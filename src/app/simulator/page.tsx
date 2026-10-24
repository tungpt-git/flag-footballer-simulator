import type { Metadata } from "next";
import { SimulatorWorkspace } from "@/modules/simulation/ui";

export const metadata: Metadata = { title: "Simulator | Flag Football Lab" };

const SimulatorPage = () => <SimulatorWorkspace />;

export default SimulatorPage;
