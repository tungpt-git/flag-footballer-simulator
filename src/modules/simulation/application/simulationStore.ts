import { create } from "zustand";
import type {
  DecisionAction,
  FrameMetrics,
  SimulationConfig,
  SimulationMode,
  FieldViewMode,
} from "../domain/types";
import type { DecisionTrigger, Route } from "@/modules/playbook";
import type { PlayerProfile } from "@/modules/roster";
import { DEFAULT_CORNERBACK, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "../domain/constants";
import { DEFAULT_LOS_Y, FIELD_WIDTH_YD } from "@/shared/kernel/field";
import { createSeed } from "../domain/rng";
import {
  PassPreview,
  SimulationState,
  applyDecision,
  computeFrameMetrics,
  createSimulation,
  previewDecision,
  stepSimulation,
} from "../domain/simulation";
import { DECISION_LABELS, OUTCOME_LABELS, OUTCOME_TONES } from "../domain/labels";
import type { Tone } from "@/shared/kernel/tone";

const LEFT_ALIGNMENT_X = 6;
const RIGHT_ALIGNMENT_X = FIELD_WIDTH_YD - 6;
const MAX_LOG_ENTRIES = 60;
const SNAPSHOT_INTERVAL_SEC = 0.1;
const MAX_FRAME_DELTA_SEC = 0.05;

export type AlignmentSide = "LEFT" | "RIGHT";

export type LineupRole = "receiverId" | "quarterbackId" | "cornerbackId" | "rusherId";

export type Lineup = Record<LineupRole, string | null>;

export type LogEntry = {
  id: number;
  atSec: number;
  tone: Tone;
  message: string;
};

export type LiveSnapshot = {
  t: number;
  metrics: FrameMetrics;
};

export type DecisionPreviews = Partial<Record<DecisionAction, PassPreview>>;

type SimulationStore = {
  mode: SimulationMode;
  players: PlayerProfile[];
  routes: Route[];
  lineup: Lineup;
  routeId: string | null;
  trigger: DecisionTrigger;
  alignmentSide: AlignmentSide;
  speedMultiplier: number;
  viewMode: FieldViewMode;

  isPlaying: boolean;
  sim: SimulationState | null;
  snapshot: LiveSnapshot | null;
  decisionPreviews: DecisionPreviews;
  eventLog: LogEntry[];

  loadCatalog: (players: PlayerProfile[], routes: Route[]) => void;
  setMode: (mode: SimulationMode) => void;
  setLineupPlayer: (role: LineupRole, playerId: string | null) => void;
  setRouteId: (routeId: string) => void;
  setTrigger: (trigger: DecisionTrigger) => void;
  setAlignmentSide: (side: AlignmentSide) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  setViewMode: (viewMode: FieldViewMode) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  tick: (deltaSec: number) => void;
  submitDecision: (action: DecisionAction) => void;
  clearLog: () => void;
};

const findPlayer = (players: PlayerProfile[], id: string | null): PlayerProfile | undefined =>
  players.find((player) => player.id === id);

const pickFirstOfPosition = (players: PlayerProfile[], position: PlayerProfile["position"]): string | null =>
  players.find((player) => player.position === position)?.id ?? null;

export const getAlignmentX = (side: AlignmentSide): number =>
  side === "LEFT" ? LEFT_ALIGNMENT_X : RIGHT_ALIGNMENT_X;

/** Builds a simulation config from the current selections, or null if no receiver/route is chosen. */
export const buildSimulationConfig = (
  store: Pick<SimulationStore, "mode" | "players" | "routes" | "lineup" | "routeId" | "trigger" | "alignmentSide">,
  seed: number,
): SimulationConfig | null => {
  const receiver = findPlayer(store.players, store.lineup.receiverId);
  const route = store.routes.find((candidate) => candidate.id === store.routeId);
  if (!receiver || !route) return null;

  return {
    mode: store.mode,
    route,
    decisionTrigger: route.decisionPoints.some((point) => point.trigger === store.trigger) ? store.trigger : "AT_TIME",
    losY: DEFAULT_LOS_Y,
    alignmentX: getAlignmentX(store.alignmentSide),
    seed,
    receiver,
    quarterback: findPlayer(store.players, store.lineup.quarterbackId) ?? DEFAULT_QUARTERBACK,
    cornerback: findPlayer(store.players, store.lineup.cornerbackId) ?? DEFAULT_CORNERBACK,
    rusher: findPlayer(store.players, store.lineup.rusherId) ?? DEFAULT_RUSHER,
  };
};

let logCounter = 0;

const appendLog = (log: LogEntry[], atSec: number, tone: Tone, message: string): LogEntry[] =>
  [{ id: (logCounter += 1), atSec, tone, message }, ...log].slice(0, MAX_LOG_ENTRIES);

const buildFreshSimulation = (store: SimulationStore): SimulationState | null => {
  const config = buildSimulationConfig(store, createSeed());
  return config ? createSimulation(config) : null;
};

export const useSimulationStore = create<SimulationStore>((set, get) => {
  /** Rebuilds the play from the current selections (pausing playback). */
  const rebuild = (overrides: Partial<SimulationStore> = {}): void => {
    const merged = { ...get(), ...overrides };
    set({
      ...overrides,
      isPlaying: false,
      sim: buildFreshSimulation(merged),
      snapshot: null,
      decisionPreviews: {},
    });
  };

  return {
    mode: "VIEW",
    players: [],
    routes: [],
    lineup: { receiverId: null, quarterbackId: null, cornerbackId: null, rusherId: null },
    routeId: null,
    trigger: "AT_CUT",
    alignmentSide: "LEFT",
    speedMultiplier: 1,
    viewMode: "PLAY",

    isPlaying: false,
    sim: null,
    snapshot: null,
    decisionPreviews: {},
    eventLog: [],

    loadCatalog: (players, routes) => {
      const { lineup, routeId } = get();
      const keepOrPick = (currentId: string | null, position: PlayerProfile["position"]): string | null =>
        findPlayer(players, currentId)?.id ?? pickFirstOfPosition(players, position);

      rebuild({
        players,
        routes,
        lineup: {
          receiverId: keepOrPick(lineup.receiverId, "WR"),
          quarterbackId: keepOrPick(lineup.quarterbackId, "QB"),
          cornerbackId: keepOrPick(lineup.cornerbackId, "DB"),
          rusherId: keepOrPick(lineup.rusherId, "RUSHER"),
        },
        routeId: routes.find((route) => route.id === routeId)?.id ?? routes[0]?.id ?? null,
      });
    },

    setMode: (mode) => rebuild({ mode }),
    setLineupPlayer: (role, playerId) => rebuild({ lineup: { ...get().lineup, [role]: playerId } }),
    setRouteId: (routeId) => rebuild({ routeId }),
    setTrigger: (trigger) => rebuild({ trigger }),
    setAlignmentSide: (alignmentSide) => rebuild({ alignmentSide }),
    setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
    setViewMode: (viewMode) => set({ viewMode }),

    play: () => {
      const store = get();
      let sim = store.sim;
      if (!sim) return;
      if (sim.phase === "PAUSED_FOR_DECISION") return;

      let eventLog = store.eventLog;
      if (sim.phase === "FINISHED") sim = buildFreshSimulation(store);
      if (!sim) return;

      if (sim.phase === "PRE_SNAP") {
        const { receiver, route } = sim.config;
        const modeLabel = sim.config.mode === "TACTICAL" ? "Tactical" : "Playbook";
        eventLog = appendLog(eventLog, 0, "neutral", `${modeLabel} snap: #${receiver.jerseyNumber} ${receiver.name} runs a ${route.name}.`);
      }
      set({ sim, isPlaying: true, eventLog, decisionPreviews: {}, snapshot: null });
    },

    pause: () => set({ isPlaying: false }),

    reset: () => rebuild(),

    tick: (deltaSec) => {
      const { sim, isPlaying, speedMultiplier, eventLog } = get();
      if (!sim || !isPlaying) return;

      const next = stepSimulation(sim, Math.min(deltaSec, MAX_FRAME_DELTA_SEC) * speedMultiplier);
      const phaseChanged = next.phase !== sim.phase;
      const snapshotDue = Math.floor(next.t / SNAPSHOT_INTERVAL_SEC) !== Math.floor(sim.t / SNAPSHOT_INTERVAL_SEC);

      if (!phaseChanged) {
        set({
          sim: next,
          ...(snapshotDue ? { snapshot: { t: next.t, metrics: computeFrameMetrics(next) } } : {}),
        });
        return;
      }

      const snapshot = { t: next.t, metrics: computeFrameMetrics(next) };

      if (next.phase === "PAUSED_FOR_DECISION") {
        const decisionPreviews: DecisionPreviews = {};
        (["PASS_TO_WR", "CHECKDOWN"] as const).forEach((action) => {
          const preview = previewDecision(next, action);
          if (preview) decisionPreviews[action] = preview;
        });
        set({
          sim: next,
          snapshot,
          decisionPreviews,
          eventLog: appendLog(eventLog, next.t, "info", `Play paused at ${next.t.toFixed(1)}s. Choose an action.`),
        });
        return;
      }

      if (next.phase === "FINISHED") {
        const { outcome } = next;
        set({
          sim: next,
          snapshot,
          isPlaying: false,
          eventLog: outcome
            ? appendLog(
                eventLog,
                next.t,
                OUTCOME_TONES[outcome.result],
                `${OUTCOME_LABELS[outcome.result]}${outcome.touchdown ? " - TOUCHDOWN" : ""} (${outcome.yardsGained >= 0 ? "+" : ""}${outcome.yardsGained} yd). ${outcome.reason}`,
              )
            : appendLog(eventLog, next.t, "neutral", "Route complete - end of play."),
        });
        return;
      }

      set({ sim: next, snapshot });
    },

    submitDecision: (action) => {
      const { sim, eventLog } = get();
      if (!sim || sim.phase !== "PAUSED_FOR_DECISION") return;

      set({
        sim: applyDecision(sim, action),
        isPlaying: true,
        decisionPreviews: {},
        eventLog: appendLog(eventLog, sim.t, "neutral", `Decision: ${DECISION_LABELS[action]}.`),
      });
    },

    clearLog: () => set({ eventLog: [] }),
  };
});
