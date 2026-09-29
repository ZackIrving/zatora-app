import {
  MAX_GUEST_TASK_LENGTH,
  MAX_FOLLOW_UP_LENGTH,
  MAX_SIMPLIFICATION_DEPTH,
  MAX_SIMPLIFIED_TASK_LENGTH,
  SUPPORT_NEED_VALUES,
  isValidGuestFirstWinResult,
  isValidGuestTask,
  normalizeGuestTask,
  createDeterministicFallback,
} from './firstWinContract.js'

export const GUEST_ONBOARDING_VERSION = 2
export const MAX_GUEST_NAME_LENGTH = 60
export const STARTER_XP = 25

const GUEST_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const VALID_STEPS = new Set(['intro', 'name', 'support', 'handoff', 'task', 'simplify', 'commitment', 'focus', 'win', 'den', 'account'])
const VALID_SUPPORT_NEEDS = new Set(['', ...SUPPORT_NEED_VALUES])
const VALID_FOCUS_CHOICES = new Set(['not_selected', 'focus_15', 'later'])
const VALID_MIGRATION_STATUSES = new Set(['draft', 'ready', 'migrating', 'migrated'])
const VALID_SIMPLIFICATION_STATUSES = new Set(['idle', 'processing', 'available', 'error'])
const VALID_SIMPLIFICATION_ERRORS = new Set(['timeout', 'provider', 'rate_limited', 'invalid_response', 'offline', 'feature_disabled', null])
const LEGAL_TRANSITIONS = {
  intro: new Set(['name']),
  name: new Set(['intro', 'support']),
  support: new Set(['name', 'handoff']),
  handoff: new Set(['support', 'task']),
  task: new Set(['handoff', 'simplify']),
  simplify: new Set(['task', 'simplify', 'commitment']),
  commitment: new Set(['simplify', 'win']),
  win: new Set(['simplify']),
}
const ALLOWED_UPDATE_FIELDS = new Set(['name', 'supportNeed', 'firstTask', 'simplificationStatus', 'simplificationDepth', 'simplifiedTask', 'followUpSteps', 'francoLine', 'acknowledgement', 'simplificationError', 'acceptedTask', 'focusChoice', 'focusStartedAt', 'focusEndsAt', 'focusCompleted', 'completedFirstWin', 'earnedStarterXP', 'migrationIntent', 'migrationStatus'])

export { MAX_FOLLOW_UP_LENGTH, MAX_GUEST_TASK_LENGTH, MAX_SIMPLIFICATION_DEPTH, MAX_SIMPLIFIED_TASK_LENGTH, SUPPORT_NEED_VALUES, isValidGuestFirstWinResult, isValidGuestTask, normalizeGuestTask, createDeterministicFallback }

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isValidDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isValidOptionalDate(value) {
  return value === null || isValidDate(value)
}

function isValidId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 100
}

function isBoundedString(value, maxLength) {
  return typeof value === 'string' && Array.from(value).length <= maxLength
}

export function normalizeGuestName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidGuestName(value) {
  const name = normalizeGuestName(value)
  return name.length > 0 && Array.from(name).length <= MAX_GUEST_NAME_LENGTH
}

export function isValidSupportNeed(value) {
  return SUPPORT_NEED_VALUES.includes(value)
}

function isValidFollowUpSteps(value, depth) {
  const limit = Math.min(2, Math.max(0, MAX_SIMPLIFICATION_DEPTH - depth))
  return Array.isArray(value) && value.length <= limit && value.every((item) => typeof item === 'string' && item.trim().length > 0 && Array.from(item).length <= MAX_FOLLOW_UP_LENGTH)
}

