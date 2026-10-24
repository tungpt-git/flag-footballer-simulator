import { describe, expect, it } from "vitest";
import { DEFAULT_CORNERBACK, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "../constants";
import { DEFENSIVE_PLAYS, type DefensivePlayId } from "../defensivePlays";
import { DEFAULT_LOS_Y } from "@/shared/kernel/field";
import { createRunnerRuntime, estimateRouteDurationSec } from "../movement";
import {
  buildRouteFromTemplate,
  resolveRoutePoints,
  type DecisionTrigger,
  type RouteType,
} from "@/modules/playbook";
import {
  ENTITY_IDS,
  SimulationState,
  applyDecision,
  applyDefensiveDecision,
  createSimulation,
  getFrame,
  previewDecision,
  stepSimulation,
} from "../simulation";
import type { PlayerProfile } from "@/modules/roster";
import type { PlayCategory, SimulationConfig, SimulationMode } from "../types";

const buildReceiver = (fortyYardDash: number, agility = 80): PlayerProfile => ({
  id: "wr",
  name: "Test WR",
  position: "WR",
  altPositions: [],
  jerseyNumber: 11,
  metrics: { fortyYardDash, agility, catchProbability: 0.8, flagPullEfficiency: 0.3 },
  stats: { targets: 0, receptions: 0, yards: 0, flagPulls: 0, interceptions: 0 },
});

const buildConfig = (
  overrides: Partial<{
    mode: SimulationMode;
    category: PlayCategory;
    routeType: RouteType;
    defense: DefensivePlayId;
    trigger: DecisionTrigger;
    receiver: PlayerProfile;
    seed: number;
  }> = {},
): SimulationConfig => ({
  mode: overrides.mode ?? "VIEW",
  category: overrides.category ?? "OFFENSE",
  route: { id: "r", ...buildRouteFromTemplate(overrides.routeType ?? "SLANT") },
  defensivePlayId: overrides.defense ?? "MAN_FREE",
  decisionTrigger: overrides.trigger ?? "AT_TIME",
  losY: DEFAULT_LOS_Y,
  alignmentX: 6,
  seed: overrides.seed ?? 42,
  receiver: overrides.receiver ?? buildReceiver(4.6),
  quarterback: DEFAULT_QUARTERBACK,
  cornerback: DEFAULT_CORNERBACK,
  rusher: DEFAULT_RUSHER,
});

const runToEnd = (initial: SimulationState, stepSec = 1 / 60, maxSteps = 2000): SimulationState => {
  let state = initial;
  for (let index = 0; index < maxSteps && state.phase !== "FINISHED"; index += 1) {
    state = stepSimulation(state, stepSec);
    if (state.phase === "PAUSED_FOR_DECISION") break;
  }
  return state;
};

const getEntity = (state: SimulationState, id: string) => {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (!entity) throw new Error(`missing ${id}`);
  return entity;
};

describe("route runner", () => {
  const durationFor = (fortyYardDash: number, agility: number, routeType: RouteType = "SLANT") => {
    const config = buildConfig({ routeType });
    const points = resolveRoutePoints(config.route.waypoints, config.alignmentX, config.losY);
    const { metrics } = buildReceiver(fortyYardDash, agility);
    return estimateRouteDurationSec(createRunnerRuntime(points, { ...metrics, fortyYardDash, agility }));
  };

  it("faster receivers finish the same route sooner", () => {
    expect(durationFor(4.4, 80)).toBeLessThan(durationFor(5.0, 80));
  });

  it("more agile receivers lose less time at sharp cuts", () => {
    expect(durationFor(4.6, 95, "HOOK")).toBeLessThan(durationFor(4.6, 30, "HOOK"));
  });
});

describe("view only mode", () => {
  it("runs the receiver along the route and finishes without any decision", () => {
    const initial = createSimulation(buildConfig());
    const end = runToEnd(initial);

    const receiver = getEntity(end, ENTITY_IDS.receiver);
    expect(end.phase).toBe("FINISHED");
    expect(end.outcome).toBeNull();
    expect(receiver.routeProgress).toBeCloseTo(1, 3);
  });

  it("is deterministic and does not mutate the input state", () => {
    const initial = createSimulation(buildConfig());
    const snapshot = JSON.stringify(getFrame(initial));
    const first = runToEnd(initial);
    const second = runToEnd(initial);

    expect(JSON.stringify(getFrame(initial))).toBe(snapshot);
    expect(getFrame(first)).toEqual(getFrame(second));
  });

  it("keeps the cornerback pursuing the receiver", () => {
    let state = createSimulation(buildConfig({ routeType: "GO" }));
    state = stepSimulation(state, 1.5);
    const receiver = getEntity(state, ENTITY_IDS.receiver);
    const cornerback = getEntity(state, ENTITY_IDS.cornerback);

    expect(cornerback.targetId).toBe(ENTITY_IDS.receiver);
    expect(cornerback.pos.y).toBeGreaterThan(DEFAULT_LOS_Y + 5);
    expect(Math.hypot(cornerback.pos.x - receiver.pos.x, cornerback.pos.y - receiver.pos.y)).toBeLessThan(10);
  });
});

describe("tactical mode", () => {
  it("pauses at the time trigger", () => {
    const state = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_TIME" })));
    expect(state.phase).toBe("PAUSED_FOR_DECISION");
    expect(state.t).toBeGreaterThanOrEqual(2.5);
    expect(state.pendingDecision?.options).toEqual(["PASS_TO_WR", "PUMP_FAKE_SCRAMBLE", "CHECKDOWN"]);
  });

  it("pauses when the receiver reaches the cut", () => {
    const state = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_CUT" })));
    const receiver = getEntity(state, ENTITY_IDS.receiver);

    expect(state.phase).toBe("PAUSED_FOR_DECISION");
    expect(state.t).toBeLessThan(2.5);
    expect(receiver.pos.y).toBeCloseTo(DEFAULT_LOS_Y + 3, 0);
  });

  it("falls back to the time trigger when a route has no cut", () => {
    const state = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", routeType: "GO", trigger: "AT_CUT" })));
    expect(state.phase).toBe("PAUSED_FOR_DECISION");
  });

  it("resolves a thrown pass with an outcome and probabilities", () => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_CUT" })));
    const thrown = applyDecision(paused, "PASS_TO_WR");
    expect(thrown.phase).toBe("BALL_IN_FLIGHT");

    const end = runToEnd(thrown);
    expect(end.phase).toBe("FINISHED");
    expect(end.outcome?.probabilities).toBeDefined();
    expect(["COMPLETED_PASS", "INTERCEPTED", "FLAG_PULLED", "TURNOVER", "INCOMPLETE"]).toContain(end.outcome?.result);
  });

  it("previews pass odds without changing the paused state", () => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_CUT" })));
    const preview = previewDecision(paused, "PASS_TO_WR");

    expect(paused.phase).toBe("PAUSED_FOR_DECISION");
    expect(preview?.probabilities.complete).toBeGreaterThan(0);
    expect(previewDecision(paused, "PUMP_FAKE_SCRAMBLE")).toBeNull();
  });

  it("a checkdown is safer than a contested deep throw", () => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", routeType: "HOOK", trigger: "AT_TIME" })));
    const checkdown = previewDecision(paused, "CHECKDOWN");
    const pass = previewDecision(paused, "PASS_TO_WR");

    expect(checkdown?.probabilities.complete).toBeGreaterThan(pass?.probabilities.complete ?? 1);
  });

  it("scramble ends with a result", () => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL" })));
    const end = runToEnd(applyDecision(paused, "PUMP_FAKE_SCRAMBLE"), 1 / 60, 3000);

    expect(end.phase).toBe("FINISHED");
    expect(["FLAG_PULLED", "TURNOVER", "SCRAMBLE_GAIN"]).toContain(end.outcome?.result);
  });

  it("outcome distribution is sane across many seeds", () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 200; seed += 1) {
      const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_CUT", seed })));
      const end = runToEnd(applyDecision(paused, "PASS_TO_WR"));
      const result = end.outcome?.result ?? "NONE";
      counts[result] = (counts[result] ?? 0) + 1;
    }
    const completionRate = ((counts.COMPLETED_PASS ?? 0) + (counts.FLAG_PULLED ?? 0)) / 200;
    expect(completionRate).toBeGreaterThan(0.3);
    expect(completionRate).toBeLessThan(0.95);
  });
});

