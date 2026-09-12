import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  GUEST_ONBOARDING_STORAGE_KEY,
  MAX_GUEST_TASK_LENGTH,
  createGuestDraft,
  guestOnboardingReducer,
  isValidGuestDraft,
  isValidGuestName,
  isValidGuestTask,
  normalizeGuestName,
  normalizeGuestTask,
  persistGuestDraft,
  readStoredGuestDraft,
  shouldClearGuestDraftAfterAuthentication,
} from '../src/hooks/guestOnboardingState.js'
import {
  DEFAULT_FIRST_TASK_PLACEHOLDER,
  getFirstTaskPlaceholder,
} from '../src/components/welcome/firstTaskPlaceholder.js'

const results = []

function test(name, run) {
  run()
  results.push(name)
}

function transition(state, step, updates = {}) {
  return guestOnboardingReducer(state, { type: 'TRANSITION', step, updates })
}

function createHandoffDraft() {
  const name = transition(createGuestDraft(), 'name')
  const support = transition(name, 'support', { name: 'Zack' })
  return transition(support, 'handoff', { supportNeed: 'staying_focused' })
}

function createMemoryStorage(value = null) {
  const entries = new Map()
  if (value !== null) entries.set(GUEST_ONBOARDING_STORAGE_KEY, value)

  return {
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null
    },
    setItem(key, nextValue) {
      entries.set(key, nextValue)
    },
    removeItem(key) {
      entries.delete(key)
    },
  }
}

test('Start creates a valid intro draft', () => {
  const draft = guestOnboardingReducer(null, { type: 'START' })
  assert.equal(draft.step, 'intro')
  assert.equal(isValidGuestDraft(draft), true)
})

test('intro → name is allowed', () => {
  const intro = createGuestDraft()
  assert.equal(transition(intro, 'name').step, 'name')
})

test('name → support requires a valid name', () => {
  const nameStep = transition(createGuestDraft(), 'name')
  assert.equal(transition(nameStep, 'support'), nameStep)
  assert.equal(transition(nameStep, 'support', { name: 'Zack' }).step, 'support')
})

test('support → handoff requires a valid support need', () => {
  const support = transition(transition(createGuestDraft(), 'name'), 'support', { name: 'Zack' })
  assert.equal(transition(support, 'handoff'), support)
  assert.equal(transition(support, 'handoff', { supportNeed: 'staying_focused' }).step, 'handoff')
})

test('handoff → task is legal only after valid personalization', () => {
  const handoff = createHandoffDraft()
  const task = transition(handoff, 'task')
  assert.equal(task.step, 'task')
  assert.equal(isValidGuestDraft(task), true)

  const intro = createGuestDraft()
  assert.equal(transition(intro, 'task'), intro)
  assert.equal(isValidGuestDraft({ ...intro, step: 'task' }), false)
})

test('First-task validation rejects empty and oversized values while preserving Unicode', () => {
  assert.equal(isValidGuestTask(''), false)
  assert.equal(isValidGuestTask('   '), false)
  assert.equal(isValidGuestTask('a'.repeat(MAX_GUEST_TASK_LENGTH + 1)), false)

  const unicodeTask = 'é'.repeat(MAX_GUEST_TASK_LENGTH)
  assert.equal(isValidGuestTask(unicodeTask), true)
  assert.equal(normalizeGuestTask(`  ${unicodeTask}  `), unicodeTask)
})

test('task → simplify requires and persists a normalized first task', () => {
  const task = transition(createHandoffDraft(), 'task')
  assert.equal(transition(task, 'simplify'), task)
  assert.equal(transition(task, 'simplify', { firstTask: '   ' }), task)

  const firstTask = normalizeGuestTask('  Study for CompTIA A+  ')
  const boundary = transition(task, 'simplify', { firstTask })
  assert.equal(boundary.step, 'simplify')
  assert.equal(boundary.firstTask, 'Study for CompTIA A+')
  assert.equal(isValidGuestDraft(boundary), true)
})