function isValidGuestDraftShape(draft, now = Date.now()) {
  if (!isPlainObject(draft) || draft.version !== GUEST_ONBOARDING_VERSION) return false
  if (!isValidId(draft.guestId) || !isValidId(draft.migrationId)) return false
  if (!isValidDate(draft.createdAt) || !isValidDate(draft.updatedAt) || !isValidDate(draft.expiresAt)) return false
  const createdAt = Date.parse(draft.createdAt)
  const updatedAt = Date.parse(draft.updatedAt)
  const expiresAt = Date.parse(draft.expiresAt)
  if (createdAt > updatedAt || updatedAt > now + 60000) return false
  if (expiresAt <= now || expiresAt > updatedAt + GUEST_DRAFT_TTL_MS + 60000) return false
  if (!VALID_STEPS.has(draft.step) || !isBoundedString(draft.name, MAX_GUEST_NAME_LENGTH)) return false
  if (!VALID_SUPPORT_NEEDS.has(draft.supportNeed) || !isBoundedString(draft.firstTask, 500)) return false
  if (!VALID_SIMPLIFICATION_STATUSES.has(draft.simplificationStatus)) return false
  if (!Number.isInteger(draft.simplificationDepth) || draft.simplificationDepth < 0 || draft.simplificationDepth > MAX_SIMPLIFICATION_DEPTH) return false
  if (!isBoundedString(draft.simplifiedTask, MAX_SIMPLIFIED_TASK_LENGTH) || !isValidFollowUpSteps(draft.followUpSteps, draft.simplificationDepth)) return false
  if (!isBoundedString(draft.francoLine, 160) || !isBoundedString(draft.acknowledgement, 180)) return false
  if (!VALID_SIMPLIFICATION_ERRORS.has(draft.simplificationError) || typeof draft.acceptedTask !== 'boolean') return false
  if (!VALID_FOCUS_CHOICES.has(draft.focusChoice) || !isValidOptionalDate(draft.focusStartedAt) || !isValidOptionalDate(draft.focusEndsAt)) return false
  if (typeof draft.focusCompleted !== 'boolean' || typeof draft.completedFirstWin !== 'boolean') return false
  if (!Number.isInteger(draft.earnedStarterXP) || draft.earnedStarterXP < 0 || draft.earnedStarterXP > STARTER_XP) return false
  if (typeof draft.migrationIntent !== 'boolean' || !VALID_MIGRATION_STATUSES.has(draft.migrationStatus)) return false
  if (draft.simplificationStatus === 'available' && !isValidGuestTask(draft.simplifiedTask)) return false
  if (draft.acceptedTask && !isValidGuestTask(draft.simplifiedTask)) return false
  if (draft.completedFirstWin && (!draft.acceptedTask || draft.earnedStarterXP !== STARTER_XP || !['win', 'den', 'account'].includes(draft.step))) return false
  return true
}

function isCoherentAtStep(draft, step = draft.step) {
  if (step === 'intro' || step === 'name') return true
  if (step === 'support') return isValidGuestName(draft.name)
  const hasPersonalization = isValidGuestName(draft.name) && isValidSupportNeed(draft.supportNeed)
  if (step === 'handoff' || step === 'task') return hasPersonalization
  if (step === 'simplify') return hasPersonalization && isValidGuestTask(draft.firstTask)
  if (step === 'commitment') return hasPersonalization && draft.acceptedTask && isValidGuestTask(draft.simplifiedTask)
  if (step === 'win') return draft.completedFirstWin && draft.acceptedTask && draft.earnedStarterXP === STARTER_XP
  return false
}

export function getLatestCoherentStep(draft) {
  if (draft?.completedFirstWin && draft.acceptedTask && draft.earnedStarterXP === STARTER_XP) return 'win'
  if (draft?.acceptedTask && isValidGuestTask(draft.simplifiedTask)) return 'commitment'
  if (isValidGuestName(draft?.name) && isValidSupportNeed(draft?.supportNeed) && isValidGuestTask(draft?.firstTask)) return 'simplify'
  if (isValidGuestName(draft?.name) && isValidSupportNeed(draft?.supportNeed)) return 'handoff'
  if (isValidGuestName(draft?.name)) return 'support'
  return 'name'
}

