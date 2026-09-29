import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { GuestOnboardingProvider } from '@/guest/GuestOnboardingProvider';

export default function GuestLayout() {
  const { isInitializing, session } = useAuth();
  if (isInitializing) return null;
  if (session) return <Redirect href="/" />;

  return (
    <GuestOnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GuestOnboardingProvider>
  );
}
