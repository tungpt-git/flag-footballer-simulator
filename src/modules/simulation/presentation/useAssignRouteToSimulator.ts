"use client";

import { useRouter } from "next/navigation";
import { useSimulationStore } from "../application/simulationStore";

type AssignRouteToSimulator = (routeId: string, receiverId: string) => void;

/** Loads a receiver and a route into the simulator setup, then opens the simulator. */
export const useAssignRouteToSimulator = (): AssignRouteToSimulator => {
  const router = useRouter();
  const setLineupPlayer = useSimulationStore((state) => state.setLineupPlayer);
  const setRouteId = useSimulationStore((state) => state.setRouteId);

  return (routeId, receiverId) => {
    setLineupPlayer("receiverId", receiverId);
    setRouteId(routeId);
    router.push("/simulator");
  };
};
