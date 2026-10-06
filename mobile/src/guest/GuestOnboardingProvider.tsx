import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  guestOnboardingReducer,
  isValidGuestName,
  isValidGuestTask,
  isValidSupportNeed,
  normalizeGuestName,
  normalizeGuestTask,
} from '../../../shared/guest/guestOnboardingDomain.js';
import {
  clearGuestDraft,
  clearGuestFlowToken,
  loadGuestDraft,
  saveGuestDraft,
} from './guestStorage';

type GuestDraft = Record<string, any>;

type GuestOnboardingContextValue = {
  draft: GuestDraft | null;
  isRestoring: boolean;
  start: () => void;
  startOver: () => void;
  resume: () => void;
  reset: () => void;
  transitionTo: (step: string, updates?: Record<string, unknown>) => void;
  requestSimplification: () => void;
  applySimplification: (result: unknown) => void;
  failSimplification: (error: string) => void;
  applyDeterministicFallback: () => void;
  acceptTask: () => void;
  stillWorking: () => void;
  completeFirstWin: () => void;
  normalizeGuestName: (value: unknown) => string;
  isValidGuestName: (value: unknown) => boolean;
  normalizeGuestTask: (value: unknown) => string;
  isValidSupportNeed: (value: unknown) => boolean;
  isValidGuestTask: (value: unknown) => boolean;
};

const GuestOnboardingContext = createContext<GuestOnboardingContextValue | null>(null);

export function GuestOnboardingProvider({ children }: PropsWithChildren) {
  const [draft, dispatch] = useReducer(guestOnboardingReducer as any, null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    void loadGuestDraft().catch(() => null).then((restored) => {
      if (!active) return;
      dispatch({ type: 'RESTORE', draft: restored });
      setIsRestoring(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isRestoring) return;
    void saveGuestDraft(draft);
  }, [draft, isRestoring]);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const startOver = useCallback(() => {
    dispatch({ type: 'START_OVER' });
    void Promise.all([clearGuestDraft(), clearGuestFlowToken()]);
  }, []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    void Promise.all([clearGuestDraft(), clearGuestFlowToken()]);
  }, []);
  const transitionTo = useCallback(
    (step: string, updates: Record<string, unknown> = {}) =>
      dispatch({ type: 'TRANSITION', step, updates }),
    [],
  );
  const requestSimplification = useCallback(
    () => dispatch({ type: 'REQUEST_SIMPLIFICATION' }),
    [],
  );
  const applySimplification = useCallback(
    (result: unknown) => dispatch({ type: 'APPLY_SIMPLIFICATION', result }),
    [],
  );
  const failSimplification = useCallback(
    (error: string) => dispatch({ type: 'SIMPLIFICATION_ERROR', error }),
    [],
  );
  const applyDeterministicFallback = useCallback(
    () => dispatch({ type: 'FALLBACK_SIMPLIFICATION' }),
    [],
  );
  const acceptTask = useCallback(() => dispatch({ type: 'ACCEPT_TASK' }), []);
  const stillWorking = useCallback(() => dispatch({ type: 'STILL_WORKING' }), []);
  const completeFirstWin = useCallback(
    () => dispatch({ type: 'COMPLETE_FIRST_WIN' }),
    [],
  );

  const value = useMemo(
    () => ({
      draft,
      isRestoring,
      start,
      startOver,
      resume,
      reset,
      transitionTo,
      requestSimplification,
      applySimplification,
      failSimplification,
      applyDeterministicFallback,
      acceptTask,
      stillWorking,
      completeFirstWin,
      normalizeGuestName,
      isValidGuestName,
      normalizeGuestTask,
      isValidSupportNeed,
      isValidGuestTask,
    }),
    [
      acceptTask,
      applySimplification,
      completeFirstWin,
      draft,
      failSimplification,
      isRestoring,
      requestSimplification,
      reset,
      resume,
      start,
      startOver,
      stillWorking,
      transitionTo,
      applyDeterministicFallback,
    ],
  );

  return (
    <GuestOnboardingContext.Provider value={value}>
      {children}
    </GuestOnboardingContext.Provider>
  );
}

export function useGuestOnboarding() {
  const context = useContext(GuestOnboardingContext);
  if (!context) {
    throw new Error('useGuestOnboarding must be used inside GuestOnboardingProvider');
  }
  return context;
}
