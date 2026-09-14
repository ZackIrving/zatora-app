import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'

import { HttpError } from './http.ts'

export interface AuthenticatedCaller {
  callerId: string
  supabase: SupabaseClient
}

export async function authenticateCaller(
  req: Request
): Promise<AuthenticatedCaller> {
  const authorization = req.headers.get('Authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)

  if (!authorization || !match) {
    throw new HttpError(
      401,
      'authentication_required',
      'Authentication required.'
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(
      500,
      'auth_configuration_error',
      'Authentication is temporarily unavailable.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  const token = match[1]
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new HttpError(
      401,
      'invalid_authentication',
      'Authentication required.'
    )
  }

  return {
    callerId: user.id,
    supabase,
  }
}
