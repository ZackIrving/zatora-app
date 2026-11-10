import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type AuthDiagnosticCode,
  getAuthErrorPresentation,
  getAuthExceptionPresentation,
} from '@/auth/authForm';
import { useAuth } from '@/auth/AuthProvider';
import { GuestButton, GuestTextInput } from '@/components/GuestUi';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { buildDeleteConfirmation } from '@/tasks/deleteConfirmation';
import { useAccountTasks } from '@/tasks/useAccountTasks';
import type { Task, TaskMutation } from '@/tasks/taskTypes';

export default function AuthenticatedTodayRoute() {
  const { signOut, user } = useAuth();
  const { state: taskState, retryLoad, createTask, editTask, setTaskDone, deleteTask, clearMutationFailure } = useAccountTasks(user?.id ?? null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const [diagnosticCode, setDiagnosticCode] = useState<AuthDiagnosticCode | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createError, setCreateError] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editError, setEditError] = useState('');

  const todoTasks = taskState.tasks.filter((task) => !task.done);
  const completedTasks = taskState.tasks.filter((task) => task.done);
  const isMutating = Boolean(taskState.mutation);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setAuthError('');
    setDiagnosticCode(null);
    try {
      const result = await signOut();
      if (result.error) {
        const presentation = getAuthErrorPresentation('sign-out', result.error);
        setAuthError(presentation.message);
        setDiagnosticCode(presentation.diagnosticCode);
      }
    } catch (caughtError) {
      const presentation = getAuthExceptionPresentation('sign-out', caughtError);
      setAuthError(presentation.message);
      setDiagnosticCode(presentation.diagnosticCode);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCreate = async () => {
    clearMutationFailure();
    setCreateError('');
    const result = await createTask(createTitle);
    if (result.ok) setCreateTitle('');
    else if (!result.stale) setCreateError(result.message);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditError('');
    clearMutationFailure();
  };

  const handleEdit = async () => {
    if (!editingTask) return;
    setEditError('');
    const result = await editTask(editingTask.id, editTitle);
    if (result.ok) {
      setEditingTask(null);
      setEditTitle('');
    } else if (!result.stale) setEditError(result.message);
  };

  const confirmDelete = (task: Task) => {
    const confirmation = buildDeleteConfirmation(task.title, () => { void deleteTask(task.id); });
    Alert.alert(confirmation.title, confirmation.message, confirmation.buttons);
  };

  const taskError = taskState.mutationFailure?.message ?? createError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <Text style={styles.brand}>ZATORA</Text>
            <Text style={styles.account}>{user?.email ?? 'Signed-in account'}</Text>
          </View>
          <Image accessibilityLabel="Franco the Zatora sidekick" source={require('../../../assets/franco-tiny-puppy-neutral.png')} style={styles.franco} />
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text accessibilityRole="header" style={styles.title}>Fresh start.</Text>
          <Text style={styles.francoLine}>“I’ll supervise from here.” — Franco</Text>

          <View style={styles.createCard}>
            <Text style={styles.cardTitle}>What needs doing?</Text>
            <GuestTextInput
              accessibilityLabel="New task title"
              editable={!isMutating}
              onChangeText={(value) => { setCreateTitle(value); setCreateError(''); }}
              onSubmitEditing={() => void handleCreate()}
              placeholder="Add a task for today"
              returnKeyType="done"
              value={createTitle}
            />
            {createError ? <Text style={styles.error}>{createError}</Text> : null}
            <GuestButton disabled={isMutating} onPress={() => void handleCreate()}>{taskState.mutation?.kind === 'create' ? 'Saving…' : 'Add task'}</GuestButton>
          </View>

          {taskState.loadStatus === 'loading' ? <View style={styles.statusCard}><ActivityIndicator color={colors.violet} /><Text style={styles.statusText}>Loading your tasks…</Text></View> : null}
          {taskState.loadStatus === 'error' ? (
            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>Your task list needs a refresh.</Text>
              <Text style={styles.statusText}>{taskState.loadFailure?.message}</Text>
              <GuestButton disabled={isMutating} onPress={() => void retryLoad()} secondary>Try again</GuestButton>
            </View>
          ) : null}
          {taskState.loadStatus === 'ready' ? (
            <>
              <TaskSection title="To Do" emptyMessage={taskState.tasks.length === 0 ? 'Your list is clear. Add the first small thing you want to move today.' : 'Nothing waiting here. Nice work—add another task whenever you’re ready.'} tasks={todoTasks} mutation={taskState.mutation} onComplete={(task) => void setTaskDone(task.id, true)} onEdit={openEdit} onDelete={confirmDelete} />
              <TaskSection title="Completed" emptyMessage="Completed tasks will appear here after your first win." tasks={completedTasks} mutation={taskState.mutation} onComplete={(task) => void setTaskDone(task.id, false)} onEdit={openEdit} onDelete={confirmDelete} />
            </>
          ) : null}

          {taskError ? <View accessibilityLiveRegion="assertive" style={styles.errorBanner}><Text style={styles.error}>{taskError}</Text><Pressable accessibilityRole="button" onPress={clearMutationFailure}><Text style={styles.dismiss}>Dismiss</Text></Pressable></View> : null}
          {authError ? <View accessibilityLiveRegion="assertive"><Text style={styles.error}>{authError}</Text>{__DEV__ && diagnosticCode ? <Text style={styles.diagnostic}>Diagnostic: {diagnosticCode}</Text> : null}</View> : null}
          <GuestButton disabled={isSigningOut} onPress={() => void handleSignOut()} secondary>{isSigningOut ? 'Signing out…' : 'Sign out'}</GuestButton>
          {isSigningOut ? <ActivityIndicator accessibilityLabel="Signing out" color={colors.violet} style={styles.spinner} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal animationType="slide" onRequestClose={() => setEditingTask(null)} transparent visible={Boolean(editingTask)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={styles.editCard}>
            <Text style={styles.cardTitle}>Edit task</Text>
            <GuestTextInput accessibilityLabel="Edit task title" autoFocus editable={!isMutating} onChangeText={(value) => { setEditTitle(value); setEditError(''); }} onSubmitEditing={() => void handleEdit()} returnKeyType="done" value={editTitle} />
            {editError ? <Text style={styles.error}>{editError}</Text> : null}
            <GuestButton disabled={isMutating} onPress={() => void handleEdit()}>{taskState.mutation?.kind === 'edit' ? 'Saving…' : 'Save changes'}</GuestButton>
            <GuestButton disabled={isMutating} onPress={() => setEditingTask(null)} secondary>Cancel</GuestButton>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function TaskSection({ title, emptyMessage, tasks, mutation, onComplete, onEdit, onDelete }: {
  title: string;
  emptyMessage: string;
  tasks: Task[];
  mutation: TaskMutation | null;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {tasks.length === 0 ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
      {tasks.map((task) => {
        const isPending = mutation?.kind !== 'create' && mutation?.taskId === task.id;
        return (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskCopy}><Text style={[styles.taskTitle, task.done && styles.completedTitle]}>{task.title}</Text>{isPending ? <Text style={styles.pending}>Saving…</Text> : null}</View>
            <View style={styles.taskActions}>
              <Pressable accessibilityLabel={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(mutation) }} disabled={Boolean(mutation)} onPress={() => onComplete(task)} style={styles.actionButton}><Text style={styles.actionText}>{task.done ? 'Reopen' : 'Complete'}</Text></Pressable>
              <Pressable accessibilityLabel={`Edit ${task.title}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(mutation) }} disabled={Boolean(mutation)} onPress={() => onEdit(task)} style={styles.actionButton}><Text style={styles.actionText}>Edit</Text></Pressable>
              <Pressable accessibilityLabel={`Delete ${task.title}`} accessibilityRole="button" accessibilityState={{ disabled: Boolean(mutation) }} disabled={Boolean(mutation)} onPress={() => onDelete(task)} style={styles.actionButton}><Text style={styles.deleteText}>Delete</Text></Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: spacing.pageGutter },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  brand: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 2.5 },
  account: { color: colors.textMuted, flexShrink: 1, fontSize: 12, marginLeft: 16, textAlign: 'right' },
  franco: { alignSelf: 'center', height: 112, marginVertical: 16, width: 112 },
  eyebrow: { color: colors.amber, fontSize: 12, fontWeight: '700', letterSpacing: 1.7, marginBottom: 10 },
  title: { color: colors.text, fontSize: 38, fontWeight: '800', letterSpacing: -1, lineHeight: 44 },
  francoLine: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 8 },
  createCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 26, padding: spacing.card },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  statusCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 18, padding: spacing.card },
  statusText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  section: { marginTop: 28 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  empty: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  taskCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 10, padding: 15 },
  taskCopy: { flex: 1 },
  taskTitle: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  completedTitle: { color: colors.textMuted, textDecorationLine: 'line-through' },
  pending: { color: colors.amber, fontSize: 12, marginTop: 4 },
  taskActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  actionButton: { marginRight: 16, paddingVertical: 4 },
  actionText: { color: colors.violet, fontSize: 13, fontWeight: '800' },
  deleteText: { color: '#ff9b9b', fontSize: 13, fontWeight: '800' },
  errorBanner: { backgroundColor: '#29171b', borderColor: '#5d2b35', borderRadius: 12, borderWidth: 1, marginTop: 18, padding: 12 },
  error: { color: '#ffb4b4', fontSize: 13, lineHeight: 19 },
  dismiss: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 8 },
  diagnostic: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  spinner: { marginTop: 14 },
  modalBackdrop: { backgroundColor: 'rgba(5, 7, 12, 0.82)', flex: 1, justifyContent: 'flex-end' },
  editCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, padding: 24, paddingBottom: 34 },
});
