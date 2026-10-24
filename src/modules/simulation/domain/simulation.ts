import type {
  BallState,
  DecisionAction,
  EntityRole,
  FrameMetrics,
  PassMetrics,
  PassProbabilities,
  PendingDecision,
  PlayOutcome,
  SimEntity,
  SimulationConfig,
  SimulationFrame,
  SimulationPhase,
} from "./types";
import {
  type DecisionPoint,
  DEFAULT_DECISION_TIME_SEC,
  getInsideDirection,
  resolveRoutePoints,
} from "@/modules/playbook";
import type { PlayerMetrics } from "@/modules/roster";
import { type Vec2, angleBetweenDeg, clamp, distance, lerp, sub } from "@/shared/kernel/geometry";
import {
  BALL_SPEED_YPS,
  DEFAULT_OUTLET,
  DEFAULT_SAFETY,
  DEFENDER_HOLD_DISTANCE_YD,
  DEFENDER_REACTION_SEC,
  END_OF_ROUTE_HOLD_SEC,
  FIXED_STEP_SEC,
  MAN_COVERAGE_LEAD_FACTOR,
  MAX_PLAY_TIME_SEC,
  PULL_ATTEMPT_INTERVAL_SEC,
  PULL_RANGE_YD,
  PUMP_FAKE_SEC,
  QB_DROP_DEPTH_YD,
  RELEASE_TIME_SEC,
  RUSHER_DELAY_SEC,
  RUSHER_START_DEPTH_YD,
  SCRAMBLE_MAX_SEC,
} from "./constants";
import { FIELD_CENTER_X, FIELD_WIDTH_YD, GOAL_LINE_Y } from "@/shared/kernel/field";
import {
  SteeringAttributes,
  computePursuitAim,
  computeZoneAim,
  findNearestEntity,
  steerToward,
} from "./defense";
import {
  RunnerRuntime,
  advanceRunner,
  createRunnerRuntime,
  estimateRouteDurationSec,
  getMaxAccelYps2,
  getTopSpeedYps,
  projectRunner,
  timeToReachArc,
} from "./movement";
import {
  FUMBLE_PROBABILITY,
  computeFlagPullProbability,
  computePassProbabilities,
  computeQbPullProbability,
  computeTimingScore,
  computeYardsAfterCatch,
  rollPassResult,
  roundYards,
} from "./outcome";
import { nextRandom } from "./rng";

export const ENTITY_IDS = {
  receiver: "receiver",
  quarterback: "qb",
  cornerback: "cornerback",
  safety: "safety",
  rusher: "rusher",
  outlet: "outlet",
} as const;

const ALL_DECISIONS: DecisionAction[] = ["PASS_TO_WR", "PUMP_FAKE_SCRAMBLE", "CHECKDOWN"];
const CHECKDOWN_TIMING_SCORE = 0.85;
const PRESSURE_RADIUS_YD = 4;
const BALL_REACTION_SEC = 0.3;
const SAFETY_DEPTH_YD = 14;
const SAFETY_CUSHION_YD = 3;
const SAFETY_ENGAGE_DISTANCE_YD = 6;
const QB_CHASE_HOLD_YD = 0.5;
const BALL_SPOT_HOLD_YD = 0.3;
const SIDELINE_MARGIN_YD = 0.5;
const SIDELINE_TURN_ZONE_YD = 4;
const SCRAMBLE_LATERAL_YD = 3;
const SCRAMBLE_FORWARD_YD = 5;

// ---------- State ----------

export type EntityAttributes = SteeringAttributes & {
  agility: number;
  flagPullEfficiency: number;
  catchProbability: number;
};

type FlightState = {
  startSec: number;
  endSec: number;
  targetId: string;
  throwSec: number;
  rusherDistanceAtThrow: number;
};

type ScrambleState = {
  startSec: number;
  fakeUntilSec: number;
  /** +1 runs toward +x, -1 toward -x. */
  direction: 1 | -1;
};

export type SimulationState = {
  config: SimulationConfig;
  t: number;
  phase: SimulationPhase;
  entities: SimEntity[];
  ball: BallState | null;
  pendingDecision: PendingDecision | null;
  outcome: PlayOutcome | null;

  // Engine internals
  attributes: Record<string, EntityAttributes>;
  runners: Record<string, RunnerRuntime>;
  decisionPoint: DecisionPoint;
  breakTimeSec: number;
  routeEndSec: number;
  rngState: number;
  flight: FlightState | null;
  scramble: ScrambleState | null;
  lastPullAttemptSec: Record<string, number>;
};

