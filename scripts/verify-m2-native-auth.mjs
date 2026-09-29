import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const mobile = (file) => readFileSync(resolve(root, 'mobile', file), 'utf8')

const env = mobile('src/config/env.ts')
const client = mobile('src/lib/supabase.ts')
const lifecycle = mobile('src/lib/authLifecycle.ts')
const provider = mobile('src/auth/AuthProvider.tsx')
const functionClient = mobile('src/lib/authenticatedFunction.ts')
const layout = mobile('src/app/_layout.tsx')
const exampleEnv = mobile('.env.example')
const mobilePackage = JSON.parse(mobile('package.json'))

const results = []
function test(name, run) {
  run()
  results.push(name)
}

test('Public configuration names are explicit and safely validated', () => {
  assert.match(env, /EXPO_PUBLIC_SUPABASE_URL/)
  assert.match(env, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.match(env, /Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.match(exampleEnv, /^EXPO_PUBLIC_SUPABASE_URL=$/m)
  assert.match(exampleEnv, /^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$/m)
})

test('Only native public Supabase configuration is used', () => {
  const sources = [env, client, lifecycle, provider, functionClient, exampleEnv]
  const forbidden = /(?:OPENAI_API_KEY|GUEST_QUOTA_DB_URL|GUEST_ABUSE_HMAC_SECRET|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)\s*=/
  assert.equal(sources.some((source) => forbidden.test(source)), false)
  assert.match(client, /@supabase\/supabase-js/)
  assert.doesNotMatch(client, /service_role|SUPABASE_SECRET_KEY/i)
})

test('Native client uses persistent auth storage and safe session settings', () => {
  assert.match(client, /@react-native-async-storage\/async-storage/)
  assert.match(client, /autoRefreshToken:\s*true/)
  assert.match(client, /persistSession:\s*true/)
  assert.match(client, /detectSessionInUrl:\s*false/)
  assert.match(client, /storage:\s*AsyncStorage/)
  assert.match(client, /react-native-url-polyfill\/auto/)
})

test('App lifecycle starts and stops refresh with one cleaned-up listener', () => {
  assert.match(lifecycle, /AppState\.addEventListener\('change'/)
  assert.match(lifecycle, /supabase\.auth\.startAutoRefresh\(\)/)
  assert.match(lifecycle, /supabase\.auth\.stopAutoRefresh\(\)/)
  assert.match(lifecycle, /appStateSubscription\?\.remove\(\)/)
  assert.doesNotMatch(lifecycle, /setInterval|setTimeout/)
})

test('Auth provider restores sessions and cleans up auth listeners', () => {
  assert.match(provider, /supabase\.auth\.getSession\(\)/)
  assert.match(provider, /supabase\.auth\.onAuthStateChange/)
  assert.match(provider, /listener\.subscription\.unsubscribe\(\)/)
  assert.match(provider, /signInWithPassword/)
  assert.match(provider, /supabase\.auth\.signOut\(\)/)
  assert.doesNotMatch(provider, /console\.(log|debug|info|warn|error)/)
})

test('Password auth contract is email/password and has no credential fixture', () => {
  assert.match(provider, /credentials: PasswordCredentials/)
  assert.match(provider, /supabase\.auth\.signInWithPassword\(credentials\)/)
  assert.doesNotMatch(provider, /password\s*[:=]\s*['"][^'"]+['"]/);
})

test('Authenticated function helper relies on the session client and sends no userId', () => {
  assert.match(functionClient, /supabase\.auth\.getSession\(\)/)
  assert.match(functionClient, /supabase\.functions\.invoke<T>\(functionName, \{ body \}\)/)
  assert.doesNotMatch(functionClient, /userId/)
  assert.doesNotMatch(functionClient, /access_token|refresh_token|console\./)
})

test('Provider is integrated at the native root boundary', () => {
  assert.match(layout, /<AuthProvider>/)
  assert.match(layout, /<\/AuthProvider>/)
})

test('Required M2 dependencies are installed', () => {
  for (const dependency of ['@supabase/supabase-js', '@react-native-async-storage/async-storage', 'react-native-url-polyfill']) {
    assert.ok(mobilePackage.dependencies[dependency], dependency)
  }
})

test('No token values are logged by the native auth foundation', () => {
  const sources = [env, client, lifecycle, provider, functionClient]
  assert.equal(sources.some((source) => /console\.|access_token.*log|refresh_token.*log/i.test(source)), false)
})

for (const result of results) console.log(`PASS: ${result}`)
console.log(`\n${results.length} M2 native-auth checks passed.`)
