import { describe, expect, it } from "vitest";
import {
  angleBetweenDeg,
  buildPath,
  distance,
  pointAtDistance,
  solveInterceptTime,
  turnAngleDeg,
} from "@/shared/kernel/geometry";

describe("path helpers", () => {
  const path = buildPath([
    { x: 0, y: 0 },
    { x: 0, y: 10 },
    { x: 10, y: 10 },
  ]);

  it("computes total length", () => {
    expect(path.totalLength).toBeCloseTo(20);
  });

  it("interpolates points along the polyline", () => {
    expect(pointAtDistance(path, 5)).toEqual({ x: 0, y: 5 });
    expect(pointAtDistance(path, 15)).toEqual({ x: 5, y: 10 });
    expect(pointAtDistance(path, 99)).toEqual({ x: 10, y: 10 });
    expect(pointAtDistance(path, -1)).toEqual({ x: 0, y: 0 });
  });

  it("measures turn angles", () => {
    expect(turnAngleDeg({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 })).toBeCloseTo(90);
    expect(turnAngleDeg({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 })).toBeCloseTo(0);
    expect(angleBetweenDeg({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });
});

describe("solveInterceptTime", () => {
  it("meets a crossing target at the predicted point", () => {
    const pursuer = { x: 0, y: 0 };
    const targetPos = { x: 10, y: 0 };
    const targetVel = { x: 0, y: 4 };
    const time = solveInterceptTime(pursuer, 8, targetPos, targetVel) as number;

    const meetingPoint = { x: targetPos.x, y: targetPos.y + targetVel.y * time };
    expect(distance(pursuer, meetingPoint)).toBeCloseTo(8 * time, 5);
  });

  it("returns null when the target is faster and running away", () => {
    expect(solveInterceptTime({ x: 0, y: 0 }, 3, { x: 5, y: 0 }, { x: 6, y: 0 })).toBeNull();
  });

  it("returns 0 when already at the target", () => {
    expect(solveInterceptTime({ x: 1, y: 1 }, 5, { x: 1, y: 1 }, { x: 2, y: 0 })).toBe(0);
  });
});
