export type RouteType =
  | "SLANT"
  | "OUT"
  | "GO"
  | "HOOK"
  | "POST"
  | "DRAG"
  | "FLAT"
  | "COMEBACK"
  | "CORNER"
  | "WHEEL"
  | "FADE"
  | "SLUGGO";

export type RouteWaypoint = {
  /** Lateral offset in yards from alignment. +x is toward the field center ("inside"). */
  x: number;
  /** Downfield offset in yards from the line of scrimmage. */
  y: number;
  cut: boolean;
  cutAngleDeg?: number;
};

export type DecisionTrigger = "AT_TIME" | "AT_CUT";

export const DEFAULT_DECISION_TIME_SEC = 2.5;

export type DecisionPoint = {
  id: string;
  trigger: DecisionTrigger;
  /** Required for AT_TIME. */
  timeSec?: number;
  /** Required for AT_CUT. */
  waypointIndex?: number;
};

/** Route aggregate root: waypoints as offsets from alignment, plus the points where a play may pause. */
export type Route = {
  id: string;
  name: string;
  type: RouteType;
  waypoints: RouteWaypoint[];
  decisionPoints: DecisionPoint[];
};
