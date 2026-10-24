/**
 * Published language of the Roster context: the types and rules other contexts may depend on.
 * Safe to import from the server, the client and tests.
 */
export type { PlayerInput, PlayerMetrics, PlayerProfile, PlayerStats, Position } from "./domain/player";
export { POSITIONS } from "./domain/player";
export { DASH_DISTANCE_YD, YARDS_TO_METERS, dashToAverageYps, dashToMetersPerSecond } from "./domain/athletics";