export type PassPreview = {
  probabilities: PassProbabilities;
  metrics: PassMetrics;
  /** Yards past the line of scrimmage at the intended catch point. */
  targetDepthYd: number;
};

// ---------- Helpers ----------

const buildAttributes = (metrics: PlayerMetrics): EntityAttributes => ({
  topSpeedYps: getTopSpeedYps(metrics),
  maxAccelYps2: getMaxAccelYps2(metrics.agility),
  agility: metrics.agility,
  flagPullEfficiency: metrics.flagPullEfficiency,
  catchProbability: metrics.catchProbability,
});

const buildEntity = (id: string, role: EntityRole, label: number, pos: Vec2): SimEntity => ({
  id,
  role,
  label: String(label),
  pos,
  vel: { x: 0, y: 0 },
  ...(role === "RECEIVER" || role === "OUTLET" ? { routeProgress: 0 } : {}),
});

const getEntity = (state: SimulationState, id: string): SimEntity => {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (!entity) throw new Error(`Entity "${id}" not found in simulation`);
  return entity;
};

const findEntity = (state: SimulationState, id: string): SimEntity | undefined =>
  state.entities.find((candidate) => candidate.id === id);

const getDefenders = (state: SimulationState): SimEntity[] =>
  state.entities.filter((entity) => entity.role === "DEFENDER");

const draw = (state: SimulationState): number => {
  const result = nextRandom(state.rngState);
  state.rngState = result.state;
  return result.value;
};

export const selectDecisionPoint = (
  config: Pick<SimulationConfig, "route" | "decisionTrigger">,
): DecisionPoint => {
  const match = config.route.decisionPoints.find((point) => point.trigger === config.decisionTrigger);
  if (match) return match;
  const timePoint = config.route.decisionPoints.find((point) => point.trigger === "AT_TIME");
  return timePoint ?? { id: "dp_time_fallback", trigger: "AT_TIME", timeSec: DEFAULT_DECISION_TIME_SEC };
};

const isActivePhase = (phase: SimulationPhase): boolean =>
  phase === "PRE_SNAP" || phase === "RUNNING" || phase === "BALL_IN_FLIGHT" || phase === "SCRAMBLING";

const cloneState = (state: SimulationState): SimulationState => ({
  ...state,
  entities: state.entities.map((entity) => ({ ...entity })),
  ball: state.ball ? { ...state.ball } : null,
  pendingDecision: state.pendingDecision
    ? { ...state.pendingDecision, options: [...state.pendingDecision.options] }
    : null,
  flight: state.flight ? { ...state.flight } : null,
  scramble: state.scramble ? { ...state.scramble } : null,
  lastPullAttemptSec: { ...state.lastPullAttemptSec },
});

// ---------- Creation ----------