test('Back from the temporary boundary preserves firstTask', () => {
  const task = transition(createHandoffDraft(), 'task')
  const boundary = transition(task, 'simplify', { firstTask: 'File my taxes' })
  const backToTask = transition(boundary, 'task')
  const backToHandoff = transition(backToTask, 'handoff')

  assert.equal(backToTask.firstTask, 'File my taxes')
  assert.equal(backToHandoff.firstTask, 'File my taxes')
})

test('Arbitrary future-state jumps remain blocked at the 12C boundary', () => {
  const handoff = createHandoffDraft()
  const task = transition(handoff, 'task')
  assert.equal(transition(handoff, 'simplify', { firstTask: 'No jump' }), handoff)
  assert.equal(transition(task, 'focus', { firstTask: 'No jump' }), task)
})

test('A valid first task persists and resumes at the temporary boundary', () => {
  const task = transition(createHandoffDraft(), 'task')
  const boundary = transition(task, 'simplify', { firstTask: 'Book the appointment' })
  const storage = createMemoryStorage()
  persistGuestDraft(boundary, storage)

  const resumed = readStoredGuestDraft(storage)
  assert.equal(resumed.step, 'simplify')
  assert.equal(resumed.firstTask, 'Book the appointment')
})

test('Illegal forward jumps are rejected', () => {
  const intro = createGuestDraft()
  assert.equal(transition(intro, 'task'), intro)
  assert.equal(transition(intro, 'handoff', { name: 'Zack', supportNeed: 'everything' }), intro)
})

test('Back transitions preserve valid answers', () => {
  const support = transition(transition(createGuestDraft(), 'name'), 'support', { name: 'Zack' })
  const handoff = transition(support, 'handoff', { supportNeed: 'consistency' })
  const backToSupport = transition(handoff, 'support')
  const backToName = transition(backToSupport, 'name')
  assert.equal(backToSupport.supportNeed, 'consistency')
  assert.equal(backToName.name, 'Zack')
})

test('Malformed JSON is rejected and removed', () => {
  const storage = createMemoryStorage('{broken')
  assert.equal(readStoredGuestDraft(storage), null)
  assert.equal(storage.getItem(GUEST_ONBOARDING_STORAGE_KEY), null)
})

test('Expired drafts are rejected and removed', () => {
  const draft = createGuestDraft(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))
  const storage = createMemoryStorage(JSON.stringify(draft))
  assert.equal(readStoredGuestDraft(storage), null)
  assert.equal(storage.getItem(GUEST_ONBOARDING_STORAGE_KEY), null)
})

test('A 61-character name is rejected', () => {
  assert.equal(isValidGuestName('a'.repeat(61)), false)
})

test('A 60-character Unicode name is accepted without alteration', () => {
  const name = 'é'.repeat(60)
  assert.equal(isValidGuestName(name), true)
  assert.equal(normalizeGuestName(`  ${name}  `), name)
})

test('An invalid support enum is rejected', () => {
  const support = transition(transition(createGuestDraft(), 'name'), 'support', { name: 'Zack' })
  assert.equal(transition(support, 'handoff', { supportNeed: 'something_else' }), support)
})

test('Resume normalizes reserved future steps to the latest coherent implemented step', () => {
  const base = createGuestDraft()
  const cases = [
    [{ ...base, step: 'task' }, 'name'],
    [{ ...base, step: 'focus', name: 'Zack' }, 'support'],
    [{ ...base, step: 'den', name: 'Zack', supportNeed: 'everything' }, 'handoff'],
    [{ ...base, step: 'den', name: 'Zack', supportNeed: 'everything', firstTask: 'Start the report' }, 'simplify'],
    [{ ...base, step: 'name', name: 'Zack' }, 'support'],
    [{ ...base, step: 'support', name: 'Zack', supportNeed: 'everything' }, 'handoff'],
    [{ ...base, step: 'task', name: 'Zack', supportNeed: 'everything', firstTask: 'Start the report' }, 'simplify'],
  ]

  for (const [draft, expectedStep] of cases) {
    const storage = createMemoryStorage(JSON.stringify(draft))
    assert.equal(readStoredGuestDraft(storage)?.step, expectedStep)
  }
})

