export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SAFE_OPENAI_FAILURE_PHASES = new Set([
  'configuration',
  'network',
  'timeout',
  'http_auth',
  'http_forbidden',
  'http_rate_limit_or_quota',
  'http_client',
  'http_server',
  'response_parse',
  'output_extraction',
])

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(
    status: number,
    code: string,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function jsonResponse(
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(
  error: HttpError
): Response {
  return jsonResponse(
    {
      success: false,
      error: error.message,
      code: error.code,
    },
    error.status
  )
}

export function createRequestId(): string {
  return crypto.randomUUID()
}

export function logRequestFailure(
  functionName: string,
  requestId: string,
  code: string
): void {
  console.error(`${functionName} request failed`, {
    requestId,
    code,
  })
}

export function logOpenAIRequestFailure(
  functionName: string,
  requestId: string,
  phase: string,
  providerStatus: number | null
): void {
  const safePhase = SAFE_OPENAI_FAILURE_PHASES.has(phase)
    ? phase
    : 'unknown'
  const safeProviderStatus =
    Number.isInteger(providerStatus) &&
    Number(providerStatus) >= 100 &&
    Number(providerStatus) <= 599
      ? providerStatus
      : null
  const diagnostic =
    safeProviderStatus === null
      ? { requestId, phase: safePhase }
      : {
          requestId,
          phase: safePhase,
          providerStatus: safeProviderStatus,
        }

  console.error(`${functionName} OpenAI request failed`, diagnostic)
}
