import { useCallback, useEffect, useReducer } from 'react'
import {
  guestOnboardingReducer,
  isValidGuestDraft,
  persistGuestDraft,
  readStoredGuestDraft,
} from './guestOnboardingState'

export {
  GUEST_ONBOARDING_STORAGE_KEY,
  GUEST_ONBOARDING_VERSION,
} from './guestOnboardingState'

export function useGuestOnboarding() {
  const [draft, dispatch] = useReducer(
    guestOnboardingReducer,
    null,
    () => readStoredGuestDraft()
  )

  useEffect(() => {
    persistGuestDraft(draft)
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
