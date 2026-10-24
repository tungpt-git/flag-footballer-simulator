import type { PlayerMetrics, Position } from "../domain/player";

export const POSITION_LABELS: Record<Position, string> = {
  QB: "Quarterback",
  WR: "Wide receiver",
  DB: "Defensive back",
  RUSHER: "Rusher",
};

/** The same stored metric means different things per position. */
export const getMetricLabels = (
  position: Position,
): Record<keyof PlayerMetrics, { label: string; hint: string }> => ({
  fortyYardDash: { label: "40-yard dash (s)", hint: "Lower is faster." },
  agility: { label: "Agility (0-100)", hint: "Sharper cuts and quicker reactions." },
  catchProbability: {
    label: {
      QB: "Throw accuracy",
      WR: "Catching probability",
      DB: "Ball skills (interceptions)",
      RUSHER: "Catching probability",
    }[position],
    hint: "Probability between 0 and 1.",
  },
  flagPullEfficiency: { label: "Flag pulling efficiency", hint: "Chance to pull a flag when in range." },
});
