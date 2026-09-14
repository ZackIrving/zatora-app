import assert from 'node:assert/strict'
import test from 'node:test'

import {
  InvalidAIResponseError,
  validateCoachResponse,
  validatePlannerResponse,
} from './aiResponseValidation.ts'
import { HttpError } from './http.ts'
import {
  MAX_COACH_INPUT_LENGTH,
  assertLegacyUserIdMatches,
  parseCoachRequest,
  parsePlannerRequest,
  readJsonBody,
} from './requestValidation.ts'

function isHttpErrorWithStatus(status: number) {
  return (error: unknown) =>
    error instanceof HttpError && error.status === status
}

test('Coach accepts a trimmed input without a legacy userId', () => {
  assert.deepEqual(
    parseCoachRequest({ input: '  Start the report  ' }),
    {
      input: 'Start the report',
      legacyUserId: undefined,
    }
  )
})

test('Matching legacy userId is accepted but not returned as identity', () => {
  assert.doesNotThrow(() =>
    assertLegacyUserIdMatches('caller-1', 'caller-1')
  )
})

test('Mismatched legacy userId is rejected with 403', () => {
  assert.throws(
    () => assertLegacyUserIdMatches('caller-2', 'caller-1'),
    isHttpErrorWithStatus(403)
  )
})

test('Malformed JSON is rejected with 400', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: '{broken',
  })

  await assert.rejects(
    readJsonBody(request),
    isHttpErrorWithStatus(400)
  )
})

test('Empty Coach input is rejected with 400', () => {
  assert.throws(
    () => parseCoachRequest({ input: '   ' }),
    isHttpErrorWithStatus(400)
  )
})

test('Oversized Coach input is rejected with 413', () => {
  assert.throws(
    () =>
      parseCoachRequest({
        input: 'a'.repeat(MAX_COACH_INPUT_LENGTH + 1),
      }),
    isHttpErrorWithStatus(413)
  )
})

test('Coach rejects unknown behavior-changing fields', () => {
  assert.throws(
    () =>
      parseCoachRequest({
        input: 'Start',
        model: 'arbitrary-model',
      }),
    isHttpErrorWithStatus(400)
  )
})

test('Planner defaults to Balanced without a legacy userId', () => {
  assert.deepEqual(parsePlannerRequest({}), {
    intensity: 'Balanced',
    forceRefresh: false,
    legacyUserId: undefined,
  })
})

test('Planner rejects unsupported intensity', () => {
  assert.throws(
    () => parsePlannerRequest({ intensity: 'Extreme' }),
    isHttpErrorWithStatus(400)
  )
})

test('Planner rejects non-boolean forceRefresh', () => {
  assert.throws(
    () => parsePlannerRequest({ forceRefresh: 'true' }),
    isHttpErrorWithStatus(400)
  )
})

test('Coach output validation accepts the established response shape', () => {
  assert.doesNotThrow(() =>
    validateCoachResponse(
      JSON.stringify({
        summary: 'Start small.',
        tasks: [
          {
            title: 'Open the report',
            category: 'AI Coach',
            energy: 'Low',
            time: '10 min',
            reward: 10,
          },
        ],
        startHere: 'Open the report.',
        encouragement: 'One small start is enough.',
      })
    )
  )
})

test('Planner output validation rejects malformed structure', () => {
  assert.throws(
    () => validatePlannerResponse('{"greeting":"hello"}'),
    InvalidAIResponseError
  )
})
