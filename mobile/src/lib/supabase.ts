import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getNativeSupabaseConfig } from '@/config/env';

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (client) return client;

  const { supabaseUrl, supabasePublishableKey } = getNativeSupabaseConfig();
  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
