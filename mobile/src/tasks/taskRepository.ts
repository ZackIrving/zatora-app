import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase';

import { TASK_COLUMNS, type Task, type TaskGateway } from './taskTypes.ts';

function isTask(value: unknown, expectedUserId: string): value is Task {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<Task>;
  return (
    typeof row.id === 'number' &&
    Number.isSafeInteger(row.id) &&
    row.id > 0 &&
    row.user_id === expectedUserId &&
    typeof row.title === 'string' &&
    typeof row.done === 'boolean' &&
    typeof row.created_at === 'string'
  );
}
function oneConfirmedTask(data: unknown, expectedUserId: string) {
  if (!Array.isArray(data) || data.length !== 1 || !isTask(data[0], expectedUserId)) {
    throw new Error('The task change was not confirmed by the server.');
  }
  return data[0];
}

export function createSupabaseTaskGateway(
  supabase: SupabaseClient = getSupabaseClient(),
): TaskGateway {
  return {
    async loadTasks(userId) {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      if (!Array.isArray(data) || !data.every((row) => isTask(row, userId))) {
        throw new Error('The task list returned an unexpected shape.');
      }
      return data;
    },

    async createTask(userId, title) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ user_id: userId, title, done: false })
        .select(TASK_COLUMNS)
        .limit(1);

      if (error) throw error;
      return oneConfirmedTask(data, userId);
    },

    async editTask(userId, taskId, title) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select(TASK_COLUMNS)
        .limit(1);

      if (error) throw error;
      return oneConfirmedTask(data, userId);
    },

    async setTaskDone(userId, taskId, done) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ done })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select(TASK_COLUMNS)
        .limit(1);

      if (error) throw error;
      return oneConfirmedTask(data, userId);
    },

    async deleteTask(userId, taskId) {
      const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id,user_id')
        .limit(1);

      if (error) throw error;
      if (
        !Array.isArray(data) ||
        data.length !== 1 ||
        data[0]?.id !== taskId ||
        data[0]?.user_id !== userId
      ) {
        throw new Error('The task deletion was not confirmed by the server.');
      }
    },
  };
}
