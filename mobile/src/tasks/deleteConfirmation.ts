export type DeleteConfirmationButton = {
  text: string;
  style?: 'cancel' | 'destructive';
  onPress?: () => void;
};

export function buildDeleteConfirmation(taskTitle: string, onConfirm: () => void) {
  return {
    title: 'Delete task?',
    message: `“${taskTitle}” will be permanently deleted.`,
    buttons: [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Delete', style: 'destructive' as const, onPress: onConfirm },
    ] satisfies DeleteConfirmationButton[],
  };
}
