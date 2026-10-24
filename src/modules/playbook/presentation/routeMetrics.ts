import type { Route, RouteType } from "../domain/route";

export type RouteFacts = {
  /** Total path length in yards. */
  lengthYd: number;
  /** Furthest point downfield from the line of scrimmage. */
  depthYd: number;
  cuts: number;
};

export const getRouteFacts = (route: Route): RouteFacts => {
  const lengthYd = route.waypoints.reduce((total, waypoint, index) => {
    if (index === 0) return total;
    const previous = route.waypoints[index - 1];
    return total + Math.hypot(waypoint.x - previous.x, waypoint.y - previous.y);
  }, 0);
  return {
    lengthYd,
    depthYd: Math.max(...route.waypoints.map((waypoint) => waypoint.y)),
    cuts: route.waypoints.filter((waypoint) => waypoint.cut).length,
  };
};

/** Coaching one-liners shown on route cards. */
export const ROUTE_BLURBS: Record<RouteType, string> = {
  SLANT: "Quick inside break at 3 yards. Beats press and man coverage before the rush arrives.",
  OUT: "Square break to the sideline at 8 yards. A safe throw if the QB is on time.",
  GO: "Straight vertical stretch. No cut, so the decision comes on the clock.",
  HOOK: "Stop and come back to the QB at 10 yards. Reliable against deep coverage.",
  POST: "Deep inside break at 10 yards toward the goalpost. High reward, high risk.",
};