export const createSimulation = (config: SimulationConfig): SimulationState => {
  const { losY, alignmentX } = config;
  const inside = getInsideDirection(alignmentX);

  const routePoints = resolveRoutePoints(config.route.waypoints, alignmentX, losY);
  const receiverRuntime = createRunnerRuntime(routePoints, config.receiver.metrics);

  const quarterbackPos = { x: FIELD_CENTER_X, y: losY - QB_DROP_DEPTH_YD };
  const entities: SimEntity[] = [
    buildEntity(ENTITY_IDS.safety, "DEFENDER", DEFAULT_SAFETY.jerseyNumber, {
      x: FIELD_CENTER_X,
      y: losY + SAFETY_DEPTH_YD,
    }),
    buildEntity(ENTITY_IDS.cornerback, "DEFENDER", config.cornerback.jerseyNumber, {
      x: clamp(routePoints[0].x + inside * 0.8, 0.5, FIELD_WIDTH_YD - 0.5),
      y: losY + 5,
    }),
    buildEntity(ENTITY_IDS.rusher, "RUSHER", config.rusher.jerseyNumber, {
      x: FIELD_CENTER_X,
      y: losY + RUSHER_START_DEPTH_YD,
    }),
    buildEntity(ENTITY_IDS.quarterback, "QB", config.quarterback.jerseyNumber, quarterbackPos),
    buildEntity(ENTITY_IDS.receiver, "RECEIVER", config.receiver.jerseyNumber, { ...routePoints[0] }),
  ];

  const attributes: Record<string, EntityAttributes> = {
    [ENTITY_IDS.receiver]: buildAttributes(config.receiver.metrics),
    [ENTITY_IDS.quarterback]: buildAttributes(config.quarterback.metrics),
    [ENTITY_IDS.cornerback]: buildAttributes(config.cornerback.metrics),
    [ENTITY_IDS.safety]: buildAttributes(DEFAULT_SAFETY.metrics),
    [ENTITY_IDS.rusher]: buildAttributes(config.rusher.metrics),
  };
  const runners: Record<string, RunnerRuntime> = { [ENTITY_IDS.receiver]: receiverRuntime };

  if (config.mode === "TACTICAL") {
    const outletX = FIELD_CENTER_X + inside * 6;
    const outletPoints: Vec2[] = [
      { x: outletX, y: losY - 1 },
      { x: outletX + inside * 1.5, y: losY + 2.5 },
      { x: outletX + inside * 5, y: losY + 3.5 },
    ];
    entities.push(buildEntity(ENTITY_IDS.outlet, "OUTLET", DEFAULT_OUTLET.jerseyNumber, { ...outletPoints[0] }));
    attributes[ENTITY_IDS.outlet] = buildAttributes(DEFAULT_OUTLET.metrics);
    runners[ENTITY_IDS.outlet] = createRunnerRuntime(outletPoints, DEFAULT_OUTLET.metrics);
  }

  const breakWaypointIndex = config.route.waypoints.findIndex((waypoint) => waypoint.cut);
  const breakArc =
    breakWaypointIndex >= 0
      ? receiverRuntime.path.cumulative[breakWaypointIndex]
      : receiverRuntime.path.totalLength * 0.6;

  return {
    config,
    t: 0,
    phase: "PRE_SNAP",
    entities,
    ball: null,
    pendingDecision: null,
    outcome: null,
    attributes,
    runners,
    decisionPoint: selectDecisionPoint(config),
    breakTimeSec: timeToReachArc(receiverRuntime, breakArc),
    routeEndSec: estimateRouteDurationSec(receiverRuntime),
    rngState: config.seed >>> 0,
    flight: null,
    scramble: null,
    lastPullAttemptSec: {},
  };
};

// ---------- Metrics / frames ----------

export const computeFrameMetrics = (state: SimulationState): FrameMetrics => {
  const receiver = getEntity(state, ENTITY_IDS.receiver);
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const rusher = getEntity(state, ENTITY_IDS.rusher);
  const nearest = findNearestEntity(receiver.pos, getDefenders(state));

  const receiverSpeed = Math.hypot(receiver.vel.x, receiver.vel.y);
  const pursuitAngleDeg =
    nearest && receiverSpeed > 0.01
      ? Math.round(angleBetweenDeg(receiver.vel, sub(nearest.pos, receiver.pos)))
      : 0;

  return {
    separationYd: nearest ? roundYards(distance(receiver.pos, nearest.pos)) : 0,
    pursuitAngleDeg,
    rusherDistanceYd: roundYards(distance(rusher.pos, quarterback.pos)),
  };
};

/** Serializable snapshot of the current play state. */
export const getFrame = (state: SimulationState): SimulationFrame => ({
  t: Math.round(state.t * 1000) / 1000,
  phase: state.phase,
  entities: state.entities.map((entity) => ({ ...entity })),
  ball: state.ball ? { ...state.ball } : null,
  metrics: computeFrameMetrics(state),
  pendingDecision: state.pendingDecision,
  outcome: state.outcome,
});

// ---------- Outcomes ----------

const finishPlay = (state: SimulationState, outcome: PlayOutcome): void => {
  state.phase = "FINISHED";
  state.outcome = outcome;
  state.pendingDecision = null;
  state.flight = null;
};

const tryPullAttempt = (
  state: SimulationState,
  pullerId: string,
  target: SimEntity,
  successProbability: number,
): boolean => {
  const puller = getEntity(state, pullerId);
  if (distance(puller.pos, target.pos) > PULL_RANGE_YD) return false;

  const lastAttempt = state.lastPullAttemptSec[pullerId] ?? Number.NEGATIVE_INFINITY;
  if (state.t - lastAttempt < PULL_ATTEMPT_INTERVAL_SEC) return false;

  state.lastPullAttemptSec[pullerId] = state.t;
  return draw(state) < successProbability;
};

