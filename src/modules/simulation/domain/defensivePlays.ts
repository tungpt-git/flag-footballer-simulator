import {
  DEFENDER_REACTION_SEC,
  MAN_COVERAGE_LEAD_FACTOR,
  RUSHER_DELAY_SEC,
  RUSHER_START_DEPTH_YD,
} from "./constants";

export type DefensivePlayId = "MAN_FREE" | "PRESS_MAN" | "ZONE" | "BRACKET" | "BLITZ" | "PREVENT";

/** Where a zone defender waits: over the middle of the field, or shaded toward the receiver's side. */
export type ZoneAnchor = "CENTER" | "RECEIVER_SIDE";

export type CoverageAssignment =
  /** Shadows the receiver, aiming `leadFactor` of the way to where he will be (0 = pure pursuit). */
  | { kind: "MAN"; leadFactor: number }
  /** Holds an anchor, stays `cushionYd` over the top of the receiver, and attacks him inside `engageDistanceYd`. */
  | { kind: "ZONE"; anchor: ZoneAnchor; cushionYd: number; engageDistanceYd: number };

export type DefenderCall = {
  /** Alignment depth past the line of scrimmage, in yards. For zone coverage this is also the zone depth. */
  depthYd: number;
  reactionSec: number;
  coverage: CoverageAssignment;
};

export type RusherCall = {
  startDepthYd: number;
  /** Seconds after the snap before the rusher breaks. */
  delaySec: number;
};

/** One defensive call: how the cornerback, the safety and the rusher line up and play. */
export type DefensivePlay = {
  id: DefensivePlayId;
  name: string;
  blurb: string;
  cornerback: DefenderCall;
  safety: DefenderCall;
  rusher: RusherCall;
};

const STANDARD_RUSH: RusherCall = { startDepthYd: RUSHER_START_DEPTH_YD, delaySec: RUSHER_DELAY_SEC };

export const DEFENSIVE_PLAYS: DefensivePlay[] = [
  {
    id: "MAN_FREE",
    name: "Man Free",
    blurb: "Cornerback covers the receiver man-to-man with a deep safety over the top. The balanced default.",
    cornerback: {
      depthYd: 5,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "MAN", leadFactor: MAN_COVERAGE_LEAD_FACTOR },
    },
    safety: {
      depthYd: 14,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "CENTER", cushionYd: 3, engageDistanceYd: 6 },
    },
    rusher: STANDARD_RUSH,
  },
  {
    id: "PRESS_MAN",
    name: "Press Man",
    blurb: "Cornerback jams the receiver at the line and reacts faster. Strong on quick routes, weaker deep.",
    cornerback: { depthYd: 1.5, reactionSec: 0.12, coverage: { kind: "MAN", leadFactor: 0.7 } },
    safety: {
      depthYd: 16,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "CENTER", cushionYd: 4, engageDistanceYd: 5 },
    },
    rusher: STANDARD_RUSH,
  },
  {
    id: "ZONE",
    name: "Cover 2 Zone",
    blurb: "Cornerback sits in the flat on the receiver's side, safety plays the deep middle. Soft against drags and curls.",
    cornerback: {
      depthYd: 7,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "RECEIVER_SIDE", cushionYd: 1, engageDistanceYd: 5 },
    },
    safety: {
      depthYd: 15,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "CENTER", cushionYd: 3, engageDistanceYd: 6 },
    },
    rusher: STANDARD_RUSH,
  },
  {
    id: "BRACKET",
    name: "Bracket Double Team",
    blurb: "Cornerback underneath and the safety chasing the receiver from the snap. Takes away the target, but gives the rush more time.",
    cornerback: {
      depthYd: 4,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "MAN", leadFactor: MAN_COVERAGE_LEAD_FACTOR },
    },
    safety: {
      depthYd: 10,
      reactionSec: 0.2,
      coverage: { kind: "ZONE", anchor: "RECEIVER_SIDE", cushionYd: 2, engageDistanceYd: 99 },
    },
    rusher: { startDepthYd: RUSHER_START_DEPTH_YD, delaySec: 1.6 },
  },
  {
    id: "BLITZ",
    name: "All-Out Blitz",
    blurb: "Rusher fires right after the snap, with one deep safety behind man coverage. The QB has far less time.",
    cornerback: {
      depthYd: 5,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "MAN", leadFactor: MAN_COVERAGE_LEAD_FACTOR },
    },
    safety: {
      depthYd: 17,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "CENTER", cushionYd: 4, engageDistanceYd: 5 },
    },
    rusher: { startDepthYd: RUSHER_START_DEPTH_YD, delaySec: 0.5 },
  },
  {
    id: "PREVENT",
    name: "Prevent Deep Zone",
    blurb: "Everyone drops deep and the rush is light. Nothing goes over the top, but short routes are wide open.",
    cornerback: {
      depthYd: 12,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "RECEIVER_SIDE", cushionYd: 4, engageDistanceYd: 4 },
    },
    safety: {
      depthYd: 20,
      reactionSec: DEFENDER_REACTION_SEC,
      coverage: { kind: "ZONE", anchor: "CENTER", cushionYd: 4, engageDistanceYd: 4 },
    },
    rusher: { startDepthYd: RUSHER_START_DEPTH_YD, delaySec: 1.8 },
  },
];

export const DEFAULT_DEFENSIVE_PLAY_ID: DefensivePlayId = "MAN_FREE";

export const getDefensivePlay = (id: DefensivePlayId): DefensivePlay => {
  const play = DEFENSIVE_PLAYS.find((candidate) => candidate.id === id);
  if (!play) throw new Error(`Unknown defensive play "${id}"`);
  return play;
};
