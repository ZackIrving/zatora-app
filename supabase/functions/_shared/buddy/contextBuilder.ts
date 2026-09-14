import type {
  BuddyContext,
  BuddyHabit,
  BuddyTask,
} from './types.ts'

import { estimateFocusMinutes } from './focusEstimator.ts'
import { calculateMomentum } from './momentum.ts'
import { buildTimeContext } from './timeContext.ts'
import {
  calculateWorkload,
  calculateWorkloadProfile,
} from './workload.ts'

const MAX_CONTEXT_TASKS = 200
const MAX_CONTEXT_HABITS = 100
const MAX_CONTEXT_TEXT_LENGTH = 500

export class BuddyContextQueryError extends Error {
  readonly source: string

  constructor(source: string) {
    super('Buddy context query failed')
    this.name = 'BuddyContextQueryError'
    this.source = source
  }
}

function assertQuerySucceeded(
  source: string,
  result: { error?: unknown }
): void {
  if (result.error) throw new BuddyContextQueryError(source)
}

function boundText(value: string): string {
  return Array.from(value).slice(0, MAX_CONTEXT_TEXT_LENGTH).join('')
}

function boundNullableText(value: string | null): string | null {
  return value === null ? null : boundText(value)
}

export async function buildBuddyContext(
  supabase: any,
  callerId: string
): Promise<BuddyContext> {
  const [
    tasksResult,
    habitsResult,
    progressResult,
    pomodorosResult,
    streakResult,
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        'title,category,energy,time,reward,done,recurring,recurrence,created_at'
      )
      .eq('user_id', callerId)
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_TASKS),

    supabase
      .from('habits')
      .select('name,completed_today,created_at')
      .eq('user_id', callerId)
      .order('created_at', { ascending: false })
      .limit(MAX_CONTEXT_HABITS),

    supabase
      .from('user_progress')
      .select('xp,level')
      .eq('user_id', callerId)
      .maybeSingle(),

    supabase
      .from('pomodoro_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', callerId)
      .eq('completed', true),

    supabase
      .from('user_stats')
      .select('current_streak')
      .eq('user_id', callerId)
      .maybeSingle(),
  ])

  assertQuerySucceeded('tasks', tasksResult)
  assertQuerySucceeded('habits', habitsResult)
  assertQuerySucceeded('user_progress', progressResult)
  assertQuerySucceeded('pomodoro_sessions', pomodorosResult)
  assertQuerySucceeded('user_stats', streakResult)

  const typedTasks = ((tasksResult.data || []) as BuddyTask[]).map(
    (task) => ({
      ...task,
      title: boundText(task.title),
      category: boundNullableText(task.category),
      energy: boundNullableText(task.energy),
      time: boundNullableText(task.time),
      recurrence: boundNullableText(task.recurrence),
    })
  )
  const typedHabits = ((habitsResult.data || []) as BuddyHabit[]).map(
    (habit) => ({
      ...habit,
      name: boundText(habit.name),
    })
  )

  const activeTasks = typedTasks.filter(
    (task) => !task.done
  )

  const completedTasks = typedTasks.filter(
    (task) => task.done
  )

  const completedHabits = typedHabits.filter(
    (habit) => habit.completed_today
  )

  const remainingHabits = typedHabits.filter(
    (habit) => !habit.completed_today
  )

  const completedPomodoros =
    pomodorosResult.count ?? 0

  const currentStreak =
    streakResult.data?.current_streak ?? 0

  const estimatedFocusMinutes =
    estimateFocusMinutes(activeTasks)

  const workload = calculateWorkload(
    activeTasks.length
  )

  const workloadProfile = calculateWorkloadProfile({
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    estimatedFocusMinutes,
  })

  const momentum = calculateMomentum({
    completedTasks: completedTasks.length,
    remainingTasks: activeTasks.length,
    completedHabits: completedHabits.length,
    completedPomodoros,
    currentStreak,
  })

  const timeContext = buildTimeContext()

  return {
    snapshot: {
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      habitsRemaining: remainingHabits.length,
      xp: progressResult.data?.xp ?? 0,
      level: progressResult.data?.level ?? 1,
      completedPomodoros,
      momentum,
    },

    timeContext,

    previousDay: {
      completedTasks: 0,
      completedHabits: 0,
      completedPomodoros: 0,
    },

    currentDay: {
      activeTasks: activeTasks.length,
      remainingHabits: remainingHabits.length,
      estimatedFocusMinutes,
    },

    userProgress: {
      xp: progressResult.data?.xp ?? 0,
      level: progressResult.data?.level ?? 1,
      currentStreak,
    },

    workload,

    workloadProfile,

    tasks: typedTasks,

    habits: typedHabits,
  }
}
