import { create } from "zustand";
import type {
  DecisionAction,
  DefensiveAction,
  FrameMetrics,
  PlayCategory,
  SimulationConfig,
  SimulationMode,
  FieldViewMode,
} from "../domain/types";
import { OFFENSIVE_PLAYS, type DecisionTrigger, type Route } from "@/modules/playbook";
import { canPlayPosition, type PlayerProfile } from "@/modules/roster";
import { DEFAULT_DEFENSIVE_PLAY_ID, getDefensivePlay, type DefensivePlayId } from "../domain/defensivePlays";
import { DEFAULT_CORNERBACK, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "../domain/constants";
import { DEFAULT_LOS_Y, FIELD_WIDTH_YD } from "@/shared/kernel/field";
import { createSeed } from "../domain/rng";
import {
  PassPreview,
  SimulationState,
  applyDecision,
  applyDefensiveDecision,
  applyOffenseChoice,
  computeFrameMetrics,
  createSimulation,
  previewDecision,
  previewReceiverThrow,
  stepSimulation,
} from "../domain/simulation";
import { assignOpenTeamSlots, buildTeamSimulationConfig, EMPTY_TEAM_LINEUP, type TeamLineup, type TeamSlot } from "../domain/teamPlay";
import { CALL_LABELS, OUTCOME_LABELS, OUTCOME_TONES } from "../domain/labels";
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

export type DecisionPreviews = Partial<Record<string, PassPreview>>;

type SimulationStore = {
  mode: SimulationMode;
  category: PlayCategory;
  players: PlayerProfile[];
  routes: Route[];
  lineup: Lineup;
  /** Shared 5-on-5 roster. Every play uses these same spots. */
  teamLineup: TeamLineup;
  routeId: string | null;
  /** Set while the simulator is running a 5-on-5 call. Cleared when a single route is chosen. */
  offensivePlayId: string | null;
  defensivePlayId: DefensivePlayId;
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
  setCategory: (category: PlayCategory) => void;
  setLineupPlayer: (role: LineupRole, playerId: string | null) => void;
  setTeamPlayer: (slot: TeamSlot, playerId: string) => void;
  setRouteId: (routeId: string) => void;
  setOffensivePlayId: (offensivePlayId: string | null) => void;
  setDefensivePlayId: (defensivePlayId: DefensivePlayId) => void;
  setTrigger: (trigger: DecisionTrigger) => void;
  setAlignmentSide: (side: AlignmentSide) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  setViewMode: (viewMode: FieldViewMode) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  tick: (deltaSec: number) => void;
  submitDecision: (action: DecisionAction) => void;
  submitOffenseChoice: (choiceId: string) => void;
  submitDefensiveDecision: (action: DefensiveAction) => void;
  clearLog: () => void;
};

const findPlayer = (players: PlayerProfile[], id: string | null): PlayerProfile | undefined =>
  players.find((player) => player.id === id);

const pickFirstOfPosition = (players: PlayerProfile[], position: PlayerProfile["position"]): string | null =>
  (players.find((player) => player.position === position) ?? players.find((player) => canPlayPosition(player, position)))?.id ?? null;

export const getAlignmentX = (side: AlignmentSide): number =>
  side === "LEFT" ? LEFT_ALIGNMENT_X : RIGHT_ALIGNMENT_X;

/** Builds a simulation config from the current selections, or null if no receiver/route is chosen. */
export const buildSimulationConfig = (
  store: Pick<
    SimulationStore,
    | "mode"
    | "category"
    | "players"
    | "routes"
    | "lineup"
    | "teamLineup"
    | "routeId"
    | "offensivePlayId"
    | "defensivePlayId"
    | "trigger"
    | "alignmentSide"
  >,
  seed: number,
): SimulationConfig | null => {
  const play = OFFENSIVE_PLAYS.find((candidate) => candidate.id === store.offensivePlayId);
  if (play) {
    return buildTeamSimulationConfig({
      play,
      players: store.players,
      teamLineup: store.teamLineup,
      mode: store.mode,
      category: store.category,
      defensivePlayId: store.defensivePlayId,
      seed,
    });
  }

  const receiver = findPlayer(store.players, store.lineup.receiverId);
  const route = store.routes.find((candidate) => candidate.id === store.routeId);
  if (!receiver || !route) return null;

  return {
    mode: store.mode,
    category: store.category,
    route,
    defensivePlayId: store.defensivePlayId,
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

/** Log line for what the engine-run quarterback decided after reading the defense's call. */
const describeEngineOffense = (action: DecisionAction): string => {
  if (action === "PASS_TO_WR") return "The QB reads your call and throws to his receiver.";
  if (action === "CHECKDOWN") return "The QB reads your call and checks down to the outlet.";
  return "The QB feels the rush, pump fakes and scrambles.";
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
    category: "OFFENSE",
    players: [],
    routes: [],
    lineup: { receiverId: null, quarterbackId: null, cornerbackId: null, rusherId: null },
    teamLineup: EMPTY_TEAM_LINEUP,
    routeId: null,
    offensivePlayId: null,
    defensivePlayId: DEFAULT_DEFENSIVE_PLAY_ID,
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
      const { lineup, teamLineup, routeId } = get();
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
        teamLineup: assignOpenTeamSlots(players, teamLineup),
        routeId: routes.find((route) => route.id === routeId)?.id ?? routes[0]?.id ?? null,
      });
    },

    setMode: (mode) => rebuild({ mode }),
    setCategory: (category) => rebuild({ category }),
    setLineupPlayer: (role, playerId) => rebuild({ lineup: { ...get().lineup, [role]: playerId } }),
    setTeamPlayer: (slot, playerId) => rebuild({ teamLineup: { ...get().teamLineup, [slot]: playerId } }),
    setRouteId: (routeId) => rebuild({ routeId, offensivePlayId: null }),
    setOffensivePlayId: (offensivePlayId) => rebuild({ offensivePlayId }),
    setDefensivePlayId: (defensivePlayId) => rebuild({ defensivePlayId }),
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
        const { receiver, route, category, teamPlay } = sim.config;
        const modeLabel = sim.config.mode === "TACTICAL" ? "Tactical" : "Playbook";
        const defenseName = getDefensivePlay(sim.config.defensivePlayId).name;
        const snapMessage = teamPlay
          ? `${modeLabel} snap: ${teamPlay.playName} against ${defenseName}.`
          : category === "DEFENSE"
            ? `${modeLabel} snap: you call ${defenseName} against #${receiver.jerseyNumber} ${receiver.name}'s ${route.name}.`
            : `${modeLabel} snap: #${receiver.jerseyNumber} ${receiver.name} runs a ${route.name} against ${defenseName}.`;
        eventLog = appendLog(eventLog, 0, "neutral", snapMessage);
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
      const thrownTo = next.config.teamPlay?.runners.find((runner) => runner.id === next.offenseTargetId);
      const engineMessage = thrownTo
        ? `The QB throws to ${thrownTo.id} on the ${thrownTo.routeName}.`
        : next.offenseAction
          ? describeEngineOffense(next.offenseAction)
          : null;
      const enginePlayLog =
        next.offenseAction && !sim.offenseAction && engineMessage ? appendLog(eventLog, next.t, "info", engineMessage) : eventLog;

      if (next.phase === "PAUSED_FOR_DECISION") {
        const decisionPreviews: DecisionPreviews = {};
        const choices = next.pendingDecision?.category === "OFFENSE" ? next.pendingDecision.choices : undefined;
        if (choices) {
          choices.forEach((choice) => {
            if (!choice.targetId) return;
            const preview = previewReceiverThrow(next, choice.targetId);
            if (preview) decisionPreviews[choice.id] = preview;
          });
        } else if (next.config.category === "OFFENSE") {
          (["PASS_TO_WR", "CHECKDOWN"] as const).forEach((action) => {
            const preview = previewDecision(next, action);
            if (preview) decisionPreviews[action] = preview;
          });
        }
        set({
          sim: next,
          snapshot,
          decisionPreviews,
          eventLog: appendLog(eventLog, next.t, "info", `Play paused at ${next.t.toFixed(1)}s. ${next.config.category === "DEFENSE" ? "Make your defensive call." : "Choose an action."}`),
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
                enginePlayLog,
                next.t,
                OUTCOME_TONES[outcome.result],
                `${OUTCOME_LABELS[outcome.result]}${outcome.touchdown ? " - TOUCHDOWN" : ""} (${outcome.yardsGained >= 0 ? "+" : ""}${outcome.yardsGained} yd). ${outcome.reason}`,
              )
            : appendLog(enginePlayLog, next.t, "neutral", "Route complete - end of play."),
        });
        return;
      }

      set({ sim: next, snapshot, eventLog: enginePlayLog });
    },

    submitDecision: (action) => {
      const { sim, eventLog } = get();
      if (!sim || sim.phase !== "PAUSED_FOR_DECISION") return;

      set({
        sim: applyDecision(sim, action),
        isPlaying: true,
        decisionPreviews: {},
        eventLog: appendLog(eventLog, sim.t, "neutral", `Decision: ${CALL_LABELS[action]}.`),
      });
    },

    submitOffenseChoice: (choiceId) => {
      const { sim, eventLog } = get();
      if (!sim || sim.phase !== "PAUSED_FOR_DECISION" || sim.pendingDecision?.category !== "OFFENSE") return;
      const choice = sim.pendingDecision.choices?.find((candidate) => candidate.id === choiceId);
      if (!choice) return;

      set({
        sim: applyOffenseChoice(sim, choiceId),
        isPlaying: true,
        decisionPreviews: {},
        eventLog: appendLog(eventLog, sim.t, "neutral", `Decision: ${choice.label}.`),
      });
    },

    submitDefensiveDecision: (action) => {
      const { sim, eventLog } = get();
      if (!sim || sim.phase !== "PAUSED_FOR_DECISION") return;

      set({
        sim: applyDefensiveDecision(sim, action),
        isPlaying: true,
        decisionPreviews: {},
        eventLog: appendLog(eventLog, sim.t, "neutral", `Defensive call: ${CALL_LABELS[action]}.`),
      });
    },

    clearLog: () => set({ eventLog: [] }),
  };
});
