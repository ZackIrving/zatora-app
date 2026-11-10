import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

const TASK_COLUMNS = 'id,user_id,title,done,created_at'
const EXPECTED_SUPABASE_HOST = 'coytgudqzoexmielqesp.supabase.co'
const REQUEST_TIMEOUT_MS = 15_000
const CLEANUP_DEADLINE_MS = 30_000
const MAX_LEDGER_ROWS = 3
const MAX_RECOVERED_ROWS = 3
let activeCleanupDeadline = null
const TEST_LETTERS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
const REQUIRED_ENVIRONMENT = Object.freeze([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'ZATORA_QA_A_EMAIL',
  'ZATORA_QA_A_PASSWORD',
  'ZATORA_QA_B_EMAIL',
  'ZATORA_QA_B_PASSWORD',
])
const EXPECTED_ID_ENVIRONMENT = Object.freeze({
  A: 'ZATORA_QA_A_EXPECTED_USER_ID',
  B: 'ZATORA_QA_B_EXPECTED_USER_ID',
})
const PUBLIC_KEY_ROLE = ['service', 'role'].join('_')
const SECRET_KEY_PREFIX = ['sb', 'secret'].join('_')
const RLS_ERROR_CODES = new Set(['42501'])
const SAFE_AUTH_CODES = new Set([
  'invalid_credentials',
  'email_not_confirmed',
  'user_banned',
  'over_request_rate_limit',
  'provider_disabled',
  'jwt_verification_failed',
  'api_authentication_failure',
])
const SAFE_ERROR_CODES = new Set([
  ...RLS_ERROR_CODES,
  ...SAFE_AUTH_CODES,
  '23503',
  '23505',
  'PGRST116',
  'PGRST301',
  'PGRST401',
])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REPO_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)))

const TEST_DEFINITIONS = Object.freeze({
  A: 'Account A owns and reads one QA task',
  B: 'Account B independently owns and reads one QA task',
  C: 'Account B cannot read Account A task',
  D: 'Account B cannot update Account A task',
  E: 'Account B cannot delete Account A task',
  F: 'Account B cannot spoof Account A ownership on insert',
  G: 'Anonymous client cannot read Account A task',
  H: 'Owners clean up only their recorded QA task IDs',
})

const CLIENT_OPTIONS = Object.freeze({
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
})

function usageError(message) {
  return new Error(`${message}\nUsage: --self-check | --execute --confirm-live-writes`)
}

function parseFlags(argv) {
  const allowed = new Set(['--self-check', '--execute', '--confirm-live-writes'])
  for (const flag of argv) {
    if (!allowed.has(flag)) throw usageError('Unknown flag')
  }

  const selfCheck = argv.includes('--self-check')
  const execute = argv.includes('--execute')
  const confirmed = argv.includes('--confirm-live-writes')

  if (selfCheck && (execute || confirmed)) {
    throw usageError('--self-check cannot be combined with live execution flags')
  }
  if (!selfCheck && !execute) {
    throw usageError('An explicit mode is required')
  }
  if (confirmed && !execute) {
    throw usageError('--confirm-live-writes requires --execute')
  }
  if (execute && !confirmed) {
    throw usageError('--execute requires --confirm-live-writes')
  }

  return { selfCheck, execute, confirmed }
}

