import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import {
  validateCoachResponse,
  validatePlannerResponse,
} from '../supabase/functions/_shared/buddy/aiResponseValidation.ts'

const PROJECT_REF = 'coytgudqzoexmielqesp'
const REQUIRED_ENVIRONMENT = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'ZATORA_QA_A_EMAIL',
  'ZATORA_QA_A_PASSWORD',
  'ZATORA_QA_B_EMAIL',
  'ZATORA_QA_B_PASSWORD',
]
const QA_ENVIRONMENT = REQUIRED_ENVIRONMENT.filter((name) =>
  name.startsWith('ZATORA_QA_')
)
const FUNCTION_NAMES = ['ai-task-coach', 'daily-ai-planner']
const TODAY = new Date().toISOString().slice(0, 10)
const REQUEST_TIMEOUT_MS = 45_000
const DIAGNOSTIC_MODE = process.argv.includes('--diagnostic')
const AUTH_ONLY_MODE = process.argv.includes('--auth-only')
const SMOKE_MODE = process.argv.includes('--smoke')
const TEMPORARY_DIAGNOSTIC_HEADERS = [
  'x-zatora-ai-phase',
  'x-zatora-ai-provider-status',
  'x-zatora-ai-provider-category',
  'x-zatora-ai-provider-code',
]

const SAFE_AUTH_ERROR_CODES = Object.freeze({
  over_request_rate_limit: 'rate_limit',
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_banned: 'user_disabled',
  user_not_found: 'user_not_found',
  email_provider_disabled: 'provider_disabled',
  provider_disabled: 'provider_disabled',
  request_timeout: 'request_timeout',
  unexpected_failure: 'auth_service_error',
})

const SAFE_FAILURE_PHASES = Object.freeze({
  method_not_allowed: 'request_method',
  authentication_required: 'authorization_header',
  auth_configuration_error: 'auth_client_configuration',
  invalid_authentication: 'auth_get_user',
  request_too_large: 'request_body_read',
  malformed_json: 'request_json_parse',
  invalid_request: 'request_validation',
  invalid_input: 'request_validation',
  input_too_large: 'request_validation',
  invalid_intensity: 'request_validation',
  invalid_force_refresh: 'request_validation',
  identity_mismatch: 'legacy_user_id_validation',
  context_unavailable: 'context_database_queries',
  plan_cache_unavailable: 'planner_cache_lookup',
  invalid_momentum: 'context_construction',
  ai_configuration_error: 'openai_configuration',
  ai_timeout: 'openai_request_timeout',
  ai_provider_failure: 'openai_request_or_output_extraction',
  invalid_ai_response: 'server_response_validation',
  plan_save_failed: 'planner_persistence',
  internal_error: 'unclassified_handler_error',
})

const results = []
const cleanupEntries = []
let retainedQaRows = 0

function printResult(label, status) {
  results.push({ label, status })
  console.log(`${label.padEnd(32, '.')} ${status}`)
}

function printFailureDiagnostic(label, functionName, response) {
  if (!DIAGNOSTIC_MODE) return

  let status = 'UNAVAILABLE'
  let code = 'transport_failure'
  let phase = 'harness_transport_or_timeout'

  if (!response.transportFailure) {
    status = Number.isInteger(response.status) ? String(response.status) : 'UNKNOWN'

    if (response.status === 200) {
      code = 'response_contract_mismatch'
      phase = 'harness_response_validation'
    } else if (
      typeof response.body?.code === 'string' &&
      Object.hasOwn(SAFE_FAILURE_PHASES, response.body.code)
    ) {
      code = response.body.code
      phase = SAFE_FAILURE_PHASES[code]
    } else {
      code = 'unknown_sanitized_error'
      phase = 'gateway_or_unclassified_response'
    }
  }

  console.log(`  DIAGNOSTIC TEST: ${label}`)
  console.log(`  FUNCTION: ${functionName}`)
  console.log(`  HTTP STATUS: ${status}`)
  console.log(`  SANITIZED ERROR CODE: ${code}`)
  console.log(`  SANITIZED PHASE: ${phase}`)
}

function printFunctionResult(label, functionName, response, passed) {
  printResult(label, passed ? 'PASS' : 'FAIL')
  if (!passed) printFailureDiagnostic(label, functionName, response)
}

