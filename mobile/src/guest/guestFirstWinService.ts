import {
  buildGuestFirstWinRequest,
  createDeterministicFallback,
  isValidGuestFirstWinResult,
} from '../../../shared/guest/firstWinContract.js';

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

/**
 * M4's platform boundary. The native product consumes this contract only;
 * M5 can replace this implementation with the guest-first-win function
 * without changing the reducer or First Win screens.
 */
export async function requestDeterministicFirstWin(
  request: GuestFirstWinRequest,
): Promise<GuestFirstWinResult> {
  const body = buildGuestFirstWinRequest(request);
  if (!body) {
    throw Object.assign(new Error('Invalid First Win request'), {
      code: 'invalid_response' as GuestFirstWinErrorCode,
    });
  }

  // Yield one render turn so the explicit processing state is observable on
  // device while keeping local Founder QA deterministic and responsive.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const result = createDeterministicFallback(
    body.task,
    body.simplificationDepth,
  ) as GuestFirstWinResult;
  if (!isValidGuestFirstWinResult(result, body.simplificationDepth)) {
    throw Object.assign(new Error('Invalid local First Win result'), {
      code: 'invalid_response' as GuestFirstWinErrorCode,
    });
  }

  return result;
}
