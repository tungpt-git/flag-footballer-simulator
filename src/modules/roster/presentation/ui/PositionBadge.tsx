import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { POSITION_THEME } from "@/shared/ui/positionTheme";
import { cn } from "@/shared/ui/utils";
import type { Position } from "../../domain/player";

type PositionBadgeProps = {
  position: Position;
  /** Show the full name ("Wide receiver") instead of the abbreviation. */
  showName?: boolean;
  className?: string;
};

/** Position chip: shape + hue + text, so it never relies on colour alone. */
export const PositionBadge = ({ position, showName = false, className }: PositionBadgeProps) => {
  const { label, cssVar } = POSITION_THEME[position];

  return (
    <span
      aria-label={`Position ${label}`}
      style={{ borderColor: `color-mix(in srgb, ${cssVar} 55%, transparent)`, backgroundColor: `color-mix(in srgb, ${cssVar} 16%, transparent)` }}
      className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border pr-2.5 pl-1.5 text-xs font-semibold text-foreground", className)}
    >
      <PositionGlyph position={position} className="size-4" />
      {showName ? label : position}
    </span>
  );
};
