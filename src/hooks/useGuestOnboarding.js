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
  const requestSimplification = useCallback(() => dispatch({ type: 'REQUEST_SIMPLIFICATION' }), [])
  const applySimplification = useCallback((result) => dispatch({ type: 'APPLY_SIMPLIFICATION', result }), [])
  const failSimplification = useCallback((error) => dispatch({ type: 'SIMPLIFICATION_ERROR', error }), [])
  const useDeterministicFallback = useCallback(() => dispatch({ type: 'FALLBACK_SIMPLIFICATION' }), [])
  const acceptTask = useCallback(() => dispatch({ type: 'ACCEPT_TASK' }), [])
  const completeFirstWin = useCallback(() => dispatch({ type: 'COMPLETE_FIRST_WIN' }), [])

  return {
    draft,
    hasDraft: Boolean(draft),
    start,
    startOver,
    resume,
    reset,
    transitionTo,
    setMigrationIntent,
    requestSimplification,
    applySimplification,
    failSimplification,
    useDeterministicFallback,
    acceptTask,
    completeFirstWin,
  }
}
