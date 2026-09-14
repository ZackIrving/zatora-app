import { HttpError } from './http.ts'

export const MAX_REQUEST_BODY_BYTES = 16_384
export const MAX_COACH_INPUT_LENGTH = 2_000
export const PLANNER_INTENSITIES = [
  'Easy',
  'Balanced',
  'Sprint',
] as const

export type PlannerIntensity =
  (typeof PLANNER_INTENSITIES)[number]

interface RequestWithLegacyUserId {
  legacyUserId?: string
}

export interface CoachRequest extends RequestWithLegacyUserId {
  input: string
}

export interface PlannerRequest extends RequestWithLegacyUserId {
  forceRefresh: boolean
  intensity: PlannerIntensity
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function assertAllowedKeys(
  body: Record<string, unknown>,
  allowedKeys: readonly string[]
): void {
  const unknownKey = Object.keys(body).find(
    (key) => !allowedKeys.includes(key)
  )

  if (unknownKey) {
    throw new HttpError(
      400,
      'invalid_request',
      'Invalid request.'
    )
  }
}

function parseLegacyUserId(
  body: Record<string, unknown>
): string | undefined {
  if (!hasOwn(body, 'userId')) return undefined

  if (typeof body.userId !== 'string') {
    throw new HttpError(
      400,
      'invalid_request',
      'Invalid request.'
    )
  }

  return body.userId
}

export async function readJsonBody(
  req: Request
): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers.get('content-length'))

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BODY_BYTES
  ) {
    throw new HttpError(
      413,
      'request_too_large',
      'Request is too large.'
    )
  }

  const rawBody = await req.text()

  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
    throw new HttpError(
      413,
      'request_too_large',
      'Request is too large.'
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new HttpError(
      400,
      'malformed_json',
      'Malformed JSON request.'
    )
  }

  if (!isRecord(parsed)) {
    throw new HttpError(
      400,
      'invalid_request',
      'Invalid request.'
    )
  }

  return parsed
}

export function parseCoachRequest(
  body: Record<string, unknown>
): CoachRequest {
  assertAllowedKeys(body, ['input', 'userId'])

  if (typeof body.input !== 'string') {
    throw new HttpError(
      400,
      'invalid_input',
      'Coach input is required.'
    )
  }

  const input = body.input.trim()

  if (!input) {
    throw new HttpError(
      400,
      'invalid_input',
      'Coach input is required.'
    )
  }

  if (Array.from(input).length > MAX_COACH_INPUT_LENGTH) {
    throw new HttpError(
      413,
      'input_too_large',
      'Coach input is too long.'
    )
  }

  return {
    input,
    legacyUserId: parseLegacyUserId(body),
  }
}

export function parsePlannerRequest(
  body: Record<string, unknown>
): PlannerRequest {
  assertAllowedKeys(body, ['intensity', 'forceRefresh', 'userId'])

  const intensity = body.intensity ?? 'Balanced'

  if (
    typeof intensity !== 'string' ||
    !PLANNER_INTENSITIES.includes(intensity as PlannerIntensity)
  ) {
    throw new HttpError(
      400,
      'invalid_intensity',
      'Unsupported planner intensity.'
    )
  }

  if (
    hasOwn(body, 'forceRefresh') &&
    typeof body.forceRefresh !== 'boolean'
  ) {
    throw new HttpError(
      400,
      'invalid_force_refresh',
      'forceRefresh must be a boolean.'
    )
  }

  return {
    intensity: intensity as PlannerIntensity,
    forceRefresh: body.forceRefresh === true,
    legacyUserId: parseLegacyUserId(body),
  }
}

export function assertLegacyUserIdMatches(
  legacyUserId: string | undefined,
  callerId: string
): void {
  if (legacyUserId === undefined) return

  // Temporary compatibility path: legacy clients may send their own ID,
  // but it is never used to authorize or target data and can be removed
  // after all callers have adopted the JWT-derived identity contract.
  if (legacyUserId !== callerId) {
    throw new HttpError(
      403,
      'identity_mismatch',
      'Request identity does not match the authenticated user.'
    )
  }
}