function decodeJwtPayload(value) {
  if (typeof value !== 'string' || value.split('.').length !== 3) return null

  try {
    const payload = value.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function assertPublicKey(value) {
  const normalized = value?.trim()
  if (!normalized) throw new Error('Missing public Supabase key')

  const lowered = normalized.toLowerCase()
  if (lowered.includes(PUBLIC_KEY_ROLE) || lowered.startsWith(SECRET_KEY_PREFIX)) {
    throw new Error('A service-role or secret key is not permitted')
  }

  const payload = decodeJwtPayload(normalized)
  if (payload?.role && !['anon', 'authenticated'].includes(payload.role)) {
    throw new Error('A privileged Supabase key is not permitted')
  }
}

function validateUrl(value) {
  try {
    const authority = typeof value === 'string' ? value.match(/^https:\/\/([^/?#]*)/i)?.[1] : null
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== EXPECTED_SUPABASE_HOST ||
      url.username ||
      url.password ||
      url.port ||
      authority?.includes(':') ||
      (url.pathname !== '' && url.pathname !== '/') ||
      url.search ||
      url.hash
    ) {
      throw new Error('unexpected Supabase endpoint')
    }
    return url
  } catch {
    throw new Error('VITE_SUPABASE_URL must be the approved HTTPS Supabase endpoint')
  }
}

function validateExpectedIds(rawExpectedIds) {
  const expectedIds = Object.fromEntries(
    Object.keys(EXPECTED_ID_ENVIRONMENT).map((owner) => [owner, rawExpectedIds[owner]?.trim() || null])
  )
  const missingExpectedIds = Object.entries(expectedIds)
    .filter(([, value]) => !value)
    .map(([owner]) => EXPECTED_ID_ENVIRONMENT[owner])
  if (missingExpectedIds.length > 0) {
    return { ok: false, missing: missingExpectedIds }
  }
  if (Object.values(expectedIds).some((value) => !UUID_PATTERN.test(value))) {
    return { ok: false, invalid: 'expected_user_id_configuration' }
  }
  if (expectedIds.A === expectedIds.B) {
    return { ok: false, invalid: 'identical_expected_user_ids' }
  }

  return { ok: true, expectedIds }
}

function requiredEnvironment() {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) return { ok: false, missing }

  try {
    validateUrl(process.env.VITE_SUPABASE_URL)
    assertPublicKey(process.env.VITE_SUPABASE_ANON_KEY)
  } catch (error) {
    return {
      ok: false,
      invalid:
        error.message.includes('privileged') || error.message.includes('service-role')
          ? 'privileged_key'
          : 'supabase_configuration',
    }
  }

  return validateExpectedIds({
    A: process.env[EXPECTED_ID_ENVIRONMENT.A],
    B: process.env[EXPECTED_ID_ENVIRONMENT.B],
  })
}

function expectedIdentityMismatch(expectedIds, actualIds) {
  return Boolean(
    (expectedIds.A && expectedIds.A !== actualIds.A) ||
      (expectedIds.B && expectedIds.B !== actualIds.B)
  )
}

function createRunId() {
  return `${Date.now().toString(36)}-${randomUUID()}`
}

function taskTitle(runId, owner) {
  return `ZATORA_M6_RLS_${runId}_${owner}`
}

function buildTaskPayload(userId, title) {
  return { user_id: userId, title }
}

function effectiveHttpStatus(error, responseStatus = null) {
  if (Number.isInteger(responseStatus)) return responseStatus
  return Number.isInteger(error?.status) ? error.status : null
}

function safeCode(error, responseStatus = null) {
  const status = effectiveHttpStatus(error, responseStatus)
  const sourceCode = typeof error?.code === 'string' ? error.code : null
  if (sourceCode === '42501') {
    return isRecognizableTasksRlsWithCheck(error, status) ? 'rls_denied' : 'ambiguous_42501'
  }
  if (sourceCode && SAFE_ERROR_CODES.has(sourceCode)) {
    if (sourceCode === 'PGRST301') return 'jwt_verification_failed'
    if (sourceCode === 'PGRST401') return 'api_authentication_failure'
    if (SAFE_AUTH_CODES.has(sourceCode)) return sourceCode
    return sourceCode
  }

  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 429) return 'rate_limited'
  return 'unknown_error'
}

function normalizedDiagnostic(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : null
}

function isRecognizableTasksRlsWithCheck(error, responseStatus = null) {
  if (error?.code !== '42501' || effectiveHttpStatus(error, responseStatus) !== 403) return false

  const allowlistedDiagnostics = new Set([
    'new row violates row-level security policy for table "tasks"',
    "new row violates row-level security policy for table 'tasks'",
    'new row violates row-level security policy for table public.tasks',
    'new row violates row-level security policy for table "public"."tasks"',
  ])
  return [error.message, error.details, error.hint]
    .map(normalizedDiagnostic)
    .some((diagnostic) => diagnostic && allowlistedDiagnostics.has(diagnostic))
}

function sanitizedError(error, phase, responseStatus = null) {
  const status = effectiveHttpStatus(error, responseStatus)
  return {
    phase,
    status,
    code: safeCode(error, status),
  }
}

function normalizedResponse(response, phase) {
  return {
    data: Array.isArray(response?.data) ? response.data : response?.data ? [response.data] : [],
    error: response?.error ? sanitizedError(response.error, phase, response.status) : null,
  }
}

function isTrustworthyZeroRows(result) {
  return !result?.error && Array.isArray(result?.data) && result.data.length === 0
}

function isContextualSpoofRlsRejection(result) {
  return (
    result?.error?.phase === 'spoof_insert' &&
    result.error.code === 'rls_denied' &&
    result.error.status === 403
  )
}

function isValidSpoofContext({ ownerInsertAndReadPassed, actualBId, expectedBId, attemptedUserId, expectedAId }) {
  return Boolean(
    ownerInsertAndReadPassed &&
      actualBId &&
      expectedBId &&
      actualBId === expectedBId &&
      attemptedUserId &&
      expectedAId &&
      attemptedUserId === expectedAId
  )
}

function isValidTaskId(value) {
  return (
    (typeof value === 'string' && UUID_PATTERN.test(value)) ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
  )
}

function isValidReturnedTaskRow(row, expectedOwnerId, expectedTitle) {
  return Boolean(
    row &&
      isValidTaskId(row.id) &&
      row.user_id === expectedOwnerId &&
      row.title === expectedTitle
  )
}

function insertResponseNeedsRecovery(result, expectedOwnerId, expectedTitle) {
  return Boolean(
    result?.error ||
      !Array.isArray(result?.data) ||
      result.data.length !== 1 ||
      !isValidReturnedTaskRow(result.data[0], expectedOwnerId, expectedTitle)
  )
}

function isSameOriginalTaskRow(actual, expected) {
  return Boolean(
    actual &&
      expected &&
      actual.id === expected.id &&
      actual.user_id === expected.user_id &&
      actual.title === expected.title &&
      actual.done === expected.done &&
      actual.created_at === expected.created_at
  )
}

function trackSpoofInsertRows(state, ledger, rows, identities, title) {
  state.recoveryRequired = true
  for (const row of rows) {
    const owner =
      row?.user_id === identities.A ? 'A' : row?.user_id === identities.B ? 'B' : 'UNKNOWN'
    const validOwnerRow = owner !== 'UNKNOWN' && isValidReturnedTaskRow(row, row.user_id, title)
    const recorded = validOwnerRow
      ? recordLedger(ledger, owner, {
          id: row.id,
          ownerId: row.user_id,
          title,
          source: 'unexpected_spoof_insert',
        }, state)
      : { ok: false, reason: 'malformed_spoof_response' }

    state.securityIncidents.push({
      type: 'spoofed_insert_success',
      owner,
      taskId: isValidTaskId(row?.id) ? String(row.id) : null,
      title,
      status: recorded.ok ? 'owner_cleanup_required' : 'manual_recovery_required',
    })
  }
}

function printResult(label, status, detail = '') {
  console.log(`${label.padEnd(42, '.')} ${status}${detail ? ` (${detail})` : ''}`)
}

function printSanitizedFailure(label, result) {
  if (!result?.error) return
  const status = result.error.status === null ? 'UNKNOWN' : String(result.error.status)
  console.log(`  ${label} sanitized error: ${result.error.code} / ${status}`)
}

async function fetchWithTimeout(input, init = {}) {
  const remaining = activeCleanupDeadline === null
    ? REQUEST_TIMEOUT_MS
    : Math.min(REQUEST_TIMEOUT_MS, activeCleanupDeadline - Date.now())
  if (remaining <= 0) throw new Error('cleanup_deadline_exceeded')
  const signal = AbortSignal.timeout(remaining)
  return fetch(input, { ...init, signal })
}

function runtimeClientOptions() {
  return {
    ...CLIENT_OPTIONS,
    global: { fetch: fetchWithTimeout },
  }
}

function createClientForRuntime() {
  return createClient(
    process.env.VITE_SUPABASE_URL.trim(),
    process.env.VITE_SUPABASE_ANON_KEY.trim(),
    runtimeClientOptions()
  )
}

async function authenticate(emailName, passwordName) {
  const client = createClientForRuntime()
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: process.env[emailName],
      password: process.env[passwordName],
    })

    if (error) return { ok: false, error: sanitizedError(error, 'sign_in') }
    if (!data?.user?.id || !data.session?.access_token) {
      return {
        ok: false,
        error: { phase: 'sign_in', status: null, code: 'invalid_auth_response' },
      }
    }

    return { ok: true, client, userId: data.user.id }
  } catch {
    return {
      ok: false,
      error: { phase: 'sign_in', status: null, code: 'transport_failure' },
    }
  }
}

