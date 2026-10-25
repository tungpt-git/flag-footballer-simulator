import { Suspense } from "react";
import { getRoutes } from "@/modules/playbook/composition";
import { getPlayers } from "@/modules/roster/composition";
import { PageLoading } from "@/shared/ui/layout/PageLoading";
import { DashboardOverview } from "./_components/DashboardOverview";

const DashboardData = async () => {
  const [players, routes] = await Promise.all([getPlayers(), getRoutes()]);
  return <DashboardOverview players={players} routeCount={routes.length} />;
};

const HomePage = () => (
  <Suspense fallback={<PageLoading label="Loading dashboard..." />}>
    <DashboardData />
  </Suspense>
);

export default HomePage;
