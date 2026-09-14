import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  InvalidAIResponseError,
  validatePlannerResponse,
} from '../_shared/buddy/aiResponseValidation.ts'
import { authenticateCaller } from '../_shared/buddy/auth.ts'
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
import { buildPlannerPrompt } from '../_shared/buddy/plannerPrompt.ts'
import {
  assertLegacyUserIdMatches,
  parsePlannerRequest,
  readJsonBody,
} from '../_shared/buddy/requestValidation.ts'

const PLAN_SELECT_COLUMNS = [
  'id',
  'plan_date',
  'intensity',
  'greeting',
  'summary',
  'priorities',
  'timeline',
  'bulldog_message',
  'momentum_snapshot',
  'generated_at',
  'created_at',
  'mood',
  'workload',
].join(',')

function normalizeError(error: unknown): HttpError {
  if (error instanceof HttpError) return error

  if (error instanceof BuddyContextQueryError) {
    return new HttpError(
      500,
      'context_unavailable',
      'Unable to load Daily Planner context.'
    )
  }

  if (error instanceof InvalidAIResponseError) {
    return new HttpError(
      502,
      'invalid_ai_response',
      'Daily Planner returned an invalid response.'
    )
  }

  if (error instanceof OpenAIRequestError) {
    if (error.code === 'timeout') {
      return new HttpError(
        504,
        'ai_timeout',
        'Daily Planner timed out.'
      )
    }

    if (error.code === 'configuration') {
      return new HttpError(
        500,
        'ai_configuration_error',
        'Daily Planner is temporarily unavailable.'
      )
    }

    return new HttpError(
      502,
      'ai_provider_failure',
      'Daily Planner is temporarily unavailable.'
    )
  }

  return new HttpError(
    500,
    'internal_error',
    'Daily Planner is temporarily unavailable.'
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
    const plannerRequest = parsePlannerRequest(body)

    assertLegacyUserIdMatches(
      plannerRequest.legacyUserId,
      callerId
    )

    const today = new Date().toISOString().slice(0, 10)

    const { data: existingPlan, error: cacheError } = await supabase
      .from('daily_ai_plans')
      .select(PLAN_SELECT_COLUMNS)
      .eq('user_id', callerId)
      .eq('plan_date', today)
      .eq('intensity', plannerRequest.intensity)
      .maybeSingle()

    if (cacheError) {
      throw new HttpError(
        500,
        'plan_cache_unavailable',
        'Unable to load the current daily plan.'
      )
    }

    if (existingPlan && !plannerRequest.forceRefresh) {
      return jsonResponse({
        source: 'cache',
        plan: existingPlan,
      })
    }

    const context = await buildBuddyContext(
      supabase,
      callerId
    )
    const prompt = buildPlannerPrompt(
      context,
      plannerRequest.intensity
    )
    const aiResult = await generateTextWithOpenAI(prompt)
    const plan = validatePlannerResponse(aiResult.outputText)
    const momentumScore = Number(
      context.snapshot.momentum.score
    )

    if (!Number.isInteger(momentumScore)) {
      throw new HttpError(
        500,
        'invalid_momentum',
        'Unable to prepare the daily plan.'
      )
    }

    const { data: savedPlan, error: saveError } = await supabase
      .from('daily_ai_plans')
      .upsert(
        {
          user_id: callerId,
          plan_date: today,
          intensity: plannerRequest.intensity,
          greeting: plan.greeting,
          summary: plan.summary,
          mood: plan.mood,
          workload: plan.workload,
          priorities: plan.priorities,
          timeline: plan.timeline,
          bulldog_message: plan.bulldogMessage,
          momentum_snapshot: momentumScore,
          context_hash: 'v1',
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,plan_date,intensity',
        }
      )
      .select(PLAN_SELECT_COLUMNS)
      .single()

    if (saveError) {
      throw new HttpError(
        500,
        'plan_save_failed',
        'Unable to save the daily plan.'
      )
    }

    return jsonResponse({
      source: 'new',
      plan: savedPlan,
    })
  } catch (error) {
    if (error instanceof OpenAIRequestError) {
      logOpenAIRequestFailure(
        'daily-ai-planner',
        requestId,
        error.code,
        error.providerStatus
      )
    }

    const normalizedError = normalizeError(error)

    logRequestFailure(
      'daily-ai-planner',
      requestId,
      normalizedError.code
    )

    return errorResponse(normalizedError)
  }
})