test('Start Over clears the full draft and persisted storage', () => {
  const storage = createMemoryStorage()
  const draft = createGuestDraft()
  persistGuestDraft(draft, storage)
  const cleared = guestOnboardingReducer(draft, { type: 'START_OVER' })
  persistGuestDraft(cleared, storage)
  assert.equal(cleared, null)
  assert.equal(storage.getItem(GUEST_ONBOARDING_STORAGE_KEY), null)
})

test('Failed authentication does not clear a guest draft', () => {
  assert.equal(shouldClearGuestDraftAfterAuthentication(null, createGuestDraft()), false)
})

test('Successful direct authentication clears a guest draft', () => {
  const draft = createGuestDraft()
  assert.equal(shouldClearGuestDraftAfterAuthentication({ id: 'user-1' }, draft), true)
  assert.equal(guestOnboardingReducer(draft, { type: 'RESET' }), null)
})

test('Future migration-intent drafts survive authentication', () => {
  const draft = { ...createGuestDraft(), migrationIntent: true }
  assert.equal(shouldClearGuestDraftAfterAuthentication({ id: 'user-1' }, draft), false)
})

test('Password recovery does not clear a guest draft', () => {
  const draft = createGuestDraft()
  assert.equal(
    shouldClearGuestDraftAfterAuthentication({ id: 'user-1' }, draft, true),
    false
  )
})

test('Authenticated users cannot render WelcomeExperience', () => {
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const loggedOutBranch = appSource.indexOf('if (!auth.user)')
  const welcomeRender = appSource.indexOf('<WelcomeExperience', loggedOutBranch)
  const authenticatedRender = appSource.indexOf('<AuthenticatedApp', welcomeRender)
  assert.ok(loggedOutBranch >= 0 && welcomeRender > loggedOutBranch)
  assert.ok(authenticatedRender > welcomeRender)
})

test('The handoff CTA and native first-task form render without a generic Continue button', () => {
  const welcomeSource = readFileSync(
    new URL('../src/components/welcome/WelcomeExperience.jsx', import.meta.url),
    'utf8'
  )

  assert.match(welcomeSource, /Let&apos;s do it/)
  assert.match(welcomeSource, /onSubmit={submitFirstTask}/)
  assert.match(welcomeSource, /Help me start/)
  assert.doesNotMatch(welcomeSource, />Continue</)
})

test('First-task submission has no network, Supabase, or function invocation path', () => {
  const welcomeSource = readFileSync(
    new URL('../src/components/welcome/WelcomeExperience.jsx', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(welcomeSource, /\bfetch\s*\(/)
  assert.doesNotMatch(welcomeSource, /supabase/i)
  assert.doesNotMatch(welcomeSource, /\.invoke\s*\(/)
  assert.match(welcomeSource, /No AI request has run/)
})

test('getting_started resolves to its personalized first-task placeholder', () => {
  assert.equal(
    getFirstTaskPlaceholder('getting_started'),
    "e.g. Start the project I've been putting off"
  )
})

test('staying_focused resolves to its personalized first-task placeholder', () => {
  assert.equal(
    getFirstTaskPlaceholder('staying_focused'),
    'e.g. Finish the report I keep getting distracted from'
  )
})

test('keeping_up resolves to its personalized first-task placeholder', () => {
  assert.equal(
    getFirstTaskPlaceholder('keeping_up'),
    "e.g. Catch up on the emails I've been avoiding"
  )
})

test('consistency resolves to its personalized first-task placeholder', () => {
  assert.equal(
    getFirstTaskPlaceholder('consistency'),
    'e.g. Get back into my workout routine'
  )
})

test('everything resolves to the generic first-task placeholder', () => {
  assert.equal(
    getFirstTaskPlaceholder('everything'),
    "e.g. Tackle the thing that's been hanging over me"
  )
})

test('Missing or unexpected support needs use the safe placeholder fallback', () => {
  assert.equal(getFirstTaskPlaceholder(), DEFAULT_FIRST_TASK_PLACEHOLDER)
  assert.equal(
    getFirstTaskPlaceholder('unexpected_value'),
    DEFAULT_FIRST_TASK_PLACEHOLDER
  )
})

for (const result of results) console.log(`PASS: ${result}`)
console.log(`\n${results.length} Sprint 12B/12C-boundary checks passed.`)
