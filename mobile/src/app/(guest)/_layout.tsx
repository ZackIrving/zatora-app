import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { SessionGateScreen } from '@/components/SessionGateScreen';
import { GuestOnboardingProvider } from '@/guest/GuestOnboardingProvider';

export default function GuestLayout() {
  const { initializationError, isInitializing, retrySessionRestoration, session } = useAuth();
  if (isInitializing || initializationError) {
    return (
      <SessionGateScreen
        error={initializationError}
        onRetry={() => void retrySessionRestoration()}
      />
    );
  }
  if (session) return <Redirect href="/" />;

  return (
    <GuestOnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GuestOnboardingProvider>
  );
}
