import { describe, expect, it } from "vitest";
import { FIELD_WIDTH_YD } from "@/shared/kernel/field";
import {
  ROUTE_TYPES,
  buildRouteFromTemplate,
  getBreakWaypointIndex,
  getInsideDirection,
  resolveRoutePoints,
} from "../routeTemplates";

describe("route templates", () => {
  it("offers at least a dozen distinct routes", () => {
    expect(ROUTE_TYPES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ROUTE_TYPES.map((type) => buildRouteFromTemplate(type).name)).size).toBe(ROUTE_TYPES.length);
  });

  it("starts every route at the alignment and keeps it on the field from either side", () => {
    ROUTE_TYPES.forEach((type) => {
      const { waypoints } = buildRouteFromTemplate(type);
      expect(waypoints[0]).toMatchObject({ x: 0, y: 0 });
      expect(Math.min(...waypoints.map((waypoint) => waypoint.y))).toBeGreaterThanOrEqual(0);

      [6, FIELD_WIDTH_YD - 6].forEach((alignmentX) => {
        resolveRoutePoints(waypoints, alignmentX, 30).forEach((point) => {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(FIELD_WIDTH_YD);
        });
      });
    });
  });

  it("marks the routes that break as cuts and the vertical ones as straight", () => {
    const hasCut = (type: (typeof ROUTE_TYPES)[number]): boolean =>
      buildRouteFromTemplate(type).waypoints.some((waypoint) => waypoint.cut);

    ["DRAG", "FLAT", "COMEBACK", "CORNER", "WHEEL", "SLUGGO"].forEach((type) => {
      expect(hasCut(type as (typeof ROUTE_TYPES)[number])).toBe(true);
    });
    expect(hasCut("FADE")).toBe(false);
  });

  it("builds every route type with a time-based decision point", () => {
    ROUTE_TYPES.forEach((type) => {
      const route = buildRouteFromTemplate(type);
      expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
      expect(route.decisionPoints.some((point) => point.trigger === "AT_TIME")).toBe(true);
    });
  });

  it("adds a cut decision point only for routes that turn", () => {
    expect(buildRouteFromTemplate("GO").decisionPoints.some((point) => point.trigger === "AT_CUT")).toBe(false);
    expect(buildRouteFromTemplate("SLANT").decisionPoints.some((point) => point.trigger === "AT_CUT")).toBe(true);
  });

  it("breaks at the first cut, or at the last point when the route is straight", () => {
    const slant = buildRouteFromTemplate("SLANT");
    expect(slant.waypoints[getBreakWaypointIndex(slant.waypoints)].cut).toBe(true);

    const go = buildRouteFromTemplate("GO");
    expect(getBreakWaypointIndex(go.waypoints)).toBe(go.waypoints.length - 1);
  });

  it("mirrors the route toward the field center and keeps it on the field", () => {
    const { waypoints } = buildRouteFromTemplate("SLANT");
    const fromLeft = resolveRoutePoints(waypoints, 6, 30);
    const fromRight = resolveRoutePoints(waypoints, FIELD_WIDTH_YD - 6, 30);

    expect(getInsideDirection(6)).toBe(1);
    expect(getInsideDirection(FIELD_WIDTH_YD - 6)).toBe(-1);
    expect(fromLeft[fromLeft.length - 1].x).toBeGreaterThan(6);
    expect(fromRight[fromRight.length - 1].x).toBeLessThan(FIELD_WIDTH_YD - 6);
    [...fromLeft, ...fromRight].forEach((point) => {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(FIELD_WIDTH_YD);
    });
  });
});
