"use client";

import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { cn } from "@/shared/ui/utils";
import { Eye, Hand, Search, SearchX } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  FORMATIONS,
  OFFENSIVE_PLAYS,
  getFormation,
  getPlayDepthYd,
  type FormationId,
  type OffensivePlay,
} from "../../domain/offensivePlays";
import { OffensivePlayDiagram } from "./OffensivePlayDiagram";

type FormationFilter = "ALL" | FormationId;

type OffensivePlaybookProps = {
  /** Category switcher shown above the filters (e.g. Offense / Defense). */
  tabs?: ReactNode;
  /** Extra controls on the same row as the category switcher, such as the plays/routes toggle. */
  toolbar?: ReactNode;
  /** Opens the play in the simulator. Film room throws for you; live pauses so you pick the target. */
  onRun: (playId: string, mode: "VIEW" | "TACTICAL") => void;
};

const FILTERS: { value: FormationFilter; label: string }[] = [
  { value: "ALL", label: "All plays" },
  ...FORMATIONS.map((formation) => ({
    value: formation.id,
    label: formation.name,
  })),
];

const chipClassName = (pressed: boolean): string =>
  cn(
    "h-9 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
    pressed && "border-primary bg-primary/15 text-foreground",
  );

const PlayCard = ({
  play,
  onRun,
}: {
  play: OffensivePlay;
  onRun: OffensivePlaybookProps["onRun"];
}) => {
  const formation = getFormation(play.formationId);
  const depthYd = getPlayDepthYd(play);
  const handleWatch = (): void => onRun(play.id, "VIEW");
  const handleRunLive = (): void => onRun(play.id, "TACTICAL");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-overlay">
      <div className="bg-stage p-3">
        <OffensivePlayDiagram
          play={play}
          className="mx-auto h-72 w-full rounded-md"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-title font-semibold uppercase tracking-wide text-foreground">
            {play.name}
          </h3>
          <div className="flex flex-wrap justify-end gap-1">
            <Badge variant="info">{formation.name}</Badge>
            <Badge variant="outline">{depthYd.toFixed(0)} yd</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{play.blurb}</p>
        {play.tip ? (
          <p className="text-sm text-foreground">{play.tip}</p>
        ) : null}
        <ul
          className="flex flex-wrap gap-x-3 gap-y-1"
          aria-label={`${play.name} routes`}
        >
          {play.assignments.map((assignment) => (
            <li
              key={assignment.position}
              className="text-xs text-muted-foreground"
            >
              <span className="font-semibold text-foreground">
                {assignment.position}
              </span>{" "}
              {assignment.routeName}
            </li>
          ))}
        </ul>
        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={handleWatch}>
            <Eye aria-hidden="true" />
            Watch
          </Button>
          <Button onClick={handleRunLive}>
            <Hand aria-hidden="true" />
            Run live
          </Button>
        </div>
      </div>
    </article>
  );
};

/** Offense half of the playbook: 5-on-5 calls grouped by formation. */
export const OffensivePlaybook = ({ tabs, toolbar, onRun }: OffensivePlaybookProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FormationFilter>("ALL");

  const visiblePlays = useMemo(() => {
    const query = search.trim().toLowerCase();
    return OFFENSIVE_PLAYS.filter(
      (play) => filter === "ALL" || play.formationId === filter,
    ).filter((play) => {
      if (query === "") return true;
      const formation = getFormation(play.formationId);
      const routes = play.assignments
        .map((assignment) => `${assignment.position} ${assignment.routeName}`)
        .join(" ");
      return `${play.name} ${formation.name} ${play.blurb} ${play.tip ?? ""} ${routes}`
        .toLowerCase()
        .includes(query);
    });
  }, [search, filter]);

  const activeFormation = filter === "ALL" ? null : getFormation(filter);

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => setSearch(event.target.value);
  const handleFilterClick = (value: FormationFilter) => (): void =>
    setFilter(value);
  const handleClear = (): void => {
    setSearch("");
    setFilter("ALL");
  };

  return (
    <>
      <PageHeading
        eyebrow="Team"
        title="Playbook"
        count={OFFENSIVE_PLAYS.length}
        description="5-on-5 calls. Downfield is up. Q is the quarterback; X, Y, Z, and C each keep one colour for the whole route."
      />
      <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabs}
          {toolbar}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Adapted from the{" "}
          <a
            href="https://nflflag.com/coaches/flag-football-rules/5-on-5-flag-football-playbook"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            NFL FLAG 5-on-5 playbook
          </a>
          . Trips, stack, and double-back calls are drawn to the right. Mirror
          them to run the other way.
          {activeFormation ? ` ${activeFormation.blurb}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter by formation"
            className="flex flex-wrap gap-1.5"
          >
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={handleFilterClick(value)}
                className={chipClassName(filter === value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <label htmlFor="play-search" className="sr-only">
              Search plays
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="play-search"
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search plays"
              className="w-52 pl-8"
            />
          </div>
        </div>
        {visiblePlays.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <SearchX
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-heading font-semibold">No plays match</h2>
            <p className="text-sm text-muted-foreground">
              Try another name, route, or formation.
            </p>
            <Button variant="outline" onClick={handleClear}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ul
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
            aria-label="5-on-5 plays"
          >
            {visiblePlays.map((play) => (
              <li
                key={play.id}
                className="flex animate-fade-in flex-col [&>article]:flex-1"
              >
                <PlayCard play={play} onRun={onRun} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
