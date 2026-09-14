export class InvalidAIResponseError extends Error {
  constructor() {
    super('AI response failed validation')
    this.name = 'InvalidAIResponseError'
  }
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoundedString(
  value: unknown,
  maxLength: number,
  allowEmpty = false
): value is string {
  return (
    typeof value === 'string' &&
    (allowEmpty || value.trim().length > 0) &&
    Array.from(value).length <= maxLength
  )
}

function isBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}

function parseObject(outputText: string): JsonRecord {
  let parsed: unknown

  try {
    parsed = JSON.parse(outputText)
  } catch {
    throw new InvalidAIResponseError()
  }

  if (!isRecord(parsed)) throw new InvalidAIResponseError()
  return parsed
}

export function validateCoachResponse(outputText: string): JsonRecord {
  const parsed = parseObject(outputText)

  const validTasks =
    Array.isArray(parsed.tasks) &&
    parsed.tasks.length <= 8 &&
    parsed.tasks.every(
      (task) =>
        isRecord(task) &&
        isBoundedString(task.title, 500) &&
        isBoundedString(task.category, 100) &&
        isBoundedString(task.energy, 100) &&
        isBoundedString(task.time, 100) &&
        isBoundedNumber(task.reward, 0, 10_000)
    )

  if (
    !isBoundedString(parsed.summary, 2_000) ||
    !validTasks ||
    !isBoundedString(parsed.startHere, 1_000, true) ||
    !isBoundedString(parsed.encouragement, 1_000, true)
  ) {
    throw new InvalidAIResponseError()
  }

  return parsed
}

export function validatePlannerResponse(outputText: string): JsonRecord {
  const parsed = parseObject(outputText)

  const validPriorities =
    Array.isArray(parsed.priorities) &&
    parsed.priorities.length <= 5 &&
    parsed.priorities.every(
      (priority) =>
        isRecord(priority) &&
        isBoundedString(priority.task, 500) &&
        isBoundedString(priority.reason, 1_000) &&
        isBoundedNumber(priority.estimatedMinutes, 1, 1_440)
    )

  const validTimeline =
    Array.isArray(parsed.timeline) &&
    parsed.timeline.length <= 12 &&
    parsed.timeline.every(
      (item) =>
        isRecord(item) &&
        isBoundedString(item.label, 500) &&
        isBoundedNumber(item.minutes, 1, 1_440) &&
        isBoundedString(item.type, 100)
    )

  if (
    !isBoundedString(parsed.greeting, 1_000, true) ||
    !isBoundedString(parsed.summary, 2_000, true) ||
    !isBoundedString(parsed.mood, 100) ||
    !isBoundedString(parsed.workload, 100) ||
    !validPriorities ||
    !validTimeline ||
    !isBoundedString(parsed.bulldogMessage, 1_000, true)
  ) {
    throw new InvalidAIResponseError()
  }

  return parsed
}
