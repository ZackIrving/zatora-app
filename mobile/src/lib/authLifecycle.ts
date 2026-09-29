import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

let appStateSubscription: { remove: () => void } | null = null;

function syncAutoRefresh(state: string) {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
}

export function startSupabaseAuthLifecycle() {
  if (Platform.OS === 'web' || appStateSubscription) return () => {};

  syncAutoRefresh(AppState.currentState);
  appStateSubscription = AppState.addEventListener('change', syncAutoRefresh);

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    supabase.auth.stopAutoRefresh();
  };
}
