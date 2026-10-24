import { Shield, Swords } from "lucide-react";
import { TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";

export type PlaybookCategory = "OFFENSE" | "DEFENSE";

/** OFFENSE / DEFENSE switcher; must be rendered inside a `Tabs` root. */
export const PlaybookCategoryTabs = () => (
  <TabsList aria-label="Playbook category" className="h-10 w-full max-w-xs">
    <TabsTrigger value="OFFENSE" className="gap-2 font-display uppercase tracking-wide">
      <Swords aria-hidden="true" />
      Offense
    </TabsTrigger>
    <TabsTrigger value="DEFENSE" className="gap-2 font-display uppercase tracking-wide">
      <Shield aria-hidden="true" />
      Defense
    </TabsTrigger>
  </TabsList>
);
