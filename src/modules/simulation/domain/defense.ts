import type { SimEntity } from "./types";
import {
  type Vec2,
  add,
  clamp,
  distance,
  length,
  lerp,
  normalize,
  scale,
  solveInterceptTime,
  sub,
} from "@/shared/kernel/geometry";
import { DEFENDER_HOLD_DISTANCE_YD } from "./constants";

const MAX_LEAD_TIME_SEC = 1.5;
const ARRIVE_RADIUS_YD = 1.5;
const MIN_ARRIVE_SPEED_FRACTION = 0.15;

export type SteeringAttributes = {
  topSpeedYps: number;
  maxAccelYps2: number;
};

/**
 * Lead-pursuit aim point. Solves for the time at which the pursuer could meet the
 * target and aims at where the target will be, scaled by `leadFactor`
 * (0 = pure pursuit, 1 = full intercept).
 */
export const computePursuitAim = (
  pursuerPos: Vec2,
  pursuerTopSpeed: number,
  target: Pick<SimEntity, "pos" | "vel">,
  leadFactor: number,
): Vec2 => {
  const interceptTime = solveInterceptTime(pursuerPos, pursuerTopSpeed, target.pos, target.vel);
  if (interceptTime === null) return { ...target.pos };
  const leadTime = Math.min(interceptTime, MAX_LEAD_TIME_SEC) * leadFactor;
  return add(target.pos, scale(target.vel, leadTime));
};

/** Aim point for a deep zone defender: stays over the top of the receiver, shaded toward him. */
export const computeZoneAim = (
  zoneAnchor: Vec2,
  receiver: Pick<SimEntity, "pos">,
  cushionYd: number,
): Vec2 => ({
  x: lerp(zoneAnchor.x, receiver.pos.x, 0.5),
  y: Math.max(zoneAnchor.y, receiver.pos.y + cushionYd),
});

/**
 * Accelerates `entity` toward `aim`, limited by top speed and max acceleration, so that
 * defenders lag behind sharp cuts. Mutates the entity in place.
 */
export const steerToward = (
  entity: SimEntity,
  aim: Vec2,
  attributes: SteeringAttributes,
  deltaSec: number,
  holdDistanceYd: number = DEFENDER_HOLD_DISTANCE_YD,
): void => {
  const toAim = sub(aim, entity.pos);
  const aimDistance = length(toAim);
  const arriveFraction =
    aimDistance <= holdDistanceYd
      ? 0
      : clamp((aimDistance - holdDistanceYd) / ARRIVE_RADIUS_YD, MIN_ARRIVE_SPEED_FRACTION, 1);
  const desiredVelocity = scale(normalize(toAim), attributes.topSpeedYps * arriveFraction);

  const velocityChange = sub(desiredVelocity, entity.vel);
  const maxChange = attributes.maxAccelYps2 * deltaSec;
  const changeMagnitude = length(velocityChange);
  const limitedChange =
    changeMagnitude > maxChange ? scale(velocityChange, maxChange / changeMagnitude) : velocityChange;

  entity.vel = add(entity.vel, limitedChange);
  entity.pos = add(entity.pos, scale(entity.vel, deltaSec));
};

export const findNearestEntity = <T extends Pick<SimEntity, "pos">>(
  origin: Vec2,
  candidates: T[],
): T | null =>
  candidates.reduce<T | null>((nearest, candidate) => {
    if (!nearest) return candidate;
    return distance(origin, candidate.pos) < distance(origin, nearest.pos) ? candidate : nearest;
  }, null);
