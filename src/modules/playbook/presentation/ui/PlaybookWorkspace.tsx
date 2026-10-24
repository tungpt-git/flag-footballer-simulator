"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, RotateCw, Search, SearchX } from "lucide-react";
import type { PlayerProfile } from "@/modules/roster";
import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { LabeledSelect } from "@/shared/ui/primitives/labeled-select";
import { cn } from "@/shared/ui/utils";
import type { Route } from "../../domain/route";
import { ROUTE_BLURBS, getRouteFacts } from "../routeMetrics";
import { useRoutes } from "../useRoutes";
import { RouteThumbnail } from "./RouteThumbnail";

type PlaybookWorkspaceProps = {
  /** Wide receivers available for assignment. */
  receivers: PlayerProfile[];
  /** Called when a route is assigned to a receiver (the host decides what that means, e.g. open the simulator). */
  onAssign: (route: Route, receiver: PlayerProfile) => void;
};

type RouteFilter = "ALL" | "BREAKING" | "VERTICAL";

const FILTERS: { value: RouteFilter; label: string }[] = [
  { value: "ALL", label: "All routes" },
  { value: "BREAKING", label: "With a cut" },
  { value: "VERTICAL", label: "Straight line" },
];

type RouteCardProps = Pick<PlaybookWorkspaceProps, "receivers" | "onAssign"> & { route: Route };

const RouteCard = ({ route, receivers, onAssign }: RouteCardProps) => {
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const facts = getRouteFacts(route);
  const receiverId = selectedReceiverId ?? receivers[0]?.id ?? null;
  const receiver = receivers.find((candidate) => candidate.id === receiverId);

  const handleAssign = (): void => {
    if (receiver) onAssign(route, receiver);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-overlay">
      <div className="bg-stage p-3">
        <RouteThumbnail route={route} className="mx-auto h-48 rounded-md" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-title font-semibold uppercase tracking-wide text-foreground">{route.name}</h3>
          <div className="flex flex-wrap justify-end gap-1">
            <Badge variant="outline">{facts.depthYd.toFixed(0)} yd deep</Badge>
            <Badge variant={facts.cuts > 0 ? "warning" : "neutral"}>{facts.cuts > 0 ? `${facts.cuts} cut${facts.cuts > 1 ? "s" : ""}` : "No cut"}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{ROUTE_BLURBS[route.type]}</p>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <LabeledSelect
            id={`assign-${route.id}`}
            label="Assign to receiver"
            value={receiverId}
            options={receivers.map((candidate) => ({ value: candidate.id, label: `#${candidate.jerseyNumber} ${candidate.name}` }))}
            onChange={setSelectedReceiverId}
            placeholder={receivers.length === 0 ? "No receivers on the roster" : "Choose a receiver"}
            disabled={receivers.length === 0}
          />
          <Button onClick={handleAssign} disabled={!receiver}>
            Run in simulator
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
};

export const PlaybookWorkspace = ({ receivers, onAssign }: PlaybookWorkspaceProps) => {
  const { data: routes, isLoading, errorMessage, refresh } = useRoutes();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RouteFilter>("ALL");

  const visibleRoutes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return routes
      .filter((route) => query === "" || route.name.toLowerCase().includes(query))
      .filter((route) => {
        const hasCut = route.waypoints.some((waypoint) => waypoint.cut);
        return filter === "ALL" || (filter === "BREAKING" ? hasCut : !hasCut);
      });
  }, [routes, search, filter]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => setSearch(event.target.value);
  const handleFilterClick = (value: RouteFilter) => (): void => setFilter(value);
  const handleClear = (): void => {
    setSearch("");
    setFilter("ALL");
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div role="status" aria-label="Loading routes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-96 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      );
    }
    if (errorMessage) {
      return (
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <AlertCircle className="size-8 text-danger" aria-hidden="true" />
          <h2 className="text-heading font-semibold">Could not load the playbook</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}. Is the database running (docker compose up -d)?</p>
          <Button variant="outline" onClick={refresh}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </div>
      );
    }
    if (visibleRoutes.length === 0) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-heading font-semibold">No routes match</h2>
          <p className="text-sm text-muted-foreground">Try another name or clear the filter.</p>
          <Button variant="outline" onClick={handleClear}>
            Clear filters
          </Button>
        </div>
      );
    }
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" aria-label="Routes">
        {visibleRoutes.map((route) => (
          <li key={route.id} className="flex animate-fade-in flex-col [&>article]:flex-1">
            <RouteCard route={route} receivers={receivers} onAssign={onAssign} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <PageHeading
        eyebrow="Team"
        title="Playbook"
        count={isLoading ? undefined : routes.length}
        description="Route library. Yellow diamonds mark cuts; blue dot is the receiver at the line of scrimmage."
      />
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter routes" className="flex flex-wrap gap-1.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={handleFilterClick(value)}
                className={cn(
                  "h-9 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
                  filter === value && "border-primary bg-primary/15 text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <label htmlFor="route-search" className="sr-only">
              Search routes
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="route-search" type="search" value={search} onChange={handleSearchChange} placeholder="Search routes" className="w-52 pl-8" />
          </div>
        </div>
        {renderBody()}
      </div>
    </>
  );
};
