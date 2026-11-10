import { Redirect } from 'expo-router';

import { getAuthDestination } from '@/auth/authState';
import { useAuth } from '@/auth/AuthProvider';
import { SessionGateScreen } from '@/components/SessionGateScreen';

export default function HomeRoute() {
  const {
    initializationError,
    isInitializing,
    retrySessionRestoration,
    session,
  } = useAuth();
  const destination = getAuthDestination({ isInitializing, session });

  if (destination === 'loading' || initializationError) {
    return (
      <SessionGateScreen
        error={initializationError}
        onRetry={() => void retrySessionRestoration()}
      />
    );
  }

  if (destination === 'guest') return <Redirect href={'/(guest)/welcome' as any} />;

  // Authenticated session restored; the account boundary owns signed-in UI.
  return <Redirect href={'/(authenticated)/today' as any} />;
}
