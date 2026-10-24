"use client";

import { useRoutes } from "@/modules/playbook/ui";
import { usePlayers } from "@/modules/roster/ui";
import {
  DESKTOP_QUERY,
  TABLET_QUERY,
  useMediaQuery,
} from "@/shared/ui/hooks/useMediaQuery";
import { Button, buttonVariants } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { cn } from "@/shared/ui/utils";
import {
  Activity,
  AlertCircle,
  Loader2,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { startSessionRecording } from "../../application/sessionHistoryStore";
import { useSimulationStore } from "../../application/simulationStore";
import { DecisionDialog } from "./DecisionDialog";
import { FieldCanvas } from "./FieldCanvas";
import { OutcomeBanner } from "./OutcomeBanner";
import { PlaybackToolbar } from "./PlaybackToolbar";
import { SetupPanel } from "./SetupPanel";
import { StageHeader } from "./StageHeader";
import { StageLegend } from "./StageLegend";
import { StagePanels, type StagePanelTab } from "./StagePanels";

const DESKTOP_TABS: StagePanelTab[] = ["live", "log", "session"];
const TABLET_TABS: StagePanelTab[] = ["setup", "live", "log", "session"];

const MOBILE_SHORTCUTS: {
  tab: StagePanelTab;
  label: string;
  icon: typeof Activity;
}[] = [
  { tab: "setup", label: "Setup", icon: SlidersHorizontal },
  { tab: "live", label: "Live data", icon: Radio },
  { tab: "log", label: "Activity", icon: Activity },
];

const StageMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-1 items-center justify-center p-6">{children}</div>
);

type MobilePanelsProps = { tabs: StagePanelTab[] };

/** Below `md` the panels live in a bottom sheet that is opened from three buttons under the field. */
const MobilePanels = ({ tabs }: MobilePanelsProps) => {
  const [openTab, setOpenTab] = useState<StagePanelTab | null>(null);
  const [lastTab, setLastTab] = useState<StagePanelTab>("setup");

  const handleOpen = (tab: StagePanelTab) => (): void => {
    setLastTab(tab);
    setOpenTab(tab);
  };
  const handleChangeTab = (tab: StagePanelTab): void => {
    setLastTab(tab);
    setOpenTab(tab);
  };
  const handleOpenChange = (open: boolean): void => {
    if (!open) setOpenTab(null);
  };

  return (
    <>
      <nav
        aria-label="Simulator panels"
        className="grid grid-cols-3 gap-2 border-t border-border bg-card p-2"
      >
        {MOBILE_SHORTCUTS.map(({ tab, label, icon: Icon }) => (
          <Button
            key={tab}
            variant="outline"
            onClick={handleOpen(tab)}
            aria-haspopup="dialog"
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </nav>
      <Dialog open={openTab !== null} onOpenChange={handleOpenChange}>
        <DialogContent variant="sheet">
          <div className="flex h-full min-h-0 flex-col">
            <DialogTitle className="px-4 pt-4 font-display text-heading uppercase tracking-wide">
              Simulator
            </DialogTitle>
            <DialogDescription className="sr-only">
              Setup, live telemetry, activity log and session results.
            </DialogDescription>
            <StagePanels
              tabs={tabs}
              value={openTab ?? lastTab}
              onValueChange={handleChangeTab}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const SimulatorWorkspace = () => {
  const {
    data: players,
    isLoading: isLoadingPlayers,
    errorMessage: playersError,
  } = usePlayers();
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    errorMessage: routesError,
  } = useRoutes();
  const isLoading = isLoadingPlayers || isLoadingRoutes;
  const errorMessage = playersError ?? routesError;

  const loadCatalog = useSimulationStore((state) => state.loadCatalog);
  const pause = useSimulationStore((state) => state.pause);
  const hasSimulation = useSimulationStore((state) => state.sim !== null);
  const mode = useSimulationStore((state) => state.mode);

  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const [sideTab, setSideTab] = useState<StagePanelTab>("live");

  useEffect(() => {
    if (isLoading || errorMessage) return;
    loadCatalog(players, routes);
  }, [isLoading, errorMessage, players, routes, loadCatalog]);

  useEffect(() => startSessionRecording(), []);
  useEffect(() => pause, [pause]);

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 p-6 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading players and routes...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        role="alert"
        className="m-6 flex gap-3 rounded-xl border border-danger/50 border-l-4 border-l-danger bg-danger-soft p-4 text-sm"
      >
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-danger"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-foreground">Could not load data</p>
          <p className="text-muted-foreground">
            {errorMessage}. Is the database running (docker compose up -d) and
            seeded (npm run db:seed)?
          </p>
        </div>
      </div>
    );
  }

  const sideTabs = isDesktop ? DESKTOP_TABS : TABLET_TABS;
  const activeSideTab = sideTabs.includes(sideTab) ? sideTab : sideTabs[0];

  return (
    <div className="flex flex-col md:h-full md:min-h-0 md:flex-row">
      {isDesktop && (
        <aside
          aria-label="Play setup"
          className="scroll-thin w-80 shrink-0 overflow-y-auto border-r border-border bg-card p-4"
        >
          <SetupPanel />
        </aside>
      )}

      <section
        aria-label="Field simulation"
        className="flex min-w-0 flex-1 flex-col md:min-h-0"
      >
        <StageHeader />
        <div
          className={cn(
            "relative flex-none bg-stage max-md:h-[min(62dvh,34rem)] md:min-h-0 md:flex-1",
          )}
        >
          <FieldCanvas />
          <StageLegend />
          {!hasSimulation && (
            <StageMessage>
              <div className="relative z-10 max-w-sm rounded-xl border border-border bg-popover p-5 text-center shadow-raised">
                <p className="font-semibold text-foreground">
                  Nothing to simulate yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The simulator needs at least one wide receiver and one route.
                </p>
                <Link
                  href="/players"
                  className={cn(buttonVariants({ size: "sm" }), "mt-3")}
                >
                  Open roster
                </Link>
              </div>
            </StageMessage>
          )}
          <OutcomeBanner />
          <DecisionDialog />
        </div>
        <PlaybackToolbar />
        {!isTablet && <MobilePanels tabs={TABLET_TABS} />}
      </section>

      {isTablet && (
        <aside
          aria-label={
            mode === "VIEW" ? "View only panels" : "Interactive panels"
          }
          className="flex w-80 shrink-0 flex-col border-l border-border bg-card md:min-h-0 xl:w-[22rem]"
        >
          <StagePanels
            tabs={sideTabs}
            value={activeSideTab}
            onValueChange={setSideTab}
          />
        </aside>
      )}
    </div>
  );
};
