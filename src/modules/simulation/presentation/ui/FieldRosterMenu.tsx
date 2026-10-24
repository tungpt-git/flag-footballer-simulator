"use client";

import { useEffect, useRef, type RefObject } from "react";
import { canPlayPosition, type PlayerProfile, type Position } from "@/modules/roster";
import { cn } from "@/shared/ui/utils";

type FieldRosterMenuProps = {
  x: number;
  y: number;
  boundsWidth: number;
  boundsHeight: number;
  title: string;
  players: PlayerProfile[];
  position: Position;
  selectedId: string | null;
  /** Pointer events on this node belong to the field, which decides whether the menu stays open. */
  fieldRef: RefObject<HTMLElement | null>;
  onSelect: (playerId: string) => void;
  onClose: () => void;
};

const MENU_WIDTH_PX = 240;
const MENU_MAX_HEIGHT_PX = 280;

/** Player list anchored to a symbol on the field. */
export const FieldRosterMenu = ({
  x,
  y,
  boundsWidth,
  boundsHeight,
  title,
  players,
  position,
  selectedId,
  fieldRef,
  onSelect,
  onClose,
}: FieldRosterMenuProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const options = players.filter((player) => canPlayPosition(player, position));
  const left = Math.max(8, Math.min(x, Math.max(8, boundsWidth - MENU_WIDTH_PX - 8)));
  const top = Math.max(8, Math.min(y, Math.max(8, boundsHeight - MENU_MAX_HEIGHT_PX - 8)));

  useEffect(() => {
    const selected = panelRef.current?.querySelector<HTMLButtonElement>("[aria-selected='true']");
    (selected ?? panelRef.current?.querySelector("button"))?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (fieldRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [fieldRef, onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Choose ${title}`}
      style={{ left, top, width: MENU_WIDTH_PX }}
      className="absolute z-20 flex max-h-72 flex-col overflow-hidden rounded-lg border border-border bg-popover shadow-overlay"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <p className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">{title}</p>
      {options.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">No eligible players on the roster.</p>
      ) : (
        <ul role="listbox" aria-label={title} className="scroll-thin flex flex-col overflow-y-auto p-1">
          {options.map((player) => {
            const isSelected = player.id === selectedId;
            const handleSelect = (): void => onSelect(player.id);
            return (
              <li key={player.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={handleSelect}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent pointer-coarse:min-h-11",
                    isSelected && "bg-primary/15",
                  )}
                >
                  <span>
                    #{player.jerseyNumber} {player.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">{player.metrics.fortyYardDash.toFixed(2)}s</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
