"use client";

import { useState } from "react";
import { OffensivePlaybook, PlaybookWorkspace } from "@/modules/playbook/ui";
import { usePlayers } from "@/modules/roster/ui";
import { DefensePlaybook, useAssignRouteToSimulator, useRunOffensivePlay } from "@/modules/simulation/ui";
import type { Route } from "@/modules/playbook";
import { canPlayPosition, type PlayerProfile } from "@/modules/roster";
import { Tabs, TabsContent } from "@/shared/ui/primitives/tabs";
import { OffenseLibrarySwitch, type OffenseLibrary } from "./OffenseLibrarySwitch";
import { PlaybookCategoryTabs, type PlaybookCategory } from "./PlaybookCategoryTabs";

const isPlaybookCategory = (value: unknown): value is PlaybookCategory => value === "OFFENSE" || value === "DEFENSE";

/** Wires the playbook to the roster and the simulator: offense assigns routes, defense runs defensive plays. */
export const PlaybookScreen = () => {
  const { data: players } = usePlayers();
  const assignRoute = useAssignRouteToSimulator();
  const runOffensivePlay = useRunOffensivePlay();
  const [category, setCategory] = useState<PlaybookCategory>("OFFENSE");
  const [library, setLibrary] = useState<OffenseLibrary>("PLAYS");
  const receivers = players.filter((player) => canPlayPosition(player, "WR"));
  const defenders = players.filter((player) => canPlayPosition(player, "DB"));

  const handleAssign = (route: Route, receiver: PlayerProfile): void => assignRoute(route.id, receiver.id);
  const handleCategoryChange = (value: unknown): void => {
    if (isPlaybookCategory(value)) setCategory(value);
  };

  const tabs = <PlaybookCategoryTabs />;
  const librarySwitch = <OffenseLibrarySwitch value={library} onChange={setLibrary} />;

  return (
    <Tabs value={category} onValueChange={handleCategoryChange}>
      <TabsContent value="OFFENSE">
        {library === "PLAYS" ? (
          <OffensivePlaybook tabs={tabs} toolbar={librarySwitch} onRun={runOffensivePlay} />
        ) : (
          <PlaybookWorkspace receivers={receivers} onAssign={handleAssign} tabs={tabs} toolbar={librarySwitch} />
        )}
      </TabsContent>
      <TabsContent value="DEFENSE">
        <DefensePlaybook defenders={defenders} tabs={tabs} />
      </TabsContent>
    </Tabs>
  );
};