function sanitizeAuthFailure(error) {
  const status = Number.isInteger(error?.status) ? error.status : null
  const sourceCode = typeof error?.code === 'string' ? error.code : null

  if (status === 429) {
    return { status, code: 'rate_limit', phase: 'sign_in' }
  }

  return {
    status,
    code:
      sourceCode && Object.hasOwn(SAFE_AUTH_ERROR_CODES, sourceCode)
        ? SAFE_AUTH_ERROR_CODES[sourceCode]
        : 'unknown_auth_error',
    phase: 'sign_in',
  }
}

function printAuthResult(label, result) {
  printResult(`${label} authentication`, result.ok ? 'PASS' : 'FAIL')
  if (result.ok) return

  const status = Number.isInteger(result.diagnostic.status)
    ? String(result.diagnostic.status)
    : 'UNAVAILABLE'
  console.log(`  STATUS: ${status}`)
  console.log(`  SANITIZED CODE: ${result.diagnostic.code}`)
  console.log(`  PHASE: ${result.diagnostic.phase}`)
}

function finalResult() {
  const failed = results.some(({ status }) =>
    ['FAIL', 'NOT SAFELY TESTABLE'].includes(status)
  )
  console.log(`\nFINAL: ${failed ? 'FAIL' : 'PASS'}`)
  if (failed) process.exitCode = 1
}

function readRepositoryFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function assertSecretsAreEnvironmentOnly() {
  const localEnvironment = readRepositoryFile('.env.local')
  for (const name of QA_ENVIRONMENT) {
    assert.doesNotMatch(localEnvironment, new RegExp(`^${name}\\s*=`, 'm'))
  }
}

function runStructuralPreflight() {
  const coach = readRepositoryFile(
    'supabase/functions/ai-task-coach/index.ts'
  )
  const planner = readRepositoryFile(
    'supabase/functions/daily-ai-planner/index.ts'
  )
  const auth = readRepositoryFile(
    'supabase/functions/_shared/buddy/auth.ts'
  )
  const coachHook = readRepositoryFile('src/hooks/useAICoach.js')
  const plannerHook = readRepositoryFile('src/hooks/useDailyPlanner.js')

  assertSecretsAreEnvironmentOnly()
  assert.match(auth, /auth\.getUser\(token\)/)
  assert.match(auth, /callerId:\s*user\.id/)
  assert.doesNotMatch(`${coach}\n${planner}`, /service[_-]?role/i)

  for (const source of [coach, planner]) {
    const identityCheck = source.lastIndexOf('assertLegacyUserIdMatches')
    const dataAccess = source.indexOf('buildBuddyContext', identityCheck)
    assert.ok(identityCheck >= 0 && dataAccess > identityCheck)
  }

  assert.doesNotMatch(coachHook, /userId\s*:/)
  assert.doesNotMatch(plannerHook, /userId\s*:/)
}

