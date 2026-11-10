import { useEffect, useMemo, useState } from 'react';

import { createSupabaseTaskGateway } from './taskRepository.ts';
import { initialTaskState, TaskSession } from './taskSession.ts';

export function useAccountTasks(userId: string | null) {
  const session = useMemo(() => new TaskSession(createSupabaseTaskGateway()), []);
  const [state, setState] = useState(() => initialTaskState(userId));

  useEffect(() => {
    const unsubscribe = session.subscribe(setState);
    return () => { unsubscribe(); };
  }, [session]);

  useEffect(() => {
    void session.setUser(userId);
  }, [session, userId]);

  const visibleState = state.userId === userId ? state : initialTaskState(userId);

  return {
    state: visibleState,
    retryLoad: () => session.retryLoad(),
    createTask: (title: string) => session.create(title),
    editTask: (taskId: number, title: string) => session.edit(taskId, title),
    setTaskDone: (taskId: number, done: boolean) => session.setDone(taskId, done),
    deleteTask: (taskId: number) => session.delete(taskId),
    clearMutationFailure: () => session.clearMutationFailure(),
  };
}