async function readExact(client, taskId, phase) {
  try {
    const response = await client
      .from('tasks')
      .select(TASK_COLUMNS)
      .eq('id', taskId)
      .limit(1)
    return normalizedResponse(response, phase)
  } catch {
    return {
      data: [],
      error: { phase, status: null, code: 'transport_failure' },
    }
  }
}

async function insertTask(client, userId, title, phase) {
  try {
    const response = await client
      .from('tasks')
      .insert(buildTaskPayload(userId, title))
      .select(TASK_COLUMNS)
      .limit(1)
    return normalizedResponse(response, phase)
  } catch {
    return {
      data: [],
      error: { phase, status: null, code: 'transport_failure' },
    }
  }
}

async function updateExact(client, taskId, expectedUserId, title, phase) {
  try {
    const response = await client
      .from('tasks')
      .update({ title })
      .eq('id', taskId)
      .eq('user_id', expectedUserId)
      .select('id')
    return normalizedResponse(response, phase)
  } catch {
    return {
      data: [],
      error: { phase, status: null, code: 'transport_failure' },
    }
  }
}

async function deleteExact(client, taskId, expectedUserId, phase) {
  try {
    const response = await client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', expectedUserId)
      .select('id')
    return normalizedResponse(response, phase)
  } catch {
    return {
      data: [],
      error: { phase, status: null, code: 'transport_failure' },
    }
  }
}

async function findMarkerRows(client, ownerId, title, phase) {
  try {
    const response = await client
      .from('tasks')
      .select('id,user_id,title')
      .eq('user_id', ownerId)
      .eq('title', title)
      .limit(MAX_RECOVERED_ROWS + 1)
    return normalizedResponse(response, phase)
  } catch {
    return {
      data: [],
      error: { phase, status: null, code: 'transport_failure' },
    }
  }
}

function createLedger() {
  return { A: new Map(), B: new Map() }
}

function recordLedger(ledger, owner, entry, state) {
  if (!isValidTaskId(entry?.id)) {
    if (state) state.recoveryRequired = true
    return { ok: false, reason: 'invalid_task_id' }
  }
  const key = String(entry.id)
  if (ledger[owner].has(key)) return { ok: true, existing: true }
  if (allLedgerEntries(ledger).length >= MAX_LEDGER_ROWS) {
    if (state) {
      state.recoveryRequired = true
      state.ledgerLimitExceeded = true
      state.overflowTaskIds.push({ id: key, owner, title: entry.title })
    }
    return { ok: false, reason: 'ledger_limit_exceeded' }
  }
  ledger[owner].set(key, {
    id: entry.id,
    owner,
    ownerId: entry.ownerId,
    title: entry.title,
    source: entry.source,
  })
  return { ok: true, existing: false }
}

function createRecoveryState() {
  return {
    insertAttempts: [],
    securityIncidents: [],
    recoveryRequired: false,
    interrupted: false,
    interruptSignal: null,
    fatalFailure: false,
    cleanupStarted: false,
    ledgerLimitExceeded: false,
    overflowTaskIds: [],
    recoveryEvidenceRequired: false,
  }
}

function beginInsertAttempt(state, owner, ownerId, title, kind) {
  const attempt = {
    owner,
    ownerId,
    title,
    kind,
    status: 'pending',
    error: null,
    recoveredIds: [],
  }
  state.insertAttempts.push(attempt)
  return attempt
}

function setInsertAttemptStatus(attempt, status, errorCode = null) {
  attempt.status = status
  attempt.error = errorCode
}

async function recoverInsertOutcome(state, ledger, attempt, ownerClient) {
  state.recoveryEvidenceRequired = true
  const markerRows = await findMarkerRows(
    ownerClient,
    attempt.ownerId,
    attempt.title,
    `${attempt.kind}_recovery`
  )

  if (markerRows.error) {
    setInsertAttemptStatus(attempt, 'unresolved', markerRows.error.code)
    state.recoveryRequired = true
    return { status: 'unresolved', error: markerRows.error }
  }

  if (markerRows.data.length > 1) {
    setInsertAttemptStatus(attempt, 'ambiguous', 'multiple_marker_rows')
    state.recoveryRequired = true
    attempt.recoveredIds = markerRows.data
      .map((row) => row.id)
      .filter((id) => isValidTaskId(id))
    return {
      status: 'ambiguous',
      error: { phase: `${attempt.kind}_recovery`, status: null, code: 'multiple_marker_rows' },
    }
  }

  if (markerRows.data.length === 1) {
    const recovered = markerRows.data[0]
    if (!isValidReturnedTaskRow(recovered, attempt.ownerId, attempt.title)) {
      setInsertAttemptStatus(attempt, 'unresolved', 'malformed_recovery_row')
      state.recoveryRequired = true
      attempt.recoveredIds = isValidTaskId(recovered?.id) ? [String(recovered.id)] : []
      return {
        status: 'unresolved',
        error: { phase: `${attempt.kind}_recovery`, status: null, code: 'malformed_recovery_row' },
      }
    }
    const recorded = recordLedger(ledger, attempt.owner, {
      id: recovered.id,
      ownerId: attempt.ownerId,
      title: attempt.title,
      source: 'recovered_insert',
    }, state)
    if (!recorded.ok) {
      setInsertAttemptStatus(attempt, 'unresolved', recorded.reason)
      state.recoveryRequired = true
      attempt.recoveredIds = isValidTaskId(recovered.id) ? [String(recovered.id)] : []
      return {
        status: 'unresolved',
        error: { phase: `${attempt.kind}_recovery`, status: null, code: recorded.reason },
      }
    }
    attempt.recoveredIds = [String(recovered.id)]
    setInsertAttemptStatus(attempt, 'recovered')
    return { status: 'recovered', row: recovered }
  }

  setInsertAttemptStatus(attempt, 'unresolved', 'no_matching_row_found')
  state.recoveryRequired = true
  return {
    status: 'unresolved',
    error: { phase: `${attempt.kind}_recovery`, status: null, code: 'no_matching_row_found' },
  }
}

function allLedgerEntries(ledger) {
  return [...ledger.A.values(), ...ledger.B.values()]
}

