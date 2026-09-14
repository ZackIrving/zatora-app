import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const results = []

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function check(name, run) {
  run()
  results.push(name)
}

function functionSection(config, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = config.match(
    new RegExp(
      `\\[functions\\.${escapedName}\\]([\\s\\S]*?)(?=\\n\\[|$)`
    )
  )

  assert.ok(match, `Missing function config for ${name}`)
  return match[1]
}

const config = read('supabase/config.toml')
const coach = read('supabase/functions/ai-task-coach/index.ts')
const planner = read('supabase/functions/daily-ai-planner/index.ts')
const auth = read('supabase/functions/_shared/buddy/auth.ts')
const contextBuilder = read(
  'supabase/functions/_shared/buddy/contextBuilder.ts'
)
const openai = read('supabase/functions/_shared/buddy/openai.ts')
const http = read('supabase/functions/_shared/buddy/http.ts')
const providerProbe = read(
  'scripts/verify-security-pass-a-provider.mjs'
)
const requestValidation = read(
  'supabase/functions/_shared/buddy/requestValidation.ts'
)
const dailyPlannerHook = read('src/hooks/useDailyPlanner.js')
const coachHook = read('src/hooks/useAICoach.js')
const packageJson = JSON.parse(read('package.json'))

check('Both authenticated AI functions enforce gateway JWT verification', () => {
  for (const name of ['ai-task-coach', 'daily-ai-planner']) {
    assert.match(functionSection(config, name), /verify_jwt\s*=\s*true/)
  }
})

check('Service-role credentials are absent from both AI functions', () => {
  assert.doesNotMatch(coach, /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i)
  assert.doesNotMatch(planner, /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i)
})

check('Caller identity is verified server-side with getUser', () => {
  assert.match(auth, /Authorization:\s*authorization/)
  assert.match(auth, /auth\.getUser\(token\)/)
  assert.match(auth, /callerId:\s*user\.id/)
  assert.match(auth, /SUPABASE_ANON_KEY/)
})

