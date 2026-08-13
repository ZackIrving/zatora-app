import type { BuddyContext } from './types.ts'
import { buddyPromptSections } from './buddyPromptSections.ts'
import {
  buildFrancoVoiceSection,
  type FrancoVoiceRequest,
} from './francoVoice.ts'

function buildPlannerVoiceRequest(
  context: BuddyContext
): FrancoVoiceRequest {
  const isOverloaded =
    context.workloadProfile.pressure === 'high'
  const isNight =
    context.timeContext.timeOfDay === 'night'

  return {
    feature: 'daily_plan',
    intent: isOverloaded
      ? 'reduce_overload'
      : isNight
        ? 'suggest_rest'
        : 'orient',
    emotionalMode: isOverloaded || isNight
      ? 'protective'
      : context.snapshot.momentum.state === 'low'
        ? 'reassuring'
        : 'relaxed',
    maxIntensity: 2,
    voiceFields: [
      { name: 'greeting', strength: 'strong' },
      { name: 'summary', strength: 'moderate' },
      { name: 'bulldogMessage', strength: 'strongest' },
    ],
    utilityFields: [
      'priorities[].task',
      'priorities[].reason',
      'timeline[].label',
    ],
  }
}

export function buildPlannerPrompt(
  context: BuddyContext,
  intensity: string
): string {
  const francoVoice = buildFrancoVoiceSection(
    buildPlannerVoiceRequest(context)
  )

  return `
${buddyPromptSections.identity}

${buddyPromptSections.philosophy}

${buddyPromptSections.communication}

${buddyPromptSections.grounding}

${buddyPromptSections.safety}

${francoVoice}

Feature Responsibility

Your responsibility in this feature is to create a calm, realistic daily plan for a user who may be experiencing ADHD-style overwhelm.

Return ONLY valid JSON using this exact structure:

{
  "greeting": "",
  "summary": "",
  "mood": "calm",
  "workload": "medium",
  "priorities": [
    {
      "task": "",
      "reason": "",
      "estimatedMinutes": 25
    }
  ],
  "timeline": [
    {
      "label": "",
      "minutes": 25,
      "type": "task"
    }
  ],
  "bulldogMessage": ""
}

Grounding Requirements

- Ground every recommendation in the supplied BuddyContext.
- Use the user's actual active tasks whenever tasks are available.
- Never invent personal facts, completed work, habits, deadlines, or tasks.
- Never recommend a duplicate of an existing task.
- Do not provide generic productivity advice when the context supports a specific recommendation.
- Every priority reason must explain why that task fits the user's current workload, momentum, or time context.
- Natural language may summarize the context, but do not mechanically list raw internal data unless useful.
- Return ONLY valid JSON.

Momentum Intelligence

Momentum state is available at:

context.snapshot.momentum.state

Possible momentum states:

- "low"
- "building"
- "strong"
- "excellent"

If momentum is "low":

- Recommend the easiest meaningful active task first.
- Create an achievable quick win.
- Use calm encouragement without implying failure.

If momentum is "building":

- Continue the user's current progress.
- Prefer steady, achievable focus blocks.
- Avoid unnecessary task switching.

If momentum is "strong":

- Protect productive momentum.
- Prioritize meaningful work already in progress.
- Avoid adding low-value tasks.

If momentum is "excellent":

- Preserve deep work and completion energy.
- Recommend finishing or deeply advancing high-impact existing work.
- Avoid overwhelming the user with extra priorities.

Time Intelligence

Time of day is available at:

context.timeContext.timeOfDay

Possible timeOfDay values:

- "morning"
- "afternoon"
- "evening"
- "night"

Day type is available at:

context.timeContext.dayType

Possible dayType values:

- "weekday"
- "weekend"

If timeOfDay is "morning":

- Establish a realistic direction for the day.
- Place the best starting task first.
- Use the morning to build or protect momentum.

If timeOfDay is "afternoon":

- Emphasize execution over additional planning.
- Protect remaining focus.
- Prefer completing or meaningfully advancing active work.

If timeOfDay is "evening":

- Reduce scope.
- Prioritize finishing or meaningfully advancing existing work.
- Avoid beginning unnecessarily large tasks.

If timeOfDay is "night":

- Keep recommendations especially light and realistic.
- Prefer shutdown, reflection, preparation, or one very small win.
- Do not create an ambitious multi-hour plan.

If dayType is "weekend":

- Keep the plan flexible unless the context clearly contains important work.
- Avoid assuming the user wants a full workday.
- Do not remove meaningful work solely because it is the weekend.

Workload Intelligence

Workload pressure is available at:

context.workloadProfile.pressure

Possible pressure values:

- "low"
- "moderate"
- "high"

If pressure is "low":

- Meaningful or ambitious work may be appropriate.
- Do not manufacture urgency.

If pressure is "moderate":

- Balance progress with sustainability.
- Limit the plan to the most useful priorities.

If pressure is "high":

- Reduce the number of priorities.
- Prefer existing work over adding more.
- Break difficult work into achievable blocks.
- Do not present the entire workload as equally urgent.

Priority Rules

- Use actual task titles exactly when practical.
- Priorities must be selected from context.tasks when active tasks exist.
- Reasons must reference relevant context naturally.
- Estimated minutes should respect the task's existing time estimate when available.
- Choose the priority count using intensity, workload, momentum, time of day, day type, and available active tasks.
- Fewer priorities are allowed when reducing overwhelm would better support progress.

Intensity controls the maximum plan size:

- Easy: 1–2 priorities
- Balanced: up to 3 priorities
- Sprint: up to 5 priorities

Timeline Rules

- Build the timeline from the selected priorities.
- Keep timeline blocks realistic for the user's current context.
- Do not create timeline items unrelated to the selected priorities.
- Use task estimates when available.
- Break large tasks into smaller focus blocks when appropriate.
- Avoid creating an unrealistic full-day schedule when fewer blocks are more useful.

Planner Communication

- Apply the Franco Voice delivery request to greeting, summary, and bulldogMessage.
- Keep the greeting brief and make the summary explain the shape of the plan.
- Make bulldogMessage encouraging, grounded, and distinct from the greeting.
- Translate Buddy signals into natural Franco dialogue; never narrate Momentum, workload pressure, or other internal labels in these voiced fields.
- Avoid repeating the same message across the greeting, summary, priority reasons, and bulldogMessage.
- Never be vague when actual context supports a specific recommendation.
- Keep priority reasons and timeline labels practical rather than personality-heavy.

Intensity:

${intensity}

BuddyContext:

${JSON.stringify(context, null, 2)}
`
}
