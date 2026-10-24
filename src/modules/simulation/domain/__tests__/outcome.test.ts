import { describe, expect, it } from "vitest";
import { computePassProbabilities, computeTimingScore, rollPassResult } from "../outcome";

const basePass = {
  separationYd: 3,
  speedDiffYps: 0,
  timingScore: 1,
  pressure: 0,
  throwDistanceYd: 15,
  qbAccuracy: 0.8,
  targetCatchProbability: 0.8,
  defenderBallSkill: 0.5,
};

describe("computePassProbabilities", () => {
  it("probabilities sum to 1", () => {
    const { complete, intercept, incomplete } = computePassProbabilities(basePass);
    expect(complete + intercept + incomplete).toBeCloseTo(1);
  });

  it("completion rises with separation and falls with pressure", () => {
    const open = computePassProbabilities({ ...basePass, separationYd: 5 });
    const covered = computePassProbabilities({ ...basePass, separationYd: 0.5 });
    const pressured = computePassProbabilities({ ...basePass, pressure: 1 });
    const clean = computePassProbabilities(basePass);

    expect(open.complete).toBeGreaterThan(covered.complete);
    expect(pressured.complete).toBeLessThan(clean.complete);
  });

  it("completion rises with receiver speed advantage and good timing", () => {
    const fast = computePassProbabilities({ ...basePass, speedDiffYps: 1.5 });
    const slow = computePassProbabilities({ ...basePass, speedDiffYps: -1.5 });
    const late = computePassProbabilities({ ...basePass, timingScore: 0 });

    expect(fast.complete).toBeGreaterThan(slow.complete);
    expect(late.complete).toBeLessThan(computePassProbabilities(basePass).complete);
  });

  it("covered receivers are intercepted more often", () => {
    const covered = computePassProbabilities({ ...basePass, separationYd: 0.5, timingScore: 0.2 });
    const open = computePassProbabilities({ ...basePass, separationYd: 6 });
    expect(covered.intercept).toBeGreaterThan(open.intercept);
  });
});

describe("computeTimingScore", () => {
  it("is perfect shortly after the break and decays for early or late throws", () => {
    expect(computeTimingScore(1.3, 1.2)).toBe(1);
    expect(computeTimingScore(3.5, 1.2)).toBeLessThan(0.5);
    expect(computeTimingScore(0.1, 1.2)).toBeLessThan(0.8);
  });
});

describe("rollPassResult", () => {
  const probabilities = { open: 0.7, complete: 0.5, intercept: 0.2, incomplete: 0.3 };

  it("maps rolls to results", () => {
    expect(rollPassResult(probabilities, 0.1)).toBe("CATCH");
    expect(rollPassResult(probabilities, 0.6)).toBe("INTERCEPTION");
    expect(rollPassResult(probabilities, 0.95)).toBe("INCOMPLETE");
  });
});