describe("defensive plays", () => {
  const defenseIds = DEFENSIVE_PLAYS.map((play) => play.id);

  it("offers more than one defensive play, each with a unique id", () => {
    expect(defenseIds.length).toBeGreaterThan(1);
    expect(new Set(defenseIds).size).toBe(defenseIds.length);
  });

  it.each(defenseIds)("%s lines the defenders up at its depths and plays out", (defense) => {
    const play = DEFENSIVE_PLAYS.find((candidate) => candidate.id === defense);
    const initial = createSimulation(buildConfig({ defense }));

    expect(getEntity(initial, ENTITY_IDS.cornerback).pos.y).toBe(DEFAULT_LOS_Y + (play?.cornerback.depthYd ?? NaN));
    expect(getEntity(initial, ENTITY_IDS.safety).pos.y).toBe(DEFAULT_LOS_Y + (play?.safety.depthYd ?? NaN));
    expect(getEntity(initial, ENTITY_IDS.rusher).pos.y).toBe(DEFAULT_LOS_Y + (play?.rusher.startDepthYd ?? NaN));
    expect(runToEnd(initial).phase).toBe("FINISHED");
  });

  it.each(defenseIds)("%s resolves a tactical pass without errors", (defense) => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", trigger: "AT_CUT", defense })));
    if (paused.phase === "FINISHED") return;

    const end = runToEnd(applyDecision(paused, "PASS_TO_WR"));
    expect(end.phase).toBe("FINISHED");
  });

  it("a blitz gets the rusher to the quarterback sooner than the standard rush", () => {
    const distanceAfter = (defense: DefensivePlayId): number => {
      const state = stepSimulation(createSimulation(buildConfig({ mode: "TACTICAL", defense })), 1.6);
      return getFrame(state).metrics.rusherDistanceYd;
    };

    expect(distanceAfter("BLITZ")).toBeLessThan(distanceAfter("MAN_FREE"));
    expect(distanceAfter("PREVENT")).toBeGreaterThan(distanceAfter("MAN_FREE"));
  });

  it("only zone defenders get an anchor, shaded toward the receiver for a zone cornerback", () => {
    const man = createSimulation(buildConfig({ defense: "MAN_FREE" }));
    const zone = createSimulation(buildConfig({ defense: "ZONE" }));

    expect(Object.keys(man.zoneAnchors)).toEqual([ENTITY_IDS.safety]);
    expect(Object.keys(zone.zoneAnchors).sort()).toEqual([ENTITY_IDS.cornerback, ENTITY_IDS.safety].sort());
    expect(zone.zoneAnchors[ENTITY_IDS.cornerback].x).toBeLessThan(zone.zoneAnchors[ENTITY_IDS.safety].x);
  });

  it("is deterministic for every defensive play", () => {
    defenseIds.forEach((defense) => {
      const first = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", defense })));
      const second = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", defense })));
      expect(getFrame(first)).toEqual(getFrame(second));
    });
  });
});