function runSelfCheck() {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8')
  const packageJson = JSON.parse(readRepositoryFile('package.json'))
  const privilegedKeyName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
  const authOnlyStart = source.lastIndexOf('async function runAuthOnly()')
  const authOnlyEnd = source.indexOf('async function main()', authOnlyStart)
  const authOnlySource = source.slice(authOnlyStart, authOnlyEnd)

  assert.doesNotMatch(source, new RegExp(privilegedKeyName))
  assert.ok(authOnlyStart >= 0 && authOnlyEnd > authOnlyStart)
  assert.doesNotMatch(
    source,
    /\.auth\.(signOut|updateUser|resetPasswordForEmail)|\.auth\.admin/
  )
  assert.doesNotMatch(
    authOnlySource,
    /invokeFunction|\.from\(|\.insert\(|\.update\(|\.delete\(/
  )
  assert.match(authOnlySource, /authenticate\([^)]*false\)/s)
  const consoleLines = source
    .split(/\r?\n/)
    .filter((line) => line.includes('console.'))
  for (const line of consoleLines) {
    assert.doesNotMatch(
      line,
      /process\.env|password|accessToken|refresh_token|Authorization|\.id/i
    )
  }
  assert.match(
    packageJson.scripts['verify:security-pass-a:live'],
    /verify-security-pass-a-live\.mjs/
  )
  assert.match(
    packageJson.scripts['verify:security-pass-a:live:diagnostic'],
    /verify-security-pass-a-live\.mjs --diagnostic/
  )
  assert.match(
    packageJson.scripts['verify:security-pass-a:auth'],
    /verify-security-pass-a-live\.mjs --auth-only/
  )
  assert.match(
    packageJson.scripts['verify:security-pass-a:smoke'],
    /verify-security-pass-a-live\.mjs --smoke/
  )
  runStructuralPreflight()

  console.log('SECURITY PASS A — LIVE QA HARNESS SELF-CHECK')
  console.log('Syntax and imports.............. PASS')
  console.log('Secret-output guard............. PASS')
  console.log('Caller-scoped auth guard........ PASS')
  console.log('Auth-only isolation............. PASS')
  console.log('Frontend no-userId guard........ PASS')
}

function requireEnvironment({ reportMissingNames = true } = {}) {
  const missing = REQUIRED_ENVIRONMENT.filter(
    (name) => !process.env[name]?.trim()
  )
  if (missing.length > 0) {
    printResult('Environment', 'FAIL')
    if (reportMissingNames) {
      for (const name of missing) console.log(`Missing variable: ${name}`)
    }
    return false
  }

  try {
    const projectUrl = new URL(process.env.VITE_SUPABASE_URL)
    if (projectUrl.hostname !== `${PROJECT_REF}.supabase.co`) {
      printResult('Environment', 'FAIL')
      return false
    }
  } catch {
    printResult('Environment', 'FAIL')
    return false
  }

  printResult('Environment', 'PASS')
  return true
}

function clientOptions(authorization) {
  return {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(authorization
      ? { global: { headers: { Authorization: authorization } } }
      : {}),
  }
}

async function authenticate(emailName, passwordName, retainSession = true) {
  try {
    const authClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      clientOptions()
    )
    const { data, error } = await authClient.auth.signInWithPassword({
      email: process.env[emailName],
      password: process.env[passwordName],
    })

    if (error) {
      return { ok: false, diagnostic: sanitizeAuthFailure(error) }
    }

    if (!data.user?.id || !data.session?.access_token) {
      return {
        ok: false,
        diagnostic: {
          status: null,
          code: 'invalid_auth_response',
          phase: 'sign_in',
        },
      }
    }

    const callerId = data.user.id
    if (!retainSession) return { ok: true, callerId }

    const accessToken = data.session.access_token
    return {
      ok: true,
      user: {
        id: callerId,
        token: accessToken,
        client: createClient(
          process.env.VITE_SUPABASE_URL,
          process.env.VITE_SUPABASE_ANON_KEY,
          clientOptions(`Bearer ${accessToken}`)
        ),
      },
    }
  } catch {
    return {
      ok: false,
      diagnostic: {
        status: null,
        code: 'transport_failure',
        phase: 'sign_in',
      },
    }
  }
}

async function readResponseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function invokeFunction(name, body, token) {
  const headers = {
    apikey: process.env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }
  if (token !== undefined) headers.Authorization = `Bearer ${token}`

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    )
    const diagnosticHeadersPresent =
      TEMPORARY_DIAGNOSTIC_HEADERS.some((name) =>
        response.headers.has(name)
      )

    return {
      status: response.status,
      body: await readResponseBody(response),
      transportFailure: false,
      diagnosticHeadersPresent,
    }
  } catch {
    return {
      status: null,
      body: null,
      transportFailure: true,
      diagnosticHeadersPresent: null,
    }
  }
}

function isCoachSuccess(response) {
  if (response.status !== 200 || typeof response.body?.result !== 'string') {
    return false
  }
  try {
    validateCoachResponse(response.body.result)
    return true
  } catch {
    return false
  }
}

function isPlannerSuccess(response) {
  if (
    response.status !== 200 ||
    !['cache', 'new'].includes(response.body?.source) ||
    typeof response.body?.plan !== 'object' ||
    response.body.plan === null ||
    typeof response.body.plan.id !== 'string'
  ) {
    return false
  }

  const plan = response.body.plan
  try {
    validatePlannerResponse(
      JSON.stringify({
        greeting: plan.greeting,
        summary: plan.summary,
        mood: plan.mood,
        workload: plan.workload,
        priorities: plan.priorities,
        timeline: plan.timeline,
        bulldogMessage: plan.bulldog_message,
      })
    )
    return true
  } catch {
    return false
  }
}

