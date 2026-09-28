export const MAX_SIMPLIFICATION_DEPTH = 2
export const MAX_GUEST_TASK_LENGTH = 500
export const MAX_SIMPLIFIED_TASK_LENGTH = 280
export const MAX_FOLLOW_UP_LENGTH = 180
export const MAX_ACKNOWLEDGEMENT_LENGTH = 180
export const MAX_FRANCO_LINE_LENGTH = 160

export const SUPPORT_NEED_VALUES = [
  'getting_started',
  'staying_focused',
  'keeping_up',
  'consistency',
  'everything',
]

const SUPPORT_NEEDS = new Set(SUPPORT_NEED_VALUES)

function isBoundedString(value, maxLength) {
  return typeof value === 'string' && Array.from(value).length <= maxLength
}

export function normalizeGuestTask(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidGuestTask(value) {
  const task = normalizeGuestTask(value)
  return task.length > 0 && Array.from(task).length <= MAX_GUEST_TASK_LENGTH
}

export function isValidGuestFirstWinRequest({ task, supportNeed, simplificationDepth } = {}) {
  return isValidGuestTask(task) && SUPPORT_NEEDS.has(supportNeed) && Number.isInteger(simplificationDepth) && simplificationDepth >= 0 && simplificationDepth <= MAX_SIMPLIFICATION_DEPTH
}

export function buildGuestFirstWinRequest({ task, supportNeed, simplificationDepth } = {}) {
  if (!isValidGuestFirstWinRequest({ task, supportNeed, simplificationDepth })) return null
  return { task: normalizeGuestTask(task), supportNeed, simplificationDepth }
}

export function isValidGuestFirstWinResult(result, simplificationDepth = 0) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false
  if (!isValidGuestTask(result.tinyFirstStep) || Array.from(result.tinyFirstStep).length > MAX_SIMPLIFIED_TASK_LENGTH) return false
  const followUpLimit = Math.min(2, Math.max(0, MAX_SIMPLIFICATION_DEPTH - simplificationDepth))
  if (!Array.isArray(result.followUpSteps) || result.followUpSteps.length > followUpLimit) return false
  if (!result.followUpSteps.every((item) => typeof item === 'string' && item.trim().length > 0 && Array.from(item).length <= MAX_FOLLOW_UP_LENGTH)) return false
  if (result.acknowledgement !== undefined && !isBoundedString(result.acknowledgement, MAX_ACKNOWLEDGEMENT_LENGTH)) return false
  if (result.francoLine !== undefined && !isBoundedString(result.francoLine, MAX_FRANCO_LINE_LENGTH)) return false
  return true
}

export function createDeterministicFallback(task) {
  return {
    acknowledgement: 'Start with the first visible part of this task.',
    tinyFirstStep: normalizeGuestTask(task),
    followUpSteps: [],
    francoLine: 'We can make it smaller again whenever you want.',
  }
}
