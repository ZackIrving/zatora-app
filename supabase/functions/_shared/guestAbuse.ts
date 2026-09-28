import postgres from 'npm:postgres@^3'

export type GuestAbuseErrorCode =
  | 'invalid_flow'
  | 'network_signal_unavailable'
  | 'quota_unavailable'
  | 'flow_expired'
  | 'flow_exhausted'
  | 'network_rate_limited'

export class GuestAbuseError extends Error {
  readonly code: GuestAbuseErrorCode
  readonly status: number

  constructor(code: GuestAbuseErrorCode, status = 503) {
    super('Guest AI abuse control rejected the request')
    this.name = 'GuestAbuseError'
    this.code = code
    this.status = status
  }
}

const MAX_NETWORK_SIGNAL_LENGTH = 100

let quotaClient: ReturnType<typeof postgres> | null = null

function getQuotaClient() {
  const connectionString = Deno.env.get('GUEST_QUOTA_DB_URL')
  if (!connectionString) throw new GuestAbuseError('quota_unavailable')

  if (!quotaClient) {
    quotaClient = postgres(connectionString, {
      ssl: 'require',
      prepare: false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    })
  }

  return quotaClient
}

function normalizeIpv4(value: string): string | null {
  const parts = value.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null
  const octets = parts.map(Number)
  if (octets.some((octet) => octet < 0 || octet > 255)) return null
  return octets.join('.')
}

function normalizeIpv6(value: string): string | null {
  const normalized = value.toLowerCase()
  if (!normalized.includes(':') || normalized.includes('%') || !/^[0-9a-f:]+$/.test(normalized)) return null
  const sections = normalized.split('::')
  if (sections.length > 2) return null
  const left = sections[0] ? sections[0].split(':') : []
  const right = sections.length === 2 && sections[1] ? sections[1].split(':') : []
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null
  if (sections.length === 1 && left.length !== 8) return null
  if (sections.length === 2 && left.length + right.length >= 8) return null
  const zeroCount = sections.length === 2 ? 8 - left.length - right.length : 0
  const groups = [...left, ...Array.from({ length: zeroCount }, () => '0'), ...right]
  if (groups.length !== 8) return null
  return groups.map((group) => group.padStart(4, '0')).join(':')
}

export function normalizeTrustedNetworkSignal(rawValue: string | null): string {
  if (!rawValue || rawValue.length > MAX_NETWORK_SIGNAL_LENGTH) throw new GuestAbuseError('network_signal_unavailable')
  const value = rawValue.trim()
  if (value !== rawValue || value.includes(',') || value.includes('/') || value.includes(' ')) throw new GuestAbuseError('network_signal_unavailable')
  const normalized = normalizeIpv4(value) || normalizeIpv6(value)
  if (!normalized) throw new GuestAbuseError('network_signal_unavailable')
  return normalized
}

async function hmacFingerprint(secret: string, purpose: string, value: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${purpose}:${value}`)
  )
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function reserveGuestGeneration(req: Request): Promise<void> {
  if (Deno.env.get('GUEST_AI_NETWORK_SIGNAL_CONFIRMED') !== 'true') {
    throw new GuestAbuseError('network_signal_unavailable')
  }

  const flowToken = req.headers.get('x-zatora-guest-flow')
  if (!flowToken || flowToken.trim() !== flowToken || flowToken.length < 8 || flowToken.length > 100) {
    throw new GuestAbuseError('invalid_flow', 400)
  }

  const secret = Deno.env.get('GUEST_ABUSE_HMAC_SECRET')
  if (!secret) throw new GuestAbuseError('quota_unavailable')

  const networkValue = normalizeTrustedNetworkSignal(req.headers.get('cf-connecting-ip'))
  const flowFingerprint = await hmacFingerprint(secret, 'flow', flowToken.trim())
  const networkFingerprint = await hmacFingerprint(secret, 'network', networkValue)

  let result
  try {
    const sql = getQuotaClient()
    const rows = await sql`
      select allowed, result_code, remaining_generations
      from guest_abuse.consume_guest_generation(
        decode(${flowFingerprint}, 'hex'),
        decode(${networkFingerprint}, 'hex')
      )
    `
    result = rows[0]
  } catch (error) {
    if (error instanceof GuestAbuseError) throw error
    throw new GuestAbuseError('quota_unavailable')
  }

  if (!result?.allowed) {
    const code = result?.result_code
    if (code === 'flow_expired') throw new GuestAbuseError(code, 429)
    if (code === 'flow_exhausted') throw new GuestAbuseError(code, 429)
    if (code === 'network_rate_limited') throw new GuestAbuseError(code, 429)
    throw new GuestAbuseError('quota_unavailable')
  }
}
