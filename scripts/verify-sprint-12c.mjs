import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  STARTER_XP,
  GUEST_ONBOARDING_VERSION,
  createGuestDraft,
  guestOnboardingReducer,
  readStoredGuestDraft,
} from '../src/hooks/guestOnboardingState.js'

const results = []
function test(name, run) { run(); results.push(name) }
function transition(state, step, updates = {}) { return guestOnboardingReducer(state, { type: 'TRANSITION', step, updates }) }
function storage(value) { const map = new Map(value ? [['zatora_guest_onboarding_v2', value]] : []); return { getItem: (key) => map.get(key) || null, setItem: (key, next) => map.set(key, next), removeItem: (key) => map.delete(key) } }
function preparedDraft() {
  let draft = createGuestDraft()
  draft = transition(draft, 'name', { name: 'Zack' })
  draft = transition(draft, 'support', { name: 'Zack' })
  draft = transition(draft, 'handoff', { supportNeed: 'getting_started' })
  draft = transition(draft, 'task', { firstTask: 'Start the report' })
  return transition(draft, 'simplify')
}

test('Guest state is version 2 with bounded simplification fields', () => {
  const draft = createGuestDraft()
  assert.equal(GUEST_ONBOARDING_VERSION, 2)
  assert.equal(draft.simplificationStatus, 'idle')
  assert.equal(draft.simplificationDepth, 0)
  assert.equal(draft.earnedStarterXP, 0)
})

test('Version 1 drafts migrate while retaining guest and migration IDs', () => {
  const legacy = createGuestDraft()
  const v1 = { ...legacy, version: 1, simplifyAttempts: 1, simplifiedTask: 'Open the document.' }
  const resumed = readStoredGuestDraft({ getItem: (key) => key === 'zatora_guest_onboarding_v1' ? JSON.stringify(v1) : null, removeItem() {}, setItem() {} })
  assert.equal(resumed.version, 2)
  assert.equal(resumed.guestId, legacy.guestId)
  assert.equal(resumed.migrationId, legacy.migrationId)
  assert.equal(resumed.simplificationStatus, 'available')
})

test('Processing is explicit and result application is validated', () => {
  const draft = preparedDraft()
  const processing = guestOnboardingReducer(draft, { type: 'REQUEST_SIMPLIFICATION' })
  assert.equal(processing.simplificationStatus, 'processing')
  const available = guestOnboardingReducer(processing, { type: 'APPLY_SIMPLIFICATION', result: { acknowledgement: '', tinyFirstStep: 'Open the report.', followUpSteps: ['Find the first section.'], francoLine: '' } })
  assert.equal(available.simplificationStatus, 'available')
  assert.equal(available.simplifiedTask, 'Open the report.')
})

test('Completion is atomic and idempotent at exactly 25 XP', () => {
  let draft = preparedDraft()
  draft = guestOnboardingReducer(draft, { type: 'REQUEST_SIMPLIFICATION' })
  draft = guestOnboardingReducer(draft, { type: 'APPLY_SIMPLIFICATION', result: { acknowledgement: '', tinyFirstStep: 'Open the report.', followUpSteps: [], francoLine: '' } })
  draft = guestOnboardingReducer(draft, { type: 'ACCEPT_TASK' })
  draft = guestOnboardingReducer(draft, { type: 'COMPLETE_FIRST_WIN' })
  const replay = guestOnboardingReducer(draft, { type: 'COMPLETE_FIRST_WIN' })
  assert.equal(draft.step, 'win')
  assert.equal(draft.completedFirstWin, true)
  assert.equal(draft.earnedStarterXP, STARTER_XP)
  assert.deepEqual(replay, draft)
})

test('Simplification depth is bounded and preserves the current tiny step for recursion', () => {
  let draft = preparedDraft()
  draft = guestOnboardingReducer(draft, { type: 'REQUEST_SIMPLIFICATION' })
  draft = guestOnboardingReducer(draft, { type: 'APPLY_SIMPLIFICATION', result: { acknowledgement: '', tinyFirstStep: 'Open the report.', followUpSteps: [], francoLine: '' } })
  const smaller = guestOnboardingReducer(draft, { type: 'TRANSITION', step: 'simplify', updates: { simplificationDepth: 1, simplificationStatus: 'idle' } })
  assert.equal(smaller.simplifiedTask, 'Open the report.')
  assert.equal(smaller.simplificationDepth, 1)
  const deepest = guestOnboardingReducer(smaller, { type: 'TRANSITION', step: 'simplify', updates: { simplificationDepth: 2, simplificationStatus: 'idle' } })
  assert.equal(deepest.simplificationDepth, 2)
})

test('Processing drafts recover without an automatic AI retry', () => {
  const draft = { ...preparedDraft(), simplificationStatus: 'processing' }
  const resumed = readStoredGuestDraft(storage(JSON.stringify(draft)))
  assert.equal(resumed.simplificationStatus, 'error')
  assert.equal(resumed.simplificationError, 'offline')
})

test('Guest endpoint is public but isolated from authenticated data', () => {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8')
  const fn = readFileSync(new URL('../supabase/functions/guest-first-win.ts', import.meta.url), 'utf8')
  assert.match(config, /\[functions\.guest-first-win\][\s\S]*verify_jwt\s*=\s*false/)
  assert.doesNotMatch(fn, /createClient|SUPABASE_SERVICE_ROLE_KEY|contextBuilder|authenticateCaller|\.from\(/)
  assert.match(fn, /GUEST_AI_ENABLED/)
  assert.match(fn, /reserveGuestGeneration/)
  assert.doesNotMatch(fn, /new Map\(|MAX_GENERATIONS_PER_FLOW/)
})

for (const result of results) console.log(`PASS: ${result}`)
console.log(`\n${results.length} Sprint 12C checks passed.`)
