import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { buildDeleteConfirmation } from '../mobile/src/tasks/deleteConfirmation.ts'
import { TaskSession } from '../mobile/src/tasks/taskSession.ts'

const task = (id, userId, title, done = false) => ({
  id,
  user_id: userId,
  title,
  done,
  created_at: `2026-10-20T00:00:0${id}.000Z`,
})
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function gatewayFixture({ loads = {}, loadError = null } = {}) {
  const calls = []
  let nextId = 20
  const gateway = {
    calls,
    async loadTasks(userId) {
      calls.push(['load', userId])
      if (loadError) throw loadError
      return (loads[userId] ?? []).map((row) => ({ ...row }))
    },
    async createTask(userId, title) {
      calls.push(['create', userId, title])
      const created = task(nextId++, userId, title)
      return created
    },
    async editTask(userId, id, title) {
      calls.push(['edit', userId, id, title])
      const existing = [...(loads[userId] ?? [])].find((row) => row.id === id) ?? task(id, userId, title)
      return { ...existing, title }
    },
    async setTaskDone(userId, id, done) {
      calls.push(['done', userId, id, done])
      const existing = [...(loads[userId] ?? [])].find((row) => row.id === id) ?? task(id, userId, 'unknown')
      return { ...existing, done }
    },
    async deleteTask(userId, id) {
      calls.push(['delete', userId, id])
    },
  }
  return gateway
}

test('account-scoped reads reset state and preserve numeric bigint task IDs', async () => {
  const gateway = gatewayFixture({
    loads: {
      'account-a': [task(101, 'account-a', 'A task')],
      'account-b': [task(202, 'account-b', 'B task')],
    },
  })
  const session = new TaskSession(gateway)

  await session.setUser('account-a')
  assert.deepEqual(session.getState().tasks.map(({ id, user_id }) => ({ id, user_id })), [{ id: 101, user_id: 'account-a' }])
  await session.setUser('account-b')
  assert.deepEqual(session.getState().tasks.map(({ id, user_id }) => ({ id, user_id })), [{ id: 202, user_id: 'account-b' }])
  assert.equal(typeof session.getState().tasks[0].id, 'number')
})

test('stale account load and mutation results cannot update the next account', async () => {
  const loads = { a: deferred(), b: deferred() }
  const calls = []
  const gateway = {
    calls,
    loadTasks: (userId) => { calls.push(['load', userId]); return loads[userId].promise },
    createTask: async () => task(1, 'unused', 'unused'),
    editTask: () => loads.a.promise,
    setTaskDone: async () => task(1, 'unused', 'unused'),
    deleteTask: async () => {},
  }
  const session = new TaskSession(gateway)
  const pendingA = session.setUser('a')
  const pendingB = session.setUser('b')
  loads.a.resolve([task(1, 'a', 'A task')])
  loads.b.resolve([task(2, 'b', 'B task')])
  await Promise.all([pendingA, pendingB])
  assert.deepEqual(session.getState().tasks.map((row) => row.user_id), ['b'])

  const editPending = session.edit(2, 'stale edit')
  await session.setUser(null)
  await session.setUser('b')
  await editPending
  assert.equal(session.getState().tasks[0].title, 'B task')
})

test('create, edit, complete, reopen, and delete use confirmed gateway results', async () => {
  const gateway = gatewayFixture({ loads: { owner: [task(7, 'owner', 'Original')] } })
  const session = new TaskSession(gateway)
  await session.setUser('owner')

  assert.equal((await session.create('New task')).ok, true)
  assert.equal(session.getState().tasks.at(-1).title, 'New task')
  assert.equal((await session.edit(7, 'Renamed')).ok, true)
  assert.equal(session.getState().tasks.find((row) => row.id === 7).title, 'Renamed')
  assert.equal((await session.setDone(7, true)).ok, true)
  assert.equal(session.getState().tasks.find((row) => row.id === 7).done, true)
  assert.equal((await session.setDone(7, false)).ok, true)
  assert.equal(session.getState().tasks.find((row) => row.id === 7).done, false)
  assert.equal((await session.delete(7)).ok, true)
  assert.equal(session.getState().tasks.some((row) => row.id === 7), false)
  assert.deepEqual(gateway.calls.slice(1), [
    ['create', 'owner', 'New task'],
    ['edit', 'owner', 7, 'Renamed'],
    ['done', 'owner', 7, true],
    ['done', 'owner', 7, false],
    ['delete', 'owner', 7],
  ])
})

test('failed mutations preserve confirmed state and expose recoverable errors', async () => {
  const gateway = gatewayFixture({ loads: { owner: [task(3, 'owner', 'Keep me')] } })
  gateway.editTask = async () => { throw new Error('Failed to fetch') }
  gateway.deleteTask = async () => { throw new Error('server unavailable') }
  const session = new TaskSession(gateway)
  await session.setUser('owner')
  const edit = await session.edit(3, 'Do not lose this input')
  assert.equal(edit.ok, false)
  assert.equal(session.getState().tasks[0].title, 'Keep me')
  assert.equal(session.getState().mutationFailure.kind, 'offline')
  const deletion = await session.delete(3)
  assert.equal(deletion.ok, false)
  assert.equal(session.getState().tasks[0].title, 'Keep me')
  assert.match(session.getState().mutationFailure.message, /could not be deleted/i)
})

test('loading, empty, server error, and offline states are distinct', async () => {
  const emptyGateway = gatewayFixture({ loads: { owner: [] } })
  const emptySession = new TaskSession(emptyGateway)
  await emptySession.setUser('owner')
  assert.equal(emptySession.getState().loadStatus, 'ready')
  assert.deepEqual(emptySession.getState().tasks, [])

  const offlineSession = new TaskSession(gatewayFixture({ loadError: new Error('network request failed') }))
  await offlineSession.setUser('owner')
  assert.equal(offlineSession.getState().loadStatus, 'error')
  assert.equal(offlineSession.getState().loadFailure.kind, 'offline')

  const serverSession = new TaskSession(gatewayFixture({ loadError: new Error('500 from API') }))
  await serverSession.setUser('owner')
  assert.equal(serverSession.getState().loadFailure.kind, 'server')
})

test('delete confirmation requires the destructive button callback', () => {
  let deleted = 0
  const confirmation = buildDeleteConfirmation('Remove this', () => { deleted += 1 })
  assert.equal(confirmation.buttons[0].style, 'cancel')
  assert.equal(deleted, 0)
  confirmation.buttons[1].onPress()
  assert.equal(deleted, 1)
})

test('blank titles fail validation without a gateway mutation', async () => {
  const gateway = gatewayFixture({ loads: { owner: [] } })
  const session = new TaskSession(gateway)
  await session.setUser('owner')
  const result = await session.create('   ')
  assert.equal(result.ok, false)
  assert.equal(result.validation, true)
  assert.equal(gateway.calls.filter(([name]) => name === 'create').length, 0)
})

test('the native Supabase gateway preserves the verified ownership and bigint contract', () => {
  const source = readFileSync(new URL('../mobile/src/tasks/taskRepository.ts', import.meta.url), 'utf8')
  assert.match(source, /\.from\('tasks'\)/g)
  assert.match(source, /\.eq\('user_id', userId\)/g)
  assert.match(source, /\.eq\('id', taskId\)/g)
  assert.match(source, /typeof row\.id === 'number'/)
  assert.match(source, /Number\.isSafeInteger\(row\.id\)/)
  assert.doesNotMatch(source, /service_role|SUPABASE_SECRET_KEY/i)
})
