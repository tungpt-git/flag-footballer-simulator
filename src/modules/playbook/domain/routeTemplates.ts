import { FIELD_CENTER_X, FIELD_WIDTH_YD } from "@/shared/kernel/field";
import { turnAngleDeg, type Vec2 } from "@/shared/kernel/geometry";
import {
  DEFAULT_DECISION_TIME_SEC,
  type DecisionPoint,
  type Route,
  type RouteType,
  type RouteWaypoint,
} from "./route";

const CUT_ANGLE_THRESHOLD_DEG = 20;
const FIELD_EDGE_MARGIN_YD = 0.75;

/**
 * Route templates in normalized offsets from the receiver's alignment.
 * +x = toward the field center (inside), +y = downfield from the line of scrimmage.
 */
export const ROUTE_TEMPLATE_POINTS: Record<RouteType, Vec2[]> = {
  SLANT: [
    { x: 0, y: 0 },
    { x: 0, y: 3 },
    { x: 7, y: 10 },
    { x: 10, y: 13 },
  ],
  OUT: [
    { x: 0, y: 0 },
    { x: 0, y: 8 },
    { x: -6, y: 8 },
  ],
  GO: [
    { x: 0, y: 0 },
    { x: 0, y: 26 },
  ],
  HOOK: [
    { x: 0, y: 0 },
    { x: 0, y: 10 },
    { x: 1.2, y: 7.5 },
  ],
  POST: [
    { x: 0, y: 0 },
    { x: 0, y: 10 },
    { x: 7, y: 20 },
    { x: 9, y: 24 },
  ],
  DRAG: [
    { x: 0, y: 0 },
    { x: 0, y: 2 },
    { x: 7, y: 3 },
    { x: 15, y: 3.5 },
  ],
  FLAT: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: -4, y: 3 },
  ],
  COMEBACK: [
    { x: 0, y: 0 },
    { x: 0, y: 14 },
    { x: -3, y: 11 },
  ],
  CORNER: [
    { x: 0, y: 0 },
    { x: 0, y: 10 },
    { x: -4, y: 16 },
    { x: -5, y: 19 },
  ],
  WHEEL: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: -4, y: 3 },
    { x: -4.5, y: 12 },
    { x: -4.5, y: 24 },
  ],
  FADE: [
    { x: 0, y: 0 },
    { x: 0, y: 5 },
    { x: -3, y: 24 },
  ],
  SLUGGO: [
    { x: 0, y: 0 },
    { x: 0, y: 3 },
    { x: 5, y: 7 },
    { x: 3, y: 10 },
    { x: 3, y: 26 },
  ],
};

export const ROUTE_NAMES: Record<RouteType, string> = {
  SLANT: "Slant",
  OUT: "Out",
  GO: "Go",
  HOOK: "Hook",
  POST: "Post",
  DRAG: "Drag",
  FLAT: "Flat",
  COMEBACK: "Comeback",
  CORNER: "Corner",
  WHEEL: "Wheel",
  FADE: "Fade",
  SLUGGO: "Sluggo",
};

export const ROUTE_TYPES = Object.keys(ROUTE_TEMPLATE_POINTS) as RouteType[];

/** Flags interior vertices with a sharp turn as cuts and records the turn angle. */
export const buildWaypoints = (points: Vec2[]): RouteWaypoint[] =>
  points.map((point, index) => {
    const isInterior = index > 0 && index < points.length - 1;
    if (!isInterior) return { x: point.x, y: point.y, cut: false };
    const angle = turnAngleDeg(points[index - 1], point, points[index + 1]);
    const cut = angle >= CUT_ANGLE_THRESHOLD_DEG;
    return cut
      ? { x: point.x, y: point.y, cut, cutAngleDeg: Math.round(angle) }
      : { x: point.x, y: point.y, cut };
  });

export const buildDecisionPoints = (waypoints: RouteWaypoint[]): DecisionPoint[] => {
  const decisionPoints: DecisionPoint[] = [];
  const firstCutIndex = waypoints.findIndex((waypoint) => waypoint.cut);
  if (firstCutIndex >= 0) {
    decisionPoints.push({ id: "dp_cut", trigger: "AT_CUT", waypointIndex: firstCutIndex });
  }
  decisionPoints.push({ id: "dp_time", trigger: "AT_TIME", timeSec: DEFAULT_DECISION_TIME_SEC });
  return decisionPoints;
};

export const buildRouteFromTemplate = (type: RouteType): Omit<Route, "id"> => {
  const waypoints = buildWaypoints(ROUTE_TEMPLATE_POINTS[type]);
  return {
    name: ROUTE_NAMES[type],
    type,
    waypoints,
    decisionPoints: buildDecisionPoints(waypoints),
  };
};

/** +1 when the alignment is left of center (inside = +x on the field), otherwise -1. */
export const getInsideDirection = (alignmentX: number): 1 | -1 =>
  alignmentX <= FIELD_CENTER_X ? 1 : -1;

const clampToField = (x: number): number =>
  Math.min(FIELD_WIDTH_YD - FIELD_EDGE_MARGIN_YD, Math.max(FIELD_EDGE_MARGIN_YD, x));

/** Converts route offsets to absolute field coordinates for a given alignment. */
export const resolveRoutePoints = (
  waypoints: RouteWaypoint[],
  alignmentX: number,
  losY: number,
): Vec2[] => {
  const inside = getInsideDirection(alignmentX);
  return waypoints.map((waypoint) => ({
    x: clampToField(alignmentX + inside * waypoint.x),
    y: losY + waypoint.y,
  }));
};

/** Index of the waypoint the receiver should "break" at (first cut, otherwise last point). */
export const getBreakWaypointIndex = (waypoints: RouteWaypoint[]): number => {
  const firstCut = waypoints.findIndex((waypoint) => waypoint.cut);
  return firstCut >= 0 ? firstCut : waypoints.length - 1;
};