check('Protected data operations use only callerId', () => {
  assert.match(coach, /buildBuddyContext\([\s\S]*?callerId/)
  assert.match(planner, /\.eq\('user_id', callerId\)/)
  assert.match(planner, /user_id:\s*callerId/)
  assert.doesNotMatch(
    `${coach}\n${planner}`,
    /user_id['"]?\s*[,=:]\s*(legacyUserId|userId)/
  )
})

check('Legacy userId compatibility rejects mismatches before data access', () => {
  assert.match(requestValidation, /Temporary compatibility path/)
  assert.match(requestValidation, /legacyUserId !== callerId/)
  assert.match(requestValidation, /403/)

  for (const source of [coach, planner]) {
    const identityCheck = source.lastIndexOf('assertLegacyUserIdMatches')
    const dataAccess = source.indexOf('buildBuddyContext', identityCheck)
    assert.ok(identityCheck >= 0 && dataAccess > identityCheck)
  }
})

check('Frontend callers no longer send userId', () => {
  assert.doesNotMatch(dailyPlannerHook, /userId\s*:/)
  assert.doesNotMatch(coachHook, /userId\s*:/)
})

check('Request validation covers Coach size and Planner enums/types', () => {
  assert.match(requestValidation, /MAX_COACH_INPUT_LENGTH/)
  assert.match(requestValidation, /input_too_large/)
  assert.match(requestValidation, /PLANNER_INTENSITIES/)
  assert.match(requestValidation, /invalid_force_refresh/)
  assert.match(requestValidation, /malformed_json/)
})

check('Buddy queries use explicit columns and fail closed on errors', () => {
  assert.doesNotMatch(contextBuilder, /\.select\(['"]\*['"]\)/)
  assert.match(contextBuilder, /assertQuerySucceeded\('tasks'/)
  assert.match(contextBuilder, /assertQuerySucceeded\('habits'/)
  assert.match(contextBuilder, /assertQuerySucceeded\('user_progress'/)
  assert.match(contextBuilder, /assertQuerySucceeded\('pomodoro_sessions'/)
  assert.match(contextBuilder, /assertQuerySucceeded\('user_stats'/)
})

check('Buddy prompt context excludes the Supabase user UUID', () => {
  assert.doesNotMatch(contextBuilder, /return\s*{\s*userId/)
})

check('Planner refresh preserves cache until validated generation succeeds', () => {
  assert.doesNotMatch(planner, /\.delete\s*\(/)

  const generation = planner.lastIndexOf('generateTextWithOpenAI')
  const validation = planner.lastIndexOf('validatePlannerResponse')
  const upsert = planner.indexOf('.upsert(', validation)

  assert.ok(generation >= 0 && validation > generation && upsert > validation)
})

check('OpenAI calls are bounded, non-stored, and timed out', () => {
  assert.match(openai, /max_output_tokens:\s*OPENAI_MAX_OUTPUT_TOKENS/)
  assert.match(openai, /store:\s*false/)
  assert.match(openai, /AbortController/)
  assert.match(openai, /OPENAI_TIMEOUT_MS/)
})

check('OpenAI failures retain only safe diagnostic categories', () => {
  for (const category of [
    'network',
    'timeout',
    'http_auth',
    'http_forbidden',
    'http_rate_limit_or_quota',
    'http_client',
    'http_server',
    'response_parse',
    'output_extraction',
  ]) {
    assert.match(openai, new RegExp(`['"]${category}['"]`))
  }

  assert.match(openai, /providerStatus/)
  assert.match(http, /SAFE_OPENAI_FAILURE_PHASES/)
  assert.match(http, /requestId[\s\S]*phase[\s\S]*providerStatus/)
  assert.doesNotMatch(
    http,
    /Authorization|apiKey|OPENAI_API_KEY|prompt|outputText|responseBody/
  )
})

check('Provider HTTP classification happens before response parsing', () => {
  const statusCheck = openai.indexOf('if (!response.ok)')
  const responseParse = openai.indexOf('data = await response.json()')

  assert.ok(statusCheck >= 0 && responseParse > statusCheck)
})

check('Temporary provider response diagnostics are absent', () => {
  const publicRuntimeSources = `${http}\n${coach}\n${planner}`
  assert.doesNotMatch(
    publicRuntimeSources,
    /x-zatora-ai|createOpenAIDiagnosticHeaders/i
  )
  assert.doesNotMatch(http, /Access-Control-Expose-Headers/i)
})

check('The provider probe is a one-request success/failure check', () => {
  assert.match(providerProbe, /ZATORA_QA_A_EMAIL/)
  assert.match(providerProbe, /ZATORA_QA_A_PASSWORD/)
  assert.doesNotMatch(
    providerProbe,
    /ZATORA_QA_B|daily-ai-planner|userId|\.from\(|\.insert\(|\.update\(|\.delete\(/
  )

  const functionFetches =
    providerProbe.match(/\/functions\/v1\/ai-task-coach/g) || []
  assert.equal(functionFetches.length, 1)
  assert.match(providerProbe, /Provider probe/)
  assert.doesNotMatch(
    providerProbe,
    /response\.headers|headers\.get|response\.json|PROVIDER (PHASE|STATUS|CATEGORY|CODE)/
  )
  assert.doesNotMatch(
    providerProbe,
    /console\.log\([^\n]*(responseBody|accessToken|password|email)/
  )
})

check('AI responses are validated before use', () => {
  assert.match(coach, /validateCoachResponse\(aiResult\.outputText\)/)
  assert.match(planner, /validatePlannerResponse\(aiResult\.outputText\)/)
})

check('Sensitive context and generated output logging is absent', () => {
  const sources = `${coach}\n${planner}`
  assert.doesNotMatch(sources, /JSON\.stringify\(context/)
  assert.doesNotMatch(
    sources,
    /OpenAI Output|Buddy Context|console\.[a-z]+\([^\n]*outputText/
  )
  assert.doesNotMatch(sources, /Authorization.*console|console.*Authorization/)
})

check('Raw provider and database errors are not returned', () => {
  const sources = `${coach}\n${planner}\n${openai}`
  assert.doesNotMatch(sources, /aiResult\.raw/)
  assert.doesNotMatch(sources, /String\(error\)/)
  assert.doesNotMatch(sources, /data\.error\?\.message/)
})

check('The package exposes the Security Pass A verifier', () => {
  assert.match(
    packageJson.scripts['verify:security-pass-a'],
    /verify-security-pass-a\.mjs/
  )
})

check('The package exposes the one-request provider probe', () => {
  assert.equal(
    packageJson.scripts['verify:security-pass-a:provider'],
    'node --env-file=.env.local scripts/verify-security-pass-a-provider.mjs'
  )
})

check('The package exposes the minimum live smoke path', () => {
  assert.equal(
    packageJson.scripts['verify:security-pass-a:smoke'],
    'node --env-file=.env.local scripts/verify-security-pass-a-live.mjs --smoke'
  )
})

for (const result of results) console.log(`PASS: ${result}`)
console.log(`\n${results.length} Security Pass A structural checks passed.`)
