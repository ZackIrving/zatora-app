export const GUEST_ONBOARDING_VERSION = 1
export const GUEST_ONBOARDING_STORAGE_KEY = 'zatora_guest_onboarding_v1'

const GUEST_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_GUEST_NAME_LENGTH = 60
export const MAX_GUEST_TASK_LENGTH = 500

const VALID_STEPS = new Set([
  'intro',
  'name',
  'support',
  'handoff',
  'task',
  'simplify',
  'commitment',
  'focus',
  'win',
  'den',
  'account',
])

export const SUPPORT_NEED_VALUES = [
  'getting_started',
  'staying_focused',
  'keeping_up',
  'consistency',
  'everything',
]

const VALID_SUPPORT_NEEDS = new Set(['', ...SUPPORT_NEED_VALUES])
const VALID_FOCUS_CHOICES = new Set(['not_selected', 'focus_15', 'later'])
const VALID_MIGRATION_STATUSES = new Set([
  'draft',
  'ready',
  'migrating',
  'migrated',
])

const LEGAL_TRANSITIONS = {
  intro: new Set(['name']),
  name: new Set(['intro', 'support']),
  support: new Set(['name', 'handoff']),
  handoff: new Set(['support', 'task']),
  task: new Set(['handoff', 'simplify']),
  simplify: new Set(['task']),
}

const ALLOWED_UPDATE_FIELDS = new Set([
  'name',
  'supportNeed',
  'firstTask',
  'simplifiedTask',
  'simplifyAttempts',
  'acceptedTask',
  'focusChoice',
  'focusStartedAt',
  'focusEndsAt',
  'focusCompleted',
  'completedFirstWin',
  'earnedStarterXP',
  'migrationIntent',
  'migrationStatus',
])

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

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
  return typeof value === 'string' && value.length <= maxLength
}

export function normalizeGuestName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidGuestName(value) {
  const name = normalizeGuestName(value)
  return name.length > 0 && name.length <= MAX_GUEST_NAME_LENGTH
}

export function isValidSupportNeed(value) {
  return SUPPORT_NEED_VALUES.includes(value)
}