/** Resolves a pulled flag on the QB (sack or scramble stop), with a small fumble chance. */
const finishQuarterbackPulled = (state: SimulationState, reasonPrefix: string): void => {
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const yardsGained = roundYards(quarterback.pos.y - state.config.losY);
  const fumbled = draw(state) < FUMBLE_PROBABILITY;
  finishPlay(
    state,
    fumbled
      ? {
          result: "TURNOVER",
          yardsGained,
          touchdown: false,
          reason: `${reasonPrefix} and the QB fumbled the ball away.`,
        }
      : { result: "FLAG_PULLED", yardsGained, touchdown: false, reason: `${reasonPrefix}.` },
  );
};

const checkQuarterbackPulls = (state: SimulationState, pullerIds: string[], reasonPrefix: string): boolean => {
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const quarterbackAgility = state.attributes[ENTITY_IDS.quarterback].agility;

  const wasPulled = pullerIds.some((pullerId) => {
    if (!findEntity(state, pullerId)) return false;
    const probability = computeQbPullProbability(
      state.attributes[pullerId].flagPullEfficiency,
      quarterbackAgility,
    );
    return tryPullAttempt(state, pullerId, quarterback, probability);
  });
  if (!wasPulled) return false;

  finishQuarterbackPulled(state, reasonPrefix);
  return true;
};

// ---------- Passing ----------

const getRusherDistanceToQuarterback = (state: SimulationState): number =>
  distance(getEntity(state, ENTITY_IDS.rusher).pos, getEntity(state, ENTITY_IDS.quarterback).pos);

const launchPass = (state: SimulationState, targetId: string): void => {
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const target = getEntity(state, targetId);
  const runtime = state.runners[targetId];

  let flightSec = RELEASE_TIME_SEC + distance(quarterback.pos, target.pos) / BALL_SPEED_YPS;
  let landing = projectRunner(target, runtime, state.t, flightSec).pos;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    flightSec = RELEASE_TIME_SEC + distance(quarterback.pos, landing) / BALL_SPEED_YPS;
    landing = projectRunner(target, runtime, state.t, flightSec).pos;
  }

  state.ball = { from: { ...quarterback.pos }, to: landing, pos: { ...quarterback.pos }, targetId };
  state.flight = {
    startSec: state.t,
    endSec: state.t + flightSec,
    targetId,
    throwSec: state.t,
    rusherDistanceAtThrow: getRusherDistanceToQuarterback(state),
  };
  state.pendingDecision = null;
  state.phase = "BALL_IN_FLIGHT";
};

type PassEvaluation = Pick<PassPreview, "probabilities" | "metrics"> & { nearestDefender: SimEntity };

/** Evaluates the pass at the moment the ball arrives (current positions). */
const evaluatePass = (state: SimulationState, flight: FlightState): PassEvaluation => {
  const target = getEntity(state, flight.targetId);
  const nearestDefender = findNearestEntity(target.pos, getDefenders(state)) as SimEntity;
  const defenderAttributes = state.attributes[nearestDefender.id];
  const targetAttributes = state.attributes[target.id];
  const ball = state.ball as BallState;

  const metrics: PassMetrics = {
    separationYd: roundYards(distance(target.pos, nearestDefender.pos)),
    speedDiffYps: Math.round((targetAttributes.topSpeedYps - defenderAttributes.topSpeedYps) * 100) / 100,
    timingScore:
      target.id === ENTITY_IDS.outlet
        ? CHECKDOWN_TIMING_SCORE
        : Math.round(computeTimingScore(flight.throwSec, state.breakTimeSec) * 100) / 100,
    pressure: Math.round(clamp(1 - flight.rusherDistanceAtThrow / PRESSURE_RADIUS_YD, 0, 1) * 100) / 100,
    throwDistanceYd: roundYards(distance(ball.from, ball.to)),
  };

  const probabilities = computePassProbabilities({
    ...metrics,
    qbAccuracy: state.attributes[ENTITY_IDS.quarterback].catchProbability,
    targetCatchProbability: targetAttributes.catchProbability,
    defenderBallSkill: defenderAttributes.catchProbability,
  });

  return { probabilities, metrics, nearestDefender };
};

const describePassContext = (metrics: PassMetrics): string =>
  `Separation ${metrics.separationYd} yd, timing ${Math.round(metrics.timingScore * 100)}%, pressure ${Math.round(metrics.pressure * 100)}%`;

