import { POSITION_INK, POSITION_THEME, getShapeVertices, type PositionKey } from "@/shared/ui/positionTheme";
import { cn } from "@/shared/ui/utils";

type PositionGlyphProps = {
  position: PositionKey;
  /** Optional jersey number or short label drawn inside the shape. */
  label?: string;
  className?: string;
};

const VIEWBOX_HALF = 16;
const UNIT_RADIUS = 11;

/** Position shape in the position hue; the same silhouette is drawn on the field canvas. */
export const PositionGlyph = ({ position, label, className }: PositionGlyphProps) => {
  const { shape, cssVar } = POSITION_THEME[position];
  const points = getShapeVertices(shape)
    .map(([x, y]) => `${x * UNIT_RADIUS * 0.82},${y * UNIT_RADIUS * 0.82}`)
    .join(" ");

  return (
    <svg
      viewBox={`${-VIEWBOX_HALF} ${-VIEWBOX_HALF} ${VIEWBOX_HALF * 2} ${VIEWBOX_HALF * 2}`}
      className={cn("size-5 shrink-0", className)}
      aria-hidden="true"
    >
      {shape === "circle" && <circle r={UNIT_RADIUS} fill={cssVar} />}
      {shape === "square" && (
        <rect x={-UNIT_RADIUS * 0.85} y={-UNIT_RADIUS * 0.85} width={UNIT_RADIUS * 1.7} height={UNIT_RADIUS * 1.7} rx="3" fill={cssVar} />
      )}
      {(shape === "diamond" || shape === "hexagon") && <polygon points={points} fill={cssVar} strokeLinejoin="round" />}
      {label && (
        <text
          y="0.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill={POSITION_INK}
          fontFamily="var(--font-jetbrains-mono), monospace"
          fontWeight="700"
          fontSize={label.length > 1 ? 9 : 11}
        >
          {label}
        </text>
      )}
    </svg>
  );
};
