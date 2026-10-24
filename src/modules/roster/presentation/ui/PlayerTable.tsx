"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { formatPercent } from "@/shared/ui/format";
import { dashToMetersPerSecond } from "../../domain/athletics";
import type { PlayerProfile } from "../../domain/player";
import { getMetricScores } from "../metricScores";
import { getPerformanceSummary } from "../performance";
import { PlayerPositions } from "./PlayerPositions";

type PlayerTableProps = {
  players: PlayerProfile[];
  onOpen: (player: PlayerProfile) => void;
  onEdit: (player: PlayerProfile) => void;
  onDelete: (player: PlayerProfile) => void;
};

const MiniMeter = ({ label, score, display }: { label: string; score: number; display: string }) => (
  <div className="flex items-center gap-2">
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(score)}
      aria-label={label}
      aria-valuetext={display}
      className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
    </div>
    <span className="w-10 font-mono text-xs text-muted-foreground tabular">{display}</span>
  </div>
);

/** Dense list view of the roster. */
export const PlayerTable = ({ players, onOpen, onEdit, onDelete }: PlayerTableProps) => {
  const handleOpen = (player: PlayerProfile) => (): void => onOpen(player);
  const handleEdit = (player: PlayerProfile) => (): void => onEdit(player);
  const handleDelete = (player: PlayerProfile) => (): void => onDelete(player);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">#</TableHead>
            <TableHead scope="col">Player</TableHead>
            <TableHead scope="col">Position</TableHead>
            <TableHead scope="col">Speed</TableHead>
            <TableHead scope="col">Agility</TableHead>
            <TableHead scope="col">Hands</TableHead>
            <TableHead scope="col">Flag pull</TableHead>
            <TableHead scope="col">Season</TableHead>
            <TableHead scope="col" className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => {
            const scores = getMetricScores(player);
            return (
              <TableRow key={player.id}>
                <TableCell className="font-display text-xl font-semibold text-foreground tabular">{player.jerseyNumber}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={handleOpen(player)}
                    className="rounded-sm text-left font-semibold text-foreground underline-offset-4 hover:underline"
                    aria-label={`Open profile for ${player.name}`}
                  >
                    {player.name}
                  </button>
                </TableCell>
                <TableCell>
                  <PlayerPositions player={player} />
                </TableCell>
                <TableCell>
                  <MiniMeter label={`Speed of ${player.name}`} score={scores.speed} display={`${player.metrics.fortyYardDash.toFixed(2)}s`} />
                  <span className="sr-only">{dashToMetersPerSecond(player.metrics.fortyYardDash).toFixed(1)} metres per second</span>
                </TableCell>
                <TableCell>
                  <MiniMeter label={`Agility of ${player.name}`} score={scores.agility} display={String(player.metrics.agility)} />
                </TableCell>
                <TableCell>
                  <MiniMeter label={`Hands of ${player.name}`} score={scores.catching} display={formatPercent(player.metrics.catchProbability)} />
                </TableCell>
                <TableCell>
                  <MiniMeter label={`Flag pulling of ${player.name}`} score={scores.flagPull} display={formatPercent(player.metrics.flagPullEfficiency)} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular">{getPerformanceSummary(player)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={handleEdit(player)} aria-label={`Edit ${player.name}`}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={handleDelete(player)} aria-label={`Delete ${player.name}`} className="text-muted-foreground hover:text-danger">
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
