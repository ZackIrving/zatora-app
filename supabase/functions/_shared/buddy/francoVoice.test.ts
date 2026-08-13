import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCoachPrompt } from './coachPrompt.ts'
import {
  buildFrancoVoiceSection,
  type FrancoVoiceField,
  type FrancoVoiceRequest,
} from './francoVoice.ts'
import { buildPlannerPrompt } from './plannerPrompt.ts'
import type { BuddyContext } from './types.ts'

interface ContextOptions {
  momentum?: BuddyContext['snapshot']['momentum']['state']
  pressure?: BuddyContext['workloadProfile']['pressure']
  timeOfDay?: BuddyContext['timeContext']['timeOfDay']
}

function voiceField(
  name: string,
  strength: FrancoVoiceField['strength'] = 'strong'
): FrancoVoiceField {
  return { name, strength }
}

function makeContext(options: ContextOptions = {}): BuddyContext {
  const momentum = options.momentum ?? 'building'
  const pressure = options.pressure ?? 'moderate'
  const timeOfDay = options.timeOfDay ?? 'afternoon'

  return {
    userId: 'controlled-test-user',
    snapshot: {
      activeTasks: 2,
      completedTasks: 1,
      habitsRemaining: 1,
      xp: 120,
      level: 2,
      completedPomodoros: 1,
      momentum: {
        score: momentum === 'low' ? 10 : momentum === 'building' ? 40 : 70,
        state: momentum,
      },
    },
    timeContext: {
      timeOfDay,
      dayType: 'weekday',
      hour: timeOfDay === 'morning' ? 9 : timeOfDay === 'night' ? 22 : 14,
    },
    previousDay: {
      completedTasks: 0,
      completedHabits: 0,
      completedPomodoros: 0,
    },
    currentDay: {
      activeTasks: 2,
      remainingHabits: 1,
      estimatedFocusMinutes: pressure === 'high' ? 210 : 50,
    },
    userProgress: {
      xp: 120,
      level: 2,
      currentStreak: 1,
    },
    workload: pressure === 'high' ? 'heavy' : 'light',
    workloadProfile: {
      level: pressure === 'high' ? 'heavy' : 'light',
      pressure,
      activeTasks: 2,
      completedTasks: 1,
      estimatedFocusMinutes: pressure === 'high' ? 210 : 50,
      averageTaskMinutes: pressure === 'high' ? 105 : 25,
    },
    tasks: [],
    habits: [],
  }
}

