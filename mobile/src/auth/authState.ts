import type { Session } from '@supabase/supabase-js';

export type AuthState = {
  session: Session | null;
  isInitializing: boolean;
  initializationError: string | null;
  accountScopeVersion: number;
};

export type AuthStateAction =
  | { type: 'RESTORE_STARTED' }
  | { type: 'SESSION_RESOLVED'; session: Session | null }
  | { type: 'RESTORE_FAILED'; message: string };

export const initialAuthState: AuthState = {
  session: null,
  isInitializing: true,
  initializationError: null,
  accountScopeVersion: 0,
};

function userId(session: Session | null) {
  return session?.user.id ?? null;
}

export function authStateReducer(state: AuthState, action: AuthStateAction): AuthState {
  if (action.type === 'RESTORE_STARTED') {
    return {
      ...state,
      isInitializing: true,
      initializationError: null,
    };
  }

  if (action.type === 'RESTORE_FAILED') {
    return {
      ...state,
      session: null,
      isInitializing: false,
      initializationError: action.message,
      accountScopeVersion: state.accountScopeVersion + (state.session ? 1 : 0),
    };
  }

  const identityChanged = userId(state.session) !== userId(action.session);
  return {
    session: action.session,
    isInitializing: false,
    initializationError: null,
    accountScopeVersion: state.accountScopeVersion + (identityChanged ? 1 : 0),
  };
}

export function getAccountScopeKey(state: Pick<AuthState, 'session' | 'accountScopeVersion'>) {
  return `${userId(state.session) ?? 'guest'}:${state.accountScopeVersion}`;
}

export type AuthDestination = 'loading' | 'guest' | 'authenticated';

export function getAuthDestination(
  state: Pick<AuthState, 'isInitializing' | 'session'>,
): AuthDestination {
  if (state.isInitializing) return 'loading';
  return state.session ? 'authenticated' : 'guest';
}
