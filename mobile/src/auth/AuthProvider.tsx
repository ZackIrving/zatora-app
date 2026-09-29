import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';

import { startSupabaseAuthLifecycle } from '@/lib/authLifecycle';
import { supabase } from '@/lib/supabase';

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
  signInWithPassword: (credentials: PasswordCredentials) => Promise<AuthResult>;
  signOut: () => Promise<SignOutResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const stopLifecycle = startSupabaseAuthLifecycle();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsInitializing(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      stopLifecycle();
    };
  }, []);

  const signInWithPassword = useCallback(
    (credentials: PasswordCredentials) => supabase.auth.signInWithPassword(credentials),
    [],
  );

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isInitializing,
      signInWithPassword,
      signOut,
    }),
    [isInitializing, session, signInWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
