import assert from 'node:assert/strict'
import test from 'node:test'

import {
  beginInsertAttempt,
  cleanupLedger,
  createLedger,
  createRecoveryState,
  insertTask,
  insertResponseNeedsRecovery,
  isContextualSpoofRlsRejection,
  isRunSuccessful,
  isSameOriginalTaskRow,
  isValidSpoofContext,
  markFatalFailure,
  normalizedResponse,
  recoverInsertOutcome,
  recoveryManifest,
  safeCode,
} from './verify-m6-two-account-tasks-rls.mjs'

const IDS = Object.freeze({
  A: '11111111-1111-4111-8111-111111111111',
  B: '22222222-2222-4222-8222-222222222222',
  ONE: '33333333-3333-4333-8333-333333333333',
  TWO: '44444444-4444-4444-8444-444444444444',
  OTHER: '55555555-5555-4555-8555-555555555555',
})

function mockClient(resolver) {
  return {
    from(table) {
      let operation = 'select'
      let payload = null
      const filters = []
      const query = {
        select() {
          return query
        },
        eq(column, value) {
          filters.push([column, value])
          return query
        },
        limit() {
          return query
        },
        insert(value) {
          operation = 'insert'
          payload = value
          return query
        },
        update(value) {
          operation = 'update'
          payload = value
          return query
        },
        delete() {
          operation = 'delete'
          return query
        },
        then(resolve, reject) {
          try {
            const response = resolver({ table, operation, payload, filters })
            if (response?.throw) return Promise.reject(response.throw).then(resolve, reject)
            return Promise.resolve(response).then(resolve, reject)
          } catch (error) {
            return Promise.reject(error).then(resolve, reject)
          }
        },
      }
      return query
    },
  }
}

function taskRow(id, ownerId, title = 'qa-title') {
  return {
    id,
    user_id: ownerId,
    title,
    done: false,
    created_at: '2026-10-11T00:00:00.000Z',
  }
}

