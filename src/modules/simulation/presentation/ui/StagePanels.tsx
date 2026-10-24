"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { EventLog } from "./EventLog";
import { LiveMetricsPanel } from "./LiveMetricsPanel";
import { SessionSummary } from "./SessionHistory";
import { SetupPanel } from "./SetupPanel";

export type StagePanelTab = "setup" | "live" | "log" | "session";

const TAB_LABELS: Record<StagePanelTab, string> = {
  setup: "Setup",
  live: "Live",
  log: "Log",
  session: "Session",
};

type StagePanelsProps = {
  tabs: StagePanelTab[];
  value: StagePanelTab;
  onValueChange: (value: StagePanelTab) => void;
};

const isStagePanelTab = (value: unknown): value is StagePanelTab => typeof value === "string" && value in TAB_LABELS;

/** Tabbed side panel. Which tabs exist depends on the screen size; the content is shared. */
export const StagePanels = ({ tabs, value, onValueChange }: StagePanelsProps) => {
  const handleValueChange = (next: unknown): void => {
    if (isStagePanelTab(next)) onValueChange(next);
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange} className="min-h-0 flex-1 gap-0">
      <TabsList variant="line" aria-label="Simulator panels" className="w-full shrink-0 border-b border-border px-2">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="h-9 after:bg-primary pointer-coarse:h-11">
            {TAB_LABELS[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <TabsContent value="setup">
          <SetupPanel />
        </TabsContent>
        <TabsContent value="live">
          <LiveMetricsPanel />
        </TabsContent>
        <TabsContent value="log">
          <EventLog />
        </TabsContent>
        <TabsContent value="session">
          <SessionSummary />
        </TabsContent>
      </div>
    </Tabs>
  );
};
