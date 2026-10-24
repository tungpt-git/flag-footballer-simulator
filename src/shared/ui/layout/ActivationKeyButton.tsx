"use client";

import { requestJson } from "@/shared/infrastructure/http/httpClient";
import {
  clearActivationKey,
  closeActivationDialog,
  getActivationDialogOpen,
  getActivationKey,
  openActivationDialog,
  saveActivationKey,
  subscribeActivationDialog,
  subscribeActivationKey,
} from "@/shared/ui/activation/activationSession";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { FormField } from "@/shared/ui/primitives/form-field";
import { Input } from "@/shared/ui/primitives/input";
import { cn } from "@/shared/ui/utils";
import { Loader2, Lock } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";

export const ActivationKeyButton = () => {
  const activationKey = useSyncExternalStore(
    subscribeActivationKey,
    getActivationKey,
    () => null,
  );
  const isDialogOpen = useSyncExternalStore(
    subscribeActivationDialog,
    getActivationDialogOpen,
    () => false,
  );
  const isUnlocked = Boolean(activationKey);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isDialogOpen && !wasOpen.current) {
      setDraft("");
      setErrorMessage(null);
    }
    wasOpen.current = isDialogOpen;
  }, [isDialogOpen]);

  const handleOpen = (): void => openActivationDialog();

  const handleOpenChange = (open: boolean): void => {
    if (isSubmitting) return;
    if (open) openActivationDialog();
    else closeActivationDialog();
  };

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
    setErrorMessage(null);
  };

  const handleUnlock = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const key = draft.trim();
    if (!key) {
      setErrorMessage("Enter the activation key.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await requestJson("/api/activation/session", {
        method: "POST",
        body: JSON.stringify({ key }),
      });
      saveActivationKey(key);
      toast.success("Roster editing is unlocked");
      closeActivationDialog();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not check the activation key",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = (): void => {
    clearActivationKey();
    toast.success("Roster editing is locked");
    closeActivationDialog();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        aria-label={
          isUnlocked
            ? "Activation. Roster editing is unlocked."
            : "Activation. Enter the activation key to edit players."
        }
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          isUnlocked && "ring-2 ring-primary",
        )}
      >
        A
        {!isUnlocked && (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
            <Lock className="size-2.5" aria-hidden="true" />
          </span>
        )}
      </button>

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleUnlock} noValidate>
            <DialogHeader>
              <DialogTitle>Activation key</DialogTitle>
              <DialogDescription>
                {isUnlocked
                  ? "Roster editing is unlocked in this browser tab. Enter a new activation key to replace it, or lock editing."
                  : "Enter the activation key to create, edit, or delete players."}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FormField
                id="activation-key"
                label="Activation key"
                error={errorMessage ?? undefined}
              >
                <Input
                  id="activation-key"
                  type="password"
                  autoComplete="off"
                  autoFocus
                  value={draft}
                  onChange={handleDraftChange}
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={
                    errorMessage ? "activation-key-error" : undefined
                  }
                />
              </FormField>
            </div>

            <DialogFooter className="mx-0 mb-0">
              {isUnlocked && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLock}
                  disabled={isSubmitting}
                >
                  Lock editing
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {isUnlocked ? "Update key" : "Unlock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
