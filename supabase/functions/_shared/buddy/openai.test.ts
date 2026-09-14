import assert from 'node:assert/strict'
import test from 'node:test'

import { logOpenAIRequestFailure } from './http.ts'
import {
  OpenAIRequestError,
  classifyOpenAIHttpStatus,
  classifyOpenAIProviderCode,
  extractOutputText,
  generateTextWithOpenAI,
} from './openai.ts'

const ALLOWLISTED_PROVIDER_CODES = [
  'credit_balance_exhausted',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'rate_limit_exceeded',
  'insufficient_quota',
] as const

test('provider HTTP statuses map to safe diagnostic categories', () => {
  assert.equal(classifyOpenAIHttpStatus(401), 'http_auth')
  assert.equal(classifyOpenAIHttpStatus(403), 'http_forbidden')
  assert.equal(
    classifyOpenAIHttpStatus(429),
    'http_rate_limit_or_quota'
  )
  assert.equal(classifyOpenAIHttpStatus(400), 'http_client')
  assert.equal(classifyOpenAIHttpStatus(404), 'http_client')
  assert.equal(classifyOpenAIHttpStatus(500), 'http_server')
  assert.equal(classifyOpenAIHttpStatus(503), 'http_server')
})

test('output extraction failures remain distinct from provider failures', () => {
  assert.equal(
    extractOutputText({ output_text: 'safe output' }),
    'safe output'
  )

  assert.throws(
    () => extractOutputText({ output: [] }),
    (error: unknown) =>
      error instanceof OpenAIRequestError &&
      error.code === 'output_extraction' &&
      error.providerStatus === null
  )
})

test('diagnostic logging emits only allowlisted metadata', () => {
  const originalConsoleError = console.error
  const calls: unknown[][] = []

  console.error = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    logOpenAIRequestFailure(
      'ai-task-coach',
      'request-safe',
      'http_auth',
      401
    )
  } finally {
    console.error = originalConsoleError
  }

  assert.deepEqual(calls, [
    [
      'ai-task-coach OpenAI request failed',
      {
        requestId: 'request-safe',
        phase: 'http_auth',
        providerStatus: 401,
      },
    ],
  ])
})

test('diagnostic logging normalizes unexpected metadata', () => {
  const originalConsoleError = console.error
  const calls: unknown[][] = []
  const unsafeValue = 'raw-provider-message-placeholder'

  console.error = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    logOpenAIRequestFailure(
      'ai-task-coach',
      'request-safe',
      unsafeValue,
      999
    )
  } finally {
    console.error = originalConsoleError
  }

  assert.deepEqual(calls, [
    [
      'ai-task-coach OpenAI request failed',
      {
        requestId: 'request-safe',
        phase: 'unknown',
      },
    ],
  ])
  assert.doesNotMatch(JSON.stringify(calls), new RegExp(unsafeValue))
})

test('recognized OpenAI provider codes map exactly to allowlisted values', () => {
  for (const providerCode of ALLOWLISTED_PROVIDER_CODES) {
    assert.equal(
      classifyOpenAIProviderCode({
        error: {
          code: providerCode,
          type: 'arbitrary_type',
          message: 'arbitrary provider message',
        },
      }),
      providerCode
    )
  }

  assert.equal(
    classifyOpenAIProviderCode({
      error: { code: null, type: 'rate_limit_error' },
    }),
    'rate_limit'
  )
  assert.equal(
    classifyOpenAIProviderCode({
      error: { code: null, type: 'insufficient_quota' },
    }),
    'insufficient_quota'
  )
})

test('arbitrary provider fields cannot reach retained error metadata', () => {
  const unsafeValue =
    'raw-provider-body-with-credential-and-token-placeholder'
  const providerCode = classifyOpenAIProviderCode({
    error: {
      code: unsafeValue,
      type: unsafeValue,
      message: unsafeValue,
      body: unsafeValue,
    },
  })
  const error = new OpenAIRequestError(
    'http_rate_limit_or_quota',
    429,
    providerCode
  )

  assert.equal(providerCode, 'unknown')
  assert.equal(error.message, 'OpenAI request failed')
  assert.equal(error.providerCode, 'unknown')
  assert.doesNotMatch(JSON.stringify(error), new RegExp(unsafeValue))
})

test('429 handling retains only the allowlisted provider subtype', async () => {
  const originalDeno = (globalThis as any).Deno
  const originalFetch = globalThis.fetch

  ;(globalThis as any).Deno = {
    env: { get: () => 'test-key-placeholder' },
  }
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 'project_spend_limit_exceeded',
          type: 'insufficient_quota',
          message: 'raw message must be discarded',
        },
      }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  try {
    await assert.rejects(
      generateTextWithOpenAI('test prompt'),
      (error: unknown) =>
        error instanceof OpenAIRequestError &&
        error.code === 'http_rate_limit_or_quota' &&
        error.providerStatus === 429 &&
        error.providerCode === 'project_spend_limit_exceeded' &&
        !Object.hasOwn(error, 'providerBody') &&
        !Object.hasOwn(error, 'providerMessage')
    )
  } finally {
    globalThis.fetch = originalFetch
    if (originalDeno === undefined) {
      delete (globalThis as any).Deno
    } else {
      ;(globalThis as any).Deno = originalDeno
    }
  }
})