export function normalizeGuestTask(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidGuestTask(value) {
  const task = normalizeGuestTask(value)
  return task.length > 0 && task.length <= MAX_GUEST_TASK_LENGTH
}

function isValidGuestDraftShape(draft, now = Date.now()) {
  if (!isPlainObject(draft)) return false
  if (draft.version !== GUEST_ONBOARDING_VERSION) return false
  if (!isValidId(draft.guestId) || !isValidId(draft.migrationId)) return false
  if (!isValidDate(draft.createdAt) || !isValidDate(draft.updatedAt)) return false
  if (!isValidDate(draft.expiresAt)) return false

  const createdAt = Date.parse(draft.createdAt)
  const updatedAt = Date.parse(draft.updatedAt)
  const expiresAt = Date.parse(draft.expiresAt)

  if (createdAt > updatedAt || updatedAt > now + 60000) return false
  if (expiresAt <= now || expiresAt > updatedAt + GUEST_DRAFT_TTL_MS + 60000) return false
  if (!VALID_STEPS.has(draft.step)) return false
  if (!isBoundedString(draft.name, MAX_GUEST_NAME_LENGTH)) return false
  if (!VALID_SUPPORT_NEEDS.has(draft.supportNeed)) return false
  if (!isBoundedString(draft.firstTask, MAX_GUEST_TASK_LENGTH)) return false
  if (!isBoundedString(draft.simplifiedTask, MAX_GUEST_TASK_LENGTH)) return false
  if (!Number.isInteger(draft.simplifyAttempts) || draft.simplifyAttempts < 0 || draft.simplifyAttempts > 2) return false
  if (typeof draft.acceptedTask !== 'boolean') return false
  if (!VALID_FOCUS_CHOICES.has(draft.focusChoice)) return false
  if (!isValidOptionalDate(draft.focusStartedAt) || !isValidOptionalDate(draft.focusEndsAt)) return false
  if (typeof draft.focusCompleted !== 'boolean') return false
  if (typeof draft.completedFirstWin !== 'boolean') return false
  if (!Number.isInteger(draft.earnedStarterXP) || draft.earnedStarterXP < 0 || draft.earnedStarterXP > 10000) return false
  if (typeof draft.migrationIntent !== 'boolean') return false
  if (!VALID_MIGRATION_STATUSES.has(draft.migrationStatus)) return false

  return true
}

function isCoherentAtStep(draft, step = draft.step) {
  if (step === 'intro' || step === 'name') return true
  if (step === 'support') return isValidGuestName(draft.name)
  const hasPersonalization =
    isValidGuestName(draft.name) && isValidSupportNeed(draft.supportNeed)

  if (step === 'handoff' || step === 'task') return hasPersonalization
  if (step === 'simplify') {
    return hasPersonalization && isValidGuestTask(draft.firstTask)
  }

  // Later Sprint 12 stages remain reserved but cannot be resumed yet.
  return false
}

export function getLatestCoherentStep(draft) {
  if (
    isValidGuestName(draft?.name) &&
    isValidSupportNeed(draft?.supportNeed) &&
    isValidGuestTask(draft?.firstTask)
  ) {
    return 'simplify'
  }

  if (isValidGuestName(draft?.name) && isValidSupportNeed(draft?.supportNeed)) {
    return 'handoff'
  }

  if (isValidGuestName(draft?.name)) return 'support'
  return 'name'
}

export function normalizeGuestDraft(draft, now = Date.now()) {
  if (!isValidGuestDraftShape(draft, now)) return null

  const latestCoherentStep = getLatestCoherentStep(draft)
  const hasLaterCompletedAnswer =
    (draft.step === 'intro' && isValidGuestName(draft.name)) ||
    (draft.step === 'name' && isValidGuestName(draft.name)) ||
    (draft.step === 'support' && isValidSupportNeed(draft.supportNeed)) ||
    (draft.step === 'handoff' && isValidGuestTask(draft.firstTask)) ||
    (draft.step === 'task' && isValidGuestTask(draft.firstTask))

  if (isCoherentAtStep(draft) && !hasLaterCompletedAnswer) return draft

  return {
    ...draft,
    step: latestCoherentStep,
  }
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
    simplifiedTask: '',
    simplifyAttempts: 0,
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

function withFreshLifetime(draft) {
  const now = new Date()

  return {
    ...draft,
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + GUEST_DRAFT_TTL_MS).toISOString(),
  }
}

function sanitizeUpdates(updates) {
  if (!isPlainObject(updates)) return {}

  return Object.fromEntries(
    Object.entries(updates).filter(([key]) => ALLOWED_UPDATE_FIELDS.has(key))
  )
}

export function canTransitionGuestOnboarding(fromStep, toStep) {
  return Boolean(LEGAL_TRANSITIONS[fromStep]?.has(toStep))
}

export function guestOnboardingReducer(state, action) {
  switch (action.type) {
    case 'START':
      return normalizeGuestDraft(state) || createGuestDraft()
    case 'START_OVER':
    case 'RESET':
      return null
    case 'RESUME': {
      const normalized = normalizeGuestDraft(state)
      return normalized ? withFreshLifetime(normalized) : null
    }
    case 'TRANSITION': {
      const current = isValidGuestDraft(state) ? state : normalizeGuestDraft(state)
      if (!current || !canTransitionGuestOnboarding(current.step, action.step)) {
        return state
      }

      const candidate = withFreshLifetime({
        ...current,
        ...sanitizeUpdates(action.updates),
        step: action.step,
      })

      return isValidGuestDraft(candidate) ? candidate : state
    }
    case 'SET_MIGRATION_INTENT': {
      const current = isValidGuestDraft(state) ? state : normalizeGuestDraft(state)
      if (!current || typeof action.value !== 'boolean') return state
      return withFreshLifetime({ ...current, migrationIntent: action.value })
    }
    default:
      return state
  }
}

export function removeStoredGuestDraft(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(GUEST_ONBOARDING_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function readStoredGuestDraft(
  storage = globalThis.localStorage,
  now = Date.now()
) {
  try {
    const storedDraft = storage?.getItem(GUEST_ONBOARDING_STORAGE_KEY)
    if (!storedDraft) return null

    const normalized = normalizeGuestDraft(JSON.parse(storedDraft), now)
    if (!normalized) {
      removeStoredGuestDraft(storage)
      return null
    }

    return normalized
  } catch {
    removeStoredGuestDraft(storage)
    return null
  }
}

export function persistGuestDraft(draft, storage = globalThis.localStorage) {
  if (!draft) {
    removeStoredGuestDraft(storage)
    return
  }

  try {
    storage?.setItem(GUEST_ONBOARDING_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // The in-memory guest experience remains usable when storage is unavailable.
  }
}

export function shouldClearGuestDraftAfterAuthentication(
  user,
  draft,
  isPasswordRecovery = false
) {
  return Boolean(user && draft && !draft.migrationIntent && !isPasswordRecovery)
}
