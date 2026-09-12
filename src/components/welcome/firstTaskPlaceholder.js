export const DEFAULT_FIRST_TASK_PLACEHOLDER =
  "e.g. Tackle the thing that's been hanging over me"

const FIRST_TASK_PLACEHOLDERS = Object.freeze({
  getting_started: "e.g. Start the project I've been putting off",
  staying_focused: 'e.g. Finish the report I keep getting distracted from',
  keeping_up: "e.g. Catch up on the emails I've been avoiding",
  consistency: 'e.g. Get back into my workout routine',
  everything: DEFAULT_FIRST_TASK_PLACEHOLDER,
})

export function getFirstTaskPlaceholder(supportNeed) {
  return FIRST_TASK_PLACEHOLDERS[supportNeed] ??
    DEFAULT_FIRST_TASK_PLACEHOLDER
}