const resolvePass = (state: SimulationState): void => {
  const flight = state.flight as FlightState;
  const target = getEntity(state, flight.targetId);
  const { probabilities, metrics, nearestDefender } = evaluatePass(state, flight);
  const context = describePassContext(metrics);
  const base = { probabilities, metrics, touchdown: false };

  const passRoll = rollPassResult(probabilities, draw(state));

  if (passRoll === "INCOMPLETE") {
    finishPlay(state, { ...base, result: "INCOMPLETE", yardsGained: 0, reason: `Pass fell incomplete. ${context}.` });
    return;
  }
  if (passRoll === "INTERCEPTION") {
    finishPlay(state, {
      ...base,
      result: "INTERCEPTED",
      yardsGained: 0,
      reason: `Defender #${nearestDefender.label} jumped the route and picked it off. ${context}.`,
    });
    return;
  }

  const catchY = target.pos.y;
  const catchYards = roundYards(catchY - state.config.losY);
  if (catchY >= GOAL_LINE_Y) {
    finishPlay(state, {
      ...base,
      result: "COMPLETED_PASS",
      yardsGained: catchYards,
      touchdown: true,
      reason: `Caught in the end zone. ${context}.`,
    });
    return;
  }

  const pullProbability = computeFlagPullProbability(
    state.attributes[nearestDefender.id].flagPullEfficiency,
    metrics.separationYd,
  );
  if (draw(state) < pullProbability) {
    const fumbled = draw(state) < FUMBLE_PROBABILITY;
    finishPlay(state, {
      ...base,
      result: fumbled ? "TURNOVER" : "FLAG_PULLED",
      yardsGained: catchYards,
      reason: fumbled
        ? `Flag pulled by #${nearestDefender.label} right after the catch, and the ball came loose. ${context}.`
        : `Flag pulled by #${nearestDefender.label} right after the catch. ${context}.`,
    });
    return;
  }

  const yardsAfterCatch = computeYardsAfterCatch(metrics.separationYd, metrics.speedDiffYps, draw(state));
  const finalY = catchY + yardsAfterCatch;
  const touchdown = finalY >= GOAL_LINE_Y;
  finishPlay(state, {
    ...base,
    result: "COMPLETED_PASS",
    yardsGained: roundYards(Math.min(finalY, GOAL_LINE_Y) - state.config.losY),
    touchdown,
    reason: `Completed and ran for ${roundYards(yardsAfterCatch)} yd after the catch. ${context}.`,
  });
};

// ---------- Movement ----------

const getDefenderAim = (
  state: SimulationState,
  entity: SimEntity,
): { aim: Vec2; targetId: string; holdYd: number } => {
  const attributes = state.attributes[entity.id];
  const receiver = getEntity(state, ENTITY_IDS.receiver);
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);

  if (entity.role === "RUSHER") {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, quarterback, 1),
      targetId: quarterback.id,
      holdYd: QB_CHASE_HOLD_YD,
    };
  }

  if (state.phase === "BALL_IN_FLIGHT" && state.ball && state.flight) {
    const reactionDone = state.t - state.flight.startSec >= BALL_REACTION_SEC;
    if (reactionDone) return { aim: state.ball.to, targetId: state.ball.targetId, holdYd: BALL_SPOT_HOLD_YD };
  }

  const scramble = state.scramble;
  if (state.phase === "SCRAMBLING" && scramble && state.t >= scramble.fakeUntilSec + DEFENDER_REACTION_SEC) {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, quarterback, 0.8),
      targetId: quarterback.id,
      holdYd: QB_CHASE_HOLD_YD,
    };
  }

  if (entity.id === ENTITY_IDS.cornerback) {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, receiver, MAN_COVERAGE_LEAD_FACTOR),
      targetId: receiver.id,
      holdYd: DEFENDER_HOLD_DISTANCE_YD,
    };
  }

  const zoneAnchor = { x: FIELD_CENTER_X, y: state.config.losY + SAFETY_DEPTH_YD };
  const isReceiverClose = distance(entity.pos, receiver.pos) < SAFETY_ENGAGE_DISTANCE_YD;
  return {
    aim: isReceiverClose
      ? computePursuitAim(entity.pos, attributes.topSpeedYps, receiver, 0.5)
      : computeZoneAim(zoneAnchor, receiver, SAFETY_CUSHION_YD),
    targetId: receiver.id,
    holdYd: DEFENDER_HOLD_DISTANCE_YD,
  };
};

