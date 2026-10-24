import { create } from "zustand";
import type { OutcomeResult, PlayCategory, PlayOutcome, SimulationMode } from "../domain/types";
import { getDefensivePlay } from "../domain/defensivePlays";
import { useSimulationStore } from "./simulationStore";

/** One finished play in the current browser session. */
export type SessionEntry = {
  id: number;
  mode: SimulationMode;
  category: PlayCategory;
  receiverLabel: string;
  routeName: string;
  defenseName: string;
  /** Action the user called, or null when the play ran in View Only mode. */
  decision: string | null;
  result: OutcomeResult;
  yardsGained: number;
  touchdown: boolean;
  reason: string;
};

type SessionHistoryStore = {
  entries: SessionEntry[];
  pendingDecision: string | null;
  recordDecision: (action: string) => void;
  recordOutcome: (outcome: PlayOutcome) => void;
  clear: () => void;
};

/** Results that count as a win for the offense. */
const OFFENSE_WIN_RESULTS: OutcomeResult[] = ["COMPLETED_PASS", "SCRAMBLE_GAIN"];

/** A play succeeds for the side the user coached: the offense wins on a gain, the defense on a stop. */
export const isSuccessfulResult = (result: OutcomeResult, category: PlayCategory = "OFFENSE"): boolean =>
  OFFENSE_WIN_RESULTS.includes(result) === (category === "OFFENSE");

let entryCounter = 0;

export const useSessionHistoryStore = create<SessionHistoryStore>((set, get) => ({
  entries: [],
  pendingDecision: null,

  recordDecision: (action) => set({ pendingDecision: action }),

  recordOutcome: (outcome) => {
    const { sim } = useSimulationStore.getState();
    if (!sim) return;
    const { receiver, route, mode, category, teamPlay } = sim.config;
    const entry: SessionEntry = {
      id: (entryCounter += 1),
      mode,
      category,
      receiverLabel: teamPlay ? "5-on-5" : `#${receiver.jerseyNumber} ${receiver.name}`,
      routeName: teamPlay ? teamPlay.playName : route.name,
      defenseName: getDefensivePlay(sim.config.defensivePlayId).name,
      decision: mode === "TACTICAL" ? get().pendingDecision : null,
      result: outcome.result,
      yardsGained: outcome.yardsGained,
      touchdown: outcome.touchdown,
      reason: outcome.reason,
    };
    set({ entries: [entry, ...get().entries], pendingDecision: null });
  },

  clear: () => set({ entries: [], pendingDecision: null }),
}));

/**
 * Listens to the simulation store and logs every new outcome. Returns the unsubscribe function.
 * Call once while the simulator is mounted.
 */
export const startSessionRecording = (): (() => void) =>
  useSimulationStore.subscribe((state, previous) => {
    const outcome = state.sim?.outcome ?? null;
    if (!outcome || outcome === previous.sim?.outcome) return;
    useSessionHistoryStore.getState().recordOutcome(outcome);
  });
