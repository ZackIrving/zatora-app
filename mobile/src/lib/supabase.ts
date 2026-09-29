import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { getNativeSupabaseConfig } from '@/config/env';

const { supabaseUrl, supabasePublishableKey } = getNativeSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
