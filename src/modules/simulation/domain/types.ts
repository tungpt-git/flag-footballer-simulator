import type { Vec2 } from "@/shared/kernel/geometry";
import type { DecisionTrigger, Route } from "@/modules/playbook";
import type { PlayerProfile } from "@/modules/roster";

export type SimulationMode = "VIEW" | "TACTICAL";

/** How much of the field the canvas shows: a zoomed window around the play, or the whole field. */
export type FieldViewMode = "PLAY" | "FULL";

export type DecisionAction = "PASS_TO_WR" | "PUMP_FAKE_SCRAMBLE" | "CHECKDOWN";

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

export type PendingDecision = {
  dpId: string;
  options: DecisionAction[];
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
  route: Route;
  decisionTrigger: DecisionTrigger;
  /** Line of scrimmage, in field yards. */
  losY: number;
  /** Receiver's starting x position. */
  alignmentX: number;
  seed: number;
};
