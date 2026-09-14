import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BuddyContextQueryError,
  buildBuddyContext,
} from './contextBuilder.ts'

interface QueryResult {
  count?: number
  data: unknown
  error: unknown
}

class FakeQuery implements PromiseLike<QueryResult> {
  private readonly result: QueryResult

  constructor(result: QueryResult) {
    this.result = result
  }

  select() {
    return this
  }

  eq() {
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  maybeSingle() {
    return this
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

function createClient(
  overrides: Partial<Record<string, QueryResult>> = {}
) {
  const defaults: Record<string, QueryResult> = {
    tasks: {
      data: [
        {
          title: 'a'.repeat(600),
          category: 'Work',
          energy: 'Low',
          time: '10 min',
          reward: 10,
          done: false,
          recurring: false,
          recurrence: null,
          created_at: '2026-09-12T00:00:00Z',
        },
      ],
      error: null,
    },
    habits: {
      data: [
        {
          name: 'Drink water',
          completed_today: false,
          created_at: '2026-09-12T00:00:00Z',
        },
      ],
      error: null,
    },
    user_progress: {
      data: { xp: 20, level: 1 },
      error: null,
    },
    pomodoro_sessions: {
      count: 2,
      data: null,
      error: null,
    },
    user_stats: {
      data: { current_streak: 3 },
      error: null,
    },
  }
  const results = { ...defaults, ...overrides }

  return {
    from(table: string) {
      return new FakeQuery(results[table])
    },
  }
}

test('Buddy context excludes caller UUID and bounds user text', async () => {
  const context = await buildBuddyContext(
    createClient(),
    'private-caller-id'
  )

  assert.equal('userId' in context, false)
  assert.equal(Array.from(context.tasks[0].title).length, 500)
  assert.equal(context.snapshot.completedPomodoros, 2)
})

test('Buddy context fails closed on any source query error', async () => {
  const client = createClient({
    tasks: {
      data: null,
      error: new Error('controlled database failure'),
    },
  })

  await assert.rejects(
    buildBuddyContext(client, 'private-caller-id'),
    (error: unknown) =>
      error instanceof BuddyContextQueryError &&
      error.source === 'tasks'
  )
})
