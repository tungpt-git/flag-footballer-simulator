import type { OffensivePlay, Route, SkillPosition } from "@/modules/playbook";
import { canPlayPosition, type PlayerProfile, type Position } from "@/modules/roster";
import type { Vec2 } from "@/shared/kernel/geometry";
import { DEFAULT_LOS_Y } from "@/shared/kernel/field";
import { DEFAULT_CORNERBACK, DEFAULT_OUTLET, DEFAULT_QUARTERBACK, DEFAULT_RUSHER } from "./constants";
import type { DefensivePlayId } from "./defensivePlays";
import type { PlayCategory, SimulationConfig, SimulationMode, TeamPlaySetup } from "./types";

/** When the quarterback reads a 5-on-5 play, in seconds after the snap. */
export const TEAM_READ_SEC = 2.2;

const SKILL_POSITIONS: SkillPosition[] = ["X", "Y", "Z", "C"];

const toField = (point: Vec2, losY: number): Vec2 => ({ x: point.x, y: losY + point.y });

const pickMany = (players: PlayerProfile[], position: Position, count: number, fallback: PlayerProfile): PlayerProfile[] => {
  const pool = players.filter((player) => canPlayPosition(player, position));
  const source = pool.length > 0 ? pool : [fallback];
  return Array.from({ length: count }, (_, index) => source[index % source.length]);
};

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

export const buildTeamPlaySetup = (
  play: OffensivePlay,
  players: PlayerProfile[],
  losY: number,
  preferredCornerback?: PlayerProfile,
): TeamPlaySetup => {
  const receivers = pickMany(players, "WR", SKILL_POSITIONS.length, DEFAULT_OUTLET);
  const otherBacks = players.filter((player) => player.id !== preferredCornerback?.id);
  const defenders = pickMany(otherBacks, "DB", SKILL_POSITIONS.length, preferredCornerback ?? DEFAULT_CORNERBACK);
  const cornerSlot = Math.max(play.assignments.findIndex((assignment) => assignment.position === "X"), 0);

  return {
    playId: play.id,
    playName: play.name,
    quarterbackPos: toField(play.quarterback, losY),
    runners: play.assignments.map((assignment, index) => ({
      id: assignment.position,
      routeName: assignment.routeName,
      points: assignment.points.map((point) => toField(point, losY)),
      player: receivers[index],
    })),
    defenders: play.assignments.map((assignment, index) => ({
      runnerId: assignment.position,
      player: index === cornerSlot && preferredCornerback ? preferredCornerback : defenders[index],
    })),
  };
};

type TeamSimulationInput = {
  play: OffensivePlay;
  players: PlayerProfile[];
  mode: SimulationMode;
  category: PlayCategory;
  defensivePlayId: DefensivePlayId;
  quarterback: PlayerProfile;
  cornerback: PlayerProfile;
  rusher: PlayerProfile;
  seed: number;
  losY?: number;
};

/** Simulation config for one 5-on-5 call. Roster holes are filled with default players. */
export const buildTeamSimulationConfig = ({
  play,
  players,
  mode,
  category,
  defensivePlayId,
  quarterback,
  cornerback,
  rusher,
  seed,
  losY = DEFAULT_LOS_Y,
}: TeamSimulationInput): SimulationConfig => {
  const teamPlay = buildTeamPlaySetup(play, players, losY, cornerback);
  const primary = teamPlay.runners[0];
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
    quarterback: quarterback ?? DEFAULT_QUARTERBACK,
    cornerback,
    rusher: rusher ?? DEFAULT_RUSHER,
    teamPlay,
  };
};
