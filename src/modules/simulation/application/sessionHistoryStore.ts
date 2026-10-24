import { create } from "zustand";
import type { DecisionAction, OutcomeResult, PlayOutcome, SimulationMode } from "../domain/types";
import { useSimulationStore } from "./simulationStore";

/** One finished play in the current browser session. */
export type SessionEntry = {
  id: number;
  mode: SimulationMode;
  receiverLabel: string;
  routeName: string;
  /** Action the user called, or null when the play ran in View Only mode. */
  decision: DecisionAction | null;
  result: OutcomeResult;
  yardsGained: number;
  touchdown: boolean;
  reason: string;
};

type SessionHistoryStore = {
  entries: SessionEntry[];
  pendingDecision: DecisionAction | null;
  recordDecision: (action: DecisionAction) => void;
  recordOutcome: (outcome: PlayOutcome) => void;
  clear: () => void;
};

/** Results that count as a win for the offense. */
const SUCCESS_RESULTS: OutcomeResult[] = ["COMPLETED_PASS", "SCRAMBLE_GAIN"];

export const isSuccessfulResult = (result: OutcomeResult): boolean => SUCCESS_RESULTS.includes(result);

let entryCounter = 0;

export const useSessionHistoryStore = create<SessionHistoryStore>((set, get) => ({
  entries: [],
  pendingDecision: null,

  recordDecision: (action) => set({ pendingDecision: action }),

  recordOutcome: (outcome) => {
    const { sim } = useSimulationStore.getState();
    if (!sim) return;
    const { receiver, route, mode } = sim.config;
    const entry: SessionEntry = {
      id: (entryCounter += 1),
      mode,
      receiverLabel: `#${receiver.jerseyNumber} ${receiver.name}`,
      routeName: route.name,
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
