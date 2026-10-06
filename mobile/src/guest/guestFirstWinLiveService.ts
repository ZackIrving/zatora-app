import {
  buildGuestFirstWinRequest,
  isValidGuestFirstWinResult,
} from '../../../shared/guest/firstWinContract.js';

import { getNativeSupabaseConfig } from '@/config/env';

import { loadOrCreateGuestFlowToken } from './guestStorage';

export type GuestFirstWinRequest = {
  task: string;
  supportNeed: string;
  simplificationDepth: number;
};

export type GuestFirstWinResult = {
  acknowledgement: string;
  tinyFirstStep: string;
  followUpSteps: string[];
  francoLine: string;
};

export type GuestFirstWinErrorCode =
  | 'timeout'
  | 'provider'
  | 'rate_limited'
  | 'invalid_response'
  | 'offline'
  | 'feature_disabled';

function serviceError(code: GuestFirstWinErrorCode): Error & { code: GuestFirstWinErrorCode } {
  return Object.assign(new Error('Guest First Win request failed.'), { code });
}

function isExactGuestFirstWinResult(value: unknown, depth: number): value is GuestFirstWinResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'acknowledgement,followUpSteps,francoLine,tinyFirstStep') return false;
  const result = value as GuestFirstWinResult;
  return typeof result.acknowledgement === 'string'
    && typeof result.francoLine === 'string'
    && isValidGuestFirstWinResult(result, depth);
}

export async function requestGuestFirstWin(
  request: GuestFirstWinRequest,
): Promise<GuestFirstWinResult> {
  const body = buildGuestFirstWinRequest(request);
  if (!body) throw serviceError('invalid_response');

  const { supabaseUrl, supabasePublishableKey } = getNativeSupabaseConfig();
  const flowToken = await loadOrCreateGuestFlowToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/guest-first-win`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublishableKey,
        'x-zatora-guest-flow': flowToken,
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      throw serviceError('invalid_response');
    }

    if (!response.ok) {
      const code = payload && typeof payload === 'object' && 'code' in payload
        ? String((payload as { code?: unknown }).code)
        : '';
      if (code === 'feature_disabled') throw serviceError('feature_disabled');
      if (code === 'network_rate_limited' || code === 'flow_exhausted' || code === 'flow_expired') {
        throw serviceError('rate_limited');
      }
      if (code === 'timeout') throw serviceError('timeout');
      if (code === 'invalid_response') throw serviceError('invalid_response');
      throw serviceError('provider');
    }

    if (!isExactGuestFirstWinResult(payload, body.simplificationDepth)) {
      throw serviceError('invalid_response');
    }
    return payload;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) throw error;
    if (controller.signal.aborted) throw serviceError('timeout');
    throw serviceError('offline');
  } finally {
    clearTimeout(timeout);
  }
}
