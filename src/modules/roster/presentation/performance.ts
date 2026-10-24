import { formatPercent } from "@/shared/ui/format";
import type { PlayerProfile } from "../domain/player";

export type PerformanceStat = { label: string; value: string };

/** Season stats that matter for the player's position. */
export const getPerformanceStats = (player: PlayerProfile): PerformanceStat[] => {
  const { stats } = player;
  if (player.position === "WR") {
    return [
      { label: "Receptions", value: String(stats.receptions) },
      { label: "Targets", value: String(stats.targets) },
      { label: "Catch rate", value: stats.targets > 0 ? formatPercent(stats.receptions / stats.targets) : "-" },
      { label: "Yards", value: String(stats.yards) },
    ];
  }
  if (player.position === "QB") {
    return [
      { label: "Pass yards", value: String(stats.yards) },
      { label: "Completions", value: String(stats.receptions) },
      { label: "Attempts", value: String(stats.targets) },
      { label: "Comp. rate", value: stats.targets > 0 ? formatPercent(stats.receptions / stats.targets) : "-" },
    ];
  }
  if (player.position === "DB") {
    return [
      { label: "Flag pulls", value: String(stats.flagPulls) },
      { label: "Interceptions", value: String(stats.interceptions) },
    ];
  }
  return [{ label: "Flag pulls", value: String(stats.flagPulls) }];
};

/** One-line summary for dense views. */
export const getPerformanceSummary = (player: PlayerProfile): string => {
  const { stats } = player;
  if (player.position === "WR") return `${stats.receptions}/${stats.targets} rec · ${stats.yards} yd`;
  if (player.position === "QB") return `${stats.yards} pass yd`;
  if (player.position === "DB") return `${stats.flagPulls} pulls · ${stats.interceptions} INT`;
  return `${stats.flagPulls} pulls`;
};
