export type NativeSupabaseConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type PublicEnvironment = Record<string, string | undefined>;

export const EXPECTED_NATIVE_SUPABASE_URL = 'https://coytgudqzoexmielqesp.supabase.co';

export type NativeSupabaseConfigurationErrorCode =
  | 'CONFIG_MISSING'
  | 'CONFIG_URL_INVALID'
  | 'CONFIG_PROJECT_MISMATCH'
  | 'CONFIG_KEY_INVALID'
  | 'CONFIG_SECRET_FORBIDDEN';

export class NativeSupabaseConfigurationError extends Error {
  readonly code: NativeSupabaseConfigurationErrorCode;

  constructor(code: NativeSupabaseConfigurationErrorCode, message: string) {
    super(message);
    this.name = 'NativeSupabaseConfigurationError';
    this.code = code;
  }
}

function expoPublicEnvironment(): PublicEnvironment {
  // Expo only inlines statically referenced process.env.EXPO_PUBLIC_* values.
  return {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getNativeSupabaseConfig(
  environment: PublicEnvironment = expoPublicEnvironment(),
): NativeSupabaseConfig {
  const supabaseUrl = environment.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new NativeSupabaseConfigurationError(
      'CONFIG_MISSING',
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new NativeSupabaseConfigurationError(
      'CONFIG_URL_INVALID',
      'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.',
    );
  }

  if (parsedUrl.origin !== EXPECTED_NATIVE_SUPABASE_URL) {
    throw new NativeSupabaseConfigurationError(
      'CONFIG_PROJECT_MISMATCH',
      'EXPO_PUBLIC_SUPABASE_URL does not match the Zatora Supabase project.',
    );
  }

  if (supabasePublishableKey.startsWith('sb_secret_')) {
    throw new NativeSupabaseConfigurationError(
      'CONFIG_SECRET_FORBIDDEN',
      'A Supabase secret key cannot be used by the mobile app.',
    );
  }

  if (!supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new NativeSupabaseConfigurationError(
      'CONFIG_KEY_INVALID',
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must contain a Supabase publishable key.',
    );
  }

  return { supabaseUrl: parsedUrl.origin, supabasePublishableKey };
}