function cleanupDeadlineFailures(entries, startIndex) {
  return entries.slice(startIndex).map((entry) => ({
    ...entry,
    error: { phase: 'cleanup', status: null, code: 'cleanup_deadline_exceeded' },
  }))
}

async function cleanupLedger(ledger, users, options = {}) {
  const failures = []
  const entries = allLedgerEntries(ledger)
  const now = typeof options.now === 'function' ? options.now : Date.now
  const cleanupDeadlineMs = Number.isFinite(options.deadlineMs) ? options.deadlineMs : CLEANUP_DEADLINE_MS
  const deadline = now() + cleanupDeadlineMs
  const previousCleanupDeadline = activeCleanupDeadline
  activeCleanupDeadline = deadline

  try {
    for (const [index, entry] of entries.entries()) {
      if (now() >= deadline) {
        failures.push(...cleanupDeadlineFailures(entries, index))
        break
      }
      const owner = users[entry.owner]
      if (!owner) {
        failures.push({ ...entry, error: { phase: 'cleanup', status: null, code: 'owner_unavailable' } })
        continue
      }

      const deleted = await deleteExact(owner.client, entry.id, entry.ownerId, 'cleanup')
      if (deleted.error) {
        failures.push({ ...entry, error: deleted.error })
        continue
      }
      if (deleted.data.length > 1 || (deleted.data.length === 1 && deleted.data[0]?.id !== entry.id)) {
        failures.push({
          ...entry,
          error: { phase: 'cleanup', status: null, code: 'cleanup_response_mismatch' },
        })
        continue
      }

      if (now() >= deadline) {
        failures.push({
          ...entry,
          error: { phase: 'cleanup', status: null, code: 'cleanup_deadline_exceeded' },
        })
        continue
      }
      const remaining = await readExact(owner.client, entry.id, 'cleanup_verify')
      if (remaining.error || remaining.data.length > 0) {
        failures.push({
          ...entry,
          error: remaining.error || { phase: 'cleanup_verify', status: null, code: 'row_remains' },
        })
      }
    }

    return failures
  } finally {
    activeCleanupDeadline = previousCleanupDeadline
  }
}

function recoveryManifest(runId, ledger, failures, state) {
  return {
    runId,
    tasks: allLedgerEntries(ledger).map((entry) => ({
      id: String(entry.id),
      owner: entry.owner,
    })),
    insertAttempts: state.insertAttempts.map((attempt) => ({
      owner: attempt.owner,
      title: attempt.title,
      kind: attempt.kind,
      status: attempt.status,
      recoveredIds: attempt.recoveredIds,
      error: attempt.error,
    })),
    unresolvedInserts: state.insertAttempts
      .filter((attempt) => ['pending', 'unresolved', 'ambiguous', 'indeterminate', 'unexpected_success'].includes(attempt.status))
      .map((attempt) => ({
        owner: attempt.owner,
        title: attempt.title,
        kind: attempt.kind,
        status: attempt.status,
        error: attempt.error,
      })),
    overflowTaskIds: state.overflowTaskIds,
    limits: {
      maxLedgerRows: MAX_LEDGER_ROWS,
      maxRecoveredRows: MAX_RECOVERED_ROWS,
      cleanupDeadlineMs: CLEANUP_DEADLINE_MS,
      ledgerLimitExceeded: state.ledgerLimitExceeded,
    },
    securityIncidents: state.securityIncidents.map((incident) => ({
      type: incident.type,
      owner: incident.owner,
      taskId: incident.taskId === undefined ? null : String(incident.taskId),
      title: incident.title || null,
      status: incident.status,
    })),
    failures: failures.map((failure) => ({
      id: failure.id === undefined ? null : String(failure.id),
      owner: failure.owner || null,
      error: failure.error?.code || 'unknown_error',
    })),
    cleanup: failures.length === 0 ? 'complete' : 'incomplete',
    recoveryRequired: state.recoveryRequired,
    recoveryEvidenceRequired: state.recoveryEvidenceRequired,
    interrupted: state.interrupted,
    interruptSignal: state.interruptSignal,
    fatalFailure: state.fatalFailure,
  }
}

