import type { PassMetrics, PassProbabilities } from "./types";
import { clamp } from "@/shared/kernel/geometry";

// ---------- Tunable model constants ----------
const OPEN_LOGIT_BIAS = -2.0;
const SEPARATION_WEIGHT = 0.85;
const SPEED_DIFF_WEIGHT = 0.45;
const TIMING_WEIGHT = 1.6;
const THROW_DISTANCE_WEIGHT = -0.035;
const PRESSURE_WEIGHT = -1.5;
const ACCURACY_WEIGHT = 2.0;
const ACCURACY_BASELINE = 0.75;

const INTERCEPT_SCALE = 0.5;
const INTERCEPT_CLOSENESS_RADIUS_YD = 4;

const IDEAL_THROW_OFFSET_AFTER_CUT_SEC = 0.2;
const TIMING_DEAD_ZONE_SEC = 0.4;
const TIMING_DECAY_SEC = 1.6;

export const FUMBLE_PROBABILITY = 0.03;

export const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

/**
 * 1.0 when the ball is released shortly after the receiver's break; decays for throws that
 * are too early (receiver not yet open) or too late (defender has closed).
 */
export const computeTimingScore = (throwTimeSec: number, breakTimeSec: number): number => {
  const error = Math.abs(throwTimeSec - breakTimeSec - IDEAL_THROW_OFFSET_AFTER_CUT_SEC);
  return 1 - clamp((error - TIMING_DEAD_ZONE_SEC) / TIMING_DECAY_SEC, 0, 1);
};

export type PassModelInput = PassMetrics & {
  /** Passer's accuracy, 0-1. */
  qbAccuracy: number;
  /** Target's catch probability, 0-1. */
  targetCatchProbability: number;
  /** Nearest defender's ball skills, 0-1. */
  defenderBallSkill: number;
  /** Scales the interception chance (a gambling defender raises it). Defaults to 1. */
  interceptMultiplier?: number;
};

/**
 * Probability model for a thrown ball, based on receiver/defender separation at arrival,
 * speed advantage, throw timing, rusher pressure and throw distance.
 */
export const computePassProbabilities = (input: PassModelInput): PassProbabilities => {
  const logit =
    OPEN_LOGIT_BIAS +
    SEPARATION_WEIGHT * input.separationYd +
    SPEED_DIFF_WEIGHT * input.speedDiffYps +
    TIMING_WEIGHT * input.timingScore +
    THROW_DISTANCE_WEIGHT * input.throwDistanceYd +
    PRESSURE_WEIGHT * input.pressure +
    ACCURACY_WEIGHT * (input.qbAccuracy - ACCURACY_BASELINE);

  const open = sigmoid(logit);
  const complete = open * clamp(input.targetCatchProbability, 0, 1);

  const closeness = clamp(1 - input.separationYd / INTERCEPT_CLOSENESS_RADIUS_YD, 0, 1);
  const interceptSkill = 0.45 * clamp(input.defenderBallSkill, 0, 1) + 0.55 * closeness;
  const intercept = Math.min(
    (1 - open) * INTERCEPT_SCALE * interceptSkill * (input.interceptMultiplier ?? 1),
    1 - complete,
  );

  const incomplete = Math.max(0, 1 - complete - intercept);
  return { open, complete, intercept, incomplete };
};

export type PassRoll = "CATCH" | "INTERCEPTION" | "INCOMPLETE";

export const rollPassResult = (probabilities: PassProbabilities, roll: number): PassRoll => {
  if (roll < probabilities.complete) return "CATCH";
  if (roll < probabilities.complete + probabilities.intercept) return "INTERCEPTION";
  return "INCOMPLETE";
};

/** Chance a nearby defender pulls the flag right after the catch. */
export const computeFlagPullProbability = (
  defenderFlagPull: number,
  separationYd: number,
): number => clamp(defenderFlagPull * (1.1 - separationYd / 6), 0, 0.95);

/** Extra yards after the catch when the flag is not pulled. */
export const computeYardsAfterCatch = (
  separationYd: number,
  speedDiffYps: number,
  roll: number,
): number => clamp(1 + 0.7 * separationYd + 0.6 * speedDiffYps + roll * 2, 0, 12);

/** Chance that a pull attempt on the QB succeeds (agile QBs slip away). */
export const computeQbPullProbability = (rusherFlagPull: number, qbAgility: number): number =>
  clamp(rusherFlagPull * 0.85 * (1 - (0.3 * clamp(qbAgility, 0, 100)) / 100), 0, 0.95);

export const roundYards = (yards: number): number => Math.round(yards * 10) / 10;
