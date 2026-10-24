"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, Eye, Gauge, Route as RouteIcon, Users, type LucideIcon } from "lucide-react";
import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { buttonVariants } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/utils";
import { useRoutes } from "@/modules/playbook/ui";
import { PositionBadge, usePlayers } from "@/modules/roster/ui";
import { dashToMetersPerSecond } from "@/modules/roster";
import { SessionSummary, useLaunchSimulator } from "@/modules/simulation/ui";

type SimulationMode = Parameters<ReturnType<typeof useLaunchSimulator>>[0];

type StatTileProps = { icon: LucideIcon; label: string; value: string; detail: string };

const StatTile = ({ icon: Icon, label, value, detail }: StatTileProps) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
      <Icon className="size-5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="caption-label">{label}</p>
      <p className="font-display text-title font-semibold text-foreground tabular">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  </div>
);

type ModeCardProps = {
  mode: SimulationMode;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  className: string;
  onLaunch: (mode: SimulationMode) => void;
};

const ModeCard = ({ mode, icon: Icon, title, description, cta, className, onLaunch }: ModeCardProps) => {
  const handleLaunch = (): void => onLaunch(mode);

  return (
    <button
      type="button"
      onClick={handleLaunch}
      className={cn(
        "group flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-background/60">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="font-display text-title font-semibold uppercase tracking-wide text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
      <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
        {cta}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  );
};

export const DashboardOverview = () => {
  const { data: players, isLoading: isLoadingPlayers, errorMessage: playersError } = usePlayers();
  const { data: routes, isLoading: isLoadingRoutes, errorMessage: routesError } = useRoutes();
  const launchSimulator = useLaunchSimulator();
  const isLoading = isLoadingPlayers || isLoadingRoutes;
  const errorMessage = playersError ?? routesError;

  const byDashTime = (first: (typeof players)[number], second: (typeof players)[number]): number =>
    first.metrics.fortyYardDash - second.metrics.fortyYardDash;
  const fastest = [...players].sort(byDashTime)[0];
  const receivers = players.filter((player) => player.position === "WR");
  const topReceivers = [...receivers].sort(byDashTime).slice(0, 5);

  return (
    <>
      <PageHeading eyebrow="Team" title="Dashboard" description="Pick a mode, run a play, and learn from the result." />

      <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
        {errorMessage && (
          <div role="alert" className="rounded-xl border border-danger/50 border-l-4 border-l-danger bg-danger-soft p-4 text-sm">
            <p className="font-semibold text-foreground">Could not load data</p>
            <p className="text-muted-foreground">{errorMessage}. Is the database running (docker compose up -d)?</p>
          </div>
        )}

        <section aria-label="Choose a mode" className="grid gap-4 md:grid-cols-2">
          <ModeCard
            mode="VIEW"
            icon={Eye}
            title="View only"
            description="Film-room mode. Pick a receiver and a route, then watch the play run against live coverage."
            cta="Open film room"
            className="border-mode-view/50 bg-mode-view/10 text-mode-view"
            onLaunch={launchSimulator}
          />
          <ModeCard
            mode="TACTICAL"
            icon={Crosshair}
            title="Interactive"
            description="Live-call mode. The play freezes at the decision point and you choose the throw, scramble or checkdown."
            cta="Run a decision drill"
            className="border-mode-live/50 bg-mode-live/10 text-mode-live"
            onLaunch={launchSimulator}
          />
        </section>

        <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
          <StatTile icon={Users} label="Players" value={isLoading ? "-" : String(players.length)} detail={`${receivers.length} receivers on the roster`} />
          <StatTile icon={RouteIcon} label="Routes" value={isLoading ? "-" : String(routes.length)} detail="Slant, Out, Go, Hook, Post" />
          <StatTile
            icon={Gauge}
            label="Fastest 40"
            value={fastest ? `${fastest.metrics.fortyYardDash.toFixed(2)}s` : "-"}
            detail={fastest ? `${fastest.name} (${dashToMetersPerSecond(fastest.metrics.fortyYardDash).toFixed(1)} m/s)` : "No players yet"}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="fastest-title" className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 id="fastest-title" className="caption-label">
                Fastest receivers
              </h2>
              <Link href="/players" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Roster
              </Link>
            </div>
            <div className="p-2">
              {topReceivers.length === 0 && <p className="p-2 text-sm text-muted-foreground">{isLoading ? "Loading..." : "No receivers yet."}</p>}
              <ol>
                {topReceivers.map((player, index) => (
                  <li key={player.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                    <span className="w-5 font-mono text-xs text-muted-foreground tabular">{index + 1}</span>
                    <span className="w-9 font-mono font-semibold text-foreground tabular">#{player.jerseyNumber}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{player.name}</span>
                    <PositionBadge position={player.position} />
                    <span className="w-14 text-right font-mono text-sm text-foreground tabular">{player.metrics.fortyYardDash.toFixed(2)}s</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="session-title" className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 id="session-title" className="caption-label">
                This session
              </h2>
            </div>
            <div className="p-4">
              <SessionSummary />
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
