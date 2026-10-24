import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { POSITION_KEYS, POSITION_THEME } from "@/shared/ui/positionTheme";

/** Key to the field: every position has its own colour and silhouette. */
export const StageLegend = () => (
  <ul aria-label="Legend" className="pointer-events-none absolute bottom-3 left-3 hidden flex-col gap-1 rounded-lg border border-border bg-popover/85 px-2.5 py-2 text-xs text-foreground shadow-raised backdrop-blur md:flex">
    {POSITION_KEYS.map((position) => (
      <li key={position} className="flex items-center gap-2">
        <PositionGlyph position={position} className="size-4" />
        <span className="font-semibold">{position}</span>
        <span className="text-muted-foreground">{POSITION_THEME[position].side}</span>
      </li>
    ))}
  </ul>
);
