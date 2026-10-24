"use client";

import { useMemo, useState } from "react";
import { AlertCircle, LayoutGrid, List, Plus, RotateCw, Search, SearchX, Users } from "lucide-react";
import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { LabeledSelect } from "@/shared/ui/primitives/labeled-select";
import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { cn } from "@/shared/ui/utils";
import { POSITIONS, canPlayPosition, type PlayerProfile, type Position } from "../../domain/player";
import { getMetricScores, getTeamAverageScores } from "../metricScores";
import { usePlayers } from "../usePlayers";
import { DeletePlayerDialog } from "./DeletePlayerDialog";
import { PlayerCard } from "./PlayerCard";
import { PlayerDetailSheet } from "./PlayerDetailSheet";
import { PlayerFormDialog } from "./PlayerFormDialog";
import { PlayerTable } from "./PlayerTable";

type PositionFilter = Position | "ALL";
type SortKey = "jersey" | "name" | "speed" | "agility";
type ViewMode = "grid" | "list";

const FILTERS: PositionFilter[] = ["ALL", ...POSITIONS];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "jersey", label: "Jersey number" },
  { value: "name", label: "Name (A-Z)" },
  { value: "speed", label: "Fastest first" },
  { value: "agility", label: "Most agile first" },
];

const isSortKey = (value: string): value is SortKey => SORT_OPTIONS.some((option) => option.value === value);

const SORTERS: Record<SortKey, (first: PlayerProfile, second: PlayerProfile) => number> = {
  jersey: (first, second) => first.jerseyNumber - second.jerseyNumber,
  name: (first, second) => first.name.localeCompare(second.name),
  speed: (first, second) => getMetricScores(second).speed - getMetricScores(first).speed,
  agility: (first, second) => second.metrics.agility - first.metrics.agility,
};

const SKELETON_COUNT = 6;

const RosterSkeleton = () => (
  <div role="status" aria-label="Loading players" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {Array.from({ length: SKELETON_COUNT }, (_, index) => (
      <div key={index} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
    ))}
    <span className="sr-only">Loading players...</span>
  </div>
);

type StateMessageProps = {
  icon: typeof Users;
  title: string;
  description: string;
  tone?: "neutral" | "danger";
  children?: React.ReactNode;
};

const StateMessage = ({ icon: Icon, title, description, tone = "neutral", children }: StateMessageProps) => (
  <div
    role={tone === "danger" ? "alert" : undefined}
    className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center"
  >
    <span className={cn("flex size-12 items-center justify-center rounded-full bg-muted", tone === "danger" ? "text-danger" : "text-muted-foreground")}>
      <Icon className="size-6" aria-hidden="true" />
    </span>
    <h2 className="text-heading font-semibold text-foreground">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
    {children}
  </div>
);

