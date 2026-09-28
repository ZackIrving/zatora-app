import { supabase } from './supabaseClient'
import { buildGuestFirstWinRequest } from '../shared/guest/firstWinContract.js'

export async function requestGuestFirstWin({ task, supportNeed, simplificationDepth, flowId }) {
  const body = buildGuestFirstWinRequest({ task, supportNeed, simplificationDepth })
  if (!body) {
    throw Object.assign(new Error('Guest simplification request is invalid'), { code: 'invalid_request' })
  }

  const { data, error } = await supabase.functions.invoke('guest-first-win', {
    body,
    headers: { 'x-zatora-guest-flow': flowId },
  })

  if (error) {
    const code = error.context?.code || error.code || 'provider'
    throw Object.assign(new Error('Guest simplification failed'), { code })
  }

  if (!data || data.success === false || typeof data.tinyFirstStep !== 'string') {
    throw Object.assign(new Error('Guest simplification returned an invalid response'), { code: 'invalid_response' })
  }

  return data
}
