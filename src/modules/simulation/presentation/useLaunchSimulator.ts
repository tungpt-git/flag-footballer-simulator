"use client";

import { useRouter } from "next/navigation";
import { useSimulationStore } from "../application/simulationStore";
import type { SimulationMode } from "../domain/types";

/** Returns a function that selects a simulation mode and opens the simulator. */
export const useLaunchSimulator = (): ((mode: SimulationMode) => void) => {
  const router = useRouter();
  const setMode = useSimulationStore((state) => state.setMode);

  return (mode) => {
    setMode(mode);
    router.push("/simulator");
  };
};
