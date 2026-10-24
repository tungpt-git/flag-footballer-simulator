/**
 * Field geometry shared by every bounded context (yards).
 *
 *   x: lateral, 0 (left sideline) .. FIELD_WIDTH_YD (right sideline)
 *   y: downfield, 0 (midfield) .. 50 (goal line) .. 60 (back of end zone)
 */
export const FIELD_WIDTH_YD = 30;
export const FIELD_CENTER_X = FIELD_WIDTH_YD / 2;
/** Length of the playing field from midfield (0) to the goal line. */
export const FIELD_LENGTH_YD = 50;
export const END_ZONE_YD = 10;
export const FIELD_TOTAL_YD = FIELD_LENGTH_YD + END_ZONE_YD;
export const GOAL_LINE_Y = FIELD_LENGTH_YD;
export const DEFAULT_LOS_Y = 30;
export const HASH_X_LEFT = 11;
export const HASH_X_RIGHT = FIELD_WIDTH_YD - 11;
