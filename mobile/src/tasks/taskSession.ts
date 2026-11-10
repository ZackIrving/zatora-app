import { taskFailure } from './taskErrors.ts';
import type {
  Task,
  TaskGateway,
  TaskMutation,
  TaskMutationResult,
  TaskState,
} from './taskTypes.ts';

type Listener = (state: TaskState) => void;

export function initialTaskState(userId: string | null = null): TaskState {
  return {
    userId,
    tasks: [],
    loadStatus: userId ? 'loading' : 'idle',
    loadFailure: null,
    mutation: null,
    mutationFailure: null,
  };
}
export function validateTaskTitle(title: string) {
  const value = title.trim();
  return value ? { ok: true as const, value } : {
    ok: false as const,
    message: 'Add a task title before saving.',
  };
}

export class TaskSession {
  private state = initialTaskState();
  private listeners = new Set<Listener>();
  private scopeVersion = 0;
  private loadVersion = 0;
  private readonly gateway: TaskGateway;

  constructor(gateway: TaskGateway) {
    this.gateway = gateway;
  }

  getState = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(nextState: TaskState) {
    this.state = nextState;
    for (const listener of this.listeners) listener(this.state);
  }

  private isCurrent(scopeVersion: number, userId: string) {
    return this.scopeVersion === scopeVersion && this.state.userId === userId;
  }

  async setUser(userId: string | null) {
    if (this.state.userId === userId) return;
    this.scopeVersion += 1;
    this.loadVersion += 1;
    this.emit(initialTaskState(userId));
    if (userId) await this.load();
  }

  async retryLoad() {
    if (this.state.userId) await this.load();
  }

  private async load() {
    const userId = this.state.userId;
    if (!userId) return;
    const scopeVersion = this.scopeVersion;
    const loadVersion = this.loadVersion + 1;
    this.loadVersion = loadVersion;
    this.emit({
      ...this.state,
      tasks: [],
      loadStatus: 'loading',
      loadFailure: null,
      mutationFailure: null,
    });

    try {
      const tasks = await this.gateway.loadTasks(userId);
      if (!this.isCurrent(scopeVersion, userId) || this.loadVersion !== loadVersion) return;
      this.emit({ ...this.state, tasks, loadStatus: 'ready', loadFailure: null });
    } catch (error) {
      if (!this.isCurrent(scopeVersion, userId) || this.loadVersion !== loadVersion) return;
      this.emit({
        ...this.state,
        tasks: [],
        loadStatus: 'error',
        loadFailure: taskFailure(error, 'load'),
      });
    }
  }

  clearMutationFailure() {
    if (this.state.mutationFailure) {
      this.emit({ ...this.state, mutationFailure: null });
    }
  }

  async create(title: string): Promise<TaskMutationResult> {
    const validation = validateTaskTitle(title);
    if (!validation.ok) return { ok: false, message: validation.message, validation: true };
    return this.mutate(
      { kind: 'create' },
      (userId) => this.gateway.createTask(userId, validation.value),
      (tasks, task) => [...tasks, task],
    );
  }

  async edit(taskId: number, title: string): Promise<TaskMutationResult> {
    const validation = validateTaskTitle(title);
    if (!validation.ok) return { ok: false, message: validation.message, validation: true };
    if (!this.state.tasks.some((task) => task.id === taskId)) {
      return { ok: false, message: 'That task is no longer available.' };
    }
    return this.mutate(
      { kind: 'edit', taskId },
      (userId) => this.gateway.editTask(userId, taskId, validation.value),
      (tasks, confirmed) => tasks.map((task) => task.id === taskId ? confirmed : task),
    );
  }

  async setDone(taskId: number, done: boolean): Promise<TaskMutationResult> {
    if (!this.state.tasks.some((task) => task.id === taskId)) {
      return { ok: false, message: 'That task is no longer available.' };
    }
    return this.mutate(
      { kind: done ? 'complete' : 'reopen', taskId },
      (userId) => this.gateway.setTaskDone(userId, taskId, done),
      (tasks, confirmed) => tasks.map((task) => task.id === taskId ? confirmed : task),
    );
  }

  async delete(taskId: number): Promise<TaskMutationResult> {
    if (!this.state.tasks.some((task) => task.id === taskId)) {
      return { ok: false, message: 'That task is no longer available.' };
    }
    return this.mutate(
      { kind: 'delete', taskId },
      async (userId) => {
        await this.gateway.deleteTask(userId, taskId);
        return null;
      },
      (tasks) => tasks.filter((task) => task.id !== taskId),
      'delete',
    );
  }

  private async mutate<T extends Task | null>(
    mutation: TaskMutation,
    request: (userId: string) => Promise<T>,
    apply: (tasks: Task[], confirmed: T) => Task[],
    operation: 'save' | 'delete' = 'save',
  ): Promise<TaskMutationResult> {
    const userId = this.state.userId;
    if (!userId) return { ok: false, message: 'Sign in again before changing tasks.' };
    if (this.state.mutation) return { ok: false, message: 'Finish the current change first.' };

    const scopeVersion = this.scopeVersion;
    this.emit({ ...this.state, mutation, mutationFailure: null });

    try {
      const confirmed = await request(userId);
      if (!this.isCurrent(scopeVersion, userId)) {
        return { ok: false, message: '', stale: true };
      }
      this.emit({
        ...this.state,
        tasks: apply(this.state.tasks, confirmed),
        mutation: null,
        mutationFailure: null,
      });
      return { ok: true };
    } catch (error) {
      if (!this.isCurrent(scopeVersion, userId)) {
        return { ok: false, message: '', stale: true };
      }
      const failure = taskFailure(error, operation);
      this.emit({ ...this.state, mutation: null, mutationFailure: failure });
      return { ok: false, message: failure.message };
    }
  }
}