export function migrateV1Draft(draft, now = Date.now()) {
  if (!isPlainObject(draft) || draft.version !== 1 || !isValidId(draft.guestId) || !isValidId(draft.migrationId)) return null
  return normalizeGuestDraft({
    ...draft,
    version: GUEST_ONBOARDING_VERSION,
    simplificationStatus: draft.simplifiedTask ? 'available' : 'idle',
    simplificationDepth: Math.min(MAX_SIMPLIFICATION_DEPTH, Number(draft.simplifyAttempts) || 0),
    followUpSteps: [],
    francoLine: '',
    acknowledgement: '',
    simplificationError: null,
  }, now)
}

export function normalizeGuestDraft(draft, now = Date.now(), recoverProcessing = true) {
  if (!isValidGuestDraftShape(draft, now)) return null
  if (recoverProcessing && draft.simplificationStatus === 'processing') draft = { ...draft, simplificationStatus: 'error', simplificationError: 'offline' }
  const latestCoherentStep = getLatestCoherentStep(draft)
  const hasLaterCompletedAnswer =
    (draft.step === 'intro' && isValidGuestName(draft.name)) ||
    (draft.step === 'name' && isValidGuestName(draft.name)) ||
    (draft.step === 'support' && isValidSupportNeed(draft.supportNeed)) ||
    (draft.step === 'handoff' && isValidGuestTask(draft.firstTask)) ||
    (draft.step === 'task' && isValidGuestTask(draft.firstTask))
  if (isCoherentAtStep(draft) && !hasLaterCompletedAnswer) return draft
  return { ...draft, step: latestCoherentStep }
}

export function isValidGuestDraft(draft, now = Date.now()) {
  return isValidGuestDraftShape(draft, now) && isCoherentAtStep(draft)
}

export function createGuestDraft(now = new Date()) {
  return {
    version: GUEST_ONBOARDING_VERSION,
    guestId: createId(),
    migrationId: createId(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + GUEST_DRAFT_TTL_MS).toISOString(),
    step: 'intro',
    name: '',
    supportNeed: '',
    firstTask: '',
    simplificationStatus: 'idle',
    simplificationDepth: 0,
    simplifiedTask: '',
    followUpSteps: [],
    francoLine: '',
    acknowledgement: '',
    simplificationError: null,
    acceptedTask: false,
    focusChoice: 'not_selected',
    focusStartedAt: null,
    focusEndsAt: null,
    focusCompleted: false,
    completedFirstWin: false,
    earnedStarterXP: 0,
    migrationIntent: false,
    migrationStatus: 'draft',
  }
}

function withFreshLifetime(draft, now = new Date()) {
  return { ...draft, updatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + GUEST_DRAFT_TTL_MS).toISOString() }
}

function sanitizeUpdates(updates) {
  if (!isPlainObject(updates)) return {}
  return Object.fromEntries(Object.entries(updates).filter(([key]) => ALLOWED_UPDATE_FIELDS.has(key)))
}

export function canTransitionGuestOnboarding(fromStep, toStep) {
  return Boolean(LEGAL_TRANSITIONS[fromStep]?.has(toStep))
}

