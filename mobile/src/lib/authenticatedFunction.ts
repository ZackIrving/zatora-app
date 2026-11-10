import { getSupabaseClient } from '@/lib/supabase';

export async function invokeAuthenticatedFunction<T>(functionName: string, body?: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Authentication required.');

  return supabase.functions.invoke<T>(functionName, { body });
}
