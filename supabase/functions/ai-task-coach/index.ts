import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  InvalidAIResponseError,
  validateCoachResponse,
} from '../_shared/buddy/aiResponseValidation.ts'
import { authenticateCaller } from '../_shared/buddy/auth.ts'
import { buildCoachPrompt } from '../_shared/buddy/coachPrompt.ts'
import {
  BuddyContextQueryError,
  buildBuddyContext,
} from '../_shared/buddy/contextBuilder.ts'
import {
  HttpError,
  corsHeaders,
  createRequestId,
  errorResponse,
  jsonResponse,
  logOpenAIRequestFailure,
  logRequestFailure,
} from '../_shared/buddy/http.ts'
import {
  OpenAIRequestError,
  generateTextWithOpenAI,
} from '../_shared/buddy/openai.ts'
import {
  assertLegacyUserIdMatches,
  parseCoachRequest,
  readJsonBody,
} from '../_shared/buddy/requestValidation.ts'

function normalizeError(error: unknown): HttpError {
  if (error instanceof HttpError) return error

  if (error instanceof BuddyContextQueryError) {
    return new HttpError(
      500,
      'context_unavailable',
      'Unable to load AI Coach context.'
    )
  }

  if (error instanceof InvalidAIResponseError) {
    return new HttpError(
      502,
      'invalid_ai_response',
      'AI Coach returned an invalid response.'
    )
  }

  if (error instanceof OpenAIRequestError) {
    if (error.code === 'timeout') {
      return new HttpError(
        504,
        'ai_timeout',
        'AI Coach timed out.'
      )
    }

    if (error.code === 'configuration') {
      return new HttpError(
        500,
        'ai_configuration_error',
        'AI Coach is temporarily unavailable.'
      )
    }

    return new HttpError(
      502,
      'ai_provider_failure',
      'AI Coach is temporarily unavailable.'
    )
  }

  return new HttpError(
    500,
    'internal_error',
    'AI Coach is temporarily unavailable.'
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        error: 'Method not allowed.',
        code: 'method_not_allowed',
      },
      405
    )
  }

  const requestId = createRequestId()

  try {
    const { callerId, supabase } = await authenticateCaller(req)
    const body = await readJsonBody(req)
    const coachRequest = parseCoachRequest(body)

    assertLegacyUserIdMatches(
      coachRequest.legacyUserId,
      callerId
    )

    const context = await buildBuddyContext(
      supabase,
      callerId
    )
    const prompt = buildCoachPrompt(
      coachRequest.input,
      context
    )
    const aiResult = await generateTextWithOpenAI(prompt)

    validateCoachResponse(aiResult.outputText)

    return jsonResponse({
      status: aiResult.status,
      result: aiResult.outputText,
    })
  } catch (error) {
    if (error instanceof OpenAIRequestError) {
      logOpenAIRequestFailure(
        'ai-task-coach',
        requestId,
        error.code,
        error.providerStatus
      )
    }

    const normalizedError = normalizeError(error)

    logRequestFailure(
      'ai-task-coach',
      requestId,
      normalizedError.code
    )

    return errorResponse(normalizedError)
  }
})