export function guestOnboardingReducer(state, action, now = new Date()) {
  switch (action.type) {
    case 'START': return normalizeGuestDraft(state, now.getTime()) || createGuestDraft(now)
    case 'START_OVER':
    case 'RESET': return null
    case 'RESUME': {
      const normalized = normalizeGuestDraft(state, now.getTime())
      return normalized ? withFreshLifetime(normalized, now) : null
    }
    case 'RESTORE': {
      const normalized = normalizeGuestDraft(action.draft, now.getTime())
      return normalized ? withFreshLifetime(normalized, now) : null
    }
    case 'TRANSITION': {
      const current = isValidGuestDraft(state, now.getTime()) ? state : normalizeGuestDraft(state, now.getTime())
      if (!current || !canTransitionGuestOnboarding(current.step, action.step)) return state
      const candidate = withFreshLifetime({ ...current, ...sanitizeUpdates(action.updates), step: action.step }, now)
      return isValidGuestDraft(candidate, now.getTime()) ? candidate : state
    }
    case 'REQUEST_SIMPLIFICATION': {
      const current = normalizeGuestDraft(state, now.getTime(), false)
      if (!current || current.step !== 'simplify' || current.simplificationStatus === 'processing' || current.simplificationDepth > MAX_SIMPLIFICATION_DEPTH) return state
      return withFreshLifetime({ ...current, simplificationStatus: 'processing', simplificationError: null }, now)
    }
    case 'APPLY_SIMPLIFICATION': {
      const current = normalizeGuestDraft(state, now.getTime(), false)
      if (!current || current.simplificationStatus !== 'processing' || !isValidGuestFirstWinResult(action.result, current.simplificationDepth)) return state
      const result = action.result
      return withFreshLifetime({
        ...current,
        simplificationStatus: 'available',
        simplifiedTask: result.tinyFirstStep.trim(),
        followUpSteps: result.followUpSteps.map((item) => item.trim()),
        acknowledgement: isBoundedString(result.acknowledgement, 180) ? result.acknowledgement : '',
        francoLine: isBoundedString(result.francoLine, 160) ? result.francoLine : '',
        simplificationError: null,
      }, now)
    }
    case 'SIMPLIFICATION_ERROR': {
      const current = normalizeGuestDraft(state, now.getTime())
      const error = VALID_SIMPLIFICATION_ERRORS.has(action.error) ? action.error : 'provider'
      return current ? withFreshLifetime({ ...current, simplificationStatus: 'error', simplificationError: error }, now) : state
    }
    case 'FALLBACK_SIMPLIFICATION': {
      const current = normalizeGuestDraft(state, now.getTime())
      if (!current || !isValidGuestTask(current.firstTask)) return state
      const fallbackInput = current.simplificationDepth === 0 ? current.firstTask : current.simplifiedTask
      const fallback = createDeterministicFallback(fallbackInput, current.simplificationDepth)
      return withFreshLifetime({
        ...current,
        simplificationStatus: 'available',
        simplifiedTask: fallback.tinyFirstStep,
        followUpSteps: fallback.followUpSteps,
        acknowledgement: fallback.acknowledgement,
        francoLine: fallback.francoLine,
        simplificationError: null,
      }, now)
    }
    case 'ACCEPT_TASK': {
      const current = normalizeGuestDraft(state, now.getTime())
      if (!current || current.simplificationStatus !== 'available' || !isValidGuestTask(current.simplifiedTask)) return state
      return withFreshLifetime({ ...current, acceptedTask: true, step: 'commitment' }, now)
    }
    case 'STILL_WORKING': {
      const current = normalizeGuestDraft(state, now.getTime())
      // Staying with the chosen step is intentionally a persistence-only
      // action: it never completes the win, awards XP, or invokes a service.
      return current && current.step === 'commitment' ? current : state
    }
    case 'COMPLETE_FIRST_WIN': {
      const current = normalizeGuestDraft(state, now.getTime())
      if (!current || current.step !== 'commitment' || !current.acceptedTask || current.completedFirstWin) return state
      return withFreshLifetime({ ...current, completedFirstWin: true, earnedStarterXP: STARTER_XP, step: 'win' }, now)
    }
    case 'SET_MIGRATION_INTENT': {
      const current = isValidGuestDraft(state, now.getTime()) ? state : normalizeGuestDraft(state, now.getTime())
      if (!current || typeof action.value !== 'boolean') return state
      return withFreshLifetime({ ...current, migrationIntent: action.value }, now)
    }
    default: return state
  }
}

export function shouldClearGuestDraftAfterAuthentication(user, draft, isPasswordRecovery = false) {
  return Boolean(user && draft && !draft.migrationIntent && !isPasswordRecovery)
}
