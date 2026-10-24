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

/**
 * Player aggregate root. Several players may share a jersey number.
 * A player can play several positions: `position` is the main one (it drives labels, stats and the
 * default role) and `altPositions` lists the others, never repeating the main position.
 */
export type PlayerProfile = {
  id: string;
  name: string;
  position: Position;
  altPositions: Position[];
  jerseyNumber: number;
  metrics: PlayerMetrics;
  stats: PlayerStats;
};

export type PlayerInput = Omit<PlayerProfile, "id">;

type PositionHolder = Pick<PlayerProfile, "position" | "altPositions">;

/** Every position the player can play, main position first. */
export const getPlayablePositions = ({ position, altPositions }: PositionHolder): Position[] => [position, ...altPositions];

export const canPlayPosition = (player: PositionHolder, position: Position): boolean =>
  getPlayablePositions(player).includes(position);

/** Drops duplicates and the main position from a list of alternative positions. */
export const normalizeAltPositions = (position: Position, altPositions: Position[]): Position[] =>
  POSITIONS.filter((candidate) => candidate !== position && altPositions.includes(candidate));
