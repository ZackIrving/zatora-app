import {
  GUEST_ONBOARDING_VERSION,
  createGuestDraft,
  guestOnboardingReducer,
  isValidGuestDraft,
  migrateV1Draft,
  normalizeGuestDraft,
} from '../../shared/guest/guestOnboardingDomain.js'

export * from '../../shared/guest/guestOnboardingDomain.js'

export const GUEST_ONBOARDING_STORAGE_KEY = 'zatora_guest_onboarding_v2'
export const LEGACY_GUEST_ONBOARDING_STORAGE_KEY = 'zatora_guest_onboarding_v1'

export { GUEST_ONBOARDING_VERSION, createGuestDraft, guestOnboardingReducer, isValidGuestDraft }

export function removeStoredGuestDraft(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(GUEST_ONBOARDING_STORAGE_KEY)
    storage?.removeItem(LEGACY_GUEST_ONBOARDING_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function readStoredGuestDraft(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const storedDraft = storage?.getItem(GUEST_ONBOARDING_STORAGE_KEY)
    const legacyDraft = storage?.getItem(LEGACY_GUEST_ONBOARDING_STORAGE_KEY)
    if (!storedDraft && !legacyDraft) return null

    const parsedDraft = JSON.parse(storedDraft || legacyDraft)
    const normalized = parsedDraft?.version === 1
      ? migrateV1Draft(parsedDraft, now)
      : normalizeGuestDraft(parsedDraft, now)

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
    storage?.removeItem(LEGACY_GUEST_ONBOARDING_STORAGE_KEY)
  } catch {
    // The in-memory guest experience remains usable when storage is unavailable.
  }
}
