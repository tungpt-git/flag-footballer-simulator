"use client";

import {
  OFFENSIVE_PLAYS,
  getFormation,
  resolveRoutePoints,
  type SkillPosition,
} from "@/modules/playbook";
import { RouteThumbnail } from "@/modules/playbook/ui";
import {
  canPlayPosition,
  dashToMetersPerSecond,
  type PlayerProfile,
  type Position,
} from "@/modules/roster";
import { DEFAULT_LOS_Y } from "@/shared/kernel/field";
import {
  LabeledSelect,
  type SelectOption,
} from "@/shared/ui/primitives/labeled-select";
import { cn } from "@/shared/ui/utils";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getAlignmentX,
  useSimulationStore,
  type AlignmentSide,
  type LineupRole,
} from "../../application/simulationStore";
import {
  DEFENSIVE_PLAYS,
  getDefensivePlay,
  type DefensivePlayId,
} from "../../domain/defensivePlays";
import { CATEGORY_LABELS, TRIGGER_LABELS } from "../../domain/labels";
import {
  createRunnerRuntime,
  estimateRouteDurationSec,
} from "../../domain/movement";
import type { PlayCategory } from "../../domain/types";
import { TeamLineupForm } from "./TeamLineupForm";

const CATEGORY_OPTIONS: PlayCategory[] = ["OFFENSE", "DEFENSE"];

const ALIGNMENT_OPTIONS: { value: AlignmentSide; label: string }[] = [
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
];

const buildPlayerOptions = (
  players: PlayerProfile[],
  position: Position,
): SelectOption[] =>
  players
    .filter((player) => canPlayPosition(player, position))
    .map((player) => ({
      value: player.id,
      label: `#${player.jerseyNumber} ${player.name} - ${player.metrics.fortyYardDash.toFixed(2)}s`,
    }));

type PlayerSelectConfig = {
  role: LineupRole;
  position: Position;
  label: string;
  id: string;
};

const DEFENSE_SELECTS: PlayerSelectConfig[] = [
  {
    role: "quarterbackId",
    position: "QB",
    label: "Quarterback",
    id: "select-qb",
  },
  {
    role: "cornerbackId",
    position: "DB",
    label: "Defender (cornerback)",
    id: "select-db",
  },
  {
    role: "rusherId",
    position: "RUSHER",
    label: "Rusher",
    id: "select-rusher",
  },
];

const DEFENSIVE_PLAY_OPTIONS: SelectOption[] = DEFENSIVE_PLAYS.map((play) => ({
  value: play.id,
  label: play.name,
}));

const isDefensivePlayId = (value: string): value is DefensivePlayId =>
  DEFENSIVE_PLAYS.some((play) => play.id === value);

const SectionTitle = ({ children, id }: { children: string; id?: string }) => (
  <h3 id={id} className="caption-label mb-2">
    {children}
  </h3>
);

const RouteSummary = () => {
  const receiverId = useSimulationStore((state) => state.lineup.receiverId);
  const routeId = useSimulationStore((state) => state.routeId);
  const players = useSimulationStore((state) => state.players);
  const routes = useSimulationStore((state) => state.routes);
  const alignmentSide = useSimulationStore((state) => state.alignmentSide);

  const summary = useMemo(() => {
    const receiver = players.find((player) => player.id === receiverId);
    const route = routes.find((candidate) => candidate.id === routeId);
    if (!receiver || !route) return null;

    const points = resolveRoutePoints(
      route.waypoints,
      getAlignmentX(alignmentSide),
      DEFAULT_LOS_Y,
    );
    const runtime = createRunnerRuntime(points, receiver.metrics);
    return {
      speedMps: dashToMetersPerSecond(receiver.metrics.fortyYardDash),
      lengthYd: runtime.path.totalLength,
      durationSec: estimateRouteDurationSec(runtime),
      cuts: route.waypoints.filter((waypoint) => waypoint.cut).length,
    };
  }, [players, routes, receiverId, routeId, alignmentSide]);

  if (!summary) return null;

  const rows: [string, string, string][] = [
    ["Speed", summary.speedMps.toFixed(1), "m/s"],
    ["Length", summary.lengthYd.toFixed(0), "yd"],
    ["Cuts", String(summary.cuts), ""],
    ["Run time", summary.durationSec.toFixed(1), "s"],
  ];

  return (
    <dl className="grid grid-cols-4 gap-1.5 rounded-lg border border-border bg-card p-2">
      {rows.map(([term, value, unit]) => (
        <div key={term} className="text-center">
          <dd className="font-display text-xl leading-none font-semibold text-foreground tabular">
            {value}
            {unit && (
              <span className="ml-0.5 font-sans text-[0.625rem] font-normal text-muted-foreground">
                {unit}
              </span>
            )}
          </dd>
          <dt className="caption-label mt-1 text-[0.5625rem]">{term}</dt>
        </div>
      ))}
    </dl>
  );
};

