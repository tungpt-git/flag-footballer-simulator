import type { OffensivePlay, Route, SkillPosition } from "@/modules/playbook";
import { canPlayPosition, type PlayerProfile, type Position } from "@/modules/roster";
import type { Vec2 } from "@/shared/kernel/geometry";
import { DEFAULT_LOS_Y } from "@/shared/kernel/field";
import { DEFAULT_CORNERBACK, DEFAULT_OUTLET, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "./constants";
import type { DefensivePlayId } from "./defensivePlays";
import type { PlayCategory, SimulationConfig, SimulationMode, TeamPlaySetup } from "./types";

/** When the quarterback reads a 5-on-5 play, in seconds after the snap. */
export const TEAM_READ_SEC = 2.2;

export const SKILL_POSITIONS: SkillPosition[] = ["X", "Y", "Z", "C"];

/** One roster pick for every body on a 5-on-5 snap. The same lineup runs every play. */
export type TeamSlot =
  | "quarterbackId"
  | "rusherId"
  | "receiverXId"
  | "receiverYId"
  | "receiverZId"
  | "receiverCId"
  | "defenderXId"
  | "defenderYId"
  | "defenderZId"
  | "defenderCId";

export type TeamLineup = Record<TeamSlot, string | null>;

export const EMPTY_TEAM_LINEUP: TeamLineup = {
  quarterbackId: null,
  rusherId: null,
  receiverXId: null,
  receiverYId: null,
  receiverZId: null,
  receiverCId: null,
  defenderXId: null,
  defenderYId: null,
  defenderZId: null,
  defenderCId: null,
};

export const TEAM_SLOTS: TeamSlot[] = [
  "quarterbackId",
  "rusherId",
  "receiverXId",
  "receiverYId",
  "receiverZId",
  "receiverCId",
  "defenderXId",
  "defenderYId",
  "defenderZId",
  "defenderCId",
];

export const RECEIVER_SLOT: Record<SkillPosition, TeamSlot> = {
  X: "receiverXId",
  Y: "receiverYId",
  Z: "receiverZId",
  C: "receiverCId",
};

export const DEFENDER_SLOT: Record<SkillPosition, TeamSlot> = {
  X: "defenderXId",
  Y: "defenderYId",
  Z: "defenderZId",
  C: "defenderCId",
};

export const getTeamSlotPosition = (slot: TeamSlot): Position => SLOT_POSITION[slot];

const isSkillPosition = (value: string): value is SkillPosition => (SKILL_POSITIONS as readonly string[]).includes(value);

/** The lineup spot drawn as this entity, when the snap is a 5-on-5 play. */
export const teamSlotForEntity = (entityId: string): TeamSlot | null => {
  if (entityId === "qb") return "quarterbackId";
  if (entityId === "rusher") return "rusherId";
  if (isSkillPosition(entityId)) return RECEIVER_SLOT[entityId];
  if (!entityId.startsWith("db-")) return null;
  const covered = entityId.slice(3);
  return isSkillPosition(covered) ? DEFENDER_SLOT[covered] : null;
};

export const teamSlotLabel = (slot: TeamSlot, routeName?: string): string => {
  if (slot === "quarterbackId") return "Quarterback";
  if (slot === "rusherId") return "Rusher";
  const receiver = SKILL_POSITIONS.find((position) => RECEIVER_SLOT[position] === slot);
  if (receiver) return routeName ? `${receiver} · ${routeName}` : receiver;
  const covered = SKILL_POSITIONS.find((position) => DEFENDER_SLOT[position] === slot);
  if (covered) return routeName ? `DB on ${covered} · ${routeName}` : `DB on ${covered}`;
  return slot;
};

const SLOT_POSITION: Record<TeamSlot, Position> = {
  quarterbackId: "QB",
  rusherId: "RUSHER",
  receiverXId: "WR",
  receiverYId: "WR",
  receiverZId: "WR",
  receiverCId: "WR",
  defenderXId: "DB",
  defenderYId: "DB",
  defenderZId: "DB",
  defenderCId: "DB",
};

const toField = (point: Vec2, losY: number): Vec2 => ({ x: point.x, y: losY + point.y });

/**
 * Fills empty spots with different eligible players when the roster has enough of them.
 * A spot the user already filled stays as they left it, even if that repeats a player.
 */
export const assignOpenTeamSlots = (players: PlayerProfile[], lineup: TeamLineup): TeamLineup => {
  const next: TeamLineup = { ...lineup };
  const usedByPosition = new Map<Position, Set<string>>();
  const filledByPosition = new Map<Position, number>();

  TEAM_SLOTS.forEach((slot) => {
    const position = SLOT_POSITION[slot];
    const pool = players.filter((player) => canPlayPosition(player, position));
    const used = usedByPosition.get(position) ?? new Set<string>();
    usedByPosition.set(position, used);
    const filled = filledByPosition.get(position) ?? 0;

    const current = lineup[slot];
    const kept = current !== null && pool.some((player) => player.id === current) ? current : null;
    const fresh = pool.find((player) => !used.has(player.id))?.id ?? null;
    const cycled = pool.length > 0 ? pool[filled % pool.length].id : null;
    const pick = kept ?? fresh ?? cycled;

    next[slot] = pick;
    if (pick) used.add(pick);
    filledByPosition.set(position, filled + 1);
  });

  return next;
};

const resolvePlayer = (players: PlayerProfile[], id: string | null, fallback: PlayerProfile): PlayerProfile =>
  players.find((player) => player.id === id) ?? fallback;

/** A route object the rest of the simulator can label. The engine runs `teamPlay.runners` instead. */
const buildLabelRoute = (play: OffensivePlay): Route => ({
  id: play.id,
  name: play.name,
  type: "GO",
  waypoints: [
    { x: 0, y: 0, cut: false },
    { x: 0, y: 12, cut: false },
  ],
  decisionPoints: [{ id: "team_read", trigger: "AT_TIME", timeSec: TEAM_READ_SEC }],
});

export const buildTeamPlaySetup = (play: OffensivePlay, players: PlayerProfile[], lineup: TeamLineup, losY: number): TeamPlaySetup => ({
  playId: play.id,
  playName: play.name,
  quarterbackPos: toField(play.quarterback, losY),
  runners: play.assignments.map((assignment) => ({
    id: assignment.position,
    routeName: assignment.routeName,
    points: assignment.points.map((point) => toField(point, losY)),
    player: resolvePlayer(players, lineup[RECEIVER_SLOT[assignment.position]], DEFAULT_OUTLET),
  })),
  defenders: play.assignments.map((assignment) => ({
    runnerId: assignment.position,
    player: resolvePlayer(players, lineup[DEFENDER_SLOT[assignment.position]], DEFAULT_CORNERBACK),
  })),
});

type TeamSimulationInput = {
  play: OffensivePlay;
  players: PlayerProfile[];
  mode: SimulationMode;
  category: PlayCategory;
  defensivePlayId: DefensivePlayId;
  seed: number;
  /** Who lines up at each spot. Empty spots fall back to the default player for that role. */
  teamLineup?: TeamLineup;
  losY?: number;
};

/** Simulation config for one 5-on-5 call. The lineup is the same one the user set for every play. */
export const buildTeamSimulationConfig = ({
  play,
  players,
  mode,
  category,
  defensivePlayId,
  seed,
  teamLineup = EMPTY_TEAM_LINEUP,
  losY = DEFAULT_LOS_Y,
}: TeamSimulationInput): SimulationConfig => {
  const teamPlay = buildTeamPlaySetup(play, players, teamLineup, losY);
  const primary = teamPlay.runners[0];
  const cornerback = teamPlay.defenders.find((defender) => defender.runnerId === "X")?.player ?? teamPlay.defenders[0]?.player ?? DEFAULT_CORNERBACK;

  return {
    mode,
    category,
    route: buildLabelRoute(play),
    defensivePlayId,
    decisionTrigger: "AT_TIME",
    losY,
    alignmentX: primary.points[0].x,
    seed,
    receiver: primary.player,
    quarterback: resolvePlayer(players, teamLineup.quarterbackId, DEFAULT_QUARTERBACK),
    cornerback,
    rusher: resolvePlayer(players, teamLineup.rusherId, DEFAULT_RUSHER),
    teamPlay,
  };
};
