import { CornerDownLeft, Flame, Shield, Shuffle, Target, Zap, type LucideIcon } from "lucide-react";
import type { PlayCall } from "../domain/types";

type CallPresentation = { icon: LucideIcon; shortcut: string; risk: string; reward: string };

/** Presentation copy for each call: icon, shortcut and a one-line risk / reward hint. */
export const CALL_PRESENTATION: Record<PlayCall, CallPresentation> = {
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
  HOLD_COVERAGE: {
    icon: Shield,
    shortcut: "1",
    risk: "No extra pressure on the QB",
    reward: "Sound coverage, nothing gambled",
  },
  JUMP_ROUTE: {
    icon: Zap,
    shortcut: "2",
    risk: "Burned for a big gain if he is beaten",
    reward: "Much higher interception chance",
  },
  BLITZ_SAFETY: {
    icon: Flame,
    shortcut: "3",
    risk: "No safety deep, big plays open up",
    reward: "Sack chance and a rushed throw",
  },
};

/** The option a keyboard shortcut selects among the options currently on offer. */
export const findCallByShortcut = <T extends PlayCall>(options: T[], key: string): T | undefined =>
  options.find((option) => CALL_PRESENTATION[option].shortcut === key);

export type PressureLevel = "LOW" | "MEDIUM" | "HIGH";

/** Pass-rush pressure from the rusher's distance to the QB (4 yd is the engine's pressure radius). */
export const getPressureLevel = (rusherDistanceYd: number): PressureLevel => {
  if (rusherDistanceYd < 4) return "HIGH";
  if (rusherDistanceYd < 7) return "MEDIUM";
  return "LOW";
};
