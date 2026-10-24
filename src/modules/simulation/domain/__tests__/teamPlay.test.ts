import { describe, expect, it } from "vitest";
import { OFFENSIVE_PLAYS } from "@/modules/playbook";
import type { PlayerProfile, Position } from "@/modules/roster";
import { DEFAULT_OUTLET } from "../constants";
import type { DefensivePlayId } from "../defensivePlays";
import { applyOffenseChoice, createSimulation, ENTITY_IDS, stepSimulation, type SimulationState } from "../simulation";
import { assignOpenTeamSlots, buildTeamSimulationConfig, EMPTY_TEAM_LINEUP, teamSlotForEntity } from "../teamPlay";
import type { SimulationMode } from "../types";

const player = (id: string, position: Position, catchProbability: number): PlayerProfile => ({
  id,
  name: id,
  position,
  altPositions: [],
  jerseyNumber: 1,
  metrics: { fortyYardDash: 4.5, agility: 70, catchProbability, flagPullEfficiency: 0.5 },
  stats: { targets: 0, receptions: 0, yards: 0, flagPulls: 0, interceptions: 0 },
});

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

  it("lines each chosen player up at that spot", () => {
    const lineup = {
      ...EMPTY_TEAM_LINEUP,
      quarterbackId: "qb-1",
      rusherId: "rush-1",
      receiverXId: "wr-x",
      receiverZId: "wr-z",
      defenderXId: "db-x",
    };
    const start = createSimulation(
      buildTeamSimulationConfig({
        play: OFFENSIVE_PLAYS[0],
        players: [
          player("wr-z", "WR", 0.11),
          player("wr-x", "WR", 0.91),
          player("db-x", "DB", 0.21),
          player("qb-1", "QB", 0.77),
          player("rush-1", "RUSHER", 0.33),
        ],
        teamLineup: lineup,
        mode: "VIEW",
        category: "OFFENSE",
        defensivePlayId: "MAN_FREE",
        seed: 3,
      }),
    );

    expect(start.attributes.X.catchProbability).toBe(0.91);
    expect(start.attributes.Z.catchProbability).toBe(0.11);
    expect(start.attributes.Y.catchProbability).toBe(DEFAULT_OUTLET.metrics.catchProbability);
    expect(start.attributes["db-X"].catchProbability).toBe(0.21);
    expect(start.attributes[ENTITY_IDS.quarterback].catchProbability).toBe(0.77);
    expect(start.attributes[ENTITY_IDS.rusher].catchProbability).toBe(0.33);
  });

  it("maps each field symbol to the roster spot it stands for", () => {
    expect(teamSlotForEntity("X")).toBe("receiverXId");
    expect(teamSlotForEntity("db-Y")).toBe("defenderYId");
    expect(teamSlotForEntity("qb")).toBe("quarterbackId");
    expect(teamSlotForEntity("rusher")).toBe("rusherId");
    expect(teamSlotForEntity("safety")).toBeNull();
  });

  it("fills open skill spots with different players and keeps a pick already made", () => {
    const receivers = ["a", "b", "c", "d"].map((id, index) => player(`wr-${id}`, "WR", 0.5 + index / 100));
    const filled = assignOpenTeamSlots(receivers, EMPTY_TEAM_LINEUP);
    expect([filled.receiverXId, filled.receiverYId, filled.receiverZId, filled.receiverCId]).toEqual(["wr-a", "wr-b", "wr-c", "wr-d"]);

    const kept = assignOpenTeamSlots(receivers.slice(0, 2), { ...EMPTY_TEAM_LINEUP, receiverXId: "wr-b" });
    expect(kept.receiverXId).toBe("wr-b");
    expect(kept.receiverYId).toBe("wr-a");
  });

  it("drops four zone defenders when the defense is in zone", () => {
    const zone = createSimulation(configFor("VIEW", "ZONE"));
    expect(Object.keys(zone.zoneAnchors)).toHaveLength(4);
    expect(Object.values(zone.defenderAssignments).every((assignment) => assignment.call.coverage.kind === "ZONE")).toBe(true);
  });
});
