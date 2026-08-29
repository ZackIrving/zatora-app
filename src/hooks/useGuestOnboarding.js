import { useCallback, useEffect, useReducer } from 'react'

export const GUEST_ONBOARDING_VERSION = 1
export const GUEST_ONBOARDING_STORAGE_KEY = 'zatora_guest_onboarding_v1'

const GUEST_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_NAME_LENGTH = 80
const MAX_TASK_LENGTH = 500

const VALID_STEPS = new Set([
  'intro',
  'name',
  'support',
  'task',
  'simplify',
  'commitment',
  'focus',
  'win',
  'den',
  'account',
])

const VALID_SUPPORT_NEEDS = new Set([
  '',
  'getting_started',
  'staying_focused',
  'keeping_up',
  'consistency',
  'everything',
])

const VALID_FOCUS_CHOICES = new Set([
  'not_selected',
  'focus_15',
  'later',
])

const VALID_MIGRATION_STATUSES = new Set([
  'draft',
  'ready',
  'migrating',
  'migrated',
])

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

function isValidGuestDraft(draft, now = Date.now()) {
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
  if (!isBoundedString(draft.name, MAX_NAME_LENGTH)) return false
  if (!VALID_SUPPORT_NEEDS.has(draft.supportNeed)) return false
  if (!isBoundedString(draft.firstTask, MAX_TASK_LENGTH)) return false
  if (!isBoundedString(draft.simplifiedTask, MAX_TASK_LENGTH)) return false
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

function removeStoredDraft() {
  try {
    localStorage.removeItem(GUEST_ONBOARDING_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function readStoredDraft() {
  try {
    const storedDraft = localStorage.getItem(GUEST_ONBOARDING_STORAGE_KEY)
    if (!storedDraft) return null

    const parsedDraft = JSON.parse(storedDraft)
    if (!isValidGuestDraft(parsedDraft)) {
      removeStoredDraft()
      return null
    }

    return parsedDraft
  } catch {
    removeStoredDraft()
    return null
  }
}

function createGuestDraft() {
  const now = new Date()

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

function guestOnboardingReducer(state, action) {
  switch (action.type) {
    case 'START':
      return state && isValidGuestDraft(state) ? state : createGuestDraft()
    case 'START_OVER':
      return createGuestDraft()
    case 'RESUME':
      return state && isValidGuestDraft(state) ? withFreshLifetime(state) : null
    case 'RESET':
      return null
    case 'TRANSITION': {
      if (!state || !VALID_STEPS.has(action.step)) return state

      const candidate = withFreshLifetime({
        ...state,
        ...sanitizeUpdates(action.updates),
        step: action.step,
      })

      return isValidGuestDraft(candidate) ? candidate : state
    }
    case 'SET_MIGRATION_INTENT': {
      if (!state || typeof action.value !== 'boolean') return state
      return withFreshLifetime({ ...state, migrationIntent: action.value })
    }
    default:
      return state
  }
}

export function useGuestOnboarding() {
  const [draft, dispatch] = useReducer(
    guestOnboardingReducer,
    null,
    readStoredDraft
  )

  useEffect(() => {
    if (!draft) {
      removeStoredDraft()
      return
    }

    try {
      localStorage.setItem(GUEST_ONBOARDING_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // The in-memory guest experience remains usable when storage is unavailable.
    }
  }, [draft])

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const startOver = useCallback(() => dispatch({ type: 'START_OVER' }), [])
  const resume = useCallback(() => {
    const canResume = isValidGuestDraft(draft)
    dispatch({ type: 'RESUME' })
    return canResume
  }, [draft])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const transitionTo = useCallback((step, updates = {}) => {
    dispatch({ type: 'TRANSITION', step, updates })
  }, [])
  const setMigrationIntent = useCallback((value) => {
    dispatch({ type: 'SET_MIGRATION_INTENT', value })
  }, [])

  return {
    draft,
    hasDraft: Boolean(draft),
    start,
    startOver,
    resume,
    reset,
    transitionTo,
    setMigrationIntent,
  }
}
