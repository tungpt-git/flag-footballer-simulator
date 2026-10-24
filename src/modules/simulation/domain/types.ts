import type { Vec2 } from "@/shared/kernel/geometry";
import type { DecisionTrigger, Route, SkillPosition } from "@/modules/playbook";
import type { PlayerProfile } from "@/modules/roster";
import type { DefensivePlayId } from "./defensivePlays";

export type SimulationMode = "VIEW" | "TACTICAL";

/** How much of the field the canvas shows: a zoomed window around the play, or the whole field. */
export type FieldViewMode = "PLAY" | "FULL";

export type DecisionAction = "PASS_TO_WR" | "PUMP_FAKE_SCRAMBLE" | "CHECKDOWN";

/** Which side of the ball the user coaches. The other side is run by the engine. */
export type PlayCategory = "OFFENSE" | "DEFENSE";

/** The defense's live call when the play pauses (interactive defense). */
export type DefensiveAction = "HOLD_COVERAGE" | "JUMP_ROUTE" | "BLITZ_SAFETY";

/** Any call the user can make at a pause, on either side of the ball. */
export type PlayCall = DecisionAction | DefensiveAction;

export type OutcomeResult =
  | "COMPLETED_PASS"
  | "INTERCEPTED"
  | "FLAG_PULLED"
  | "TURNOVER"
  | "INCOMPLETE"
  | "SCRAMBLE_GAIN";

export type SimulationPhase =
  | "PRE_SNAP"
  | "RUNNING"
  | "PAUSED_FOR_DECISION"
  | "BALL_IN_FLIGHT"
  | "SCRAMBLING"
  | "FINISHED";

export type EntityRole = "RECEIVER" | "QB" | "DEFENDER" | "RUSHER" | "OUTLET";

export type SimEntity = {
  id: string;
  role: EntityRole;
  /** Jersey number (or short label) drawn inside the dot. */
  label: string;
  pos: Vec2;
  vel: Vec2;
  /** Fraction (0-1) of the route completed. Route runners only. */
  routeProgress?: number;
  /** Entity this defender is currently pursuing. */
  targetId?: string;
};

export type PassProbabilities = {
  /** Receiver is open and the throw is on target. */
  open: number;
  complete: number;
  intercept: number;
  incomplete: number;
};

export type PassMetrics = {
  separationYd: number;
  speedDiffYps: number;
  timingScore: number;
  pressure: number;
  throwDistanceYd: number;
};

export type PlayOutcome = {
  result: OutcomeResult;
  yardsGained: number;
  touchdown: boolean;
  reason: string;
  probabilities?: PassProbabilities;
  metrics?: PassMetrics;
};

/** One button on a 5-on-5 pause: a throw to a skill player, or a scramble. */
export type OffenseChoice = {
  id: string;
  label: string;
  description: string;
  /** Receiver to throw to. Null means scramble. */
  targetId: string | null;
};

export type PendingDecision =
  | { dpId: string; category: "OFFENSE"; options: DecisionAction[]; choices?: OffenseChoice[] }
  | { dpId: string; category: "DEFENSE"; options: DefensiveAction[] };

/** One skill player on a 5-on-5 call, already placed on the field. */
export type TeamRunnerSetup = {
  id: SkillPosition;
  routeName: string;
  /** Absolute field points. The first point is the alignment. */
  points: Vec2[];
  player: PlayerProfile;
};

/** The defender lined up over one skill player. */
export type TeamDefenderSetup = {
  runnerId: SkillPosition;
  player: PlayerProfile;
};

/** A full 5-on-5 call: four routes plus the quarterback's spot. The rusher stays on the lineup. */
export type TeamPlaySetup = {
  playId: string;
  playName: string;
  quarterbackPos: Vec2;
  runners: TeamRunnerSetup[];
  defenders: TeamDefenderSetup[];
};

export type BallState = {
  from: Vec2;
  to: Vec2;
  pos: Vec2;
  targetId: string;
};

export type FrameMetrics = {
  /** Distance from the receiver to the nearest defender. */
  separationYd: number;
  /** Angle at the receiver between its velocity and the nearest defender (0 = head-on, 180 = trailing). */
  pursuitAngleDeg: number;
  /** Distance from the rusher to the QB. */
  rusherDistanceYd: number;
};

/** Serializable snapshot of the play at one instant. */
export type SimulationFrame = {
  t: number;
  phase: SimulationPhase;
  entities: SimEntity[];
  ball: BallState | null;
  metrics: FrameMetrics;
  pendingDecision: PendingDecision | null;
  outcome: PlayOutcome | null;
};

export type SimulationLineup = {
  receiver: PlayerProfile;
  quarterback: PlayerProfile;
  cornerback: PlayerProfile;
  rusher: PlayerProfile;
};

/** Everything needed to start one play. */
export type SimulationConfig = SimulationLineup & {
  mode: SimulationMode;
  category: PlayCategory;
  route: Route;
  /** The defensive call the offense is running against. */
  defensivePlayId: DefensivePlayId;
  decisionTrigger: DecisionTrigger;
  /** Line of scrimmage, in field yards. */
  losY: number;
  /** Receiver's starting x position. Ignored when `teamPlay` is set. */
  alignmentX: number;
  seed: number;
  /** When set, the snap is a 5-on-5 call instead of one receiver. */
  teamPlay?: TeamPlaySetup;
};
