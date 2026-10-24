import { CornerDownLeft, Shuffle, Target, type LucideIcon } from "lucide-react";
import type { DecisionAction } from "../domain/types";

/** Presentation copy for each decision: icon, shortcut and a one-line risk / reward hint. */
export const DECISION_PRESENTATION: Record<DecisionAction, { icon: LucideIcon; shortcut: string; risk: string; reward: string }> = {
  PASS_TO_WR: {
    icon: Target,
    shortcut: "1",
    risk: "Corner may pick it off",
    reward: "Biggest gain, TD chance",
  },
  PUMP_FAKE_SCRAMBLE: {
    icon: Shuffle,
    shortcut: "2",
    risk: "Flag pulled if rusher is close",
    reward: "Buys time, runs for yards",
  },
  CHECKDOWN: {
    icon: CornerDownLeft,
    shortcut: "3",
    risk: "Short gain only",
    reward: "Safest throw to the outlet",
  },
};

export const KEY_TO_ACTION: Record<string, DecisionAction> = Object.fromEntries(
  (Object.entries(DECISION_PRESENTATION) as [DecisionAction, { shortcut: string }][]).map(([action, { shortcut }]) => [shortcut, action]),
);

export type PressureLevel = "LOW" | "MEDIUM" | "HIGH";

/** Pass-rush pressure from the rusher's distance to the QB (4 yd is the engine's pressure radius). */
export const getPressureLevel = (rusherDistanceYd: number): PressureLevel => {
  if (rusherDistanceYd < 4) return "HIGH";
  if (rusherDistanceYd < 7) return "MEDIUM";
  return "LOW";
};
