import { ACTIVATION_KEY_STORAGE } from "@/shared/kernel/activationAccess";

type Listener = () => void;

const keyListeners = new Set<Listener>();
const dialogListeners = new Set<Listener>();

let isDialogOpen = false;

const emit = (listeners: Set<Listener>): void => {
  listeners.forEach((listener) => listener());
};

/** Activation key saved for this browser tab, or null when roster editing is locked. */
export const getActivationKey = (): string | null => {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(ACTIVATION_KEY_STORAGE)?.trim() ?? "";
  return value || null;
};

export const subscribeActivationKey = (listener: Listener): (() => void) => {
  keyListeners.add(listener);
  return () => keyListeners.delete(listener);
};

export const saveActivationKey = (key: string): void => {
  window.sessionStorage.setItem(ACTIVATION_KEY_STORAGE, key.trim());
  emit(keyListeners);
};

export const clearActivationKey = (): void => {
  window.sessionStorage.removeItem(ACTIVATION_KEY_STORAGE);
  emit(keyListeners);
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
