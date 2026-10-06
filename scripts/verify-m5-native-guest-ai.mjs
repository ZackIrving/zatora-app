import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildGuestFirstWinPrompt } from '../supabase/functions/_shared/guestFirstWinPrompt.ts'
import { buildGuestFirstWinRequest, createDeterministicFallback, isValidGuestFirstWinResult } from '../shared/guest/firstWinContract.js'

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const client = read('mobile/src/guest/guestFirstWinLiveService.ts')
const storage = read('mobile/src/guest/guestStorage.ts')
const onboarding = read('mobile/src/app/(guest)/onboarding.tsx')
const fallback = read('mobile/src/guest/guestFirstWinService.ts')
const fn = read('supabase/functions/guest-first-win.ts')
const abuse = read('supabase/functions/_shared/guestAbuse.ts')
const validation = read('supabase/functions/_shared/guestFirstWinValidation.ts')
const config = read('supabase/config.toml')
const checks = []
function check(name, condition) {
  assert.ok(condition, name)
  checks.push(name)
}

check('native client uses the authoritative request builder', client.includes('buildGuestFirstWinRequest') && client.includes('JSON.stringify(body)'))
check('native client sends exactly the bounded request body', !client.includes('guestId') && !client.includes('migrationId') && !client.includes('userId') && !client.includes('email') && !client.includes('Authorization'))
check('native client sends only an opaque flow header in addition to public transport headers', client.includes("'x-zatora-guest-flow': flowToken") && !client.includes('cf-connecting-ip'))
check('native client does not use the authenticated Supabase function helper', !client.includes('supabase.functions.invoke') && client.includes('apikey: supabasePublishableKey'))
check('native client validates the exact sanitized response shape', client.includes('Object.keys(value).sort()') && client.includes('isValidGuestFirstWinResult'))
check('native client has bounded timeout and no automatic retry', client.includes('12_000') && !client.includes('retry') && !client.includes('for ('))
check('native flow calls the live service through the existing processing seam', onboarding.includes('requestGuestFirstWin') && onboarding.includes('requestKeyRef'))
check('deterministic fallback remains available behind the original service seam', fallback.includes('createDeterministicFallback') && fallback.includes('requestDeterministicFirstWin'))
check('flow token uses Expo cryptographic generation and resets with a new flow', storage.includes("from 'expo-crypto'") && storage.includes('Crypto.randomUUID()') && storage.includes('clearGuestFlowToken'))
check('native missing Origin is accepted while browser origins are checked', fn.includes('return !origin || allowedOrigins().includes(origin)') && fn.includes('origin_not_allowed'))
check('wildcard production CORS is not present', !fn.includes("'*'") && !fn.includes('https://zatora.app'))
check('kill switch remains exact and fail closed', fn.includes("GUEST_AI_ENABLED') !== 'true'"))
check('request validation rejects unknown keys and depth above two', validation.includes("assertKeys(body, ['task', 'supportNeed', 'simplificationDepth'])") && validation.includes('MAX_SIMPLIFICATION_DEPTH = 2'))
check('quota reservation precedes provider invocation', fn.indexOf('await reserveGuestGeneration(req)') < fn.indexOf('await generate('))
check('provider bounds and strict output schema remain fixed', fn.includes("model: 'gpt-5-mini'") && fn.includes("effort: 'low'") && fn.includes('12_000') && fn.includes('max_output_tokens: 500') && fn.includes('store: false') && fn.includes("type: 'json_schema'") && fn.includes('strict: true') && fn.includes('additionalProperties: false'))
check('no service role or authenticated app-data access exists', !fn.includes('SUPABASE_SERVICE_ROLE_KEY') && !fn.includes('SUPABASE_SECRET_KEY') && !fn.includes('createClient') && !fn.includes('.from('))
check('quota connection uses transaction-pooler-safe settings', abuse.includes("ssl: 'require'") && abuse.includes('prepare: false') && abuse.includes('max: 1'))
check('public deployment keeps JWT verification disabled', /\[functions\.guest-first-win\][\s\S]*verify_jwt\s*=\s*false/.test(config))
check('server response validation is exact and sanitized', validation.includes('expectedKeys') && validation.includes('invalid_response'))

// These checks verify prompt construction and bounds, not the semantic quality
// of nondeterministic provider text. Live QA must still judge that quality.
for (const task of ['Put three clean shirts away', 'Stand up and pick up one clean shirt', 'Write a report']) {
  for (const depth of [0, 1, 2]) {
    const request = buildGuestFirstWinRequest({ task, supportNeed: 'getting_started', simplificationDepth: depth })
    check(`depth ${depth} prompt preserves the bounded request for ${task}`, Object.keys(request).sort().join(',') === 'simplificationDepth,supportNeed,task')
    const prompt = buildGuestFirstWinPrompt(request)
    check(`depth ${depth} instructions and follow-up bounds for ${task}`, prompt.includes(`Depth ${depth}:`) && prompt.includes(`Task: ${task}`) && prompt.includes(`followUpSteps has 0-${2 - depth}`) && prompt.includes('Higher depth MUST reduce activation effort and must not add actions'))
    if (depth === 2) {
      check(`depth 2 atomic-action constraints for ${task}`, prompt.includes('one atomic physical or digital action') && prompt.includes('Do not produce a compound sequence') && prompt.includes('no "stand up and pick up"') && prompt.includes('no "stand up and pick up", "open X and read", or "walk over and"') && prompt.includes('What is the smallest useful action the person can physically or digitally do right now?') && prompt.includes('followUpSteps must be []') && prompt.includes('lower the barrier to touching one item'))
    }
    check(`approved deterministic fallback stays bounded at depth ${depth} for ${task}`, isValidGuestFirstWinResult(createDeterministicFallback(task, depth), depth))
  }
}
check('native recursive task context remains in the existing task field', onboarding.includes('draft.simplificationDepth === 0 ? draft.firstTask : draft.simplifiedTask'))
check('original-task depth 0 and depth 1 semantics are explicit', buildGuestFirstWinPrompt({ task: 'Read a book', supportNeed: 'getting_started', simplificationDepth: 0 }).includes('small, concrete starting action for the original task') && buildGuestFirstWinPrompt({ task: 'Read a book', supportNeed: 'getting_started', simplificationDepth: 1 }).includes('materially smaller/easier action than a reasonable depth-0 step'))

for (const name of checks) console.log(`PASS: ${name}`)
console.log(`\n${checks.length} M5 native guest-AI structural checks passed.`)