const moveDefender = (state: SimulationState, entity: SimEntity, deltaSec: number): void => {
  const reactionSec = entity.role === "RUSHER" ? RUSHER_DELAY_SEC : DEFENDER_REACTION_SEC;
  if (state.t < reactionSec) return;

  const { aim, targetId, holdYd } = getDefenderAim(state, entity);
  entity.targetId = targetId;
  steerToward(entity, aim, state.attributes[entity.id], deltaSec, holdYd);
};

const getScrambleAim = (state: SimulationState, quarterback: SimEntity, scramble: ScrambleState): Vec2 => {
  const nearSideline =
    (scramble.direction > 0 && quarterback.pos.x > FIELD_WIDTH_YD - SIDELINE_TURN_ZONE_YD) ||
    (scramble.direction < 0 && quarterback.pos.x < SIDELINE_TURN_ZONE_YD);
  if (nearSideline) scramble.direction = scramble.direction > 0 ? -1 : 1;

  return {
    x: quarterback.pos.x + scramble.direction * SCRAMBLE_LATERAL_YD,
    y: quarterback.pos.y + SCRAMBLE_FORWARD_YD,
  };
};

const moveQuarterback = (state: SimulationState, entity: SimEntity, deltaSec: number): void => {
  const scramble = state.scramble;
  if (state.phase !== "SCRAMBLING" || !scramble || state.t < scramble.fakeUntilSec) {
    entity.vel = { x: 0, y: 0 };
    return;
  }
  steerToward(entity, getScrambleAim(state, entity, scramble), state.attributes[entity.id], deltaSec, 0);
};

const moveEntities = (state: SimulationState, deltaSec: number): void => {
  state.entities.forEach((entity) => {
    if (entity.role === "RECEIVER" || entity.role === "OUTLET") {
      advanceRunner(entity, state.runners[entity.id], state.t, deltaSec);
      return;
    }
    if (entity.role === "QB") {
      moveQuarterback(state, entity, deltaSec);
      return;
    }
    moveDefender(state, entity, deltaSec);
  });
};

// ---------- Phase handlers ----------

const hasReachedDecisionPoint = (state: SimulationState): boolean => {
  const point = state.decisionPoint;
  if (point.trigger === "AT_TIME") return state.t >= (point.timeSec ?? DEFAULT_DECISION_TIME_SEC);

  const receiver = getEntity(state, ENTITY_IDS.receiver);
  const runtime = state.runners[ENTITY_IDS.receiver];
  const cutArc = runtime.path.cumulative[point.waypointIndex ?? 0] ?? runtime.path.totalLength;
  return (receiver.routeProgress ?? 0) * runtime.path.totalLength >= cutArc - 1e-6;
};

const handleRunning = (state: SimulationState): void => {
  const isTactical = state.config.mode === "TACTICAL";

  if (isTactical) {
    if (checkQuarterbackPulls(state, [ENTITY_IDS.rusher], "Rusher got home and pulled the QB's flag (sack)")) return;
    if (hasReachedDecisionPoint(state)) {
      state.phase = "PAUSED_FOR_DECISION";
      state.pendingDecision = { dpId: state.decisionPoint.id, options: [...ALL_DECISIONS] };
      return;
    }
  }

  const routeIsDone = state.t >= state.routeEndSec + END_OF_ROUTE_HOLD_SEC;
  if (!isTactical && routeIsDone) {
    state.phase = "FINISHED";
    return;
  }
  if (state.t >= MAX_PLAY_TIME_SEC) {
    state.phase = "FINISHED";
  }
};

const handleBallInFlight = (state: SimulationState): void => {
  const { flight, ball } = state;
  if (!flight || !ball) return;

  const flightProgress = clamp(
    (state.t - flight.startSec - RELEASE_TIME_SEC) / (flight.endSec - flight.startSec - RELEASE_TIME_SEC),
    0,
    1,
  );
  ball.pos = { x: lerp(ball.from.x, ball.to.x, flightProgress), y: lerp(ball.from.y, ball.to.y, flightProgress) };

  if (state.t >= flight.endSec) resolvePass(state);
};

