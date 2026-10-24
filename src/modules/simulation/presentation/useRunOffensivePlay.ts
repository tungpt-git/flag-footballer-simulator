"use client";

import { useRouter } from "next/navigation";
import { useSimulationStore } from "../application/simulationStore";
import type { SimulationMode } from "../domain/types";

type RunOffensivePlay = (playId: string, mode: SimulationMode) => void;

/** Loads a 5-on-5 call into the simulator and opens it. */
export const useRunOffensivePlay = (): RunOffensivePlay => {
  const router = useRouter();
  const setCategory = useSimulationStore((state) => state.setCategory);
  const setMode = useSimulationStore((state) => state.setMode);
  const setOffensivePlayId = useSimulationStore((state) => state.setOffensivePlayId);

  return (playId, mode) => {
    setCategory("OFFENSE");
    setMode(mode);
    setOffensivePlayId(playId);
    router.push("/simulator");
  };
};
