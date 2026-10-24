export type Position = "QB" | "WR" | "DB" | "RUSHER";

export const POSITIONS: Position[] = ["QB", "WR", "DB", "RUSHER"];

export type PlayerMetrics = {
  /** 40-yard dash time in seconds (lower is faster). */
  fortyYardDash: number;
  /** Agility rating, 0-100. */
  agility: number;
  /** 0-1. WR/RUSHER: catching. QB: throw accuracy. DB: ball skills. */
  catchProbability: number;
  /** 0-1. Chance of pulling a flag when in range. */
  flagPullEfficiency: number;
};

export type PlayerStats = {
  targets: number;
  receptions: number;
  yards: number;
  flagPulls: number;
  interceptions: number;
};

/** Player aggregate root. The jersey number is unique across the roster. */
export type PlayerProfile = {
  id: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  metrics: PlayerMetrics;
  stats: PlayerStats;
};

export type PlayerInput = Omit<PlayerProfile, "id">;