export const PlayersWorkspace = () => {
  const { data: players, isLoading, errorMessage, refresh } = usePlayers();
  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("jersey");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [viewingPlayer, setViewingPlayer] = useState<PlayerProfile | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerProfile | null>(null);

  const teamAverage = useMemo(() => getTeamAverageScores(players), [players]);
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players
      .filter((player) => filter === "ALL" || canPlayPosition(player, filter))
      .filter((player) => query === "" || player.name.toLowerCase().includes(query) || String(player.jerseyNumber) === query)
      .sort(SORTERS[sortKey]);
  }, [players, filter, search, sortKey]);

  const countFor = (positionFilter: PositionFilter): number =>
    positionFilter === "ALL" ? players.length : players.filter((player) => canPlayPosition(player, positionFilter)).length;

  const handleCreate = (): void => {
    setEditingPlayer(null);
    setIsFormOpen(true);
  };
  const handleEdit = (player: PlayerProfile): void => {
    setViewingPlayer(null);
    setEditingPlayer(player);
    setIsFormOpen(true);
  };
  const handleRequestDelete = (player: PlayerProfile): void => {
    setViewingPlayer(null);
    setPlayerToDelete(player);
  };
  const handleOpen = (player: PlayerProfile): void => setViewingPlayer(player);
  const handleCloseDetail = (): void => setViewingPlayer(null);
  const handleCloseDelete = (): void => setPlayerToDelete(null);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => setSearch(event.target.value);
  const handleFilterClick = (positionFilter: PositionFilter) => (): void => setFilter(positionFilter);
  const handleSortChange = (value: string): void => {
    if (isSortKey(value)) setSortKey(value);
  };
  const handleViewClick = (nextView: ViewMode) => (): void => setViewMode(nextView);
  const handleClearFilters = (): void => {
    setFilter("ALL");
    setSearch("");
  };

  const renderBody = () => {
    if (isLoading) return <RosterSkeleton />;
    if (errorMessage) {
      return (
        <StateMessage icon={AlertCircle} tone="danger" title="Could not load the roster" description={`${errorMessage}. Is the database running (docker compose up -d)?`}>
          <Button variant="outline" onClick={refresh}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </StateMessage>
      );
    }
    if (players.length === 0) {
      return (
        <StateMessage icon={Users} title="Your roster is empty" description="Add players with their bio and athletic metrics to use them in route simulations.">
          <Button onClick={handleCreate}>
            <Plus aria-hidden="true" />
            Add first player
          </Button>
        </StateMessage>
      );
    }
    if (visiblePlayers.length === 0) {
      return (
        <StateMessage icon={SearchX} title="No players match" description="Try another position or clear the search.">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear filters
          </Button>
        </StateMessage>
      );
    }
    if (viewMode === "list") {
      return <PlayerTable players={visiblePlayers} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleRequestDelete} />;
    }
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Players">
        {visiblePlayers.map((player) => (
          <li key={player.id} className="animate-fade-in">
            <PlayerCard player={player} teamAverage={teamAverage} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleRequestDelete} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <PageHeading
        eyebrow="Team"
        title="Roster"
        count={isLoading ? undefined : players.length}
        description="Profiles, athletic metrics and season stats for every player. Bars show each player against the team average tick."
        actions={
          <Button onClick={handleCreate}>
            <Plus aria-hidden="true" />
            New player
          </Button>
        }
      />

      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <div className="flex flex-wrap items-end gap-3">
          <div role="group" aria-label="Filter by position" className="flex flex-wrap gap-1.5">
            {FILTERS.map((positionFilter) => {
              const isActive = filter === positionFilter;
              return (
                <button
                  key={positionFilter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={handleFilterClick(positionFilter)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
                    isActive && "border-primary bg-primary/15 text-foreground",
                  )}
                >
                  {positionFilter !== "ALL" && <PositionGlyph position={positionFilter} className="size-4" />}
                  {positionFilter === "ALL" ? "All" : positionFilter}
                  <span className="font-mono text-xs text-muted-foreground tabular">{countFor(positionFilter)}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-end gap-3">
            <div className="relative">
              <label htmlFor="roster-search" className="sr-only">
                Search players by name or number
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="roster-search" type="search" value={search} onChange={handleSearchChange} placeholder="Search name or #" className="w-48 pl-8" />
            </div>
            <LabeledSelect id="roster-sort" label="Sort" value={sortKey} options={SORT_OPTIONS} onChange={handleSortChange} className="w-44 [&>label]:sr-only" />
            <div role="group" aria-label="Layout" className="flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  ["grid", LayoutGrid, "Card view"],
                  ["list", List, "List view"],
                ] as const
              ).map(([value, Icon, label]) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleViewClick(value)}
                  aria-label={label}
                  aria-pressed={viewMode === value}
                  className={cn(viewMode === value && "bg-accent")}
                >
                  <Icon aria-hidden="true" />
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {isLoading ? "" : `${visiblePlayers.length} players shown`}
        </p>
        {renderBody()}
      </div>

      <PlayerDetailSheet player={viewingPlayer} teamAverage={teamAverage} onClose={handleCloseDetail} onEdit={handleEdit} onDelete={handleRequestDelete} />
      <PlayerFormDialog player={editingPlayer} open={isFormOpen} onOpenChange={setIsFormOpen} onSaved={refresh} teamAverage={teamAverage} />
      <DeletePlayerDialog player={playerToDelete} onClose={handleCloseDelete} onDeleted={refresh} />
    </>
  );
};
