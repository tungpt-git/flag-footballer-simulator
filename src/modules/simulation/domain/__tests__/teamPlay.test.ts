import { describe, expect, it } from "vitest";
import { OFFENSIVE_PLAYS } from "@/modules/playbook";
import { DEFAULT_CORNERBACK, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "../constants";
import type { DefensivePlayId } from "../defensivePlays";
import { applyOffenseChoice, createSimulation, stepSimulation, type SimulationState } from "../simulation";
import { buildTeamSimulationConfig } from "../teamPlay";
import type { SimulationMode } from "../types";

const runToEnd = (initial: SimulationState, stepSec = 1 / 60, maxSteps = 4000): SimulationState => {
  let state = initial;
  for (let index = 0; index < maxSteps && state.phase !== "FINISHED"; index += 1) {
    state = stepSimulation(state, stepSec);
    if (state.phase === "PAUSED_FOR_DECISION") break;
  }
  return state;
};

const configFor = (mode: SimulationMode, defense: DefensivePlayId = "MAN_FREE") =>
  buildTeamSimulationConfig({
    play: OFFENSIVE_PLAYS[0],
    players: [],
    mode,
    category: "OFFENSE",
    defensivePlayId: defense,
    quarterback: DEFAULT_QUARTERBACK,
    cornerback: DEFAULT_CORNERBACK,
    rusher: DEFAULT_RUSHER,
    seed: 7,
  });

describe("5-on-5 simulation", () => {
  it("lines up four routes against five defenders and finishes the film-room snap", () => {
    const start = createSimulation(configFor("VIEW"));
    expect(start.entities.filter((entity) => entity.role === "RECEIVER")).toHaveLength(4);
    expect(start.entities.filter((entity) => entity.role === "DEFENDER" || entity.role === "RUSHER")).toHaveLength(5);
    expect(Object.keys(start.defenderAssignments)).toHaveLength(4);

    const end = runToEnd(start);
    expect(end.phase).toBe("FINISHED");
    expect(end.outcome).not.toBeNull();
  });

  it("moves every skill player off the snap alignment", () => {
    const start = createSimulation(configFor("VIEW"));
    const moved = stepSimulation(start, 1.2);

    start.entities
      .filter((entity) => entity.role === "RECEIVER")
      .forEach((receiver) => {
        const later = moved.entities.find((entity) => entity.id === receiver.id);
        expect(later).toBeDefined();
        expect(Math.hypot((later?.pos.x ?? 0) - receiver.pos.x, (later?.pos.y ?? 0) - receiver.pos.y)).toBeGreaterThan(1);
      });
  });

  it("pauses a live snap so the quarterback can throw to any skill player", () => {
    const paused = runToEnd(createSimulation(configFor("TACTICAL")));
    expect(paused.phase).toBe("PAUSED_FOR_DECISION");
    expect(paused.pendingDecision?.category).toBe("OFFENSE");
    if (paused.pendingDecision?.category !== "OFFENSE") return;

    const targets = paused.pendingDecision.choices?.map((choice) => choice.targetId) ?? [];
    expect(targets.filter((target) => target !== null).sort()).toEqual(["C", "X", "Y", "Z"]);
    expect(targets).toContain(null);

    const thrown = applyOffenseChoice(paused, "Z");
    expect(thrown.phase).toBe("BALL_IN_FLIGHT");
    expect(thrown.ball?.targetId).toBe("Z");
  });

  it("drops four zone defenders when the defense is in zone", () => {
    const zone = createSimulation(configFor("VIEW", "ZONE"));
    expect(Object.keys(zone.zoneAnchors)).toHaveLength(4);
    expect(Object.values(zone.defenderAssignments).every((assignment) => assignment.call.coverage.kind === "ZONE")).toBe(true);
  });
});