function isIdentityMismatch(response) {
  return (
    response.status === 403 &&
    response.body?.code === 'identity_mismatch' &&
    !Object.hasOwn(response.body, 'plan') &&
    !Object.hasOwn(response.body, 'result')
  )
}

async function runNegativeAuthTests() {
  for (const name of FUNCTION_NAMES) {
    const label = name === 'ai-task-coach' ? 'Coach' : 'Planner'
    const body =
      name === 'ai-task-coach'
        ? { input: 'Security QA request' }
        : { intensity: 'Balanced', forceRefresh: false }

    const noAuth = await invokeFunction(name, body)
    printFunctionResult(
      `No-auth ${label}`,
      name,
      noAuth,
      noAuth.status === 401
    )

    const invalid = await invokeFunction(
      name,
      body,
      'zatora-security-pass-a-invalid-token'
    )
    printFunctionResult(
      `Invalid-auth ${label}`,
      name,
      invalid,
      invalid.status === 401
    )
  }
}

const TABLE_SPECS = [
  {
    name: 'tasks',
    key: 'id',
    fingerprint: 'id,user_id,title,done,created_at',
    values: (userId, marker) => ({
      user_id: userId,
      title: marker,
      category: 'Security QA',
      energy: 'Low',
      time: '5 min',
      reward: 0,
      done: false,
      recurring: false,
    }),
    cleanup: true,
    singleton: false,
  },
  {
    name: 'habits',
    key: 'id',
    fingerprint:
      'id,user_id,name,frequency,completed_today,last_completed_date,created_at',
    values: (userId, marker) => ({
      user_id: userId,
      name: marker,
      frequency: 'daily',
      completed_today: false,
    }),
    cleanup: true,
    singleton: false,
  },
  {
    name: 'user_progress',
    key: 'user_id',
    fingerprint: 'user_id,xp,level,created_at,updated_at',
    values: (userId) => ({ user_id: userId, xp: 0, level: 1 }),
    cleanup: true,
    singleton: true,
  },
  {
    name: 'pomodoro_sessions',
    key: 'id',
    fingerprint: 'id,user_id,duration,completed,created_at',
    values: (userId) => ({
      user_id: userId,
      duration: 1,
      completed: true,
    }),
    cleanup: true,
    singleton: false,
  },
  {
    name: 'user_stats',
    key: 'user_id',
    fingerprint:
      'id,user_id,current_streak,longest_streak,last_completed_date,created_at',
    values: (userId) => ({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
    }),
    cleanup: false,
    singleton: true,
  },
]

async function seedRow(user, spec, marker) {
  if (spec.singleton) {
    const { data, error } = await user.client
      .from(spec.name)
      .select(spec.fingerprint)
      .eq('user_id', user.id)
      .limit(1)
    if (error) return null
    if (data.length > 0) {
      return { spec, value: data[0][spec.key], created: false }
    }
  }

  const { data, error } = await user.client
    .from(spec.name)
    .insert(spec.values(user.id, marker))
    .select(spec.fingerprint)
    .single()
  if (error || data?.[spec.key] === undefined) return null

  const entry = {
    user,
    spec,
    value: data[spec.key],
    created: true,
  }
  cleanupEntries.push(entry)
  if (!spec.cleanup) retainedQaRows += 1
  return entry
}

async function prepareRlsRows(userA, userB) {
  const marker = `ZATORA_SECURITY_QA_${Date.now()}`
  const refs = { A: new Map(), B: new Map() }

  for (const spec of TABLE_SPECS) {
    const [rowA, rowB] = await Promise.all([
      seedRow(userA, spec, `${marker}_A_${spec.name}`),
      seedRow(userB, spec, `${marker}_B_${spec.name}`),
    ])
    if (rowA) refs.A.set(spec.name, rowA)
    if (rowB) refs.B.set(spec.name, rowB)
  }

  return refs
}

async function queryKnownRow(client, ref) {
  return client
    .from(ref.spec.name)
    .select(ref.spec.fingerprint)
    .eq(ref.spec.key, ref.value)
}

