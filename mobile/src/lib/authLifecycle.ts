import { AppState, Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

let appStateSubscription: { remove: () => void } | null = null;

function syncAutoRefresh(supabase: SupabaseClient, state: string) {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
}

export function startSupabaseAuthLifecycle(supabase: SupabaseClient) {
  if (Platform.OS === 'web' || appStateSubscription) return () => {};

  syncAutoRefresh(supabase, AppState.currentState);
  appStateSubscription = AppState.addEventListener('change', (state) => {
    syncAutoRefresh(supabase, state);
  });

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    supabase.auth.stopAutoRefresh();
  };
}
