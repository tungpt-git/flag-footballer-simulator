export const DASH_DISTANCE_YD = 40;
export const YARDS_TO_METERS = 0.9144;

/** Average 40-yard dash speed in yards per second. */
export const dashToAverageYps = (fortyYardDash: number): number =>
  DASH_DISTANCE_YD / Math.max(fortyYardDash, 0.1);

/** Average 40-yard dash speed in meters per second (for display). */
export const dashToMetersPerSecond = (fortyYardDash: number): number =>
  dashToAverageYps(fortyYardDash) * YARDS_TO_METERS;
