import { StatMeter } from "@/shared/ui/StatMeter";
import { formatPercent } from "@/shared/ui/format";
import { dashToMetersPerSecond } from "../../domain/athletics";
import type { PlayerProfile } from "../../domain/player";
import { getMetricLabels } from "../labels";
import { getMetricScores, type MetricScores } from "../metricScores";

type PlayerMetersProps = {
  player: PlayerProfile;
  /** Team averages to compare against; omit to hide the comparison. */
  teamAverage?: MetricScores | null;
  compact?: boolean;
};

/** The four athletic metrics as visual meters (speed, agility, hands, flag pulling). */
export const PlayerMeters = ({ player, teamAverage, compact = false }: PlayerMetersProps) => {
  const labels = getMetricLabels(player.position);
  const scores = getMetricScores(player);
  const average = teamAverage ?? undefined;

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3.5"}>
      <StatMeter
        compact={compact}
        label="Speed"
        score={scores.speed}
        averageScore={average?.speed}
        display={compact ? `${player.metrics.fortyYardDash.toFixed(2)} s` : `${player.metrics.fortyYardDash.toFixed(2)} s · ${dashToMetersPerSecond(player.metrics.fortyYardDash).toFixed(1)} m/s`}
      />
      <StatMeter compact={compact} label="Agility" score={scores.agility} averageScore={average?.agility} display={String(player.metrics.agility)} />
      <StatMeter
        compact={compact}
        label={compact ? "Hands" : labels.catchProbability.label}
        score={scores.catching}
        averageScore={average?.catching}
        display={formatPercent(player.metrics.catchProbability)}
      />
      <StatMeter
        compact={compact}
        label={compact ? "Flag pull" : labels.flagPullEfficiency.label}
        score={scores.flagPull}
        averageScore={average?.flagPull}
        display={formatPercent(player.metrics.flagPullEfficiency)}
      />
    </div>
  );
};
