import { getPlayers } from "@/modules/roster/composition";
import { PlayersWorkspace } from "@/modules/roster/ui";
import { isActivationUnlocked } from "@/shared/infrastructure/auth/activationCookie";
import { PageLoading } from "@/shared/ui/layout/PageLoading";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Players | Flag Football Lab" };

const PlayersData = async () => {
  const [players, isUnlocked] = await Promise.all([
    getPlayers(),
    isActivationUnlocked(),
  ]);
  return <PlayersWorkspace players={players} isUnlocked={isUnlocked} />;
};

const PlayersPage = () => (
  <Suspense fallback={<PageLoading label="Loading players..." />}>
    <PlayersData />
  </Suspense>
);

export default PlayersPage;
