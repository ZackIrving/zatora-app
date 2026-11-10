import type { TaskFailure } from './taskTypes.ts';

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error) {
    const candidate = error as { message?: unknown; details?: unknown; code?: unknown };
    return [candidate.message, candidate.details, candidate.code]
      .filter((value): value is string => typeof value === 'string')
      .join(' ');
  }
  return '';
}
export function taskFailure(error: unknown, operation: 'load' | 'save' | 'delete'): TaskFailure {
  const normalized = errorText(error).toLowerCase();
  const offline = /failed to fetch|network request failed|network|offline|timeout|timed out/.test(normalized);

  if (offline) {
    return {
      kind: 'offline',
      message: operation === 'load'
        ? 'Your tasks are unavailable offline. Check your connection and try again.'
        : 'That change could not reach Zatora. Check your connection and try again.',
    };
  }

  return {
    kind: 'server',
    message: operation === 'load'
      ? 'We could not load your tasks right now. Try again in a moment.'
      : operation === 'delete'
        ? 'That task could not be deleted. It is still in your list—please try again.'
        : 'That change could not be saved. Your previous task is still intact—please try again.',
  };
}
