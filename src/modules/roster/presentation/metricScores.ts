import type { PlayerProfile } from "../domain/player";

/** Normalised 0-100 scores used for meters and the radar. Presentation-only; nothing is persisted. */
export type MetricScores = {
  speed: number;
  agility: number;
  catching: number;
  flagPull: number;
};

export const METRIC_SCORE_KEYS = ["speed", "agility", "catching", "flagPull"] as const;
export type MetricScoreKey = (typeof METRIC_SCORE_KEYS)[number];

/** 40-yard dash window mapped onto the meter: 4.2 s (elite) = 100, 6.0 s = 0. */
const FASTEST_DASH_SEC = 4.2;
const SLOWEST_DASH_SEC = 6;

const clampScore = (value: number): number => Math.min(100, Math.max(0, value));

export const dashToScore = (fortyYardDash: number): number =>
  clampScore(((SLOWEST_DASH_SEC - fortyYardDash) / (SLOWEST_DASH_SEC - FASTEST_DASH_SEC)) * 100);

export const getMetricScores = (player: PlayerProfile): MetricScores => ({
  speed: dashToScore(player.metrics.fortyYardDash),
  agility: clampScore(player.metrics.agility),
  catching: clampScore(player.metrics.catchProbability * 100),
  flagPull: clampScore(player.metrics.flagPullEfficiency * 100),
});

const EMPTY_SCORES: MetricScores = { speed: 0, agility: 0, catching: 0, flagPull: 0 };

/** Average of every player's scores, or `null` for an empty roster. */
export const getTeamAverageScores = (players: PlayerProfile[]): MetricScores | null => {
  if (players.length === 0) return null;
  const totals = players.map(getMetricScores).reduce<MetricScores>(
    (sum, scores) => ({
      speed: sum.speed + scores.speed,
      agility: sum.agility + scores.agility,
      catching: sum.catching + scores.catching,
      flagPull: sum.flagPull + scores.flagPull,
    }),
    EMPTY_SCORES,
  );
  return {
    speed: totals.speed / players.length,
    agility: totals.agility / players.length,
    catching: totals.catching / players.length,
    flagPull: totals.flagPull / players.length,
  };
};