function isInsideRepository(path) {
  const relativePath = relative(REPO_ROOT, path)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function persistRecoveryManifest(runId, ledger, failures, state) {
  const configuredPath = process.env.ZATORA_M6_RLS_MANIFEST_PATH?.trim()
  const path = resolve(configuredPath || join(tmpdir(), `zatora-m6-rls-recovery-${runId}.json`))

  if (isInsideRepository(path)) return { ok: false, path: null }

  try {
    writeFileSync(path, `${JSON.stringify(recoveryManifest(runId, ledger, failures, state), null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })
    return { ok: true, path }
  } catch {
    return { ok: false, path }
  }
}

function installProcessHandlers(state) {
  const onSignal = (signal) => {
    state.interrupted = true
    state.interruptSignal = signal
  }
  const onFatal = () => {
    state.interrupted = true
    state.fatalFailure = true
  }

  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)
  process.on('uncaughtException', onFatal)
  process.on('unhandledRejection', onFatal)

  return () => {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    process.off('uncaughtException', onFatal)
    process.off('unhandledRejection', onFatal)
  }
}

function markFatalFailure(state) {
  state.fatalFailure = true
  state.recoveryRequired = true
  state.recoveryEvidenceRequired = true
}

function isRunSuccessful(statuses, cleanupFailures, state) {
  return (
    TEST_LETTERS.every((letter) => statuses.get(letter) === 'PASS') &&
    cleanupFailures.length === 0 &&
    !state.recoveryRequired &&
    !state.recoveryEvidenceRequired &&
    !state.interrupted &&
    !state.fatalFailure
  )
}

function stopIfInterrupted(state) {
  if (state.interrupted) throw new Error('execution_interrupted')
}

async function cleanupOnce(state, ledger, users) {
  if (state.cleanupStarted) {
    return [{ error: { phase: 'cleanup', status: null, code: 'cleanup_already_started' } }]
  }

  state.cleanupStarted = true
  try {
    return await cleanupLedger(ledger, users)
  } catch {
    markFatalFailure(state)
    return [{ error: { phase: 'cleanup', status: null, code: 'cleanup_exception' } }]
  }
}

function runSelfCheck() {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8')
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  )

  assert.deepEqual(Object.keys(TEST_DEFINITIONS), TEST_LETTERS)
  assert.deepEqual(buildTaskPayload('user-a', 'title-a'), {
    user_id: 'user-a',
    title: 'title-a',
  })
  assert.deepEqual(parseFlags(['--self-check']), {
    selfCheck: true,
    execute: false,
    confirmed: false,
  })
  assert.throws(() => parseFlags(['--execute']), /requires --confirm-live-writes/)
  assert.throws(() => parseFlags(['--unknown']), /Unknown flag/)
  assert.throws(() => assertPublicKey('sb_secret_test-value'), /secret key/)
  assert.throws(() => assertPublicKey('eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.x'), /privileged/)
  assert.doesNotThrow(() => assertPublicKey('sb_publishable_test-value'))
  assert.doesNotThrow(() => validateUrl(`https://${EXPECTED_SUPABASE_HOST}`))
  assert.throws(() => validateUrl(`http://${EXPECTED_SUPABASE_HOST}`), /approved HTTPS/)
  assert.throws(() => validateUrl('https://evil.example'), /approved HTTPS/)
  assert.throws(() => validateUrl(`https://user:pass@${EXPECTED_SUPABASE_HOST}`), /approved HTTPS/)
  assert.throws(() => validateUrl(`https://${EXPECTED_SUPABASE_HOST}:443`), /approved HTTPS/)
  assert.throws(() => validateUrl(`https://${EXPECTED_SUPABASE_HOST}/rest/v1`), /approved HTTPS/)
  assert.throws(() => validateUrl(`https://${EXPECTED_SUPABASE_HOST}/?query=1`), /approved HTTPS/)
    assert.equal(safeCode({
      code: '42501',
      status: 403,
      message: 'new row violates row-level security policy for table "tasks"',
    }), 'rls_denied')
    assert.equal(safeCode({ code: '42501', status: 403, message: 'permission denied for table "tasks"' }), 'ambiguous_42501')
  assert.equal(safeCode({ code: 'PGRST301', status: 401 }), 'jwt_verification_failed')
  assert.equal(safeCode({ status: 401 }), 'unauthorized')
  assert.equal(isTrustworthyZeroRows({ data: [], error: null }), true)
  assert.equal(isTrustworthyZeroRows({ data: [], error: { code: 'rls_denied' } }), false)
  assert.equal(isTrustworthyZeroRows({ data: [], error: { code: 'unauthorized' } }), false)
  for (const phase of ['cross_read', 'cross_update', 'cross_delete']) {
    assert.equal(
      isTrustworthyZeroRows(normalizedResponse({ data: [], error: { code: '42501', status: 403 } }, phase)),
      false
    )
  }
  assert.equal(isContextualSpoofRlsRejection({
    data: [],
      error: { phase: 'spoof_insert', code: 'rls_denied', status: 403 },
  }), true)
  assert.equal(isContextualSpoofRlsRejection({
    data: [],
    error: { phase: 'cross_update', code: 'rls_denied', status: 403 },
  }), false)
    assert.equal(isValidSpoofContext({
      ownerInsertAndReadPassed: true,
      actualBId: 'owner-b',
      expectedBId: 'owner-b',
      attemptedUserId: 'owner-a',
      expectedAId: 'owner-a',
    }), true)
    assert.equal(isValidSpoofContext({
      ownerInsertAndReadPassed: true,
      actualBId: 'wrong-user',
      expectedBId: 'owner-b',
      attemptedUserId: 'owner-a',
      expectedAId: 'owner-a',
    }), false)
  assert.equal(insertResponseNeedsRecovery({ data: [{}], error: null }, 'owner-a', 'title'), true)
  assert.equal(insertResponseNeedsRecovery({
    data: [{ id: '11111111-1111-4111-8111-111111111111', user_id: 'owner-a', title: 'title' }],
    error: null,
  }, 'owner-a', 'title'), false)
  assert.equal(insertResponseNeedsRecovery({
    data: [{ id: '11111111-1111-4111-8111-111111111111', user_id: 'owner-b', title: 'title' }],
    error: null,
  }, 'owner-a', 'title'), true)
  assert.equal(insertResponseNeedsRecovery({
    data: [{ id: '11111111-1111-4111-8111-111111111111', user_id: 'owner-a', title: 'wrong' }],
    error: null,
  }, 'owner-a', 'title'), true)
  assert.equal(validateExpectedIds({ A: null, B: '22222222-2222-4222-8222-222222222222' }).ok, false)
  assert.equal(validateExpectedIds({
    A: '11111111-1111-4111-8111-111111111111',
    B: '11111111-1111-4111-8111-111111111111',
  }).invalid, 'identical_expected_user_ids')
  const boundedLedger = createLedger()
  const boundedState = createRecoveryState()
  for (const id of [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ]) {
    assert.equal(recordLedger(boundedLedger, 'A', { id, ownerId: 'owner-a', title: id }, boundedState).ok, true)
  }
  assert.equal(recordLedger(boundedLedger, 'A', {
    id: '44444444-4444-4444-8444-444444444444',
    ownerId: 'owner-a',
    title: 'overflow',
  }, boundedState).reason, 'ledger_limit_exceeded')
  assert.equal(boundedState.recoveryRequired, true)
  assert.equal(cleanupDeadlineFailures([...boundedLedger.A.values()], 1).length, 2)

  const recoveryState = createRecoveryState()
  const recoveryLedger = createLedger()
  const recoveryAttempt = beginInsertAttempt(
    recoveryState,
    'A',
    '11111111-1111-4111-8111-111111111111',
    'ZATORA_M6_RLS_self_check_A',
    'owner_A_insert'
  )
  setInsertAttemptStatus(recoveryAttempt, 'unresolved', 'transport_failure')
  recoveryState.recoveryRequired = true
  recoveryState.securityIncidents.push({
    type: 'self_check_incident',
    owner: 'A',
    status: 'manual_recovery_required',
  })
  const spoofEvidenceState = createRecoveryState()
  const spoofEvidenceLedger = createLedger()
  trackSpoofInsertRows(
    spoofEvidenceState,
    spoofEvidenceLedger,
    [{ user_id: 'owner-a', title: 'spoof' }],
    { A: 'owner-a', B: 'owner-b' },
    'spoof'
  )
  assert.equal(spoofEvidenceState.recoveryRequired, true)
  assert.equal(spoofEvidenceState.securityIncidents[0].taskId, null)
  assert.equal(spoofEvidenceState.securityIncidents[0].status, 'manual_recovery_required')
  const cleanupState = createRecoveryState()
  cleanupState.ledgerLimitExceeded = true
  cleanupState.overflowTaskIds.push({ id: '11111111-1111-4111-8111-111111111111', owner: 'A', title: 'overflow' })
  const cleanupText = JSON.stringify(recoveryManifest('cleanup-limit', createLedger(), [], cleanupState))
  assert.match(cleanupText, /maxLedgerRows/)
  assert.match(cleanupText, /overflowTaskIds/)
  const recoveryText = JSON.stringify(recoveryManifest('self-check', recoveryLedger, [], recoveryState))
  assert.match(recoveryText, /unresolvedInserts/)
  assert.doesNotMatch(recoveryText, /password|access_token|refresh_token|Authorization/i)
  assert.doesNotMatch(recoveryText, /11111111-1111-4111-8111-111111111111/)
  assert.equal(
    expectedIdentityMismatch(
      { A: '11111111-1111-4111-8111-111111111111', B: null },
      { A: '22222222-2222-4222-8222-222222222222', B: '33333333-3333-4333-8333-333333333333' }
    ),
    true
  )
  assert.equal(
    expectedIdentityMismatch({ A: null, B: null }, { A: 'a', B: 'b' }),
    false
  )
  assert.throws(() => stopIfInterrupted({ interrupted: true }), /execution_interrupted/)
  const fatalState = createRecoveryState()
  markFatalFailure(fatalState)
  assert.equal(fatalState.fatalFailure, true)
  assert.equal(fatalState.recoveryRequired, true)
  assert.equal(fatalState.recoveryEvidenceRequired, true)

  assert.match(source, /persistSession:\s*false/)
  assert.match(source, /autoRefreshToken:\s*false/)
  assert.match(source, /detectSessionInUrl:\s*false/)
  assert.match(source, /AbortSignal\.timeout\(remaining\)/)
  assert.match(source, /recoverInsertOutcome/)
  assert.match(source, /process\.on\('SIGINT'/)
  assert.match(source, /ZATORA_QA_A_EXPECTED_USER_ID/)
  assert.match(source, /CLEANUP_DEADLINE_MS/)
  assert.match(source, /MAX_LEDGER_ROWS/)
  assert.match(source, /MAX_RECOVERED_ROWS/)
  for (const name of REQUIRED_ENVIRONMENT) assert.match(source, new RegExp(name))
  assert.doesNotMatch(source, /\.auth\.admin|\.rpc\(['"]truncate/i)
  assert.doesNotMatch(source, /\.from\(['"]tasks['"]\)\.delete\(\)\s*;/)
  assert.doesNotMatch(source, /console\.(log|error)\([^\n]*(?:password|access_token|refresh_token|Authorization|process\.env)/i)
  assert.match(packageJson.dependencies['@supabase/supabase-js'], /\^2\./)

  printResult('Mode parser and CLI guards', 'PASS')
  printResult('Public-key and secret guard', 'PASS')
  printResult('Independent-client configuration', 'PASS')
  printResult('A-H test definitions', 'PASS')
  printResult('Exact-ID mutation restrictions', 'PASS')
  printResult('Credential-output guard', 'PASS')
  printResult('Approved endpoint and bounded transport', 'PASS')
  printResult('Authentication versus RLS classifier', 'PASS')
  printResult('Insert outcome recovery and manifest', 'PASS')
  printResult('Interruption and identity guards', 'PASS')
  printResult('Supabase dependency availability', 'PASS')
  printResult('LIVE AUTHENTICATION', 'NOT RUN')
  printResult('LIVE DATABASE READS', 'NOT RUN')
  printResult('LIVE DATABASE WRITES', 'NOT RUN')
  printResult('LIVE CLEANUP', 'NOT RUN')
  console.log('\nSELF-CHECK: PASS')
}

function printAuthFailure(label, auth) {
  printResult(label, 'FAIL', auth.error?.code || 'unknown_error')
}

async function runExecute() {
  const environment = requiredEnvironment()
  if (!environment.ok) {
    printResult('Execution environment', 'FAIL', environment.missing?.join(',') || environment.invalid)
    return 1
  }

  const runId = createRunId()
  const ledger = createLedger()
  const users = {}
  const state = createRecoveryState()
  const statuses = new Map(TEST_LETTERS.map((letter) => [letter, 'NOT RUN']))
  let cleanupFailures = []
  let manifestResult = null
  let exitCode = 1
  const removeProcessHandlers = installProcessHandlers(state)

  const setTest = (letter, status, detail = '') => {
    statuses.set(letter, status)
    printResult(`Test ${letter} — ${TEST_DEFINITIONS[letter]}`, status, detail)
  }

  const reportFinal = () => {
    for (const letter of TEST_LETTERS) {
      if (statuses.get(letter) === 'NOT RUN') {
        printResult(`Test ${letter} — ${TEST_DEFINITIONS[letter]}`, 'NOT RUN')
      }
    }

    for (const owner of ['A', 'B']) {
      for (const entry of ledger[owner].values()) {
        console.log(`QA ${owner} task ID: ${String(entry.id)}`)
      }
    }
    if (manifestResult?.ok) {
      console.log(`Recovery manifest: ${manifestResult.path}`)
    } else if (cleanupFailures.length > 0 || state.recoveryRequired || state.recoveryEvidenceRequired || state.interrupted || state.fatalFailure) {
      console.log('Recovery manifest: MANUAL REQUIRED')
      for (const attempt of state.insertAttempts) {
        if (['pending', 'unresolved', 'ambiguous', 'indeterminate', 'unexpected_success'].includes(attempt.status)) {
          console.log(`Manual recovery marker: owner ${attempt.owner}, title ${attempt.title}`)
        }
      }
      for (const overflow of state.overflowTaskIds) {
        console.log(`Manual recovery task ID: ${overflow.id} (owner ${overflow.owner})`)
      }
      console.log('Manual recovery scope: only the listed QA IDs or markers; use the matching owner session and do not retry broad deletes.')
    }
    const cleanupComplete =
      cleanupFailures.length === 0 &&
      !state.recoveryRequired &&
      !state.recoveryEvidenceRequired &&
      !state.interrupted &&
      !state.fatalFailure
    console.log(`Cleanup outcome: ${cleanupComplete ? 'complete' : 'incomplete'}`)

    const passed = isRunSuccessful(statuses, cleanupFailures, state)
    exitCode = passed ? 0 : 1
    console.log(`FINAL: ${passed ? 'PASS' : 'FAIL'}`)
  }

  console.log('ZATORA M6 TWO-ACCOUNT TASK RLS QA')
  console.log(`Run identifier: ${runId}`)
  console.log('Credentials and session material are not printed.')

  try {
    stopIfInterrupted(state)
    const [authA, authB] = await Promise.all([
      authenticate('ZATORA_QA_A_EMAIL', 'ZATORA_QA_A_PASSWORD'),
      authenticate('ZATORA_QA_B_EMAIL', 'ZATORA_QA_B_PASSWORD'),
    ])
    stopIfInterrupted(state)

    if (!authA.ok) {
      printAuthFailure('Account A authentication', authA)
      setTest('A', 'FAIL', authA.error?.code || 'auth_failure')
      return 1
    }
    if (!authB.ok) {
      printAuthFailure('Account B authentication', authB)
      setTest('B', 'FAIL', authB.error?.code || 'auth_failure')
      return 1
    }

    users.A = authA
    users.B = authB
    const expectedIds = environment.expectedIds
    if (expectedIdentityMismatch(expectedIds, { A: authA.userId, B: authB.userId })) {
      printResult('Expected account identity mapping', 'FAIL', 'identity_mismatch')
      setTest('A', 'FAIL', 'identity_mismatch')
      setTest('B', 'FAIL', 'identity_mismatch')
      return 1
    }
    if (authA.userId === authB.userId) {
      printResult('Distinct authenticated identities', 'FAIL')
      setTest('A', 'FAIL', 'identical_identity')
      setTest('B', 'FAIL', 'identical_identity')
      return 1
    }
    printResult('Distinct authenticated identities', 'PASS')

    const titleA = taskTitle(runId, 'A')
    const attemptA = beginInsertAttempt(state, 'A', authA.userId, titleA, 'owner_A_insert')
    stopIfInterrupted(state)
    const insertedA = await insertTask(authA.client, authA.userId, titleA, 'insert_A')
    if (insertResponseNeedsRecovery(insertedA, authA.userId, titleA)) {
      const recovery = await recoverInsertOutcome(state, ledger, attemptA, authA.client)
      const detail = recovery.status === 'recovered'
        ? 'insert_outcome_recovered'
        : insertedA.error?.code || 'insert_contract_failure'
      setTest('A', 'FAIL', detail)
      printSanitizedFailure('Account A insert', insertedA)
      return 1
    }

    const rowA = insertedA.data[0]
    setInsertAttemptStatus(attemptA, 'confirmed')
    const recordedA = recordLedger(ledger, 'A', {
      id: rowA.id,
      ownerId: authA.userId,
      title: titleA,
      source: 'owner_insert',
    }, state)
    if (!recordedA.ok) {
      setInsertAttemptStatus(attemptA, 'indeterminate', recordedA.reason)
      setTest('A', 'FAIL', recordedA.reason)
      return 1
    }
    const readA = await readExact(authA.client, rowA.id, 'read_A')
    if (
      readA.error ||
      readA.data.length !== 1 ||
      readA.data[0].id !== rowA.id ||
      readA.data[0].user_id !== authA.userId ||
      readA.data[0].title !== titleA
    ) {
      printSanitizedFailure('Account A read', readA)
      setTest('A', 'FAIL', readA.error?.code || 'ownership_read_failure')
      return 1
    }
    setTest('A', 'PASS')
    stopIfInterrupted(state)

    const titleB = taskTitle(runId, 'B')
    const attemptB = beginInsertAttempt(state, 'B', authB.userId, titleB, 'owner_B_insert')
    stopIfInterrupted(state)
    const insertedB = await insertTask(authB.client, authB.userId, titleB, 'insert_B')
    if (insertResponseNeedsRecovery(insertedB, authB.userId, titleB)) {
      const recovery = await recoverInsertOutcome(state, ledger, attemptB, authB.client)
      const detail = recovery.status === 'recovered'
        ? 'insert_outcome_recovered'
        : insertedB.error?.code || 'insert_contract_failure'
      setTest('B', 'FAIL', detail)
      printSanitizedFailure('Account B insert', insertedB)
      return 1
    }

    const rowB = insertedB.data[0]
    setInsertAttemptStatus(attemptB, 'confirmed')
    const recordedB = recordLedger(ledger, 'B', {
      id: rowB.id,
      ownerId: authB.userId,
      title: titleB,
      source: 'owner_insert',
    }, state)
    if (!recordedB.ok) {
      setInsertAttemptStatus(attemptB, 'indeterminate', recordedB.reason)
      setTest('B', 'FAIL', recordedB.reason)
      return 1
    }
    const readB = await readExact(authB.client, rowB.id, 'read_B')
    if (
      readB.error ||
      readB.data.length !== 1 ||
      readB.data[0].id !== rowB.id ||
      readB.data[0].user_id !== authB.userId ||
      readB.data[0].title !== titleB
    ) {
      printSanitizedFailure('Account B read', readB)
      setTest('B', 'FAIL', readB.error?.code || 'ownership_read_failure')
      return 1
    }
    setTest('B', 'PASS')
    stopIfInterrupted(state)

    const crossRead = await readExact(authB.client, rowA.id, 'cross_read')
    if (!isTrustworthyZeroRows(crossRead)) {
      printSanitizedFailure('Cross-account read', crossRead)
      setTest('C', 'FAIL', crossRead.error?.code || 'cross_account_read_not_zero_rows')
      return 1
    }
    setTest('C', 'PASS')
    stopIfInterrupted(state)

    const attemptedTitle = `${titleA}_UNAUTHORIZED_UPDATE`
    const crossUpdate = await updateExact(authB.client, rowA.id, authA.userId, attemptedTitle, 'cross_update')
    if (!isTrustworthyZeroRows(crossUpdate)) {
      printSanitizedFailure('Cross-account update', crossUpdate)
      setTest('D', 'FAIL', crossUpdate.error?.code || 'cross_account_update_not_zero_rows')
      return 1
    }
    const afterUpdate = await readExact(authA.client, rowA.id, 'cross_update_verify')
    if (
      afterUpdate.error ||
      afterUpdate.data.length !== 1 ||
      !isSameOriginalTaskRow(afterUpdate.data[0], rowA)
    ) {
      printSanitizedFailure('Owner update verification', afterUpdate)
      setTest('D', 'FAIL', afterUpdate.error?.code || 'owner_state_changed')
      return 1
    }
    setTest('D', 'PASS')
    stopIfInterrupted(state)

    const crossDelete = await deleteExact(authB.client, rowA.id, authA.userId, 'cross_delete')
    if (!isTrustworthyZeroRows(crossDelete)) {
      printSanitizedFailure('Cross-account delete', crossDelete)
      setTest('E', 'FAIL', crossDelete.error?.code || 'cross_account_delete_not_zero_rows')
      return 1
    }
    const afterDelete = await readExact(authA.client, rowA.id, 'cross_delete_verify')
    if (
      afterDelete.error ||
      afterDelete.data.length !== 1 ||
      !isSameOriginalTaskRow(afterDelete.data[0], rowA)
    ) {
      printSanitizedFailure('Owner delete verification', afterDelete)
      setTest('E', 'FAIL', afterDelete.error?.code || 'owner_row_missing_or_changed')
      return 1
    }
    setTest('E', 'PASS')
    stopIfInterrupted(state)

    const spoofTitle = taskTitle(runId, 'SPOOF')
    const spoofAttempt = beginInsertAttempt(state, 'A', authA.userId, spoofTitle, 'spoof_insert')
    stopIfInterrupted(state)
    const spoofInsert = await insertTask(authB.client, authA.userId, spoofTitle, 'spoof_insert')
    const spoofContextValid = isValidSpoofContext({
      ownerInsertAndReadPassed: statuses.get('B') === 'PASS',
      actualBId: authB.userId,
      expectedBId: expectedIds.B,
      attemptedUserId: authA.userId,
      expectedAId: expectedIds.A,
    })
    if (spoofInsert.data.length > 0) {
      setInsertAttemptStatus(spoofAttempt, 'unexpected_success')
      trackSpoofInsertRows(
        state,
        ledger,
        spoofInsert.data,
        { A: authA.userId, B: authB.userId },
        spoofTitle
      )
      setTest('F', 'FAIL', 'spoofed_insert_applied')
      return 1
    }
    if (spoofInsert.error?.code === 'transport_failure') {
      await recoverInsertOutcome(state, ledger, spoofAttempt, authA.client)
      setTest('F', 'FAIL', 'spoof_insert_outcome_unknown')
      return 1
    }
    if (!spoofInsert.error) {
      const recovery = await recoverInsertOutcome(state, ledger, spoofAttempt, authA.client)
      setTest('F', 'FAIL', recovery.status === 'unresolved' ? 'spoofed_insert_outcome_unknown' : 'spoofed_insert_not_rejected')
      return 1
    }
    if (!spoofContextValid || !isContextualSpoofRlsRejection(spoofInsert)) {
      printSanitizedFailure('Spoofed insert', spoofInsert)
      setInsertAttemptStatus(spoofAttempt, 'rejected', spoofInsert.error.code)
      setTest('F', 'FAIL', spoofInsert.error.code)
      return 1
    }
    setInsertAttemptStatus(spoofAttempt, 'rejected', spoofInsert.error.code)
    setTest('F', 'PASS', spoofInsert.error.code)
    stopIfInterrupted(state)

    const anonymous = createClientForRuntime()
    const anonymousRead = await readExact(anonymous, rowA.id, 'anonymous_read')
    if (!isTrustworthyZeroRows(anonymousRead)) {
      printSanitizedFailure('Anonymous read', anonymousRead)
      setTest('G', 'FAIL', anonymousRead.error?.code || 'anonymous_read_not_zero_rows')
      return 1
    }
    setTest('G', 'PASS')
  } catch {
    markFatalFailure(state)
    printResult('Harness execution', 'FAIL', 'unexpected_sanitized_failure')
  } finally {
    if (allLedgerEntries(ledger).length > 0 && users.A && users.B) {
      cleanupFailures = await cleanupOnce(state, ledger, users)
      if (
        cleanupFailures.length === 0 &&
        !state.recoveryRequired &&
        !state.recoveryEvidenceRequired &&
        !state.interrupted &&
        !state.fatalFailure
      ) {
        statuses.set('H', 'PASS')
        printResult('Test H — Owner cleanup', 'PASS')
      } else {
        statuses.set('H', 'FAIL')
        printResult('Test H — Owner cleanup', 'FAIL', 'incomplete_cleanup')
      }
    } else if (state.recoveryRequired || state.interrupted || state.fatalFailure) {
      cleanupFailures = [{ error: { phase: 'cleanup', status: null, code: 'manual_recovery_required' } }]
      statuses.set('H', 'FAIL')
      printResult('Test H — Owner cleanup', 'FAIL', 'manual_recovery_required')
    } else {
      statuses.set('H', 'NOT RUN')
    }

    if (cleanupFailures.length > 0 || state.recoveryRequired || state.recoveryEvidenceRequired || state.interrupted || state.fatalFailure) {
      manifestResult = persistRecoveryManifest(runId, ledger, cleanupFailures, state)
      if (manifestResult.ok) {
        printResult('Sanitized recovery manifest', 'PERSISTED')
      } else {
        printResult('Sanitized recovery manifest', 'MANUAL REQUIRED', 'write_failed')
      }
    }

    removeProcessHandlers()
    reportFinal()
  }

  return exitCode
}

async function main() {
  let flags
  try {
    flags = parseFlags(process.argv.slice(2))
  } catch (error) {
    console.log(`CLI validation: FAIL (${error.message.split('\n')[0]})`)
    process.exitCode = 2
    return
  }

  if (flags.selfCheck) {
    try {
      runSelfCheck()
    } catch {
      printResult('Offline self-check', 'FAIL', 'sanitized_validation_failure')
      process.exitCode = 1
    }
    return
  }

  process.exitCode = await runExecute()
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main()
}

export {
  TEST_LETTERS,
  allLedgerEntries,
  beginInsertAttempt,
  cleanupLedger,
  createLedger,
  createRecoveryState,
  insertTask,
  insertResponseNeedsRecovery,
  isContextualSpoofRlsRejection,
  isRecognizableTasksRlsWithCheck,
  isRunSuccessful,
  isSameOriginalTaskRow,
  isValidSpoofContext,
  markFatalFailure,
  normalizedResponse,
  recoverInsertOutcome,
  recoveryManifest,
  recordLedger,
  safeCode,
}