async function verifyRlsTable(userA, userB, refA, refB) {
  if (!refA || !refB) return 'NOT SAFELY TESTABLE'

  const [aOwn, aSeesB, bOwn, bSeesA] = await Promise.all([
    queryKnownRow(userA.client, refA),
    queryKnownRow(userA.client, refB),
    queryKnownRow(userB.client, refB),
    queryKnownRow(userB.client, refA),
  ])

  if ([aOwn, aSeesB, bOwn, bSeesA].some(({ error }) => error)) return 'FAIL'

  return aOwn.data.length === 1 &&
    bOwn.data.length === 1 &&
    aSeesB.data.length === 0 &&
    bSeesA.data.length === 0
    ? 'PASS'
    : 'FAIL'
}

async function fingerprint(user, refs) {
  const state = []
  for (const [name, ref] of [...refs.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const { data, error } = await queryKnownRow(user.client, ref)
    if (error) throw new Error('Fingerprint query failed')
    state.push([name, data])
  }
  return createHash('sha256').update(JSON.stringify(state)).digest('hex')
}

async function findCurrentPlan(user) {
  const { data, error } = await user.client
    .from('daily_ai_plans')
    .select(
      'id,user_id,plan_date,intensity,greeting,summary,priorities,timeline,bulldog_message,momentum_snapshot,context_hash,generated_at,created_at,mood,workload'
    )
    .eq('user_id', user.id)
    .eq('plan_date', TODAY)
    .eq('intensity', 'Balanced')
    .maybeSingle()
  if (error) throw new Error('Plan lookup failed')
  return data
}

function planReference(user, plan, created) {
  const spec = {
    name: 'daily_ai_plans',
    key: 'id',
    fingerprint:
      'id,user_id,plan_date,intensity,greeting,summary,priorities,timeline,bulldog_message,momentum_snapshot,context_hash,generated_at,created_at,mood,workload',
    cleanup: true,
  }
  const ref = { user, spec, value: plan.id, created }
  if (created) cleanupEntries.push(ref)
  return ref
}

async function canonicalAccess(label, user) {
  const coach = await invokeFunction(
    'ai-task-coach',
    { input: 'Security QA: suggest one harmless five-minute next step.' },
    user.token
  )
  printFunctionResult(
    `${label} canonical Coach`,
    'ai-task-coach',
    coach,
    isCoachSuccess(coach)
  )

  const planner = await invokeFunction(
    'daily-ai-planner',
    { intensity: 'Balanced', forceRefresh: false },
    user.token
  )
  printFunctionResult(
    `${label} canonical Planner`,
    'daily-ai-planner',
    planner,
    isPlannerSuccess(planner)
  )
  return { coach, planner }
}

async function crossUserAttempt(label, actor, targetId) {
  const coach = await invokeFunction(
    'ai-task-coach',
    { input: 'Security QA identity-boundary check.', userId: targetId },
    actor.token
  )
  printFunctionResult(
    `${label} Coach`,
    'ai-task-coach',
    coach,
    isIdentityMismatch(coach)
  )

  const planner = await invokeFunction(
    'daily-ai-planner',
    { intensity: 'Balanced', forceRefresh: false, userId: targetId },
    actor.token
  )
  printFunctionResult(
    `${label} Planner`,
    'daily-ai-planner',
    planner,
    isIdentityMismatch(planner)
  )
}

async function matchingLegacyAccess(label, user) {
  const coach = await invokeFunction(
    'ai-task-coach',
    {
      input: 'Security QA matching legacy identity check.',
      userId: user.id,
    },
    user.token
  )
  printFunctionResult(
    `${label} matching legacy Coach`,
    'ai-task-coach',
    coach,
    isCoachSuccess(coach)
  )

  const planner = await invokeFunction(
    'daily-ai-planner',
    {
      intensity: 'Balanced',
      forceRefresh: false,
      userId: user.id,
    },
    user.token
  )
  printFunctionResult(
    `${label} matching legacy Planner`,
    'daily-ai-planner',
    planner,
    isPlannerSuccess(planner)
  )
}

async function plannerRefresh(userA, userB, refA, refsB) {
  const beforeB = await fingerprint(userB, refsB)
  const refreshed = await invokeFunction(
    'daily-ai-planner',
    { intensity: 'Balanced', forceRefresh: true },
    userA.token
  )
  const refreshPassed =
    isPlannerSuccess(refreshed) && refreshed.body.source === 'new'
  printFunctionResult(
    'Planner secured refresh',
    'daily-ai-planner',
    refreshed,
    refreshPassed
  )

  if (!refreshPassed) {
    printResult('Planner ownership', 'FAIL')
    printResult('Planner cross-user isolation', 'FAIL')
    return
  }

  const refreshedRef = { ...refA, value: refreshed.body.plan.id }
  const [aOwn, bSeesA] = await Promise.all([
    queryKnownRow(userA.client, refreshedRef),
    queryKnownRow(userB.client, refreshedRef),
  ])
  printResult(
    'Planner ownership',
    !aOwn.error && aOwn.data.length === 1 ? 'PASS' : 'FAIL'
  )

  const afterB = await fingerprint(userB, refsB)
  printResult(
    'Planner cross-user isolation',
    !bSeesA.error && bSeesA.data.length === 0 && beforeB === afterB
      ? 'PASS'
      : 'FAIL'
  )
}

async function cleanup() {
  let cleanupFailed = false

  for (const entry of cleanupEntries.reverse()) {
    if (!entry.created || !entry.spec.cleanup) continue

    const { error } = await entry.user.client
      .from(entry.spec.name)
      .delete()
      .eq(entry.spec.key, entry.value)
    if (error) {
      cleanupFailed = true
      continue
    }

    const check = await queryKnownRow(entry.user.client, entry)
    if (check.error || check.data.length !== 0) cleanupFailed = true
  }

  printResult('Disposable row cleanup', cleanupFailed ? 'FAIL' : 'PASS')
  printResult(
    'user_stats cleanup',
    retainedQaRows > 0 ? 'RETAINED BY POLICY' : 'NOT CREATED'
  )
}

async function runAuthOnly() {
  if (!requireEnvironment({ reportMissingNames: false })) {
    process.exitCode = 1
    return
  }

  const [authA, authB] = await Promise.all([
    authenticate('ZATORA_QA_A_EMAIL', 'ZATORA_QA_A_PASSWORD', false),
    authenticate('ZATORA_QA_B_EMAIL', 'ZATORA_QA_B_PASSWORD', false),
  ])

  printAuthResult('QA A', authA)
  printAuthResult('QA B', authB)

  const distinct =
    authA.ok && authB.ok && authA.callerId !== authB.callerId
  printResult('Distinct QA users', distinct ? 'PASS' : 'FAIL')

  if (!authA.ok || !authB.ok || !distinct) process.exitCode = 1
}

async function main() {
  console.log('SECURITY PASS A — LIVE QA\n')

  if (!requireEnvironment()) {
    finalResult()
    return
  }

  try {
    runStructuralPreflight()
    printResult('Structural security preflight', 'PASS')
  } catch {
    printResult('Structural security preflight', 'FAIL')
    finalResult()
    return
  }

  const [authA, authB] = await Promise.all([
    authenticate('ZATORA_QA_A_EMAIL', 'ZATORA_QA_A_PASSWORD'),
    authenticate('ZATORA_QA_B_EMAIL', 'ZATORA_QA_B_PASSWORD'),
  ])

  printAuthResult('QA A', authA)
  printAuthResult('QA B', authB)

  if (!authA.ok || !authB.ok) {
    printResult('LIVE LOG INSPECTION', 'MANUAL REQUIRED')
    finalResult()
    return
  }

  const userA = authA.user
  const userB = authB.user
  printResult('Distinct QA users', userA.id !== userB.id ? 'PASS' : 'FAIL')
  if (userA.id === userB.id) {
    printResult('LIVE LOG INSPECTION', 'MANUAL REQUIRED')
    finalResult()
    return
  }

  try {
    await runNegativeAuthTests()

    const [prePlanA, prePlanB] = await Promise.all([
      findCurrentPlan(userA),
      findCurrentPlan(userB),
    ])
    const refs = await prepareRlsRows(userA, userB)

    const [canonicalA, canonicalB] = await Promise.all([
      canonicalAccess('QA A', userA),
      canonicalAccess('QA B', userB),
    ])

    if (isPlannerSuccess(canonicalA.planner)) {
      refs.A.set(
        'daily_ai_plans',
        planReference(userA, canonicalA.planner.body.plan, !prePlanA)
      )
    }
    if (isPlannerSuccess(canonicalB.planner)) {
      refs.B.set(
        'daily_ai_plans',
        planReference(userB, canonicalB.planner.body.plan, !prePlanB)
      )
    }

    printResult(
      'Canonical no-userId contract',
      isCoachSuccess(canonicalA.coach) &&
        isPlannerSuccess(canonicalA.planner) &&
        isCoachSuccess(canonicalB.coach) &&
        isPlannerSuccess(canonicalB.planner)
        ? 'PASS'
        : 'FAIL'
    )

    for (const table of [
      'tasks',
      'habits',
      'user_progress',
      'pomodoro_sessions',
      'user_stats',
      'daily_ai_plans',
    ]) {
      const status = await verifyRlsTable(
        userA,
        userB,
        refs.A.get(table),
        refs.B.get(table)
      )
      printResult(`RLS ${table}`, status)
    }

    const beforeA = await fingerprint(userA, refs.A)
    const beforeB = await fingerprint(userB, refs.B)

    await crossUserAttempt('A -> B', userA, userB.id)
    const afterB = await fingerprint(userB, refs.B)
    await crossUserAttempt('B -> A', userB, userA.id)
    const afterA = await fingerprint(userA, refs.A)

    printResult(
      'Cross-user data integrity',
      beforeA === afterA && beforeB === afterB ? 'PASS' : 'FAIL'
    )

    await matchingLegacyAccess('QA A', userA)
    await matchingLegacyAccess('QA B', userB)

    const planRefA = refs.A.get('daily_ai_plans')
    if (planRefA) {
      await plannerRefresh(userA, userB, planRefA, refs.B)
    } else {
      printResult('Planner secured refresh', 'FAIL')
      printResult('Planner ownership', 'FAIL')
      printResult('Planner cross-user isolation', 'FAIL')
    }

    printResult('Frontend no-userId contract', 'PASS')
  } catch {
    printResult('Harness execution', 'FAIL')
  } finally {
    try {
      await cleanup()
    } catch {
      printResult('Disposable row cleanup', 'FAIL')
    }
  }

  printResult('LIVE LOG INSPECTION', 'MANUAL REQUIRED')
  finalResult()
}

async function runSmoke() {
  console.log('SECURITY PASS A — FINAL LIVE SMOKE\n')

  if (!requireEnvironment()) {
    finalResult()
    return
  }

  try {
    runStructuralPreflight()
    printResult('Structural security preflight', 'PASS')
  } catch {
    printResult('Structural security preflight', 'FAIL')
    finalResult()
    return
  }

  const [authA, authB] = await Promise.all([
    authenticate('ZATORA_QA_A_EMAIL', 'ZATORA_QA_A_PASSWORD'),
    authenticate('ZATORA_QA_B_EMAIL', 'ZATORA_QA_B_PASSWORD'),
  ])

  printAuthResult('QA A', authA)
  printAuthResult('QA B', authB)

  if (!authA.ok || !authB.ok) {
    finalResult()
    return
  }

  const userA = authA.user
  const userB = authB.user
  const distinct = userA.id !== userB.id
  printResult('Distinct QA users', distinct ? 'PASS' : 'FAIL')
  if (!distinct) {
    finalResult()
    return
  }

  const noAuth = await invokeFunction(
    'ai-task-coach',
    { input: 'Security QA request' }
  )
  printFunctionResult(
    'No-auth Coach',
    'ai-task-coach',
    noAuth,
    noAuth.status === 401
  )

  const canonical = await canonicalAccess('QA A', userA)
  const crossUser = await invokeFunction(
    'ai-task-coach',
    {
      input: 'Security QA identity-boundary check.',
      userId: userB.id,
    },
    userA.token
  )
  printFunctionResult(
    'A -> B Coach',
    'ai-task-coach',
    crossUser,
    isIdentityMismatch(crossUser)
  )

  const diagnosticHeadersAbsent = [
    noAuth,
    canonical.coach,
    canonical.planner,
    crossUser,
  ].every((response) => response.diagnosticHeadersPresent === false)
  printResult(
    'Diagnostic headers absent',
    diagnosticHeadersAbsent ? 'PASS' : 'FAIL'
  )

  finalResult()
}

if (process.argv.includes('--self-check')) {
  runSelfCheck()
} else if (AUTH_ONLY_MODE) {
  await runAuthOnly()
} else if (SMOKE_MODE) {
  await runSmoke()
} else {
  await main()
}
