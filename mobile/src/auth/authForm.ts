import type { AuthError } from '@supabase/supabase-js';

export type AuthMode = 'sign-in' | 'sign-up';

export type ValidCredentials = {
  email: string;
  password: string;
};

export type CredentialValidation =
  | { ok: true; credentials: ValidCredentials }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(
  mode: AuthMode,
  emailInput: string,
  password: string,
): CredentialValidation {
  const email = emailInput.trim();

  if (!email || !password) {
    return { ok: false, message: 'Enter your email and password.' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (mode === 'sign-up' && password.length < 6) {
    return { ok: false, message: 'Use a password with at least 6 characters.' };
  }

  return { ok: true, credentials: { email, password } };
}

type AuthOperation = AuthMode | 'restore' | 'sign-out';

type NativeSupabaseConfigurationErrorCode =
  | 'CONFIG_MISSING'
  | 'CONFIG_URL_INVALID'
  | 'CONFIG_PROJECT_MISMATCH'
  | 'CONFIG_KEY_INVALID'
  | 'CONFIG_SECRET_FORBIDDEN';

const CONFIGURATION_ERROR_CODES = new Set<NativeSupabaseConfigurationErrorCode>([
  'CONFIG_MISSING',
  'CONFIG_URL_INVALID',
  'CONFIG_PROJECT_MISMATCH',
  'CONFIG_KEY_INVALID',
  'CONFIG_SECRET_FORBIDDEN',
]);

function isNativeSupabaseConfigurationError(
  error: unknown,
): error is Error & { code: NativeSupabaseConfigurationErrorCode } {
  if (!(error instanceof Error) || error.name !== 'NativeSupabaseConfigurationError') return false;
  return CONFIGURATION_ERROR_CODES.has(
    (error as Error & { code: NativeSupabaseConfigurationErrorCode }).code,
  );
}

export type AuthDiagnosticCode =
  | NativeSupabaseConfigurationErrorCode
  | 'AUTH_EMAIL_UNCONFIRMED'
  | 'AUTH_REJECTED'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_PROVIDER_ERROR'
  | 'AUTH_SESSION_MISSING'
  | 'NETWORK_UNAVAILABLE'
  | 'UNEXPECTED_ERROR';

export type AuthErrorPresentation = {
  message: string;
  diagnosticCode: AuthDiagnosticCode;
};

function isNetworkFailure(code: string, message: string) {
  return (
    code.includes('network') ||
    code.includes('fetch') ||
    message.includes('network') ||
    message.includes('fetch')
  );
}

export function getAuthErrorPresentation(
  operation: AuthOperation,
  error: Pick<AuthError, 'code' | 'message'>,
): AuthErrorPresentation {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message.toLowerCase();

  if (
    operation === 'sign-in' &&
    (code === 'email_not_confirmed' || message.includes('email not confirmed'))
  ) {
    return {
      message: 'Confirm your email before signing in, then try again.',
      diagnosticCode: 'AUTH_EMAIL_UNCONFIRMED',
    };
  }
  if (
    operation === 'sign-in' &&
    (code === 'invalid_credentials' || message.includes('invalid login credentials'))
  ) {
    return {
      message: 'That email or password was not accepted. Check both and try again.',
      diagnosticCode: 'AUTH_REJECTED',
    };
  }
  if (code.includes('rate_limit') || message.includes('rate limit') || message.includes('too many requests')) {
    return {
      message: 'Too many attempts just now. Wait a moment, then try again.',
      diagnosticCode: 'AUTH_RATE_LIMITED',
    };
  }
  if (operation === 'sign-up' && (code.includes('weak_password') || message.includes('password should be'))) {
    return {
      message: 'That password is not strong enough. Try a longer password.',
      diagnosticCode: 'AUTH_REJECTED',
    };
  }
  if (operation === 'sign-up' && (code.includes('user_already_exists') || message.includes('already registered'))) {
    return {
      message: 'That account could not be created. Try signing in instead.',
      diagnosticCode: 'AUTH_REJECTED',
    };
  }
  if (isNetworkFailure(code, message)) {
    return {
      message: operation === 'restore'
        ? 'We could not check your session. Check your connection and try again.'
        : 'We could not reach Zatora. Check your connection and try again.',
      diagnosticCode: 'NETWORK_UNAVAILABLE',
    };
  }
  if (operation === 'sign-out') {
    return {
      message: 'We could not sign you out. Please try again.',
      diagnosticCode: 'AUTH_PROVIDER_ERROR',
    };
  }
  if (operation === 'restore') {
    return {
      message: 'We could not check your session. Try again.',
      diagnosticCode: 'AUTH_PROVIDER_ERROR',
    };
  }
  return {
    message: operation === 'sign-up'
      ? 'Zatora could not create your account. Please try again.'
      : 'Zatora could not complete sign-in. Please try again.',
    diagnosticCode: 'AUTH_PROVIDER_ERROR',
  };
}

export function getAuthExceptionPresentation(
  operation: AuthOperation,
  error: unknown,
): AuthErrorPresentation {
  if (isNativeSupabaseConfigurationError(error)) {
    const messages: Record<NativeSupabaseConfigurationErrorCode, string> = {
      CONFIG_MISSING: 'Zatora’s connection settings are missing. Add the mobile Expo environment file, then restart the app.',
      CONFIG_URL_INVALID: 'Zatora’s Supabase URL is invalid. Check the mobile Expo environment file, then restart the app.',
      CONFIG_PROJECT_MISMATCH: 'Zatora is pointed at the wrong Supabase project. Check the mobile Expo environment file, then restart the app.',
      CONFIG_KEY_INVALID: 'Zatora’s mobile Supabase key is invalid. Use the public publishable key, then restart the app.',
      CONFIG_SECRET_FORBIDDEN: 'Zatora’s mobile Supabase key is not public. Use the publishable key, then restart the app.',
    };
    return { message: messages[error.code], diagnosticCode: error.code };
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (isNetworkFailure('', message)) {
    return {
      message: operation === 'restore'
        ? 'We could not check your session. Check your connection and try again.'
        : 'We could not reach Zatora. Check your connection and try again.',
      diagnosticCode: 'NETWORK_UNAVAILABLE',
    };
  }

  return {
    message: operation === 'sign-out'
      ? 'We could not sign you out. Please try again.'
      : 'Zatora could not complete the request. Please try again.',
    diagnosticCode: 'UNEXPECTED_ERROR',
  };
}

export function getAuthErrorMessage(operation: AuthOperation, error: Pick<AuthError, 'code' | 'message'>) {
  return getAuthErrorPresentation(operation, error).message;
}
