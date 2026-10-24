"use client";

import { PlaybookWorkspace } from "@/modules/playbook/ui";
import { usePlayers } from "@/modules/roster/ui";
import { useAssignRouteToSimulator } from "@/modules/simulation/ui";
import type { Route } from "@/modules/playbook";
import { canPlayPosition, type PlayerProfile } from "@/modules/roster";

/** Wires the route library to the roster and the simulator: assigning a route opens the simulator. */
export const PlaybookScreen = () => {
  const { data: players } = usePlayers();
  const assignRoute = useAssignRouteToSimulator();
  const receivers = players.filter((player) => canPlayPosition(player, "WR"));

  const handleAssign = (route: Route, receiver: PlayerProfile): void => assignRoute(route.id, receiver.id);

  return <PlaybookWorkspace receivers={receivers} onAssign={handleAssign} />;
};
