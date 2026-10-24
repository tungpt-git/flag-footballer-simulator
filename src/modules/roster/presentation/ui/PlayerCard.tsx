"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { POSITION_THEME } from "@/shared/ui/positionTheme";
import type { PlayerProfile } from "../../domain/player";
import type { MetricScores } from "../metricScores";
import { getPerformanceSummary } from "../performance";
import { PlayerMeters } from "./PlayerMeters";
import { PlayerPositions } from "./PlayerPositions";

type PlayerCardProps = {
  player: PlayerProfile;
  teamAverage: MetricScores | null;
  onOpen: (player: PlayerProfile) => void;
  onEdit: (player: PlayerProfile) => void;
  onDelete: (player: PlayerProfile) => void;
};

/** Roster card. The whole card opens the profile; edit/delete sit above the stretched button. */
export const PlayerCard = ({ player, teamAverage, onOpen, onEdit, onDelete }: PlayerCardProps) => {
  const handleOpen = (): void => onOpen(player);
  const handleEdit = (): void => onEdit(player);
  const handleDelete = (): void => onDelete(player);

  return (
    <article
      style={{ borderTopColor: POSITION_THEME[player.position].cssVar }}
      className="group/card relative flex flex-col gap-4 rounded-xl border border-t-[3px] border-border bg-card p-4 shadow-raised transition-[transform,border-color,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-overlay"
    >
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Open profile for ${player.name}, number ${player.jerseyNumber}`}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="pointer-events-none flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display text-display leading-none text-foreground tabular" aria-hidden="true">
            {player.jerseyNumber}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-heading font-semibold text-foreground">{player.name}</h3>
            <PlayerPositions player={player} showName className="mt-1" />
          </div>
        </div>
        <div className="pointer-events-auto relative z-10 -mr-1 flex gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={handleEdit} aria-label={`Edit ${player.name}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleDelete} aria-label={`Delete ${player.name}`} className="text-muted-foreground hover:text-danger">
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="pointer-events-none">
        <PlayerMeters player={player} teamAverage={teamAverage} compact />
      </div>

      <p className="pointer-events-none border-t border-border pt-3 font-mono text-xs text-muted-foreground tabular">
        {getPerformanceSummary(player)}
      </p>
    </article>
  );
};
