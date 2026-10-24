"use client";

import type { SkillPosition } from "@/modules/playbook";
import {
  canPlayPosition,
  type PlayerProfile,
  type Position,
} from "@/modules/roster";
import {
  LabeledSelect,
  type SelectOption,
} from "@/shared/ui/primitives/labeled-select";
import { useSimulationStore } from "../../application/simulationStore";
import {
  DEFENDER_SLOT,
  RECEIVER_SLOT,
  SKILL_POSITIONS,
  type TeamSlot,
} from "../../domain/teamPlay";

type TeamLineupFormProps = {
  /** Keeps select ids unique when the form is mounted in more than one place. */
  idPrefix: string;
  /** Route name for each skill spot, shown when a play is already chosen. */
  routes?: Partial<Record<SkillPosition, string>>;
};

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

const receiverLabel = (
  position: SkillPosition,
  routeName: string | undefined,
): string => (routeName ? `${position} · ${routeName}` : position);

const defenderLabel = (
  position: SkillPosition,
  routeName: string | undefined,
): string =>
  routeName ? `DB on ${position} · ${routeName}` : `DB on ${position}`;

/** Offense and defense picks shared by every 5-on-5 play. */
export const TeamLineupForm = ({ idPrefix, routes }: TeamLineupFormProps) => {
  const players = useSimulationStore((state) => state.players);
  const lineup = useSimulationStore((state) => state.teamLineup);
  const setTeamPlayer = useSimulationStore((state) => state.setTeamPlayer);

  const handleChange =
    (slot: TeamSlot) =>
    (playerId: string): void =>
      setTeamPlayer(slot, playerId);

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No players on the roster yet. Plays use the default lineup until you add
        some.
      </p>
    );
  }

  const quarterbacks = buildPlayerOptions(players, "QB");
  const receivers = buildPlayerOptions(players, "WR");
  const defenders = buildPlayerOptions(players, "DB");
  const rushers = buildPlayerOptions(players, "RUSHER");

  return (
    <section
      id="setup-roster"
      aria-label="5-on-5 roster"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
            Offense
          </h3>
          <p className="text-xs text-muted-foreground">
            This lineup runs every 5-on-5 play.
          </p>
        </div>
        <LabeledSelect
          id={`${idPrefix}-qb`}
          label="Quarterback"
          value={lineup.quarterbackId}
          options={quarterbacks}
          onChange={handleChange("quarterbackId")}
          placeholder="Choose a quarterback"
        />
        {SKILL_POSITIONS.map((position) => (
          <LabeledSelect
            key={position}
            id={`${idPrefix}-receiver-${position}`}
            label={receiverLabel(position, routes?.[position])}
            value={lineup[RECEIVER_SLOT[position]]}
            options={receivers}
            onChange={handleChange(RECEIVER_SLOT[position])}
            placeholder={`Choose ${position}`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
            Defense
          </h3>
          <p className="text-xs text-muted-foreground">
            One defender on each route, plus the rusher.
          </p>
        </div>
        {SKILL_POSITIONS.map((position) => (
          <LabeledSelect
            key={position}
            id={`${idPrefix}-defender-${position}`}
            label={defenderLabel(position, routes?.[position])}
            value={lineup[DEFENDER_SLOT[position]]}
            options={defenders}
            onChange={handleChange(DEFENDER_SLOT[position])}
            placeholder={`Choose a defender for ${position}`}
          />
        ))}
        <LabeledSelect
          id={`${idPrefix}-rusher`}
          label="Rusher"
          value={lineup.rusherId}
          options={rushers}
          onChange={handleChange("rusherId")}
          placeholder="Choose a rusher"
        />
      </div>
    </section>
  );
};
