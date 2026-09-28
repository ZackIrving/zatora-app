import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/20260926000000_guest_ai_abuse_control.sql', import.meta.url), 'utf8')
const fn = readFileSync(new URL('../supabase/functions/guest-first-win.ts', import.meta.url), 'utf8')
const abuse = readFileSync(new URL('../supabase/functions/_shared/guestAbuse.ts', import.meta.url), 'utf8')
const checks = []

function check(name, run) {
  run()
  checks.push(name)
}

check('Migration defines private quota schema, policy, flow, and network tables', () => {
  assert.match(migration, /create schema if not exists guest_abuse/)
  assert.match(migration, /create table if not exists guest_abuse\.network_policy/)
  assert.match(migration, /create table if not exists guest_abuse\.flow_budgets/)
  assert.match(migration, /create table if not exists guest_abuse\.network_windows/)
})

check('Migration enforces three generations per flow and a configurable network window', () => {
  assert.match(migration, /generation_count smallint[^\n]*check \(generation_count between 0 and 3\)/)
  assert.match(migration, /network_window_seconds integer/)
  assert.match(migration, /network_hard_limit integer/)
  assert.match(migration, /values \(true\)/)
})

check('Quota RPC is SECURITY DEFINER and locks flow before network', () => {
  assert.match(migration, /create or replace function guest_abuse\.consume_guest_generation/)
  assert.match(migration, /security definer/)
  assert.match(migration, /Flow row locking is always acquired before network row locking/)
  assert.match(migration, /flow_budgets[\s\S]*for update[\s\S]*network_windows[\s\S]*for update/)
})

check('Quota expiration is explicit and cleanup-safe', () => {
  assert.match(migration, /expires_at timestamptz not null/)
  assert.match(migration, /flow_budgets_expires_at_idx/)
  assert.match(migration, /network_windows_expires_at_idx/)
  assert.match(migration, /if v_flow_expires_at <= v_now then[\s\S]*flow_expired/)
  assert.match(migration, /window_start = v_network_window_start/)
})

check('Least privilege revokes direct access and grants only worker RPC execution', () => {
  assert.match(migration, /revoke all on schema guest_abuse from public, anon, authenticated, service_role/)
  assert.match(migration, /revoke all on all tables in schema guest_abuse from public, anon, authenticated, service_role, guest_quota_worker/)
  assert.match(migration, /grant usage on schema guest_abuse to guest_quota_worker/)
  assert.match(migration, /grant execute on function guest_abuse\.consume_guest_generation\(bytea, bytea\) to guest_quota_worker/)
  assert.doesNotMatch(migration, /^grant execute on function[^\n]*\b(anon|authenticated|service_role)\b/m)
  assert.doesNotMatch(migration, /grant (select|insert|update|delete|all) on (table|all tables)/i)
})

check('Guest function is fail-closed and reserves before provider invocation', () => {
  assert.match(fn, /GUEST_AI_ENABLED'\) !== 'true'/)
  assert.match(fn, /reserveGuestGeneration\(req\)/)
  assert.ok(fn.indexOf('await reserveGuestGeneration(req)') < fn.indexOf('await generate('))
  assert.doesNotMatch(fn, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|createClient|\.from\(|new Map\(|MAX_GENERATIONS_PER_FLOW/)
})

check('Network signal is exact, HMAC-fingerprinted, and fail-closed pending confirmation', () => {
  assert.match(abuse, /GUEST_AI_NETWORK_SIGNAL_CONFIRMED.*!== 'true'/)
  assert.match(abuse, /headers\.get\('cf-connecting-ip'\)/)
  assert.match(abuse, /GUEST_ABUSE_HMAC_SECRET/)
  assert.match(abuse, /HMAC.*SHA-256|hash: 'SHA-256'/)
  assert.doesNotMatch(abuse, /x-forwarded-for|x-real-ip/i)
  assert.doesNotMatch(abuse, /console\.(log|error).*network|console\.(log|error).*ip/i)
})

check('Migration contains no raw task, IP, or browser identifier storage', () => {
  assert.doesNotMatch(migration, /task|supportNeed|ip_address|user_agent|cookie|localStorage/i)
})

for (const result of checks) console.log(`PASS: ${result}`)
console.log(`\n${checks.length} durable abuse-control structural checks passed.`)
console.log('STRUCTURAL: PASS')
console.log('LIVE DATABASE: NOT CLAIMED BY SOURCE VERIFIER')
console.log('CONCURRENCY: NOT CLAIMED BY SOURCE VERIFIER')
console.log('PERMISSIONS: NOT CLAIMED BY SOURCE VERIFIER')
