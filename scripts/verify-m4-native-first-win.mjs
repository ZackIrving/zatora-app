import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createGuestDraft,
  guestOnboardingReducer,
  STARTER_XP,
} from '../shared/guest/guestOnboardingDomain.js'
import {
  MAX_SIMPLIFICATION_DEPTH,
  buildGuestFirstWinRequest,
  createDeterministicFallback,
  isValidGuestFirstWinResult,
} from '../shared/guest/firstWinContract.js'

const root = process.cwd()
const read = (relative) => readFile(path.join(root, relative), 'utf8')
const checks = []
const check = (name, condition) => {
  assert.ok(condition, name)
  checks.push(name)
}

const onboarding = await read('mobile/src/app/(guest)/onboarding.tsx')
const provider = await read('mobile/src/guest/GuestOnboardingProvider.tsx')
const service = await read('mobile/src/guest/guestFirstWinService.ts')
const storage = await read('mobile/src/guest/guestStorage.ts')

const now = new Date('2026-01-01T12:00:00.000Z')
const transition = (state, step, updates = {}) => guestOnboardingReducer(state, { type: 'TRANSITION', step, updates }, now)
let draft = createGuestDraft(now)
draft = transition(draft, 'name', { name: 'Founder' })
draft = transition(draft, 'support', { name: 'Founder' })
draft = transition(draft, 'handoff', { supportNeed: 'getting_started' })
draft = transition(draft, 'task', { firstTask: 'Start the report' })
draft = transition(draft, 'simplify')
draft = guestOnboardingReducer(draft, { type: 'FALLBACK_SIMPLIFICATION' }, now)
draft = guestOnboardingReducer(draft, { type: 'ACCEPT_TASK' }, now)
const stillWorking = guestOnboardingReducer(draft, { type: 'STILL_WORKING' }, now)
const win = guestOnboardingReducer(stillWorking, { type: 'COMPLETE_FIRST_WIN' }, now)
const replay = guestOnboardingReducer(win, { type: 'COMPLETE_FIRST_WIN' }, now)

check('native flow exposes the M4 action sequence', ['Help me start', 'Start with this', 'Make it even smaller', 'Still working', 'I did it', 'FIRST WIN', '+25 XP'].every((label) => onboarding.includes(label)))
check('native flow has bounded depth control', onboarding.includes('simplificationDepth < 2') && onboarding.includes('simplificationDepth + 1'))
check('result hierarchy distinguishes context from the action', onboarding.includes('YOUR TASK') && onboarding.includes('START HERE') && onboarding.includes('taskContext') && onboarding.includes('resultCard'))
check('win copy is completion-specific and user-facing', onboarding.includes('You started. That counts.') && !onboarding.includes('onboarding milestone'))
check('native provider owns shared reducer actions', ['REQUEST_SIMPLIFICATION', 'APPLY_SIMPLIFICATION', 'ACCEPT_TASK', 'STILL_WORKING', 'COMPLETE_FIRST_WIN'].every((action) => provider.includes(action)))
check('local service is an explicit M5 seam', service.includes('requestDeterministicFirstWin') && service.includes('M5') && service.includes('createDeterministicFallback'))
check('local service does not call a provider or Edge Function', !/fetch\s*\(|functions\.invoke|OPENAI|supabase/i.test(service))
check('native persistence remains AsyncStorage-backed', storage.includes('@react-native-async-storage/async-storage') && storage.includes('zatora_native_guest_onboarding_v2'))
const founderTask = 'Study for CompTIA A+ for 30 minutes'
const depthResults = [0, 1, 2].reduce((results, depth) => {
  const task = depth === 0 ? founderTask : results[depth - 1].tinyFirstStep
  const request = buildGuestFirstWinRequest({ task, supportNeed: 'getting_started', simplificationDepth: depth })
  assert.ok(request)
  const result = createDeterministicFallback(request.task, request.simplificationDepth)
  assert.equal(isValidGuestFirstWinResult(result, depth), true)
  assert.ok(result.tinyFirstStep.length > 0)
  results.push(result)
  return results
}, [])
check('Founder task no longer echoes the original text', depthResults[0].tinyFirstStep !== founderTask)
check('Founder task progresses observably through depth 0 to 2', new Set(depthResults.map((result) => result.tinyFirstStep)).size === 3)
check('Depth 2 is terminal with no depth 3 path', MAX_SIMPLIFICATION_DEPTH === 2 && !onboarding.includes('simplificationDepth + 3'))
for (const task of ['Write a project update', 'Clean the kitchen counter', 'Schedule a dentist appointment']) {
  const first = createDeterministicFallback(task, 0)
  const second = createDeterministicFallback(first.tinyFirstStep, 1)
  assert.notEqual(first.tinyFirstStep, task)
  assert.notEqual(second.tinyFirstStep, first.tinyFirstStep)
}
check('Generic task shapes receive deterministic non-echoing steps', true)
check('Still working preserves commitment and awards no XP', stillWorking.step === 'commitment' && stillWorking.earnedStarterXP === 0 && !stillWorking.completedFirstWin)
check('completion awards exactly 25 XP', win.step === 'win' && win.earnedStarterXP === STARTER_XP && win.earnedStarterXP === 25)
check('completion is idempotent', JSON.stringify(replay) === JSON.stringify(win))

console.log(`M4 native First Win verification passed: ${checks.length} checks`)
