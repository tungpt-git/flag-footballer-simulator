import type { Metadata } from "next";
import { Suspense } from "react";
import { getRoutes } from "@/modules/playbook/composition";
import { getPlayers } from "@/modules/roster/composition";
import { PageLoading } from "@/shared/ui/layout/PageLoading";
import { PlaybookScreen } from "./_components/PlaybookScreen";

export const metadata: Metadata = { title: "Playbook | Flag Football Lab" };

const PlaybookData = async () => {
  const [players, routes] = await Promise.all([getPlayers(), getRoutes()]);
  return <PlaybookScreen players={players} routes={routes} />;
};

const PlaybookPage = () => (
  <Suspense fallback={<PageLoading label="Loading playbook..." />}>
    <PlaybookData />
  </Suspense>
);

export default PlaybookPage;
