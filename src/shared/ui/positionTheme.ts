/**
 * Single visual language for positions: every position has a hue AND a shape, so it is never
 * identified by colour alone (colour-blind safe). Used by cards, badges, legends and the canvas.
 *
 * `hex` mirrors the `--pos-*` CSS variables in globals.css (canvas cannot read CSS variables).
 */
export type PositionKey = "QB" | "WR" | "DB" | "RUSHER";

export type PositionShape = "circle" | "diamond" | "square" | "hexagon";

export type PositionTheme = {
  label: string;
  side: "Offense" | "Defense";
  shape: PositionShape;
  hex: string;
  /** CSS variable holding the same hue, for DOM styling that should follow the theme tokens. */
  cssVar: string;
};

export const POSITION_THEME: Record<PositionKey, PositionTheme> = {
  QB: { label: "Quarterback", side: "Offense", shape: "circle", hex: "#f2b705", cssVar: "var(--pos-qb)" },
  WR: { label: "Wide receiver", side: "Offense", shape: "diamond", hex: "#38bdf8", cssVar: "var(--pos-wr)" },
  DB: { label: "Defensive back", side: "Defense", shape: "square", hex: "#ff6b3d", cssVar: "var(--pos-db)" },
  RUSHER: { label: "Rusher", side: "Defense", shape: "hexagon", hex: "#d946ef", cssVar: "var(--pos-rusher)" },
};

/** Text colour that stays readable on top of any position hue. */
export const POSITION_INK = "#0a0e13";

export const POSITION_KEYS = Object.keys(POSITION_THEME) as PositionKey[];

/** Unit-radius polygon vertices for non-circular shapes (centered on 0,0; radius 1). */
export const getShapeVertices = (shape: PositionShape): [number, number][] => {
  if (shape === "diamond") return [[0, -1.25], [1.25, 0], [0, 1.25], [-1.25, 0]];
  if (shape === "square") return [[-0.95, -0.95], [0.95, -0.95], [0.95, 0.95], [-0.95, 0.95]];
  if (shape === "hexagon") {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI / 3) * index - Math.PI / 2;
      return [Math.cos(angle) * 1.12, Math.sin(angle) * 1.12] as [number, number];
    });
  }
  return [];
};
