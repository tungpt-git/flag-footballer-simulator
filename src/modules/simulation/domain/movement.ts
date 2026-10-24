import { dashToAverageYps, type PlayerMetrics } from "@/modules/roster";
import {
  Path,
  buildPath,
  clamp,
  directionAtDistance,
  pointAtDistance,
  scale,
  turnAngleDeg,
  type Vec2,
} from "@/shared/kernel/geometry";
import {
  CUT_BRAKE_WINDOW_YD,
  PEAK_SPEED_MULTIPLIER,
  ROUTE_ACCEL_TIME_SEC,
  ROUTE_START_SPEED_FRACTION,
} from "./constants";
import type { SimEntity } from "./types";

const MIN_CUT_ANGLE_DEG = 20;
const MIN_CUT_SPEED_FRACTION = 0.35;
const TIME_PROJECTION_STEP_SEC = 1 / 60;
const MAX_PROJECTION_TIME_SEC = 15;

/** Peak sprint speed in yards per second (faster than the dash average, which includes acceleration). */
export const getTopSpeedYps = (metrics: PlayerMetrics): number =>
  dashToAverageYps(metrics.fortyYardDash) * PEAK_SPEED_MULTIPLIER;

/** Maximum change in velocity per second; higher agility means quicker direction changes. */
export const getMaxAccelYps2 = (agility: number): number => 7 + (9 * clamp(agility, 0, 100)) / 100;

export type RouteCut = {
  /** Arc-length position of the cut along the route. */
  arc: number;
  /** Fraction of top speed the runner can hold through the cut. */
  speedFraction: number;
};

export type RunnerRuntime = {
  path: Path;
  cuts: RouteCut[];
  topSpeedYps: number;
};

/** Sharper cuts slow the runner more; agility reduces the penalty. */
export const getCutSpeedFraction = (turnDeg: number, agility: number): number =>
  clamp(
    1 - (turnDeg / 180) * (0.75 - (0.5 * clamp(agility, 0, 100)) / 100),
    MIN_CUT_SPEED_FRACTION,
    1,
  );

export const createRunnerRuntime = (points: Vec2[], metrics: PlayerMetrics): RunnerRuntime => {
  const path = buildPath(points);
  const cuts: RouteCut[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const turnDeg = turnAngleDeg(points[index - 1], points[index], points[index + 1]);
    if (turnDeg < MIN_CUT_ANGLE_DEG) continue;
    cuts.push({
      arc: path.cumulative[index],
      speedFraction: getCutSpeedFraction(turnDeg, metrics.agility),
    });
  }
  return { path, cuts, topSpeedYps: getTopSpeedYps(metrics) };
};

const getCutFactor = (cuts: RouteCut[], arc: number): number =>
  cuts.reduce((factor, cut) => {
    const distanceToCut = Math.abs(arc - cut.arc);
    if (distanceToCut >= CUT_BRAKE_WINDOW_YD) return factor;
    const blended =
      cut.speedFraction + (1 - cut.speedFraction) * (distanceToCut / CUT_BRAKE_WINDOW_YD);
    return Math.min(factor, blended);
  }, 1);

const getAccelerationFactor = (elapsedSec: number): number =>
  ROUTE_START_SPEED_FRACTION +
  (1 - ROUTE_START_SPEED_FRACTION) * clamp(elapsedSec / ROUTE_ACCEL_TIME_SEC, 0, 1);

/** Instantaneous speed (yd/s) at an arc position and time since snap. */
export const getRunnerSpeed = (runtime: RunnerRuntime, arc: number, elapsedSec: number): number => {
  if (arc >= runtime.path.totalLength) return 0;
  const factor = Math.min(getAccelerationFactor(elapsedSec), getCutFactor(runtime.cuts, arc));
  return runtime.topSpeedYps * factor;
};

const getArc = (entity: SimEntity, runtime: RunnerRuntime): number =>
  (entity.routeProgress ?? 0) * runtime.path.totalLength;

/** Advances a route runner in place along its path. */
export const advanceRunner = (
  entity: SimEntity,
  runtime: RunnerRuntime,
  elapsedSec: number,
  deltaSec: number,
): void => {
  const { path } = runtime;
  if (path.totalLength <= 0) return;

  const arc = getArc(entity, runtime);
  const speed = getRunnerSpeed(runtime, arc, elapsedSec);
  const nextArc = Math.min(path.totalLength, arc + speed * deltaSec);

  entity.routeProgress = nextArc / path.totalLength;
  entity.pos = pointAtDistance(path, nextArc);
  entity.vel =
    nextArc >= path.totalLength
      ? { x: 0, y: 0 }
      : scale(directionAtDistance(path, nextArc), getRunnerSpeed(runtime, nextArc, elapsedSec));
};

export type RunnerProjection = { pos: Vec2; vel: Vec2; progress: number };

/** Where the runner will be `horizonSec` from now (runners are independent of defenders). */
export const projectRunner = (
  entity: SimEntity,
  runtime: RunnerRuntime,
  elapsedSec: number,
  horizonSec: number,
): RunnerProjection => {
  const probe: SimEntity = { ...entity, pos: { ...entity.pos }, vel: { ...entity.vel } };
  let time = elapsedSec;
  let remaining = horizonSec;
  while (remaining > 1e-9) {
    const step = Math.min(TIME_PROJECTION_STEP_SEC, remaining);
    advanceRunner(probe, runtime, time, step);
    time += step;
    remaining -= step;
  }
  return { pos: probe.pos, vel: probe.vel, progress: probe.routeProgress ?? 0 };
};

/** Seconds after the snap until the runner has covered `arc` yards of its route. */
export const timeToReachArc = (runtime: RunnerRuntime, arc: number): number => {
  const probe: SimEntity = {
    id: "probe",
    role: "RECEIVER",
    label: "",
    pos: pointAtDistance(runtime.path, 0),
    vel: { x: 0, y: 0 },
    routeProgress: 0,
  };
  const targetArc = Math.min(arc, runtime.path.totalLength);
  let time = 0;
  while (time < MAX_PROJECTION_TIME_SEC) {
    if (getArc(probe, runtime) >= targetArc - 1e-6) return time;
    advanceRunner(probe, runtime, time, TIME_PROJECTION_STEP_SEC);
    time += TIME_PROJECTION_STEP_SEC;
  }
  return time;
};

export const estimateRouteDurationSec = (runtime: RunnerRuntime): number =>
  timeToReachArc(runtime, runtime.path.totalLength);
