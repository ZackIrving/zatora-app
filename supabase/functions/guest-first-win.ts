import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { HttpError, createRequestId } from './_shared/buddy/http.ts'
import { GuestAbuseError, reserveGuestGeneration } from './_shared/guestAbuse.ts'
import { buildGuestFirstWinPrompt } from './_shared/guestFirstWinPrompt.ts'
import { parseGuestFirstWinRequest, readGuestJsonBody, validateGuestFirstWinResponse } from './_shared/guestFirstWinValidation.ts'

function allowedOrigins(): string[] {
  const configured = Deno.env.get('GUEST_AI_ALLOWED_ORIGINS')
  return (configured ? configured.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000']).map((origin) => origin.trim()).filter(Boolean)
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin') || ''
  const allowed = allowedOrigins()
  return { ...(allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}), 'Access-Control-Allow-Headers': 'content-type, apikey, x-client-info, x-zatora-guest-flow', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
}

async function generate(prompt: string): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new HttpError(503, 'provider', 'Franco is temporarily unavailable.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ model: 'gpt-5-mini', reasoning: { effort: 'low' }, text: { verbosity: 'low' }, input: prompt, max_output_tokens: 500, store: false }) })
    if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, response.status === 429 ? 'rate_limited' : 'provider', 'Franco is temporarily unavailable.')
    const data = await response.json()
    const output = data?.output_text || data?.output?.flatMap((item: { content?: Array<{ text?: string; output_text?: string }> }) => item.content || []).map((content: { text?: string; output_text?: string }) => content.text || content.output_text).filter(Boolean).join('\n\n')
    if (typeof output !== 'string' || !output.trim()) throw new HttpError(502, 'invalid_response', 'Franco returned an invalid response.')
    return output
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (controller.signal.aborted) throw new HttpError(504, 'timeout', 'Franco took too long.')
    throw new HttpError(502, 'provider', 'Franco is temporarily unavailable.')
  } finally { clearTimeout(timeout) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { success: false, code: 'method_not_allowed', error: 'Method not allowed.' }, 405)
  const requestId = createRequestId()
  try {
    if (Deno.env.get('GUEST_AI_ENABLED') !== 'true') throw new HttpError(503, 'feature_disabled', 'Guest AI is temporarily unavailable.')
    const request = parseGuestFirstWinRequest(await readGuestJsonBody(req))
    await reserveGuestGeneration(req)
    const output = await generate(buildGuestFirstWinPrompt(request))
    const result = validateGuestFirstWinResponse(output, request.simplificationDepth)
    return json(req, result)
  } catch (error) {
    const normalized = error instanceof GuestAbuseError
      ? new HttpError(error.status, error.code, error.code === 'invalid_flow' ? 'Guest flow is required.' : 'Guest AI is temporarily unavailable.')
      : error instanceof HttpError ? error : new HttpError(500, 'provider', 'Franco is temporarily unavailable.')
    console.error('guest-first-win request failed', { requestId, code: normalized.code })
    return json(req, { success: false, code: normalized.code, error: normalized.message }, normalized.status)
  }
})
