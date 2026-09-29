export type NativeSupabaseConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type PublicEnvironment = Record<string, string | undefined>;

export function getNativeSupabaseConfig(
  environment: PublicEnvironment = process.env,
): NativeSupabaseConfig {
  const supabaseUrl = environment.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.');
  }

  return { supabaseUrl, supabasePublishableKey };
}
