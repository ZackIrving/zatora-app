import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { SessionGateScreen } from '@/components/SessionGateScreen';

export default function AuthenticatedLayout() {
  const {
    accountScopeKey,
    initializationError,
    isInitializing,
    retrySessionRestoration,
    session,
  } = useAuth();

  if (isInitializing || initializationError) {
    return (
      <SessionGateScreen
        error={initializationError}
        onRetry={() => void retrySessionRestoration()}
      />
    );
  }
  if (!session) return <Redirect href={'/(guest)/welcome' as any} />;

  return <Stack key={accountScopeKey} screenOptions={{ headerShown: false }} />;
}
