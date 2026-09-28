import { HttpError } from './buddy/http.ts'
import {
  GuestFirstWinRequest,
  GuestFirstWinResponse,
  SUPPORT_NEEDS,
} from './guestFirstWinTypes.ts'

export const MAX_GUEST_REQUEST_BODY_BYTES = 8_192
export const MAX_GUEST_TASK_LENGTH = 500
export const MAX_SIMPLIFICATION_DEPTH = 2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertKeys(body: Record<string, unknown>, keys: string[]) {
  if (Object.keys(body).some((key) => !keys.includes(key))) throw new HttpError(400, 'invalid_request', 'Invalid request.')
}

function bounded(value: unknown, max: number, required = false): value is string {
  return typeof value === 'string' && (!required || value.trim().length > 0) && Array.from(value).length <= max
}

export async function readGuestJsonBody(req: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_GUEST_REQUEST_BODY_BYTES) throw new HttpError(413, 'request_too_large', 'Request is too large.')
  const raw = await req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_GUEST_REQUEST_BODY_BYTES) throw new HttpError(413, 'request_too_large', 'Request is too large.')
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('not object')
    return parsed
  } catch {
    throw new HttpError(400, 'malformed_json', 'Malformed JSON request.')
  }
}

export function parseGuestFirstWinRequest(body: Record<string, unknown>): GuestFirstWinRequest {
  assertKeys(body, ['task', 'supportNeed', 'simplificationDepth'])
  if (!bounded(body.task, MAX_GUEST_TASK_LENGTH, true)) throw new HttpError(400, 'invalid_task', 'Task is required.')
  if (typeof body.supportNeed !== 'string' || !SUPPORT_NEEDS.includes(body.supportNeed as never)) throw new HttpError(400, 'invalid_support_need', 'Support need is invalid.')
  if (!Number.isInteger(body.simplificationDepth) || Number(body.simplificationDepth) < 0 || Number(body.simplificationDepth) > MAX_SIMPLIFICATION_DEPTH) throw new HttpError(400, 'invalid_depth', 'Simplification depth is invalid.')
  return { task: body.task.trim(), supportNeed: body.supportNeed as GuestFirstWinRequest['supportNeed'], simplificationDepth: Number(body.simplificationDepth) }
}

function parseObject(output: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(output)
    if (!isRecord(parsed)) throw new Error('not object')
    return parsed
  } catch { throw new HttpError(502, 'invalid_response', 'Franco returned an invalid response.') }
}

export function validateGuestFirstWinResponse(output: string, depth: number): GuestFirstWinResponse {
  const parsed = parseObject(output)
  const expectedKeys = ['acknowledgement', 'tinyFirstStep', 'followUpSteps', 'francoLine']
  if (Object.keys(parsed).some((key) => !expectedKeys.includes(key))) throw new HttpError(502, 'invalid_response', 'Franco returned an invalid response.')
  const followUps = parsed.followUpSteps
  const followUpLimit = Math.min(2, MAX_SIMPLIFICATION_DEPTH - depth)
  if (!bounded(parsed.acknowledgement, 180) || !bounded(parsed.tinyFirstStep, 280, true) || !Array.isArray(followUps) || followUps.length > followUpLimit || !followUps.every((item) => bounded(item, 180, true)) || !bounded(parsed.francoLine, 160)) throw new HttpError(502, 'invalid_response', 'Franco returned an invalid response.')
  return { acknowledgement: parsed.acknowledgement as string, tinyFirstStep: parsed.tinyFirstStep as string, followUpSteps: (followUps as string[]).map((item) => item.trim()), francoLine: parsed.francoLine as string }
}