test('Franco Voice preserves role separation and safety constraints', () => {
  const section = buildFrancoVoiceSection({
    feature: 'daily_plan',
    intent: 'orient',
    emotionalMode: 'relaxed',
    maxIntensity: 2,
    voiceFields: [voiceField('greeting')],
    utilityFields: ['priorities[].task'],
  })

  assert.match(section, /determines only how that established purpose is communicated/)
  assert.match(section, /Never recalculate, contradict, or add to supplied task state/)
  assert.match(section, /companion, not a productivity authority/)
  assert.match(section, /Franco jokes about himself, never about the user's ADHD/)
  assert.match(section, /Some responses should have none/)
  assert.match(section, /never as canned lines to copy or randomly select/)
  assert.match(section, /Fields Franco May Voice\s+\n- greeting — strong:/)
  assert.match(section, /Keep These Fields Utility-First\s+\n- priorities\[\]\.task/)
})

test('Franco Voice requires character while translating internal Buddy state', () => {
  const section = buildFrancoVoiceSection({
    feature: 'ai_task_coach',
    intent: 'break_down_task',
    emotionalMode: 'reassuring',
    maxIntensity: 2,
    voiceFields: [
      voiceField('summary', 'moderate'),
      voiceField('encouragement', 'strong'),
    ],
    utilityFields: ['tasks[].title', 'startHere'],
  })

  assert.match(section, /character first and an AI productivity coach second/)
  assert.match(section, /Even without an explicit dog joke/)
  assert.match(section, /one unmistakably Franco turn of phrase/)
  assert.match(section, /silent reasoning inputs, not user-facing vocabulary/)
  assert.match(section, /Do not say that Momentum is low, workload is moderate, or pressure is high/)
  assert.match(section, /Translation changes phrasing, never the underlying recommendation or state/)
  assert.match(section, /at most one explicit nap, snack, supervising, lounging, or bulldog reference/)
  assert.match(section, /five minutes of structure is progress/)
})

const voiceMatrix: Array<{
  scenario: string
  request: FrancoVoiceRequest
}> = [
  {
    scenario: 'Morning + low Momentum',
    request: { feature: 'daily_plan', intent: 'orient', emotionalMode: 'reassuring', maxIntensity: 1, voiceFields: [voiceField('greeting')] },
  },
  {
    scenario: 'Morning + high Momentum',
    request: { feature: 'daily_plan', intent: 'orient', emotionalMode: 'relaxed', maxIntensity: 2, voiceFields: [voiceField('greeting')] },
  },
  {
    scenario: 'Heavy workload',
    request: { feature: 'daily_plan', intent: 'reduce_overload', emotionalMode: 'protective', maxIntensity: 1, voiceFields: [voiceField('summary', 'moderate')] },
  },
  {
    scenario: 'Light workload',
    request: { feature: 'daily_plan', intent: 'orient', emotionalMode: 'relaxed', maxIntensity: 2, voiceFields: [voiceField('summary', 'moderate')] },
  },
  {
    scenario: 'User cannot get started',
    request: { feature: 'ai_task_coach', intent: 'encourage_start', emotionalMode: 'determined', maxIntensity: 2, voiceFields: [voiceField('encouragement')] },
  },
  {
    scenario: 'First task completed',
    request: { feature: 'progress', intent: 'celebrate_task', emotionalMode: 'celebratory', maxIntensity: 2, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Several tasks completed',
    request: { feature: 'progress', intent: 'celebrate_task', emotionalMode: 'celebratory', maxIntensity: 2, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Major achievement',
    request: { feature: 'achievement', intent: 'celebrate_milestone', emotionalMode: 'celebratory', maxIntensity: 3, voiceFields: [voiceField('message', 'strongest')] },
  },
  {
    scenario: 'Missed habits',
    request: { feature: 'progress', intent: 'reflect', emotionalMode: 'reassuring', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Returning after inactivity',
    request: { feature: 'home', intent: 'welcome_back', emotionalMode: 'reassuring', maxIntensity: 2, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Abandoned focus session',
    request: { feature: 'focus', intent: 'recover_from_interruption', emotionalMode: 'reassuring', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Completed focus session',
    request: { feature: 'focus', intent: 'complete_focus', emotionalMode: 'celebratory', maxIntensity: 2, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Late-night overloaded user',
    request: { feature: 'focus', intent: 'suggest_rest', emotionalMode: 'protective', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Legitimate night-owl work session',
    request: { feature: 'focus', intent: 'prepare_focus', emotionalMode: 'determined', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Large Brain Dump',
    request: { feature: 'brain_dump', intent: 'reduce_overload', emotionalMode: 'protective', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Distraction',
    request: { feature: 'distraction_blocker', intent: 'redirect_distraction', emotionalMode: 'determined', maxIntensity: 1, voiceFields: [voiceField('message')] },
  },
  {
    scenario: 'Empty task list',
    request: { feature: 'daily_plan', intent: 'orient', emotionalMode: 'relaxed', maxIntensity: 2, voiceFields: [voiceField('bulldogMessage', 'strongest')] },
  },
  {
    scenario: 'Everything completed',
    request: { feature: 'daily_plan', intent: 'celebrate_milestone', emotionalMode: 'celebratory', maxIntensity: 2, voiceFields: [voiceField('bulldogMessage', 'strongest')] },
  },
  {
    scenario: 'Repeatedly postponed task',
    request: { feature: 'ai_task_coach', intent: 'break_down_task', emotionalMode: 'determined', maxIntensity: 2, voiceFields: [voiceField('encouragement')] },
  },
  {
    scenario: 'Overloaded Daily Plan',
    request: { feature: 'daily_plan', intent: 'reduce_overload', emotionalMode: 'protective', maxIntensity: 1, voiceFields: [voiceField('summary', 'moderate')] },
  },
]

for (const { scenario, request } of voiceMatrix) {
  test(`voice matrix supports: ${scenario}`, () => {
    const section = buildFrancoVoiceSection(request)

    assert.match(section, new RegExp(`Current feature: ${request.feature}`))
    assert.match(section, new RegExp(`Message intent: ${request.intent}`))
    assert.match(section, new RegExp(`Emotional mode: ${request.emotionalMode}`))
    assert.match(section, new RegExp(`Maximum personality intensity: Level ${request.maxIntensity}`))
    assert.match(section, new RegExp(`- ${request.voiceFields[0].name} — ${request.voiceFields[0].strength}:`))
  })
}

test('Daily Planner selects reassuring orientation for morning low Momentum', () => {
  const prompt = buildPlannerPrompt(
    makeContext({ momentum: 'low', pressure: 'low', timeOfDay: 'morning' }),
    'Balanced'
  )

  assert.match(prompt, /Current feature: daily_plan/)
  assert.match(prompt, /Message intent: orient/)
  assert.match(prompt, /Emotional mode: reassuring/)
  assert.match(prompt, /- greeting — strong:/)
  assert.match(prompt, /- summary — moderate:/)
  assert.match(prompt, /- bulldogMessage — strongest:/)
  assert.match(prompt, /- priorities\[\]\.task/)
  assert.match(prompt, /"timeOfDay": "morning"/)
  assert.match(prompt, /"state": "low"/)
})

test('Daily Planner selects protective overload delivery from Buddy pressure', () => {
  const prompt = buildPlannerPrompt(
    makeContext({ momentum: 'strong', pressure: 'high', timeOfDay: 'morning' }),
    'Balanced'
  )

  assert.match(prompt, /Message intent: reduce_overload/)
  assert.match(prompt, /Emotional mode: protective/)
  assert.match(prompt, /"pressure": "high"/)
})

test('Daily Planner protects scope at night without inventing overload state', () => {
  const prompt = buildPlannerPrompt(
    makeContext({ momentum: 'building', pressure: 'low', timeOfDay: 'night' }),
    'Easy'
  )

  assert.match(prompt, /Message intent: suggest_rest/)
  assert.match(prompt, /Emotional mode: protective/)
  assert.match(prompt, /"pressure": "low"/)
  assert.match(prompt, /"timeOfDay": "night"/)
})

test('AI Task Coach uses protective breakdown delivery for low Momentum', () => {
  const prompt = buildCoachPrompt(
    'I cannot get started',
    makeContext({ momentum: 'low', pressure: 'moderate' })
  )

  assert.match(prompt, /Current feature: ai_task_coach/)
  assert.match(prompt, /Message intent: break_down_task/)
  assert.match(prompt, /Emotional mode: protective/)
  assert.match(prompt, /- summary — moderate:/)
  assert.match(prompt, /- encouragement — strong:/)
  assert.match(prompt, /- tasks\[\]\.title/)
  assert.match(prompt, /- startHere/)
  assert.match(prompt, /Keep task titles and startHere immediately actionable/)
})

test('AI Task Coach can use determined delivery when protection is not needed', () => {
  const prompt = buildCoachPrompt(
    'Help me take the next step',
    makeContext({ momentum: 'strong', pressure: 'moderate' })
  )

  assert.match(prompt, /Message intent: break_down_task/)
  assert.match(prompt, /Emotional mode: determined/)
})
