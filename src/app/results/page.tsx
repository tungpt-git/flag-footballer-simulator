import type { Metadata } from "next";
import { SessionHistory } from "@/modules/simulation/ui";

export const metadata: Metadata = { title: "Results | Flag Football Lab" };

const ResultsPage = () => <SessionHistory />;

export default ResultsPage;
