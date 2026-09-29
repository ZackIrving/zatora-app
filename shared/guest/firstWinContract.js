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

function createInitialActivationStep(task) {
  const normalized = normalizeGuestTask(task).toLowerCase()

  if (/\b(study|read|review|learn|course|exam|test)\b/.test(normalized)) return 'Open the material you need for this task.'
  if (/\b(write|draft|essay|report|email|proposal|document)\b/.test(normalized)) return 'Open a blank document for this task.'
  if (/\b(clean|tidy|organize|declutter)\b/.test(normalized)) return 'Choose one small, visible area to start with.'
  if (/\b(call|contact|message|reply|text)\b/.test(normalized)) return 'Open the contact or conversation you need.'
  if (/\b(schedule|book|appointment|meeting)\b/.test(normalized)) return 'Open your calendar.'
  if (/\b(pay|bill|form|file|application|tax)\b/.test(normalized)) return 'Open the bill, form, or file you need.'
  if (/\b(exercise|workout|run|walk)\b/.test(normalized)) return 'Put on the first thing you need to get moving.'
  return 'Put the first thing you need for this task in front of you.'
}

function createSmallerActivationStep(task, depth) {
  const normalized = normalizeGuestTask(task).toLowerCase()

  if (depth === 1) {
    if (normalized.includes('material')) return 'Open the first section you want to work on.'
    if (normalized.includes('blank document')) return 'Type a rough title.'
    if (normalized.includes('visible area')) return 'Pick up one item in that area.'
    if (normalized.includes('contact or conversation')) return 'Find the number or message box.'
    if (normalized.includes('calendar')) return 'Find one possible time.'
    if (normalized.includes('bill, form, or file')) return 'Find the first field or amount you need.'
    if (normalized.includes('get moving')) return 'Stand up with that item ready.'
    return 'Open or uncover the first visible part of this task.'
  }

  if (normalized.includes('section')) return 'Read the first paragraph.'
  if (normalized.includes('rough title')) return 'Type one rough sentence.'
  if (normalized.includes('one item')) return 'Move that one item where it belongs.'
  if (normalized.includes('number or message box')) return 'Type one short sentence or dial the number.'
  if (normalized.includes('possible time')) return 'Choose one time to use.'
  if (normalized.includes('field or amount')) return 'Complete or note just that one item.'
  if (normalized.includes('stand up')) return 'Move for one minute.'
  return 'Do one minute of the first visible part.'
}

export function createDeterministicFallback(task, simplificationDepth = 0) {
  const depth = Math.min(MAX_SIMPLIFICATION_DEPTH, Math.max(0, Number.isInteger(simplificationDepth) ? simplificationDepth : 0))
  return {
    acknowledgement: depth === 0 ? 'Start with the first visible part of this task.' : 'Let’s lower the effort one more notch.',
    tinyFirstStep: depth === 0 ? createInitialActivationStep(task) : createSmallerActivationStep(task, depth),
    followUpSteps: [],
    francoLine: depth < MAX_SIMPLIFICATION_DEPTH ? 'We can make it smaller again whenever you want.' : 'This is small enough to begin without doing the whole task.',
  }
}