export const SetupPanel = () => {
  const mode = useSimulationStore((state) => state.mode);
  const category = useSimulationStore((state) => state.category);
  const setCategory = useSimulationStore((state) => state.setCategory);
  const players = useSimulationStore((state) => state.players);
  const routes = useSimulationStore((state) => state.routes);
  const lineup = useSimulationStore((state) => state.lineup);
  const routeId = useSimulationStore((state) => state.routeId);
  const defensivePlayId = useSimulationStore((state) => state.defensivePlayId);
  const trigger = useSimulationStore((state) => state.trigger);
  const alignmentSide = useSimulationStore((state) => state.alignmentSide);
  const offensivePlayId = useSimulationStore((state) => state.offensivePlayId);
  const setLineupPlayer = useSimulationStore((state) => state.setLineupPlayer);
  const setRouteId = useSimulationStore((state) => state.setRouteId);
  const setDefensivePlayId = useSimulationStore(
    (state) => state.setDefensivePlayId,
  );
  const setTrigger = useSimulationStore((state) => state.setTrigger);
  const setAlignmentSide = useSimulationStore(
    (state) => state.setAlignmentSide,
  );
  const setOffensivePlayId = useSimulationStore(
    (state) => state.setOffensivePlayId,
  );
  const activePlay =
    OFFENSIVE_PLAYS.find((play) => play.id === offensivePlayId) ?? null;
  const [isRosterVisible, setIsRosterVisible] = useState(true);

  const selectedRoute = routes.find((route) => route.id === routeId);
  const routeHasCut =
    selectedRoute?.waypoints.some((waypoint) => waypoint.cut) ?? false;

  const triggerOptions: SelectOption[] = [
    { value: "AT_CUT", label: TRIGGER_LABELS.AT_CUT },
    { value: "AT_TIME", label: TRIGGER_LABELS.AT_TIME },
  ];

  const handleTriggerChange = (value: string): void =>
    setTrigger(value === "AT_TIME" ? "AT_TIME" : "AT_CUT");
  const handleAlignmentChange = (side: AlignmentSide) => (): void =>
    setAlignmentSide(side);
  const handleDefensivePlayChange = (value: string): void => {
    if (isDefensivePlayId(value)) setDefensivePlayId(value);
  };
  const handleRouteClick = (id: string) => (): void => setRouteId(id);
  const handleCategoryClick = (option: PlayCategory) => (): void =>
    setCategory(option);
  const handleClearPlay = (): void => setOffensivePlayId(null);
  const handleToggleRoster = (): void =>
    setIsRosterVisible((visible) => !visible);

  const teamRoutes: Partial<Record<SkillPosition, string>> | undefined =
    activePlay
      ? Object.fromEntries(
          activePlay.assignments.map((assignment) => [
            assignment.position,
            assignment.routeName,
          ]),
        )
      : undefined;

  const teamSection = activePlay ? (
    <section
      key="team"
      aria-label="5-on-5 play"
      className="flex flex-col gap-3"
    >
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          {activePlay.name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {getFormation(activePlay.formationId).name}. The quarterback reads at
          2.2 seconds. Click a player on the field to change that spot. The same
          lineup runs every 5-on-5 play.
        </p>
      </div>
      <button
        type="button"
        aria-expanded={isRosterVisible}
        aria-controls="setup-roster"
        onClick={handleToggleRoster}
        className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent pointer-coarse:h-11"
      >
        {isRosterVisible ? "Hide roster" : "Show roster"}
      </button>
      {isRosterVisible && (
        <TeamLineupForm idPrefix="setup" routes={teamRoutes} />
      )}
      <button
        type="button"
        onClick={handleClearPlay}
        className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11"
      >
        Use a single route instead
      </button>
    </section>
  ) : null;

  const offenseSection = (
    <section
      key="offense"
      aria-label={
        category === "DEFENSE" ? "Opposing offense" : "Receiver and route"
      }
      className="flex flex-col gap-3"
    >
      <LabeledSelect
        id="select-receiver"
        label={category === "DEFENSE" ? "Opposing receiver" : "Receiver"}
        value={lineup.receiverId}
        options={buildPlayerOptions(players, "WR")}
        onChange={(value) => setLineupPlayer("receiverId", value)}
        placeholder="Choose a receiver"
      />

      <div>
        <SectionTitle id="route-picker-label">
          {category === "DEFENSE" ? "Route they run" : "Route"}
        </SectionTitle>
        <div
          role="radiogroup"
          aria-labelledby="route-picker-label"
          className="grid grid-cols-3 gap-2"
        >
          {routes.map((route) => {
            const isSelected = route.id === routeId;
            return (
              <button
                key={route.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={handleRouteClick(route.id)}
                className={cn(
                  "flex flex-col items-center gap-1 overflow-hidden rounded-lg border border-border bg-surface pb-1.5 text-xs font-medium text-muted-foreground transition-[border-color,background-color] duration-150 hover:border-primary/60 hover:text-foreground",
                  isSelected &&
                    "border-primary bg-primary/10 text-foreground ring-1 ring-primary",
                )}
              >
                <RouteThumbnail route={route} className="h-16 w-full" />
                {route.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle id="alignment-label">Alignment</SectionTitle>
        <div
          role="radiogroup"
          aria-labelledby="alignment-label"
          className="inline-flex w-full overflow-hidden rounded-lg border border-border bg-background"
        >
          {ALIGNMENT_OPTIONS.map((option) => {
            const isSelected = alignmentSide === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={handleAlignmentChange(option.value)}
                className={cn(
                  "h-9 flex-1 border-r border-border text-sm font-medium text-muted-foreground transition-colors duration-150 last:border-r-0 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <RouteSummary />
    </section>
  );

  const defensivePlaySection = (
    <section key="defense" aria-label="Defensive play">
      <LabeledSelect
        id="select-defensive-play"
        label="Defensive play"
        value={defensivePlayId}
        options={DEFENSIVE_PLAY_OPTIONS}
        onChange={handleDefensivePlayChange}
        hint={getDefensivePlay(defensivePlayId).blurb}
      />
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Side of the ball">
        <SectionTitle id="category-label">Coach the</SectionTitle>
        <div
          role="radiogroup"
          aria-labelledby="category-label"
          className="inline-flex w-full overflow-hidden rounded-lg border border-border bg-background"
        >
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = category === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={handleCategoryClick(option)}
                className={cn(
                  "h-9 flex-1 border-r border-border text-sm font-medium text-muted-foreground transition-colors duration-150 last:border-r-0 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {CATEGORY_LABELS[option]}
              </button>
            );
          })}
        </div>
      </section>

      {category === "DEFENSE"
        ? [defensivePlaySection, teamSection ?? offenseSection]
        : [teamSection ?? offenseSection, defensivePlaySection]}

      {mode === "TACTICAL" && !activePlay && (
        <section
          aria-label="Decision trigger"
          className="rounded-lg border border-mode-live/40 bg-mode-live/5 p-3"
        >
          <LabeledSelect
            id="select-trigger"
            label="Pause the play"
            value={trigger}
            options={triggerOptions}
            onChange={handleTriggerChange}
            hint={
              trigger === "AT_CUT" && !routeHasCut
                ? "This route has no cut, so the play pauses at 2.5 seconds."
                : "When the play stops so you can call an action."
            }
          />
        </section>
      )}

      {!activePlay && (
        <details className="group rounded-lg border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground">
            Quarterback, defender &amp; rusher
            <ChevronDown
              className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="flex flex-col gap-3 border-t border-border p-3">
            {DEFENSE_SELECTS.map((config) => (
              <LabeledSelect
                key={config.id}
                id={config.id}
                label={config.label}
                value={lineup[config.role]}
                options={buildPlayerOptions(players, config.position)}
                onChange={(value) => setLineupPlayer(config.role, value)}
                placeholder="Default player"
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
