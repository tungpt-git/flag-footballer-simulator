"use client";

import { useRouter } from "next/navigation";
import { useSimulationStore } from "../application/simulationStore";
import type { DefensivePlayId } from "../domain/defensivePlays";
import type { SimulationMode } from "../domain/types";

type RunDefensivePlay = (defensivePlayId: DefensivePlayId, cornerbackId: string | null, mode: SimulationMode) => void;

/** Loads a defensive play and a cornerback into the simulator, switches it to the DEFENSE side, then opens it. */
export const useRunDefensivePlay = (): RunDefensivePlay => {
  const router = useRouter();
  const setCategory = useSimulationStore((state) => state.setCategory);
  const setMode = useSimulationStore((state) => state.setMode);
  const setDefensivePlayId = useSimulationStore((state) => state.setDefensivePlayId);
  const setLineupPlayer = useSimulationStore((state) => state.setLineupPlayer);

  return (defensivePlayId, cornerbackId, mode) => {
    setCategory("DEFENSE");
    setMode(mode);
    setDefensivePlayId(defensivePlayId);
    if (cornerbackId) setLineupPlayer("cornerbackId", cornerbackId);
    router.push("/simulator");
  };
};