const handleScramble = (state: SimulationState): void => {
  const scramble = state.scramble;
  if (!scramble) return;

  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const pullerIds = [ENTITY_IDS.rusher, ENTITY_IDS.cornerback, ENTITY_IDS.safety];
  if (checkQuarterbackPulls(state, pullerIds, "Flag pulled on the scrambling QB")) return;

  if (quarterback.pos.y >= GOAL_LINE_Y) {
    finishPlay(state, {
      result: "SCRAMBLE_GAIN",
      yardsGained: roundYards(GOAL_LINE_Y - state.config.losY),
      touchdown: true,
      reason: "The QB escaped the rush and scrambled into the end zone.",
    });
    return;
  }

  const isOutOfBounds =
    quarterback.pos.x <= SIDELINE_MARGIN_YD || quarterback.pos.x >= FIELD_WIDTH_YD - SIDELINE_MARGIN_YD;
  if (isOutOfBounds) {
    finishPlay(state, {
      result: "SCRAMBLE_GAIN",
      yardsGained: roundYards(quarterback.pos.y - state.config.losY),
      touchdown: false,
      reason: "The QB escaped the rush and ran out of bounds.",
    });
    return;
  }

  if (state.t - scramble.startSec >= SCRAMBLE_MAX_SEC) {
    finishQuarterbackPulled(state, "The QB was run down after a long scramble");
  }
};

const advanceSubstep = (state: SimulationState, deltaSec: number): void => {
  if (state.phase === "PRE_SNAP") state.phase = "RUNNING";

  moveEntities(state, deltaSec);
  state.t += deltaSec;

  if (state.phase === "RUNNING") handleRunning(state);
  else if (state.phase === "BALL_IN_FLIGHT") handleBallInFlight(state);
  else if (state.phase === "SCRAMBLING") handleScramble(state);
};

// ---------- Public API ----------

/**
 * Advances the simulation by `deltaSec` using fixed internal sub-steps (deterministic for a
 * given seed). Returns a new state; the input is never mutated.
 */
export const stepSimulation = (state: SimulationState, deltaSec: number): SimulationState => {
  if (!isActivePhase(state.phase)) return state;

  const next = cloneState(state);
  let remaining = deltaSec;
  while (remaining > 1e-9 && isActivePhase(next.phase)) {
    const stepSec = Math.min(FIXED_STEP_SEC, remaining);
    advanceSubstep(next, stepSec);
    remaining -= stepSec;
  }
  return next;
};

/** Applies the user's choice while the play is paused at a decision point. */
export const applyDecision = (state: SimulationState, action: DecisionAction): SimulationState => {
  if (state.phase !== "PAUSED_FOR_DECISION") return state;

  const next = cloneState(state);
  next.pendingDecision = null;

  if (action === "PASS_TO_WR") {
    launchPass(next, ENTITY_IDS.receiver);
    return next;
  }
  if (action === "CHECKDOWN") {
    launchPass(next, ENTITY_IDS.outlet);
    return next;
  }

  const quarterback = getEntity(next, ENTITY_IDS.quarterback);
  const rusher = getEntity(next, ENTITY_IDS.rusher);
  next.scramble = {
    startSec: next.t,
    fakeUntilSec: next.t + PUMP_FAKE_SEC,
    // Escape away from the rusher's side.
    direction: quarterback.pos.x >= rusher.pos.x ? 1 : -1,
  };
  next.phase = "SCRAMBLING";
  return next;
};

/**
 * Looks ahead (on a copy) to estimate the odds of a pass or checkdown if thrown right now.
 * Returns null for non-throwing actions.
 */
export const previewDecision = (state: SimulationState, action: DecisionAction): PassPreview | null => {
  if (action === "PUMP_FAKE_SCRAMBLE" || state.phase !== "PAUSED_FOR_DECISION") return null;

  let lookahead = applyDecision(state, action);
  const targetDepthYd = roundYards((lookahead.ball?.to.y ?? state.config.losY) - state.config.losY);
  for (let iteration = 0; iteration < 300 && lookahead.phase === "BALL_IN_FLIGHT"; iteration += 1) {
    lookahead = stepSimulation(lookahead, 1 / 30);
  }

  const { outcome } = lookahead;
  if (!outcome?.probabilities || !outcome.metrics) return null;
  return { probabilities: outcome.probabilities, metrics: outcome.metrics, targetDepthYd };
};

/** Absolute route polyline for rendering the receiver's route. */
export const getReceiverRoutePoints = (state: SimulationState): Vec2[] =>
  state.runners[ENTITY_IDS.receiver].path.points;

export const getOutletRoutePoints = (state: SimulationState): Vec2[] | null =>
  state.runners[ENTITY_IDS.outlet]?.path.points ?? null;
