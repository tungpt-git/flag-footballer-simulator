import type { Metadata } from "next";
import { Suspense } from "react";
import { getRoutes } from "@/modules/playbook/composition";
import { getPlayers } from "@/modules/roster/composition";
import { SimulatorWorkspace } from "@/modules/simulation/ui";
import { PageLoading } from "@/shared/ui/layout/PageLoading";

export const metadata: Metadata = { title: "Simulator | Flag Football Lab" };

const SimulatorData = async () => {
  const [players, routes] = await Promise.all([getPlayers(), getRoutes()]);
  return <SimulatorWorkspace players={players} routes={routes} />;
};

const SimulatorPage = () => (
  <Suspense fallback={<PageLoading label="Loading players and routes..." />}>
    <SimulatorData />
  </Suspense>
);

export default SimulatorPage;
