import assert from 'node:assert/strict'
import {
  GUEST_ONBOARDING_VERSION,
  MAX_SIMPLIFICATION_DEPTH,
  STARTER_XP,
  createGuestDraft,
  guestOnboardingReducer,
  isValidGuestFirstWinResult,
  migrateV1Draft,
  normalizeGuestDraft,
} from '../shared/guest/guestOnboardingDomain.js'
import { buildGuestFirstWinRequest } from '../shared/guest/firstWinContract.js'

const now = new Date('2026-01-01T12:00:00.000Z')
const results = []

function test(name, run) {
  run()
  results.push(name)
}

function transition(state, step, updates = {}) {
  return guestOnboardingReducer(state, { type: 'TRANSITION', step, updates }, now)
}

function preparedDraft() {
  let draft = createGuestDraft(now)
  draft = transition(draft, 'name', { name: 'Zack' })
  draft = transition(draft, 'support', { name: 'Zack' })
  draft = transition(draft, 'handoff', { supportNeed: 'getting_started' })
  draft = transition(draft, 'task', { firstTask: 'Start the report' })
  return transition(draft, 'simplify')
}

function availableDraft() {
  const processing = guestOnboardingReducer(preparedDraft(), { type: 'REQUEST_SIMPLIFICATION' }, now)
  return guestOnboardingReducer(processing, {
    type: 'APPLY_SIMPLIFICATION',
    result: {
      acknowledgement: 'Good start.',
      tinyFirstStep: 'Open the report.',
      followUpSteps: ['Find the first section.'],
      francoLine: 'One small step.',
    },
  }, now)
}

test('Initial state is schema version 2', () => {
  const draft = createGuestDraft(now)
  assert.equal(draft.version, GUEST_ONBOARDING_VERSION)
  assert.equal(draft.step, 'intro')
  assert.equal(draft.earnedStarterXP, 0)
})

test('Version 1 migration preserves identity and produces version 2', () => {
  const legacy = createGuestDraft(now)
  const migrated = migrateV1Draft({ ...legacy, version: 1, simplifyAttempts: 1, simplifiedTask: 'Open the report.' }, now.getTime())
  assert.equal(migrated.version, 2)
  assert.equal(migrated.guestId, legacy.guestId)
  assert.equal(migrated.migrationId, legacy.migrationId)
  assert.equal(migrated.simplificationStatus, 'available')
})

test('Simplification depth advances from 0 to 1 to 2', () => {
  let draft = availableDraft()
  draft = transition(draft, 'simplify', { simplificationDepth: 1, simplificationStatus: 'idle', followUpSteps: [] })
  draft = transition(draft, 'simplify', { simplificationDepth: 2, simplificationStatus: 'idle', followUpSteps: [] })
  assert.equal(draft.simplificationDepth, 2)
})

test('Depth greater than 2 cannot become a valid next generation', () => {
  const draft = availableDraft()
  const next = transition(draft, 'simplify', { simplificationDepth: MAX_SIMPLIFICATION_DEPTH + 1, simplificationStatus: 'idle' })
  assert.deepEqual(next, draft)
})

test('Valid AI result is accepted at the current depth', () => {
  assert.equal(isValidGuestFirstWinResult({ tinyFirstStep: 'Open the report.', followUpSteps: [] }, 0), true)
  assert.equal(availableDraft().simplificationStatus, 'available')
})

test('Malformed AI result is rejected without changing state', () => {
  const processing = guestOnboardingReducer(preparedDraft(), { type: 'REQUEST_SIMPLIFICATION' }, now)
  const unchanged = guestOnboardingReducer(processing, { type: 'APPLY_SIMPLIFICATION', result: { tinyFirstStep: '', followUpSteps: ['not allowed', 'too much'] } }, now)
  assert.deepEqual(unchanged, processing)
})

test('Deterministic fallback creates an available result without AI', () => {
  const fallback = guestOnboardingReducer(preparedDraft(), { type: 'FALLBACK_SIMPLIFICATION' }, now)
  assert.equal(fallback.simplificationStatus, 'available')
  assert.equal(fallback.simplifiedTask, 'Start the report')
  assert.deepEqual(fallback.followUpSteps, [])
})

test('Commitment transition requires an available result', () => {
  const commitment = guestOnboardingReducer(availableDraft(), { type: 'ACCEPT_TASK' }, now)
  assert.equal(commitment.step, 'commitment')
  assert.equal(commitment.acceptedTask, true)
})

test('Still working does not complete the First Win', () => {
  const commitment = guestOnboardingReducer(availableDraft(), { type: 'ACCEPT_TASK' }, now)
  const stillWorking = guestOnboardingReducer(commitment, { type: 'STILL_WORKING' }, now)
  assert.equal(stillWorking.completedFirstWin, false)
  assert.equal(stillWorking.earnedStarterXP, 0)
  assert.equal(stillWorking.step, 'commitment')
})

test('Completion awards exactly 25 XP', () => {
  const commitment = guestOnboardingReducer(availableDraft(), { type: 'ACCEPT_TASK' }, now)
  const win = guestOnboardingReducer(commitment, { type: 'COMPLETE_FIRST_WIN' }, now)
  assert.equal(win.step, 'win')
  assert.equal(win.earnedStarterXP, STARTER_XP)
  assert.equal(win.earnedStarterXP, 25)
})

test('Repeated completion is idempotent', () => {
  const commitment = guestOnboardingReducer(availableDraft(), { type: 'ACCEPT_TASK' }, now)
  const win = guestOnboardingReducer(commitment, { type: 'COMPLETE_FIRST_WIN' }, now)
  assert.deepEqual(guestOnboardingReducer(win, { type: 'COMPLETE_FIRST_WIN' }, now), win)
})

test('Win state survives normalization and resume', () => {
  const commitment = guestOnboardingReducer(availableDraft(), { type: 'ACCEPT_TASK' }, now)
  const win = guestOnboardingReducer(commitment, { type: 'COMPLETE_FIRST_WIN' }, now)
  assert.equal(normalizeGuestDraft(win, now.getTime()).step, 'win')
  assert.equal(guestOnboardingReducer(win, { type: 'RESUME' }, now).step, 'win')
})

test('Processing resumes as recovery and does not retry automatically', () => {
  const processing = guestOnboardingReducer(preparedDraft(), { type: 'REQUEST_SIMPLIFICATION' }, now)
  const resumed = normalizeGuestDraft(processing, now.getTime())
  assert.equal(resumed.simplificationStatus, 'error')
  assert.equal(resumed.simplificationError, 'offline')
})

test('Request payload construction stays bounded and platform-neutral', () => {
  assert.deepEqual(buildGuestFirstWinRequest({ task: '  Start the report  ', supportNeed: 'getting_started', simplificationDepth: 2 }), {
    task: 'Start the report',
    supportNeed: 'getting_started',
    simplificationDepth: 2,
  })
  assert.equal(buildGuestFirstWinRequest({ task: 'Start', supportNeed: 'invalid', simplificationDepth: 0 }), null)
})

for (const result of results) console.log(`PASS: ${result}`)
console.log(`\n${results.length} M1 shared-domain checks passed.`)
