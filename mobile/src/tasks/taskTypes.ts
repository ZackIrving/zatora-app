export const TASK_COLUMNS = 'id,user_id,title,done,created_at' as const;

export type Task = {
  id: number;
  user_id: string;
  title: string;
  done: boolean;
  created_at: string;
};
export type TaskFailureKind = 'offline' | 'server';

export type TaskFailure = {
  kind: TaskFailureKind;
  message: string;
};

export type TaskMutation =
  | { kind: 'create' }
  | { kind: 'edit'; taskId: number }
  | { kind: 'complete'; taskId: number }
  | { kind: 'reopen'; taskId: number }
  | { kind: 'delete'; taskId: number };

export type TaskState = {
  userId: string | null;
  tasks: Task[];
  loadStatus: 'idle' | 'loading' | 'ready' | 'error';
  loadFailure: TaskFailure | null;
  mutation: TaskMutation | null;
  mutationFailure: TaskFailure | null;
};

export type TaskMutationResult =
  | { ok: true }
  | { ok: false; message: string; stale?: boolean; validation?: boolean };

export interface TaskGateway {
  loadTasks(userId: string): Promise<Task[]>;
  createTask(userId: string, title: string): Promise<Task>;
  editTask(userId: string, taskId: number, title: string): Promise<Task>;
  setTaskDone(userId: string, taskId: number, done: boolean): Promise<Task>;
  deleteTask(userId: string, taskId: number): Promise<void>;
}
