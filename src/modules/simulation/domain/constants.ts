import type { PlayerProfile, Position } from "@/modules/roster";

/** Visible window around the line of scrimmage for the "play view". */
export const PLAY_VIEW_BEHIND_LOS_YD = 8;
export const PLAY_VIEW_AHEAD_LOS_YD = 30;

// ---------- Simulation tuning ----------
export const FIXED_STEP_SEC = 1 / 120;
export const MAX_PLAY_TIME_SEC = 9;
export const END_OF_ROUTE_HOLD_SEC = 0.8;

export const PEAK_SPEED_MULTIPLIER = 1.12;
export const ROUTE_ACCEL_TIME_SEC = 1.1;
export const ROUTE_START_SPEED_FRACTION = 0.45;
export const CUT_BRAKE_WINDOW_YD = 1.6;

export const BALL_SPEED_YPS = 20;
export const RELEASE_TIME_SEC = 0.2;

export const DEFENDER_REACTION_SEC = 0.25;
export const DEFENDER_HOLD_DISTANCE_YD = 0.9;
export const MAN_COVERAGE_LEAD_FACTOR = 0.6;
export const RUSHER_DELAY_SEC = 1.2;
export const RUSHER_START_DEPTH_YD = 7;
export const QB_DROP_DEPTH_YD = 5;
export const PULL_RANGE_YD = 1.1;
export const PULL_ATTEMPT_INTERVAL_SEC = 0.25;
export const PUMP_FAKE_SEC = 0.4;
export const SCRAMBLE_MAX_SEC = 5;

// ---------- Interactive defense ----------
/** How long the engine-run QB reads the defense's live call before he throws. */
export const QB_READ_SEC = 0.8;
/** The QB scrambles instead of throwing when a rusher is this close. */
export const QB_SCRAMBLE_TRIGGER_YD = 2;
export const JUMP_ROUTE_SPEED_MULTIPLIER = 1.12;
export const JUMP_ROUTE_INTERCEPT_MULTIPLIER = 1.7;
/** A cornerback who gambled and lost is this much further from the catch than the sim measures. */
export const JUMP_ROUTE_OVERCOMMIT_YD = 3;
export const BLITZ_RUSHER_SPEED_MULTIPLIER = 1.25;

// ---------- Default (fallback) profiles ----------
const emptyStats = { targets: 0, receptions: 0, yards: 0, flagPulls: 0, interceptions: 0 };

const buildDefaultProfile = (
  id: string,
  name: string,
  position: Position,
  jerseyNumber: number,
  metrics: PlayerProfile["metrics"],
): PlayerProfile => ({ id, name, position, altPositions: [], jerseyNumber, metrics, stats: emptyStats });

export const DEFAULT_QUARTERBACK = buildDefaultProfile("default_qb", "Default QB", "QB", 1, {
  fortyYardDash: 5.0,
  agility: 70,
  catchProbability: 0.8,
  flagPullEfficiency: 0.3,
});

export const DEFAULT_CORNERBACK = buildDefaultProfile("default_db", "Default DB", "DB", 21, {
  fortyYardDash: 4.9,
  agility: 70,
  catchProbability: 0.5,
  flagPullEfficiency: 0.55,
});

export const DEFAULT_SAFETY = buildDefaultProfile("default_safety", "Default Safety", "DB", 31, {
  fortyYardDash: 4.85,
  agility: 65,
  catchProbability: 0.55,
  flagPullEfficiency: 0.5,
});

export const DEFAULT_RUSHER = buildDefaultProfile("default_rusher", "Default Rusher", "RUSHER", 55, {
  fortyYardDash: 5.0,
  agility: 60,
  catchProbability: 0.4,
  flagPullEfficiency: 0.6,
});

export const DEFAULT_OUTLET = buildDefaultProfile("default_outlet", "Check-down", "WR", 33, {
  fortyYardDash: 5.1,
  agility: 70,
  catchProbability: 0.88,
  flagPullEfficiency: 0.3,
});
