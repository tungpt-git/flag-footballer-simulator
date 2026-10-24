"use client";

import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { cn } from "@/shared/ui/utils";
import { POSITIONS, normalizeAltPositions, type Position } from "../../domain/player";
import { POSITION_LABELS } from "../labels";

type AltPositionPickerProps = {
  mainPosition: Position;
  value: Position[];
  onChange: (value: Position[]) => void;
};

/** Toggle chips for the other positions a player can play. The main position is never offered. */
export const AltPositionPicker = ({ mainPosition, value, onChange }: AltPositionPickerProps) => {
  const handleToggle = (position: Position) => (): void => {
    const next = value.includes(position) ? value.filter((selected) => selected !== position) : [...value, position];
    onChange(normalizeAltPositions(mainPosition, next));
  };

  return (
    <div className="flex flex-col gap-1">
      <span id="player-alt-positions-label" className="text-xs font-semibold text-foreground">
        Also plays
      </span>
      <div role="group" aria-labelledby="player-alt-positions-label" className="flex flex-wrap gap-1.5">
        {POSITIONS.filter((position) => position !== mainPosition).map((position) => {
          const isSelected = value.includes(position);
          return (
            <button
              key={position}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${POSITION_LABELS[position]}${isSelected ? ", selected" : ""}`}
              onClick={handleToggle(position)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                { "border-foreground/60 bg-muted text-foreground": isSelected },
              )}
            >
              <PositionGlyph position={position} className="size-4" />
              {position}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Optional. Players can be picked for these roles in the simulator too.</p>
    </div>
  );
};
