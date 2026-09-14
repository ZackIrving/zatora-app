const OPENAI_TIMEOUT_MS = 30_000
const OPENAI_MAX_OUTPUT_TOKENS = 1_600

export type OpenAIErrorCode =
  | 'configuration'
  | 'network'
  | 'timeout'
  | 'http_auth'
  | 'http_forbidden'
  | 'http_rate_limit_or_quota'
  | 'http_client'
  | 'http_server'
  | 'response_parse'
  | 'output_extraction'

export type OpenAIProviderCode =
  | 'credit_balance_exhausted'
  | 'organization_usage_limit_exceeded'
  | 'organization_spend_limit_exceeded'
  | 'project_spend_limit_exceeded'
  | 'rate_limit_exceeded'
  | 'insufficient_quota'
  | 'rate_limit'
  | 'unknown'

const OPENAI_PROVIDER_CODE_ALLOWLIST = new Set<OpenAIProviderCode>([
  'credit_balance_exhausted',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'rate_limit_exceeded',
  'insufficient_quota',
])

export class OpenAIRequestError extends Error {
  readonly code: OpenAIErrorCode
  readonly providerStatus: number | null
  readonly providerCode: OpenAIProviderCode

  constructor(
    code: OpenAIErrorCode,
    providerStatus: number | null = null,
    providerCode: OpenAIProviderCode = 'unknown'
  ) {
    super('OpenAI request failed')
    this.name = 'OpenAIRequestError'
    this.code = code
    this.providerStatus = providerStatus
    this.providerCode = providerCode
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

export function classifyOpenAIProviderCode(
  data: unknown
): OpenAIProviderCode {
  if (!isRecord(data) || !isRecord(data.error)) return 'unknown'

  const providerCode = data.error.code
  const providerType = data.error.type

  if (
    typeof providerCode === 'string' &&
    OPENAI_PROVIDER_CODE_ALLOWLIST.has(
      providerCode as OpenAIProviderCode
    )
  ) {
    return providerCode as OpenAIProviderCode
  }

  if (providerType === 'insufficient_quota') {
    return 'insufficient_quota'
  }

  if (providerType === 'rate_limit_error') {
    return 'rate_limit'
  }

  return 'unknown'
}

async function readOpenAIProviderCode(
  response: Response
): Promise<OpenAIProviderCode> {
  try {
    return classifyOpenAIProviderCode(await response.json())
  } catch {
    return 'unknown'
  }
}

export function classifyOpenAIHttpStatus(
  status: number
): OpenAIErrorCode {
  if (status === 401) return 'http_auth'
  if (status === 403) return 'http_forbidden'
  if (status === 429) return 'http_rate_limit_or_quota'
  if (status >= 500) return 'http_server'
  return 'http_client'
}

export function extractOutputText(data: any): string {
  const outputText =
    data?.output_text ||
    data?.output
      ?.flatMap((item: any) => item.content || [])
      ?.map((content: any) => content.text || content.output_text)
      ?.filter(Boolean)
      ?.join('\n\n')

  if (typeof outputText !== 'string' || !outputText.trim()) {
    throw new OpenAIRequestError('output_extraction')
  }

  return outputText
}

export async function generateTextWithOpenAI(prompt: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')

  if (!apiKey) throw new OpenAIRequestError('configuration')

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    OPENAI_TIMEOUT_MS
  )

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-5-mini',
        reasoning: {
          effort: 'low',
        },
        text: {
          verbosity: 'low',
        },
        input: prompt,
        max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
        store: false,
      }),
    })

    if (!response.ok) {
      const providerCode =
        response.status === 429
          ? await readOpenAIProviderCode(response)
          : 'unknown'

      throw new OpenAIRequestError(
        classifyOpenAIHttpStatus(response.status),
        response.status,
        providerCode
      )
    }

    let data: unknown

    try {
      data = await response.json()
    } catch {
      throw new OpenAIRequestError('response_parse')
    }

    return {
      status: response.status,
      outputText: extractOutputText(data),
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new OpenAIRequestError('timeout')
    }

    if (error instanceof OpenAIRequestError) throw error
    throw new OpenAIRequestError('network')
  } finally {
    clearTimeout(timeout)
  }
}
