import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';

import {
  getAuthErrorPresentation,
  getAuthExceptionPresentation,
  type AuthErrorPresentation,
} from '@/auth/authForm';
import { authStateReducer, getAccountScopeKey, initialAuthState } from '@/auth/authState';
import { startSupabaseAuthLifecycle } from '@/lib/authLifecycle';
import { getSupabaseClient } from '@/lib/supabase';

type PasswordCredentials = {
  email: string;
  password: string;
};

type AuthResult = {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
};

type SignOutResult = {
  error: AuthError | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isInitializing: boolean;
  initializationError: string | null;
  accountScopeKey: string;
  retrySessionRestoration: () => Promise<void>;
  signInWithPassword: (credentials: PasswordCredentials) => Promise<AuthResult>;
  signUpWithPassword: (credentials: PasswordCredentials) => Promise<AuthResult>;
  signOut: () => Promise<SignOutResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function restorationMessage(presentation: AuthErrorPresentation) {
  return __DEV__
    ? `${presentation.message}\nDiagnostic: ${presentation.diagnosticCode}`
    : presentation.message;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(authStateReducer, initialAuthState);
  const restorationRequestRef = useRef(0);

  const retrySessionRestoration = useCallback(async () => {
    const requestId = restorationRequestRef.current + 1;
    restorationRequestRef.current = requestId;
    dispatch({ type: 'RESTORE_STARTED' });

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (restorationRequestRef.current !== requestId) return;
      if (error) {
        dispatch({
          type: 'RESTORE_FAILED',
          message: restorationMessage(getAuthErrorPresentation('restore', error)),
        });
        return;
      }
      dispatch({ type: 'SESSION_RESOLVED', session: data.session });
    } catch (error) {
      if (restorationRequestRef.current !== requestId) return;
      dispatch({
        type: 'RESTORE_FAILED',
        message: restorationMessage(getAuthExceptionPresentation('restore', error)),
      });
    }
  }, []);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      restorationRequestRef.current += 1;
      dispatch({
        type: 'RESTORE_FAILED',
        message: restorationMessage(getAuthExceptionPresentation('restore', error)),
      });
      return undefined;
    }

    const stopLifecycle = startSupabaseAuthLifecycle(supabase);
    void retrySessionRestoration();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      restorationRequestRef.current += 1;
      dispatch({ type: 'SESSION_RESOLVED', session: nextSession });
    });

    return () => {
      restorationRequestRef.current += 1;
      listener.subscription.unsubscribe();
      stopLifecycle();
    };
  }, [retrySessionRestoration]);

  const signInWithPassword = useCallback(async (credentials: PasswordCredentials) => {
    const supabase = getSupabaseClient();
    const result = await supabase.auth.signInWithPassword(credentials);
    if (result.data.session) {
      restorationRequestRef.current += 1;
      dispatch({ type: 'SESSION_RESOLVED', session: result.data.session });
    }
    return result;
  }, []);

  const signUpWithPassword = useCallback(async (credentials: PasswordCredentials) => {
    const supabase = getSupabaseClient();
    const result = await supabase.auth.signUp(credentials);
    if (result.data.session) {
      restorationRequestRef.current += 1;
      dispatch({ type: 'SESSION_RESOLVED', session: result.data.session });
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const result = await supabase.auth.signOut();
    if (!result.error) {
      restorationRequestRef.current += 1;
      dispatch({ type: 'SESSION_RESOLVED', session: null });
    }
    return result;
  }, []);

  const value = useMemo(
    () => ({
      session: state.session,
      user: state.session?.user ?? null,
      isInitializing: state.isInitializing,
      initializationError: state.initializationError,
      accountScopeKey: getAccountScopeKey(state),
      retrySessionRestoration,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [retrySessionRestoration, signInWithPassword, signOut, signUpWithPassword, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
