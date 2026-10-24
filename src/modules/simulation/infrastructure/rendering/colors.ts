/**
 * Canvas palette. The turf is constant across themes (the field is the hero); position hues come from
 * the shared position theme so the canvas, cards and legends always agree.
 */
export const CANVAS_COLORS = {
  turfLight: "#2f8f4e",
  turfDark: "#298447",
  turfShade: "rgba(4, 28, 14, 0.38)",
  endZone: "#1d5c39",
  endZoneStripe: "rgba(255,255,255,0.045)",
  endZoneText: "rgba(255,255,255,0.4)",
  line: "rgba(255,255,255,0.92)",
  lineSoft: "rgba(255,255,255,0.5)",
  yardNumber: "rgba(255,255,255,0.8)",
  scrimmage: "#38bdf8",
  toGain: "#ffc233",

  ink: "#0a0e13",
  white: "#ffffff",
  offenseRing: "#ffffff",
  defenseRing: "#0a0e13",

  routeGhost: "rgba(255,255,255,0.42)",
  routeActive: "#ffffff",
  routeOutlet: "rgba(255,255,255,0.5)",
  cut: "#ffc233",

  pursuit: "#ff6b3d",
  pursuitDanger: "#ff4d4d",
  throwLine: "#ffc233",
  ball: "#a8582a",
  ballLace: "#ffffff",

  labelText: "#ffffff",
  labelBackground: "rgba(6,9,13,0.84)",
  decisionRing: "#ffc233",
  dim: "rgba(3,6,10,0.66)",
  selection: "#ffffff",
} as const;

const FALLBACK_MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const FALLBACK_DISPLAY = '"Arial Narrow", system-ui, sans-serif';

const readFontVariable = (name: string, fallback: string): string => {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `${value}, ${fallback}` : fallback;
};

/** Font stacks resolved from the next/font CSS variables at draw time. */
export const getCanvasFonts = (): { mono: string; display: string } => ({
  mono: readFontVariable("--font-jetbrains-mono", FALLBACK_MONO),
  display: readFontVariable("--font-barlow", FALLBACK_DISPLAY),
});
