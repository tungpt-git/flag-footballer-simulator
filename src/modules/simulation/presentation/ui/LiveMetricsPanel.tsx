"use client";

import { Badge } from "@/shared/ui/primitives/badge";
import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { POSITION_THEME } from "@/shared/ui/positionTheme";
import { cn } from "@/shared/ui/utils";
import { YARDS_TO_METERS } from "@/modules/roster";
import { PlayerMeters, PositionBadge, getTeamAverageScores } from "@/modules/roster/ui";
import type { SimEntity, SimulationPhase } from "../../domain/types";
import { distance } from "@/shared/kernel/geometry";
import { OUTCOME_LABELS } from "../../domain/labels";
import { useSimulationStore } from "../../application/simulationStore";
import { useStageUiStore } from "../../application/stageUiStore";
import { ENTITY_POSITION, ENTITY_ROLE_LABELS } from "../../infrastructure/rendering/entityStyle";
import { ENTITY_ORDER, getEntityProfile } from "../entityProfiles";
import { OUTCOME_STYLES } from "../outcomeStyles";

export const PHASE_LABELS: Record<SimulationPhase, { label: string; variant: "neutral" | "info" | "warning" | "success" }> = {
  PRE_SNAP: { label: "Pre-snap", variant: "neutral" },
  RUNNING: { label: "Live", variant: "info" },
  PAUSED_FOR_DECISION: { label: "Awaiting decision", variant: "warning" },
  BALL_IN_FLIGHT: { label: "Ball in flight", variant: "info" },
  SCRAMBLING: { label: "Scrambling", variant: "info" },
  FINISHED: { label: "Finished", variant: "success" },
};

const speedOf = (entity: SimEntity): number => Math.hypot(entity.vel.x, entity.vel.y);

/** Distance from `entity` to the nearest opposing player (defenders look at their own target instead). */
const getNearestOpponentYd = (entity: SimEntity, entities: SimEntity[]): number | null => {
  const isDefense = entity.role === "DEFENDER" || entity.role === "RUSHER";
  const opponents = entities.filter((candidate) => (candidate.role === "DEFENDER" || candidate.role === "RUSHER") !== isDefense);
  if (opponents.length === 0) return null;
  return Math.min(...opponents.map((opponent) => distance(opponent.pos, entity.pos)));
};

type TelemetryTileProps = { label: string; value: string; unit?: string; hint?: string };

const TelemetryTile = ({ label, value, unit, hint }: TelemetryTileProps) => (
  <div className="rounded-lg border border-border bg-card px-3 py-2" title={hint}>
    <dt className="caption-label text-[0.625rem]">{label}</dt>
    <dd className="flex items-baseline gap-1">
      <span className="font-display text-stat font-semibold text-foreground tabular">{value}</span>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </dd>
  </div>
);

