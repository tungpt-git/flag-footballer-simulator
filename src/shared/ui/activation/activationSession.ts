type Listener = () => void;

const dialogListeners = new Set<Listener>();

let isDialogOpen = false;

const emit = (listeners: Set<Listener>): void => {
  listeners.forEach((listener) => listener());
};

export const getActivationDialogOpen = (): boolean => isDialogOpen;

export const subscribeActivationDialog = (listener: Listener): (() => void) => {
  dialogListeners.add(listener);
  return () => dialogListeners.delete(listener);
};

export const openActivationDialog = (): void => {
  if (isDialogOpen) return;
  isDialogOpen = true;
  emit(dialogListeners);
};

export const closeActivationDialog = (): void => {
  if (!isDialogOpen) return;
  isDialogOpen = false;
  emit(dialogListeners);
};
