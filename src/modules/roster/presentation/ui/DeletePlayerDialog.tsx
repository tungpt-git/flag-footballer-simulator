"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { openActivationDialog } from "@/shared/ui/activation/activationSession";
import { deletePlayerAction } from "../playerActions";
import type { PlayerProfile } from "../../domain/player";

type DeletePlayerDialogProps = {
  player: PlayerProfile | null;
  onClose: () => void;
  onDeleted: () => void;
};

export const DeletePlayerDialog = ({ player, onClose, onDeleted }: DeletePlayerDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenChange = (open: boolean): void => {
    if (!open && !isDeleting) onClose();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!player) return;
    setIsDeleting(true);
    try {
      const result = await deletePlayerAction(player.id);
      if (!result.ok) {
        if (result.unauthorized) openActivationDialog();
        toast.error(result.message);
        return;
      }
      toast.success(`Deleted ${player.name}`);
      onDeleted();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete player");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={player !== null} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>Delete {player?.name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the player profile and stats. Simulations that use this player will fall back to a default profile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="animate-spin" aria-hidden="true" />}
            Delete player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
