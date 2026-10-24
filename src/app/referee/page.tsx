import type { Metadata } from "next";
import { RefereeExam } from "@/modules/officiating/ui";

export const metadata: Metadata = { title: "Referee exam | Flag Football Lab" };

const RefereePage = () => <RefereeExam />;

export default RefereePage;
