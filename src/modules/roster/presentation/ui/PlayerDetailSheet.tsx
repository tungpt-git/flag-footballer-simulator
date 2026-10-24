"use client";

import { POSITION_THEME } from "@/shared/ui/positionTheme";
import { Button } from "@/shared/ui/primitives/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/shared/ui/primitives/drawer";
import { Pencil, Trash2 } from "lucide-react";
import type { PlayerProfile } from "../../domain/player";
import { getMetricScores, type MetricScores } from "../metricScores";
import { getPerformanceStats } from "../performance";
import { PlayerMeters } from "./PlayerMeters";
import { PlayerPositions } from "./PlayerPositions";
import { PlayerRadar } from "./PlayerRadar";

type PlayerDetailSheetProps = {
  player: PlayerProfile | null;
  teamAverage: MetricScores | null;
  onClose: () => void;
  onEdit: (player: PlayerProfile) => void;
  onDelete: (player: PlayerProfile) => void;
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="caption-label mb-3">{children}</h3>
);

const buildRadarSummary = (player: PlayerProfile): string => {
  const scores = getMetricScores(player);
  return `Radar chart for ${player.name}: speed ${Math.round(scores.speed)}, hands ${Math.round(scores.catching)}, flag pulling ${Math.round(scores.flagPull)}, agility ${Math.round(scores.agility)} out of 100. Dashed outline shows the team average.`;
};

/** Read-only profile: bio, athletic metrics against the team average, and season performance. */
export const PlayerDetailSheet = ({
  player,
  teamAverage,
  onClose,
  onEdit,
  onDelete,
}: PlayerDetailSheetProps) => {
  const handleOpenChange = (open: boolean): void => {
    if (!open) onClose();
  };
  const handleEdit = (): void => {
    if (player) onEdit(player);
  };
  const handleDelete = (): void => {
    if (player) onDelete(player);
  };

  return (
    <Drawer
      open={player !== null}
      onOpenChange={handleOpenChange}
      swipeDirection="right"
    >
      <DrawerContent>
        {player && (
          <div className="flex min-h-full flex-col">
            <header
              style={{ borderTopColor: POSITION_THEME[player.position].cssVar }}
              className="border-t-4 border-b border-border bg-muted/40 px-5 pt-5 pb-4 md:rounded-tl-2xl"
            >
              <div className="flex items-end gap-4">
                <span
                  className="font-display text-[4.5rem] leading-[0.85] font-semibold text-foreground tabular"
                  aria-hidden="true"
                >
                  {player.jerseyNumber}
                </span>
                <div className="min-w-0 pb-1">
                  <DrawerTitle className="truncate text-title font-semibold">
                    {player.name}
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    {`${POSITION_THEME[player.position].label}${player.altPositions.length > 0 ? `, also plays ${player.altPositions.join(", ")}` : ""}, jersey ${player.jerseyNumber}. Profile with athletic metrics compared to the team average.`}
                  </DrawerDescription>
                  <PlayerPositions
                    player={player}
                    showName
                    className="mt-1.5"
                  />
                </div>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 px-5 py-5">
              <section aria-label="Athletic metrics">
                <SectionTitle>Athletic metrics</SectionTitle>
                <PlayerRadar
                  scores={getMetricScores(player)}
                  teamAverage={teamAverage}
                  summary={buildRadarSummary(player)}
                />
                <p className="mt-1 mb-4 text-center text-xs text-muted-foreground">
                  Solid area: {player.name.split(" ")[0]} · Dashed line: team
                  average
                </p>
                <PlayerMeters player={player} teamAverage={teamAverage} />
              </section>

              <section aria-label="Performance">
                <SectionTitle>Season performance</SectionTitle>
                <dl className="grid grid-cols-2 gap-2">
                  {getPerformanceStats(player).map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-display text-stat font-semibold text-foreground tabular">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <footer className="sticky bottom-0 flex gap-2 border-t border-border bg-popover px-5 py-3">
              <Button onClick={handleEdit} className="flex-1">
                <Pencil aria-hidden="true" />
                Edit profile
              </Button>
              <Button variant="destructive-outline" onClick={handleDelete}>
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            </footer>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
