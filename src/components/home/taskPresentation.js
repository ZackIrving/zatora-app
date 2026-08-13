const energyBonus = {
  Low: 0,
  Medium: 5,
  High: 10,
  Creative: 5,
}

export function getTaskMinutes(time) {
  const minutes = Number.parseInt(time, 10)
  return Number.isFinite(minutes) ? minutes : 15
}

export function deriveTaskReward(task = {}) {
  const minutes = getTaskMinutes(task.time)
  const durationReward = minutes <= 10 ? 10 : minutes <= 20 ? 15 : minutes <= 30 ? 20 : minutes <= 45 ? 25 : 30
  return Math.min(40, durationReward + (energyBonus[task.energy] || 0))
}

export function deriveTaskPriority(task = {}) {
  const explicitPriority = String(task.priority || '').toLowerCase()
  if (explicitPriority.startsWith('high')) return 'High'
  if (explicitPriority.startsWith('medium')) return 'Medium'
  if (explicitPriority.startsWith('low')) return 'Low'

  const minutes = getTaskMinutes(task.time)
  if (minutes >= 45) return 'High'
  if (minutes >= 20) return 'Medium'
  return 'Low'
}

export function getTaskIconType(task = {}) {
  const context = `${task.title || ''} ${task.category || ''}`.toLowerCase()

  if (/workout|fitness|exercise|strength|gym|run|health/.test(context)) return 'fitness'
  if (/write|writing|notes?|journal|document|readme/.test(context)) return 'notebook'
  if (/study|studying|read|reading|learn|course|quiz|school/.test(context)) return 'book'
  if (/code|coding|develop|developer|technical|github|homelab|software|security/.test(context)) return 'technical'
  if (/focus|goal|precision|priority|dashboard|qa|career|apply/.test(context)) return 'target'
  return 'check'
}
