import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  authStateReducer,
  getAccountScopeKey,
  getAuthDestination,
  initialAuthState,
} from '../mobile/src/auth/authState.ts'
import {
  getAuthErrorPresentation,
  getAuthExceptionPresentation,
  getAuthErrorMessage,
  validateCredentials,
} from '../mobile/src/auth/authForm.ts'
import {
  EXPECTED_NATIVE_SUPABASE_URL,
  NativeSupabaseConfigurationError,
  getNativeSupabaseConfig,
} from '../mobile/src/config/env.ts'

const session = (id) => ({ user: { id } })

test('guest and authenticated routes stay separated while restoration has a loading state', () => {
  assert.equal(getAuthDestination(initialAuthState), 'loading')
  assert.equal(getAuthDestination({ isInitializing: false, session: null }), 'guest')
  assert.equal(getAuthDestination({ isInitializing: false, session: session('account-a') }), 'authenticated')
})

test('restored sessions resolve to the authenticated identity', () => {
  const restored = authStateReducer(initialAuthState, {
    type: 'SESSION_RESOLVED',
    session: session('account-a'),
  })
  assert.equal(restored.isInitializing, false)
  assert.equal(restored.session.user.id, 'account-a')
  assert.equal(restored.initializationError, null)
})

test('invalid credentials and network failures have clear recoverable messages', () => {
  assert.equal(
    getAuthErrorMessage('sign-in', {
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    }),
    'That email or password was not accepted. Check both and try again.',
  )
  assert.match(
    getAuthErrorMessage('sign-in', { code: 'fetch_failed', message: 'Failed to fetch' }),
    /Check your connection/,
  )
  assert.equal(validateCredentials('sign-in', 'not-an-email', 'secret').ok, false)
  assert.equal(validateCredentials('sign-up', 'person@example.com', 'short').ok, false)
})

test('auth failures are categorized without exposing provider details', () => {
  assert.deepEqual(
    getAuthErrorPresentation('sign-in', {
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    }),
    {
      message: 'Confirm your email before signing in, then try again.',
      diagnosticCode: 'AUTH_EMAIL_UNCONFIRMED',
    },
  )
  assert.equal(
    getAuthErrorPresentation('sign-in', {
      code: 'unexpected_failure',
      message: 'internal provider detail',
    }).diagnosticCode,
    'AUTH_PROVIDER_ERROR',
  )
  assert.equal(
    getAuthExceptionPresentation(
      'sign-in',
      new NativeSupabaseConfigurationError('CONFIG_MISSING', 'fixture'),
    ).diagnosticCode,
    'CONFIG_MISSING',
  )
})

test('native configuration accepts only the expected project and a public key', () => {
  const config = getNativeSupabaseConfig({
    EXPO_PUBLIC_SUPABASE_URL: `${EXPECTED_NATIVE_SUPABASE_URL}/`,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
  })
  assert.equal(config.supabaseUrl, EXPECTED_NATIVE_SUPABASE_URL)
  assert.equal(config.supabasePublishableKey, 'sb_publishable_test_fixture')

  assert.throws(
    () => getNativeSupabaseConfig({}),
    (error) => error instanceof NativeSupabaseConfigurationError && error.code === 'CONFIG_MISSING',
  )
  assert.throws(
    () => getNativeSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://wrong-project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
    }),
    (error) => error instanceof NativeSupabaseConfigurationError && error.code === 'CONFIG_PROJECT_MISMATCH',
  )
  assert.throws(
    () => getNativeSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: EXPECTED_NATIVE_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden_fixture',
    }),
    (error) => error instanceof NativeSupabaseConfigurationError && error.code === 'CONFIG_SECRET_FORBIDDEN',
  )
  assert.throws(
    () => getNativeSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: EXPECTED_NATIVE_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJlegacy-key-fixture',
    }),
    (error) => error instanceof NativeSupabaseConfigurationError && error.code === 'CONFIG_KEY_INVALID',
  )
})

test('accepted sign-out clears identity and rotates the account scope', () => {
  const signedIn = authStateReducer(initialAuthState, {
    type: 'SESSION_RESOLVED',
    session: session('account-a'),
  })
  const signedOut = authStateReducer(signedIn, { type: 'SESSION_RESOLVED', session: null })
  assert.equal(signedOut.session, null)
  assert.equal(signedOut.accountScopeVersion, signedIn.accountScopeVersion + 1)
  assert.notEqual(getAccountScopeKey(signedOut), getAccountScopeKey(signedIn))
})

test('account switching clears user-specific state but a token refresh for the same user does not', () => {
  const accountA = authStateReducer(initialAuthState, {
    type: 'SESSION_RESOLVED',
    session: session('account-a'),
  })
  const refreshedA = authStateReducer(accountA, {
    type: 'SESSION_RESOLVED',
    session: { ...session('account-a'), access_token: 'refreshed' },
  })
  assert.equal(refreshedA.accountScopeVersion, accountA.accountScopeVersion)

  const accountB = authStateReducer(refreshedA, {
    type: 'SESSION_RESOLVED',
    session: session('account-b'),
  })
  assert.equal(accountB.accountScopeVersion, accountA.accountScopeVersion + 1)
  assert.notEqual(getAccountScopeKey(accountA), getAccountScopeKey(accountB))
})

test('native source uses Expo-inlineable configuration and session-driven navigation', async () => {
  const root = process.cwd()
  const [authScreen, authenticatedLayout, provider, environment, gitignore] = await Promise.all([
    readFile(path.join(root, 'mobile/src/components/AuthScreen.tsx'), 'utf8'),
    readFile(path.join(root, 'mobile/src/app/(authenticated)/_layout.tsx'), 'utf8'),
    readFile(path.join(root, 'mobile/src/auth/AuthProvider.tsx'), 'utf8'),
    readFile(path.join(root, 'mobile/src/config/env.ts'), 'utf8'),
    readFile(path.join(root, 'mobile/.gitignore'), 'utf8'),
  ])

  assert.doesNotMatch(authScreen, /clearGuestDraft|removeItem|guestStorage/)
  assert.doesNotMatch(authScreen, /router\.replace\('\/\(authenticated\)\/today'/)
  assert.match(authenticatedLayout, /<Stack key=\{accountScopeKey\}/)
  assert.match(provider, /signUpWithPassword/)
  assert.match(provider, /dispatch\(\{ type: 'SESSION_RESOLVED', session: null \}\)/)
  assert.match(environment, /process\.env\.EXPO_PUBLIC_SUPABASE_URL/)
  assert.match(environment, /process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.doesNotMatch(environment, /environment: PublicEnvironment = process\.env/)
  assert.match(gitignore, /^\.env\*\.local$/m)
  assert.doesNotMatch(`${authScreen}\n${authenticatedLayout}\n${provider}`, /service_role|SUPABASE_SECRET_KEY/i)
})