test('spoof classification distinguishes RLS, privilege, JWT, SQL, and transport failures', () => {
  const rls = { code: '42501', status: 403, message: 'new row violates row-level security policy for table "tasks"' }
  const rlsResult = normalizedResponse({ data: [], error: rls }, 'spoof_insert')
  assert.equal(safeCode(rls), 'rls_denied')
  assert.equal(isContextualSpoofRlsRejection(rlsResult), true)

  const privilege = { code: '42501', status: 403, message: 'permission denied for table "tasks"' }
  assert.equal(safeCode(privilege), 'ambiguous_42501')
  assert.equal(isContextualSpoofRlsRejection(normalizedResponse({ data: [], error: privilege }, 'spoof_insert')), false)

  const jwt = { code: 'PGRST301', status: 401, message: 'JWT verification failed' }
  assert.equal(safeCode(jwt), 'jwt_verification_failed')
  assert.equal(isContextualSpoofRlsRejection(normalizedResponse({ data: [], error: jwt }, 'spoof_insert')), false)

  const sql = { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' }
  assert.equal(safeCode(sql), '23505')
  assert.equal(isContextualSpoofRlsRejection(normalizedResponse({ data: [], error: sql }, 'spoof_insert')), false)

  const transport = { code: 'transport_failure', status: null }
  assert.equal(isContextualSpoofRlsRejection(normalizedResponse({ data: [], error: transport }, 'spoof_insert')), false)
})

test('spoof classification uses the PostgREST response status without broadening 42501', () => {
  const rlsError = {
    code: '42501',
    message: 'new row violates row-level security policy for table "tasks"',
    details: null,
    hint: null,
  }
  const rlsResult = normalizedResponse({ data: null, error: rlsError, status: 403 }, 'spoof_insert')
  assert.deepEqual(rlsResult.error, { phase: 'spoof_insert', status: 403, code: 'rls_denied' })
  assert.equal(isContextualSpoofRlsRejection(rlsResult), true)

  const privilegeResult = normalizedResponse({
    data: null,
    error: { ...rlsError, message: 'permission denied for table tasks' },
    status: 403,
  }, 'spoof_insert')
  assert.deepEqual(privilegeResult.error, { phase: 'spoof_insert', status: 403, code: 'ambiguous_42501' })
  assert.equal(isContextualSpoofRlsRejection(privilegeResult), false)

  const missingStatusResult = normalizedResponse({ data: null, error: rlsError }, 'spoof_insert')
  assert.deepEqual(missingStatusResult.error, { phase: 'spoof_insert', status: null, code: 'ambiguous_42501' })
  assert.equal(isContextualSpoofRlsRejection(missingStatusResult), false)
})

test('spoof context rejects a wrong authenticated B identity', () => {
  assert.equal(isValidSpoofContext({
    ownerInsertAndReadPassed: true,
    actualBId: IDS.B,
    expectedBId: IDS.B,
    attemptedUserId: IDS.A,
    expectedAId: IDS.A,
  }), true)
  assert.equal(isValidSpoofContext({
    ownerInsertAndReadPassed: true,
    actualBId: IDS.OTHER,
    expectedBId: IDS.B,
    attemptedUserId: IDS.A,
    expectedAId: IDS.A,
  }), false)
})

test('multiple recovery candidates remain ambiguous with exact candidate IDs', async () => {
  const state = createRecoveryState()
  const ledger = createLedger()
  const attempt = beginInsertAttempt(state, 'A', IDS.A, 'marker', 'owner_A_insert')
  const client = mockClient(() => ({
    data: [taskRow(IDS.ONE, IDS.A, 'marker'), taskRow(IDS.TWO, IDS.A, 'marker')],
    error: null,
  }))

  const result = await recoverInsertOutcome(state, ledger, attempt, client)
  assert.equal(result.status, 'ambiguous')
  assert.deepEqual(attempt.recoveredIds, [IDS.ONE, IDS.TWO])
  assert.equal(ledger.A.size, 0)
  assert.equal(state.recoveryRequired, true)
})

test('timeout after server-side insert commit is recovered by owner and exact marker', async () => {
  const insertClient = mockClient(({ operation }) => (
    operation === 'insert' ? { throw: new Error('request timed out after commit') } : { data: [], error: null }
  ))
  const inserted = await insertTask(insertClient, IDS.A, 'marker', 'owner_A_insert')
  assert.equal(inserted.error.code, 'transport_failure')

  const state = createRecoveryState()
  const ledger = createLedger()
  const attempt = beginInsertAttempt(state, 'A', IDS.A, 'marker', 'owner_A_insert')
  const ownerClient = mockClient(() => ({ data: [taskRow(IDS.ONE, IDS.A, 'marker')], error: null }))
  const recovered = await recoverInsertOutcome(state, ledger, attempt, ownerClient)
  assert.equal(recovered.status, 'recovered')
  assert.equal(ledger.A.has(IDS.ONE), true)
  assert.deepEqual(attempt.recoveredIds, [IDS.ONE])
})

test('numeric bigint task IDs pass the insert contract and remain exact through recovery cleanup', async () => {
  const numericTaskId = 731
  const row = taskRow(numericTaskId, IDS.A, 'numeric-marker')
  assert.equal(insertResponseNeedsRecovery({ data: [row], error: null }, IDS.A, 'numeric-marker'), false)
  for (const unsafeId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(
      insertResponseNeedsRecovery({ data: [taskRow(unsafeId, IDS.A, 'numeric-marker')], error: null }, IDS.A, 'numeric-marker'),
      true
    )
  }

  const state = createRecoveryState()
  const ledger = createLedger()
  const attempt = beginInsertAttempt(state, 'A', IDS.A, 'numeric-marker', 'owner_A_insert')
  const ownerClient = mockClient(({ operation, filters }) => {
    if (operation === 'delete') {
      assert.deepEqual(filters, [['id', numericTaskId], ['user_id', IDS.A]])
      return { data: [{ id: numericTaskId }], error: null }
    }
    if (filters.some(([column]) => column === 'title')) return { data: [row], error: null }
    return { data: [], error: null }
  })

  const recovered = await recoverInsertOutcome(state, ledger, attempt, ownerClient)
  assert.equal(recovered.status, 'recovered')
  assert.equal(ledger.A.get(String(numericTaskId)).id, numericTaskId)
  assert.deepEqual(attempt.recoveredIds, [String(numericTaskId)])

  const failures = await cleanupLedger(ledger, { A: { client: ownerClient } })
  assert.deepEqual(failures, [])
})

test('cleanup deadline exhaustion retains unresolved ledger evidence', async () => {
  const ledger = createLedger()
  ledger.A.set(IDS.ONE, { id: IDS.ONE, owner: 'A', ownerId: IDS.A, title: 'marker', source: 'test' })
  const failures = await cleanupLedger(ledger, { A: { client: mockClient(() => { throw new Error('must not request') }) } }, {
    deadlineMs: 0,
    now: () => 100,
  })
  assert.equal(failures.length, 1)
  assert.equal(failures[0].error.code, 'cleanup_deadline_exceeded')
})

test('signal during cleanup prevents an overall success result', async () => {
  const state = createRecoveryState()
  const ledger = createLedger()
  ledger.A.set(IDS.ONE, { id: IDS.ONE, owner: 'A', ownerId: IDS.A, title: 'marker', source: 'test' })
  const client = mockClient(({ operation }) => {
    if (operation === 'delete') {
      state.interrupted = true
      return { data: [{ id: IDS.ONE }], error: null }
    }
    return { data: [], error: null }
  })
  const failures = await cleanupLedger(ledger, { A: { client } }, { now: () => 100, deadlineMs: 30_000 })
  const statuses = new Map(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letter) => [letter, 'PASS']))
  assert.equal(failures.length, 0)
  assert.equal(isRunSuccessful(statuses, failures, state), false)
})

test('cleanup rejects a malformed response containing the wrong task ID', async () => {
  const ledger = createLedger()
  ledger.A.set(IDS.ONE, { id: IDS.ONE, owner: 'A', ownerId: IDS.A, title: 'marker', source: 'test' })
  const client = mockClient(({ operation }) => (
    operation === 'delete' ? { data: [{ id: IDS.OTHER }], error: null } : { data: [], error: null }
  ))
  const failures = await cleanupLedger(ledger, { A: { client } })
  assert.equal(failures.length, 1)
  assert.equal(failures[0].error.code, 'cleanup_response_mismatch')
})

test('unexpected exception before ledger recording forces recovery evidence', () => {
  const state = createRecoveryState()
  beginInsertAttempt(state, 'A', IDS.A, 'marker', 'owner_A_insert')
  markFatalFailure(state)
  const manifest = recoveryManifest('run', createLedger(), [], state)
  assert.equal(manifest.fatalFailure, true)
  assert.equal(manifest.recoveryRequired, true)
  assert.equal(manifest.unresolvedInserts[0].status, 'pending')
})

test('full-row owner verification catches id, user_id, and created_at differences', () => {
  const original = taskRow(IDS.ONE, IDS.A)
  assert.equal(isSameOriginalTaskRow(original, original), true)
  for (const field of ['id', 'user_id', 'created_at']) {
    const changed = { ...original, [field]: field === 'created_at' ? '2026-10-12T00:00:00.000Z' : IDS.OTHER }
    assert.equal(isSameOriginalTaskRow(changed, original), false, field)
  }
})
