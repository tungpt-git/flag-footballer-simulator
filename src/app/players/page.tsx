import type { Metadata } from "next";
import { PlayersWorkspace } from "@/modules/roster/ui";

export const metadata: Metadata = { title: "Players | Flag Football Lab" };

const PlayersPage = () => <PlayersWorkspace />;

export default PlayersPage;
