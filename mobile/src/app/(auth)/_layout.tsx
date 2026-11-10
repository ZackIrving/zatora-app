import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { SessionGateScreen } from '@/components/SessionGateScreen';

export default function AuthLayout() {
  const { initializationError, isInitializing, retrySessionRestoration, session } = useAuth();

  if (isInitializing || initializationError) {
    return (
      <SessionGateScreen
        error={initializationError}
        onRetry={() => void retrySessionRestoration()}
      />
    );
  }
  if (session) return <Redirect href={'/(authenticated)/today' as any} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