describe("interactive defense", () => {
  const pauseOnDefense = (seed = 42, defense: DefensivePlayId = "MAN_FREE"): SimulationState =>
    runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", category: "DEFENSE", trigger: "AT_TIME", defense, seed })));

  it("pauses the defense with defensive options instead of passing options", () => {
    const paused = pauseOnDefense();

    expect(paused.phase).toBe("PAUSED_FOR_DECISION");
    expect(paused.pendingDecision?.category).toBe("DEFENSE");
    expect(paused.pendingDecision?.options).toEqual(["HOLD_COVERAGE", "JUMP_ROUTE", "BLITZ_SAFETY"]);
  });

  it("keeps offering the throwing options when the user coaches the offense", () => {
    const paused = runToEnd(createSimulation(buildConfig({ mode: "TACTICAL", category: "OFFENSE" })));

    expect(paused.pendingDecision?.category).toBe("OFFENSE");
  });

  it("ignores an offensive decision while the defense is the one deciding", () => {
    const paused = pauseOnDefense();

    expect(applyDecision(paused, "PASS_TO_WR")).toBe(paused);
  });

  it.each(["HOLD_COVERAGE", "JUMP_ROUTE", "BLITZ_SAFETY"] as const)("%s resumes the play and the engine quarterback finishes it", (action) => {
    const paused = pauseOnDefense();
    const resumed = applyDefensiveDecision(paused, action);

    expect(resumed.phase).toBe("RUNNING");
    expect(resumed.pendingDecision).toBeNull();
    expect(runToEnd(resumed, 1 / 60, 4000).phase).toBe("FINISHED");
  });

  it("does not mutate the paused state when a call is made", () => {
    const paused = pauseOnDefense();
    const snapshot = structuredClone(getFrame(paused));

    applyDefensiveDecision(paused, "BLITZ_SAFETY");

    expect(getFrame(paused)).toEqual(snapshot);
    expect(paused.phase).toBe("PAUSED_FOR_DECISION");
  });

  it("is deterministic for the same call and seed", () => {
    const play = (): SimulationState => runToEnd(applyDefensiveDecision(pauseOnDefense(7), "JUMP_ROUTE"), 1 / 60, 4000);

    expect(getFrame(play())).toEqual(getFrame(play()));
  });

  it("sending the safety on a blitz brings him toward the quarterback instead of holding the deep zone", () => {
    const safetyDepthAfter = (action: "HOLD_COVERAGE" | "BLITZ_SAFETY"): number => {
      const resumed = applyDefensiveDecision(pauseOnDefense(), action);
      return getEntity(stepSimulation(resumed, 0.5), ENTITY_IDS.safety).pos.y;
    };

    expect(safetyDepthAfter("BLITZ_SAFETY")).toBeLessThan(safetyDepthAfter("HOLD_COVERAGE"));
  });
});