const EntityPicker = () => {
  const entityIds = useSimulationStore((state) => (state.sim ? state.sim.entities.map((entity) => entity.id).join(",") : ""));
  const sim = useSimulationStore.getState().sim;
  const selectedEntityId = useStageUiStore((state) => state.selectedEntityId);
  const selectEntity = useStageUiStore((state) => state.selectEntity);
  const hoverEntity = useStageUiStore((state) => state.hoverEntity);

  if (!sim) return null;
  const present = entityIds.split(",");

  return (
    <div role="radiogroup" aria-label="Select a player on the field" className="flex flex-wrap gap-1.5">
      {ENTITY_ORDER.filter((id) => present.includes(id)).map((id) => {
        const entity = sim.entities.find((candidate) => candidate.id === id);
        if (!entity) return null;
        const position = ENTITY_POSITION[entity.role];
        const isSelected = selectedEntityId === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${ENTITY_ROLE_LABELS[entity.role]}, ${POSITION_THEME[position].label}, number ${entity.label}`}
            onClick={() => selectEntity(id)}
            onPointerEnter={() => hoverEntity(id)}
            onPointerLeave={() => hoverEntity(null)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface pr-3 pl-1.5 font-mono text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
              isSelected && "border-primary bg-primary/15 text-foreground",
            )}
          >
            <PositionGlyph position={position} label={entity.label} className="size-6" />
            {position}
          </button>
        );
      })}
    </div>
  );
};

const SelectedPlayer = () => {
  const selectedEntityId = useStageUiStore((state) => state.selectedEntityId);
  const players = useSimulationStore((state) => state.players);
  const config = useSimulationStore((state) => state.sim?.config ?? null);
  const snapshot = useSimulationStore((state) => state.snapshot);
  const sim = useSimulationStore.getState().sim;

  if (!sim || !config || !selectedEntityId) return null;
  const entity = sim.entities.find((candidate) => candidate.id === selectedEntityId);
  const profile = entity ? getEntityProfile(config, selectedEntityId) : null;
  if (!entity || !profile) return null;

  const speedYps = speedOf(entity);
  const gapYd = getNearestOpponentYd(entity, sim.entities);
  const teamAverage = getTeamAverageScores(players);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-display text-5xl leading-none font-semibold text-foreground tabular" aria-hidden="true">
          {profile.jerseyNumber}
        </span>
        <div className="min-w-0">
          <p className="truncate text-heading font-semibold text-foreground">{profile.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <PositionBadge position={profile.position} />
            <Badge variant="outline">{ENTITY_ROLE_LABELS[entity.role]}</Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2" aria-label={`Live telemetry for ${profile.name}`}>
        <TelemetryTile label="Speed" value={(speedYps * YARDS_TO_METERS).toFixed(1)} unit="m/s" hint={`${speedYps.toFixed(1)} yards per second`} />
        <TelemetryTile label="Nearest opponent" value={gapYd === null ? "-" : gapYd.toFixed(1)} unit="yd" />
        {entity.role === "RECEIVER" && snapshot && (
          <>
            <TelemetryTile label="Separation" value={snapshot.metrics.separationYd.toFixed(1)} unit="yd" hint="Distance to the nearest defender" />
            <TelemetryTile label="Defender angle" value={`${snapshot.metrics.pursuitAngleDeg}`} unit="deg" hint="0 deg: defender in front. 180 deg: trailing directly behind." />
          </>
        )}
        {(entity.role === "RUSHER" || entity.role === "QB") && snapshot && (
          <TelemetryTile label="Rusher to QB" value={snapshot.metrics.rusherDistanceYd.toFixed(1)} unit="yd" />
        )}
      </dl>

      <details className="group rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground">
          Athletic profile vs team
          <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-border p-3">
          <PlayerMeters player={profile} teamAverage={teamAverage} compact />
        </div>
      </details>
    </div>
  );
};

/** Live telemetry: clock and phase, a player picker, the selected player's numbers, and the play result. */
export const LiveMetricsPanel = () => {
  const phase = useSimulationStore((state) => state.sim?.phase ?? null);
  const elapsedSec = useSimulationStore((state) => state.snapshot?.t ?? 0);
  const outcome = useSimulationStore((state) => state.sim?.outcome ?? null);
  const hasSimulation = useSimulationStore((state) => state.sim !== null);

  if (!hasSimulation) return <p className="text-sm text-muted-foreground">Choose a receiver and a route to see live telemetry.</p>;

  const OutcomeIcon = outcome ? OUTCOME_STYLES[outcome.result].icon : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="caption-label">Time since snap</p>
          <p className="font-display text-display font-semibold text-foreground tabular" aria-live="off">
            {elapsedSec.toFixed(1)}
            <span className="ml-1 text-xl text-muted-foreground">s</span>
          </p>
        </div>
        {phase && <Badge variant={PHASE_LABELS[phase].variant}>{PHASE_LABELS[phase].label}</Badge>}
      </div>

      <section aria-label="Players" className="flex flex-col gap-3">
        <h3 className="caption-label">Players</h3>
        <EntityPicker />
        <SelectedPlayer />
      </section>

      <section aria-label="Play summary" className="flex flex-col gap-2">
        <h3 className="caption-label">Play summary</h3>
        {outcome && OutcomeIcon ? (
          <div className={cn("flex gap-3 rounded-lg border-2 bg-card p-3", OUTCOME_STYLES[outcome.result].card)}>
            <OutcomeIcon className={cn("mt-0.5 size-5 shrink-0", OUTCOME_STYLES[outcome.result].text)} aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">
                {OUTCOME_LABELS[outcome.result]} <span className="font-mono text-sm tabular">{outcome.yardsGained >= 0 ? "+" : ""}{outcome.yardsGained} yd</span>
              </p>
              <p className="text-sm text-muted-foreground">{outcome.reason}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The result and the reason behind it appear here when the play ends.</p>
        )}
      </section>
    </div>
  );
};
