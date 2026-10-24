import type {
  BallState,
  DecisionAction,
  DefensiveAction,
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
  BLITZ_RUSHER_SPEED_MULTIPLIER,
  DEFAULT_OUTLET,
  DEFAULT_SAFETY,
  DEFENDER_HOLD_DISTANCE_YD,
  DEFENDER_REACTION_SEC,
  END_OF_ROUTE_HOLD_SEC,
  FIXED_STEP_SEC,
  JUMP_ROUTE_INTERCEPT_MULTIPLIER,
  JUMP_ROUTE_OVERCOMMIT_YD,
  JUMP_ROUTE_SPEED_MULTIPLIER,
  MAX_PLAY_TIME_SEC,
  PULL_ATTEMPT_INTERVAL_SEC,
  PULL_RANGE_YD,
  PUMP_FAKE_SEC,
  QB_DROP_DEPTH_YD,
  QB_READ_SEC,
  QB_SCRAMBLE_TRIGGER_YD,
  RELEASE_TIME_SEC,
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
import { type DefenderCall, getDefensivePlay } from "./defensivePlays";
import { nextRandom } from "./rng";
import { TEAM_READ_SEC } from "./teamPlay";

export const ENTITY_IDS = {
  receiver: "receiver",
  quarterback: "qb",
  cornerback: "cornerback",
  safety: "safety",
  rusher: "rusher",
  outlet: "outlet",
} as const;

const ALL_DECISIONS: DecisionAction[] = ["PASS_TO_WR", "PUMP_FAKE_SCRAMBLE", "CHECKDOWN"];
const ALL_DEFENSIVE_ACTIONS: DefensiveAction[] = ["HOLD_COVERAGE", "JUMP_ROUTE", "BLITZ_SAFETY"];
const CHECKDOWN_TIMING_SCORE = 0.85;
const PRESSURE_RADIUS_YD = 4;
const BALL_REACTION_SEC = 0.3;
const QB_CHASE_HOLD_YD = 0.5;
const ZONE_ANCHOR_RECEIVER_SIDE_BLEND = 0.4;
const ZONE_ENGAGE_LEAD_FACTOR = 0.5;
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
  /** Fixed spot each zone defender holds, keyed by entity id. */
  zoneAnchors: Record<string, Vec2>;
  /** Man or zone responsibility for each 5-on-5 coverage defender. Empty for a one-receiver snap. */
  defenderAssignments: Record<string, { runnerId: string; call: DefenderCall }>;
  /** Seconds after the snap until each runner's first cut. */
  breakTimeById: Record<string, number>;
  /** Deepest route and the defender over it. Null on a one-receiver snap. */
  teamFocus: { defenderId: string; runnerId: string } | null;
  /** Skill player the quarterback threw to, when the engine picked the target. */
  offenseTargetId: string | null;
  runners: Record<string, RunnerRuntime>;
  decisionPoint: DecisionPoint;
  breakTimeSec: number;
  routeEndSec: number;
  rngState: number;
  flight: FlightState | null;
  scramble: ScrambleState | null;
  lastPullAttemptSec: Record<string, number>;

  // Interactive defense (the engine plays the offense)
  /** The defense's live call, once the user has made it. */
  defenseCall: DefensiveAction | null;
  /** When the engine-run QB acts on the defense's call, or null when he is not waiting. */
  offenseDecisionAtSec: number | null;
  /** What the engine-run QB chose to do. */
  offenseAction: DecisionAction | null;
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

const buildEntity = (id: string, role: EntityRole, label: string | number, pos: Vec2): SimEntity => ({
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

/** The call for a coverage defender: the cornerback has his own, every other defender plays the safety's. */
const getDefenderCall = (state: SimulationState, entityId: string): DefenderCall => {
  const assignment = state.defenderAssignments[entityId];
  if (assignment) return assignment.call;
  const defense = getDefensivePlay(state.config.defensivePlayId);
  return entityId === ENTITY_IDS.cornerback ? defense.cornerback : defense.safety;
};

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
    ? ({
        ...state.pendingDecision,
        options: [...state.pendingDecision.options],
        ...(state.pendingDecision.category === "OFFENSE" && state.pendingDecision.choices
          ? { choices: state.pendingDecision.choices.map((choice) => ({ ...choice })) }
          : {}),
      } as PendingDecision)
    : null,
  flight: state.flight ? { ...state.flight } : null,
  scramble: state.scramble ? { ...state.scramble } : null,
  lastPullAttemptSec: { ...state.lastPullAttemptSec },
});

// ---------- Creation ----------

const createTeamSimulation = (config: SimulationConfig): SimulationState => {
  const team = config.teamPlay;
  if (!team) throw new Error("Team play is missing");

  const { losY } = config;
  const defense = getDefensivePlay(config.defensivePlayId);
  const coverMan = defense.cornerback.coverage.kind === "MAN";
  const entities: SimEntity[] = [];
  const attributes: Record<string, EntityAttributes> = {};
  const runners: Record<string, RunnerRuntime> = {};
  const zoneAnchors: Record<string, Vec2> = {};
  const defenderAssignments: SimulationState["defenderAssignments"] = {};
  const breakTimeById: Record<string, number> = {};

  team.runners.forEach((runner) => {
    const runtime = createRunnerRuntime(runner.points, runner.player.metrics);
    entities.push(buildEntity(runner.id, "RECEIVER", runner.id, { ...runner.points[0] }));
    attributes[runner.id] = buildAttributes(runner.player.metrics);
    runners[runner.id] = runtime;
    const breakArc = runtime.cuts[0]?.arc ?? runtime.path.totalLength * 0.6;
    breakTimeById[runner.id] = timeToReachArc(runtime, breakArc);
  });

  team.defenders.forEach((defender, index) => {
    const runner = team.runners.find((candidate) => candidate.id === defender.runnerId) ?? team.runners[index];
    const id = `db-${runner.id}`;
    const call = coverMan || index < 2 ? defense.cornerback : defense.safety;
    const alignment = runner.points[0];
    entities.push(
      buildEntity(id, "DEFENDER", runner.id, {
        x: clamp(alignment.x + (index - 1.5) * 1.1, 0.5, FIELD_WIDTH_YD - 0.5),
        y: losY + call.depthYd,
      }),
    );
    attributes[id] = buildAttributes(defender.player.metrics);
    defenderAssignments[id] = { runnerId: runner.id, call };
    if (call.coverage.kind === "ZONE") {
      zoneAnchors[id] = { x: clamp(alignment.x, 0.5, FIELD_WIDTH_YD - 0.5), y: losY + call.depthYd };
    }
  });

  entities.push(
    buildEntity(ENTITY_IDS.rusher, "RUSHER", config.rusher.jerseyNumber, {
      x: team.quarterbackPos.x,
      y: losY + defense.rusher.startDepthYd,
    }),
    buildEntity(ENTITY_IDS.quarterback, "QB", config.quarterback.jerseyNumber, { ...team.quarterbackPos }),
  );
  attributes[ENTITY_IDS.rusher] = buildAttributes(config.rusher.metrics);
  attributes[ENTITY_IDS.quarterback] = buildAttributes(config.quarterback.metrics);

  const deepest = team.runners.reduce((best, runner) =>
    Math.max(...runner.points.map((point) => point.y)) > Math.max(...best.points.map((point) => point.y)) ? runner : best,
  );
  const routeEndSec = Math.max(...team.runners.map((runner) => estimateRouteDurationSec(runners[runner.id])));

  return {
    config,
    t: 0,
    phase: "PRE_SNAP",
    entities,
    ball: null,
    pendingDecision: null,
    outcome: null,
    attributes,
    zoneAnchors,
    runners,
    defenderAssignments,
    breakTimeById,
    teamFocus: { defenderId: `db-${deepest.id}`, runnerId: deepest.id },
    offenseTargetId: null,
    decisionPoint: { id: "team_read", trigger: "AT_TIME", timeSec: TEAM_READ_SEC },
    breakTimeSec: TEAM_READ_SEC,
    routeEndSec,
    rngState: config.seed >>> 0,
    flight: null,
    scramble: null,
    lastPullAttemptSec: {},
    defenseCall: null,
    offenseDecisionAtSec: null,
    offenseAction: null,
  };
};

export const createSimulation = (config: SimulationConfig): SimulationState => {
  if (config.teamPlay) return createTeamSimulation(config);

  const { losY, alignmentX } = config;
  const inside = getInsideDirection(alignmentX);

  const routePoints = resolveRoutePoints(config.route.waypoints, alignmentX, losY);
  const receiverRuntime = createRunnerRuntime(routePoints, config.receiver.metrics);

  const defense = getDefensivePlay(config.defensivePlayId);
  const quarterbackPos = { x: FIELD_CENTER_X, y: losY - QB_DROP_DEPTH_YD };
  const entities: SimEntity[] = [
    buildEntity(ENTITY_IDS.safety, "DEFENDER", DEFAULT_SAFETY.jerseyNumber, {
      x: FIELD_CENTER_X,
      y: losY + defense.safety.depthYd,
    }),
    buildEntity(ENTITY_IDS.cornerback, "DEFENDER", config.cornerback.jerseyNumber, {
      x: clamp(routePoints[0].x + inside * 0.8, 0.5, FIELD_WIDTH_YD - 0.5),
      y: losY + defense.cornerback.depthYd,
    }),
    buildEntity(ENTITY_IDS.rusher, "RUSHER", config.rusher.jerseyNumber, {
      x: FIELD_CENTER_X,
      y: losY + defense.rusher.startDepthYd,
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

  const zoneAnchors: Record<string, Vec2> = {};
  const defenderCalls: [string, DefenderCall][] = [
    [ENTITY_IDS.cornerback, defense.cornerback],
    [ENTITY_IDS.safety, defense.safety],
  ];
  defenderCalls.forEach(([id, call]) => {
    if (call.coverage.kind !== "ZONE") return;
    zoneAnchors[id] = {
      x:
        call.coverage.anchor === "CENTER"
          ? FIELD_CENTER_X
          : lerp(routePoints[0].x, FIELD_CENTER_X, ZONE_ANCHOR_RECEIVER_SIDE_BLEND),
      y: losY + call.depthYd,
    };
  });

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
  const breakTimeSec = timeToReachArc(receiverRuntime, breakArc);

  return {
    config,
    t: 0,
    phase: "PRE_SNAP",
    entities,
    ball: null,
    pendingDecision: null,
    outcome: null,
    attributes,
    zoneAnchors,
    runners,
    defenderAssignments: {},
    breakTimeById: { [ENTITY_IDS.receiver]: breakTimeSec },
    teamFocus: null,
    offenseTargetId: null,
    decisionPoint: selectDecisionPoint(config),
    breakTimeSec,
    routeEndSec: estimateRouteDurationSec(receiverRuntime),
    rngState: config.seed >>> 0,
    flight: null,
    scramble: null,
    lastPullAttemptSec: {},
    defenseCall: null,
    offenseDecisionAtSec: null,
    offenseAction: null,
  };
};

// ---------- Metrics / frames ----------

const separationFromDefense = (state: SimulationState, entity: SimEntity): number => {
  const nearest = findNearestEntity(entity.pos, getDefenders(state));
  return nearest ? distance(entity.pos, nearest.pos) : 0;
};

/** The receiver the live readout follows: the throw target, otherwise whoever is most open. */
const getTrackedReceiver = (state: SimulationState): SimEntity => {
  if (!state.config.teamPlay) return getEntity(state, ENTITY_IDS.receiver);
  if (state.ball) {
    const target = findEntity(state, state.ball.targetId);
    if (target) return target;
  }
  const runners = state.entities.filter((entity) => entity.role === "RECEIVER");
  return runners.reduce((openest, runner) =>
    separationFromDefense(state, runner) > separationFromDefense(state, openest) ? runner : openest,
  );
};

export const computeFrameMetrics = (state: SimulationState): FrameMetrics => {
  const receiver = getTrackedReceiver(state);
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

/** The defenders who are rushing the QB: the rusher, plus the safety once the defense has sent him. */
const getQuarterbackPullerIds = (state: SimulationState): string[] => {
  if (state.defenseCall !== "BLITZ_SAFETY") return [ENTITY_IDS.rusher];
  const extra = state.teamFocus?.defenderId ?? ENTITY_IDS.safety;
  return [ENTITY_IDS.rusher, extra];
};

/** Distance from the closest pass rusher to the QB. */
const getRusherDistanceToQuarterback = (state: SimulationState): number => {
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  return Math.min(...getQuarterbackPullerIds(state).map((id) => distance(getEntity(state, id).pos, quarterback.pos)));
};

/** True while the cornerback is gambling on the receiver's route and the ball goes to that receiver. */
const isGamblingOnTarget = (state: SimulationState, targetId: string): boolean => {
  if (state.defenseCall !== "JUMP_ROUTE") return false;
  return targetId === (state.teamFocus?.runnerId ?? ENTITY_IDS.receiver);
};

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
        : Math.round(computeTimingScore(flight.throwSec, state.breakTimeById[target.id] ?? state.breakTimeSec) * 100) / 100,
    pressure: Math.round(clamp(1 - flight.rusherDistanceAtThrow / PRESSURE_RADIUS_YD, 0, 1) * 100) / 100,
    throwDistanceYd: roundYards(distance(ball.from, ball.to)),
  };

  const probabilities = computePassProbabilities({
    ...metrics,
    qbAccuracy: state.attributes[ENTITY_IDS.quarterback].catchProbability,
    targetCatchProbability: targetAttributes.catchProbability,
    defenderBallSkill: defenderAttributes.catchProbability,
    interceptMultiplier: isGamblingOnTarget(state, flight.targetId) ? JUMP_ROUTE_INTERCEPT_MULTIPLIER : 1,
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

  const gambleSeparationYd = isGamblingOnTarget(state, flight.targetId) ? JUMP_ROUTE_OVERCOMMIT_YD : 0;
  const afterCatchSeparationYd = metrics.separationYd + gambleSeparationYd;
  const gambleNote = gambleSeparationYd > 0 ? " The cornerback's gamble left him out of position." : "";

  const pullProbability = computeFlagPullProbability(
    state.attributes[nearestDefender.id].flagPullEfficiency,
    afterCatchSeparationYd,
  );
  if (draw(state) < pullProbability) {
    const fumbled = draw(state) < FUMBLE_PROBABILITY;
    finishPlay(state, {
      ...base,
      result: fumbled ? "TURNOVER" : "FLAG_PULLED",
      yardsGained: catchYards,
      reason: fumbled
        ? `Flag pulled by #${nearestDefender.label} right after the catch, and the ball came loose. ${context}.`
        : `Flag pulled by #${nearestDefender.label} right after the catch. ${context}.${gambleNote}`,
    });
    return;
  }

  const yardsAfterCatch = computeYardsAfterCatch(afterCatchSeparationYd, metrics.speedDiffYps, draw(state));
  const finalY = catchY + yardsAfterCatch;
  const touchdown = finalY >= GOAL_LINE_Y;
  finishPlay(state, {
    ...base,
    result: "COMPLETED_PASS",
    yardsGained: roundYards(Math.min(finalY, GOAL_LINE_Y) - state.config.losY),
    touchdown,
    reason: `Completed and ran for ${roundYards(yardsAfterCatch)} yd after the catch. ${context}.${gambleNote}`,
  });
};

// ---------- Movement ----------

const getDefenderAim = (
  state: SimulationState,
  entity: SimEntity,
): { aim: Vec2; targetId: string; holdYd: number } => {
  const attributes = state.attributes[entity.id];
  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const coveredRunner = (): SimEntity =>
    getEntity(state, state.defenderAssignments[entity.id]?.runnerId ?? ENTITY_IDS.receiver);
  const jumpedDefenderId = state.teamFocus?.defenderId ?? ENTITY_IDS.cornerback;
  const blitzerId = state.teamFocus?.defenderId ?? ENTITY_IDS.safety;

  if (entity.role === "RUSHER") {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, quarterback, 1),
      targetId: quarterback.id,
      holdYd: QB_CHASE_HOLD_YD,
    };
  }

  if (state.phase === "BALL_IN_FLIGHT" && state.ball && state.flight) {
    const ballReactionSec = isGamblingOnTarget(state, state.flight.targetId) && entity.id === jumpedDefenderId ? 0 : BALL_REACTION_SEC;
    const reactionDone = state.t - state.flight.startSec >= ballReactionSec;
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

  if (state.defenseCall === "BLITZ_SAFETY" && entity.id === blitzerId) {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, quarterback, 1),
      targetId: quarterback.id,
      holdYd: QB_CHASE_HOLD_YD,
    };
  }

  const { coverage } = getDefenderCall(state, entity.id);
  const receiver = coveredRunner();
  const zoneTarget = state.config.teamPlay
    ? (findNearestEntity(
        entity.pos,
        state.entities.filter((candidate) => candidate.role === "RECEIVER"),
      ) ?? receiver)
    : receiver;
  if (coverage.kind === "MAN") {
    return {
      aim: computePursuitAim(entity.pos, attributes.topSpeedYps, receiver, coverage.leadFactor),
      targetId: receiver.id,
      holdYd: DEFENDER_HOLD_DISTANCE_YD,
    };
  }

  const isReceiverClose = distance(entity.pos, zoneTarget.pos) < coverage.engageDistanceYd;
  return {
    aim: isReceiverClose
      ? computePursuitAim(entity.pos, attributes.topSpeedYps, zoneTarget, ZONE_ENGAGE_LEAD_FACTOR)
      : computeZoneAim(state.zoneAnchors[entity.id], zoneTarget, coverage.cushionYd),
    targetId: zoneTarget.id,
    holdYd: DEFENDER_HOLD_DISTANCE_YD,
  };
};

const moveDefender = (state: SimulationState, entity: SimEntity, deltaSec: number): void => {
  const reactionSec =
    entity.role === "RUSHER"
      ? getDefensivePlay(state.config.defensivePlayId).rusher.delaySec
      : getDefenderCall(state, entity.id).reactionSec;
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

const buildPendingDecision = (state: SimulationState): PendingDecision => {
  if (state.config.category === "DEFENSE") {
    return { dpId: state.decisionPoint.id, category: "DEFENSE", options: [...ALL_DEFENSIVE_ACTIONS] };
  }
  if (state.config.teamPlay) {
    const choices = [
      ...state.config.teamPlay.runners.map((runner) => ({
        id: runner.id,
        label: `Throw to ${runner.id}`,
        description: runner.routeName,
        targetId: runner.id,
      })),
      { id: "SCRAMBLE", label: "Scramble", description: "Escape the rush and run.", targetId: null },
    ];
    return { dpId: state.decisionPoint.id, category: "OFFENSE", options: ["PUMP_FAKE_SCRAMBLE"], choices };
  }
  return { dpId: state.decisionPoint.id, category: "OFFENSE", options: [...ALL_DECISIONS] };
};

const handleRunning = (state: SimulationState): void => {
  const isTactical = state.config.mode === "TACTICAL";

  if (isTactical) {
    if (checkQuarterbackPulls(state, getQuarterbackPullerIds(state), "The rush got home and pulled the QB's flag (sack)")) return;

    if (state.offenseDecisionAtSec !== null) {
      if (state.t >= state.offenseDecisionAtSec) runEngineOffense(state);
      return;
    }
    if (hasReachedDecisionPoint(state)) {
      state.phase = "PAUSED_FOR_DECISION";
      state.pendingDecision = buildPendingDecision(state);
      return;
    }
  }

  if (!isTactical && state.config.teamPlay && hasReachedDecisionPoint(state)) {
    runEngineOffense(state);
    return;
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
  const pullerIds = state.config.teamPlay
    ? state.entities.filter((entity) => entity.role === "RUSHER" || entity.role === "DEFENDER").map((entity) => entity.id)
    : [ENTITY_IDS.rusher, ENTITY_IDS.cornerback, ENTITY_IDS.safety];
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

/** Carries out an offensive call on `state` in place: a throw, a checkdown or a pump fake and scramble. */
const performOffenseDecision = (state: SimulationState, action: DecisionAction, targetId?: string): void => {
  state.pendingDecision = null;

  if (action !== "PUMP_FAKE_SCRAMBLE") {
    const target = targetId ?? (action === "CHECKDOWN" ? ENTITY_IDS.outlet : ENTITY_IDS.receiver);
    state.offenseTargetId = target;
    launchPass(state, target);
    return;
  }
  state.offenseTargetId = null;

  const quarterback = getEntity(state, ENTITY_IDS.quarterback);
  const rusher = getEntity(state, ENTITY_IDS.rusher);
  state.scramble = {
    startSec: state.t,
    fakeUntilSec: state.t + PUMP_FAKE_SEC,
    // Escape away from the rusher's side.
    direction: quarterback.pos.x >= rusher.pos.x ? 1 : -1,
  };
  state.phase = "SCRAMBLING";
};

/** Applies a 5-on-5 pause choice: a throw to one skill player, or a scramble. */
export const applyOffenseChoice = (state: SimulationState, choiceId: string): SimulationState => {
  if (state.phase !== "PAUSED_FOR_DECISION" || state.pendingDecision?.category !== "OFFENSE") return state;
  const choice = state.pendingDecision.choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) return state;

  const next = cloneState(state);
  if (choice.targetId) performOffenseDecision(next, "PASS_TO_WR", choice.targetId);
  else performOffenseDecision(next, "PUMP_FAKE_SCRAMBLE");
  return next;
};

/** Applies the user's choice while the offense is paused at a decision point. */
export const applyDecision = (state: SimulationState, action: DecisionAction): SimulationState => {
  if (state.phase !== "PAUSED_FOR_DECISION" || state.pendingDecision?.category === "DEFENSE") return state;

  const next = cloneState(state);
  performOffenseDecision(next, action);
  return next;
};

/**
 * Plays a throw or checkdown out on a copy of `state` (which may be paused or just running) to read
 * the odds the ball would face. Returns null for the scramble, which has no pass odds.
 */
const previewThrowTo = (state: SimulationState, targetId: string): PassPreview | null => {
  let lookahead = cloneState(state);
  lookahead.phase = "PAUSED_FOR_DECISION";
  lookahead.offenseDecisionAtSec = null;
  performOffenseDecision(lookahead, "PASS_TO_WR", targetId);

  const targetDepthYd = roundYards((lookahead.ball?.to.y ?? state.config.losY) - state.config.losY);
  for (let iteration = 0; iteration < 300 && lookahead.phase === "BALL_IN_FLIGHT"; iteration += 1) {
    lookahead = stepSimulation(lookahead, 1 / 30);
  }

  const { outcome } = lookahead;
  if (!outcome?.probabilities || !outcome.metrics) return null;
  return { probabilities: outcome.probabilities, metrics: outcome.metrics, targetDepthYd };
};

const previewThrow = (state: SimulationState, action: DecisionAction): PassPreview | null => {
  if (action === "PUMP_FAKE_SCRAMBLE") return null;
  const targetId = action === "CHECKDOWN" ? ENTITY_IDS.outlet : ENTITY_IDS.receiver;
  return previewThrowTo(state, targetId);
};

/** Odds of throwing to one skill player right now. */
export const previewReceiverThrow = (state: SimulationState, targetId: string): PassPreview | null =>
  previewThrowTo(state, targetId);

/**
 * Looks ahead (on a copy) to estimate the odds of a pass or checkdown if thrown right now.
 * Returns null for non-throwing actions.
 */
export const previewDecision = (state: SimulationState, action: DecisionAction): PassPreview | null =>
  state.phase === "PAUSED_FOR_DECISION" ? previewThrow(state, action) : null;

/** The engine-run QB: scrambles under heavy pressure, otherwise takes the better of the pass and the checkdown. */
const chooseEngineOffenseAction = (state: SimulationState): DecisionAction => {
  if (getRusherDistanceToQuarterback(state) < QB_SCRAMBLE_TRIGGER_YD) return "PUMP_FAKE_SCRAMBLE";

  const score = (action: DecisionAction): number => {
    const preview = previewThrow(state, action);
    return preview ? preview.probabilities.complete - 2 * preview.probabilities.intercept : Number.NEGATIVE_INFINITY;
  };
  return score("CHECKDOWN") > score("PASS_TO_WR") ? "CHECKDOWN" : "PASS_TO_WR";
};

/** The engine-run QB on a 5-on-5 play. Null means he scrambles instead of throwing. */
const chooseTeamTarget = (state: SimulationState): string | null => {
  if (getRusherDistanceToQuarterback(state) < QB_SCRAMBLE_TRIGGER_YD) return null;

  const runners = state.entities.filter((entity) => entity.role === "RECEIVER");
  let bestId = runners[0]?.id ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;
  runners.forEach((runner) => {
    const preview = previewThrowTo(state, runner.id);
    const score = preview ? preview.probabilities.complete - 2 * preview.probabilities.intercept : Number.NEGATIVE_INFINITY;
    if (score > bestScore) {
      bestScore = score;
      bestId = runner.id;
    }
  });
  return bestId;
};

/** The engine-run QB reads the defense's call and acts on it, in place. */
const runEngineOffense = (state: SimulationState): void => {
  state.offenseDecisionAtSec = null;
  if (state.config.teamPlay) {
    const targetId = chooseTeamTarget(state);
    if (!targetId) {
      state.offenseAction = "PUMP_FAKE_SCRAMBLE";
      performOffenseDecision(state, "PUMP_FAKE_SCRAMBLE");
      return;
    }
    state.offenseAction = "PASS_TO_WR";
    performOffenseDecision(state, "PASS_TO_WR", targetId);
    return;
  }

  const action = chooseEngineOffenseAction(state);
  state.offenseAction = action;
  performOffenseDecision(state, action);
};

const scaleTopSpeed = (
  attributes: Record<string, EntityAttributes>,
  entityId: string,
  multiplier: number,
): Record<string, EntityAttributes> => ({
  ...attributes,
  [entityId]: { ...attributes[entityId], topSpeedYps: attributes[entityId].topSpeedYps * multiplier },
});

const DEFENSIVE_CALL_SPEED_BOOSTS: Partial<Record<DefensiveAction, { entityId: string; multiplier: number }>> = {
  JUMP_ROUTE: { entityId: ENTITY_IDS.cornerback, multiplier: JUMP_ROUTE_SPEED_MULTIPLIER },
  BLITZ_SAFETY: { entityId: ENTITY_IDS.rusher, multiplier: BLITZ_RUSHER_SPEED_MULTIPLIER },
};

/**
 * Applies the user's live defensive call while the defense is paused at a decision point. The play
 * resumes and the engine-run QB acts on the call after a short read.
 */
export const applyDefensiveDecision = (state: SimulationState, action: DefensiveAction): SimulationState => {
  if (state.phase !== "PAUSED_FOR_DECISION" || state.pendingDecision?.category !== "DEFENSE") return state;

  const next = cloneState(state);
  const boost = DEFENSIVE_CALL_SPEED_BOOSTS[action];
  const boostedId = action === "JUMP_ROUTE" && next.teamFocus ? next.teamFocus.defenderId : boost?.entityId;
  next.pendingDecision = null;
  next.defenseCall = action;
  next.attributes = boost && boostedId ? scaleTopSpeed(next.attributes, boostedId, boost.multiplier) : next.attributes;
  next.offenseDecisionAtSec = next.t + QB_READ_SEC;
  next.phase = "RUNNING";
  return next;
};

export type RenderableRoute = { id: string; points: Vec2[]; progress: number };

/** One polyline per skill player on a 5-on-5 snap. Empty for a one-receiver snap. */
export const getRenderableRoutes = (state: SimulationState): RenderableRoute[] => {
  if (!state.config.teamPlay) return [];
  return state.config.teamPlay.runners.map((runner) => ({
    id: runner.id,
    points: state.runners[runner.id]?.path.points ?? runner.points,
    progress: findEntity(state, runner.id)?.routeProgress ?? 0,
  }));
};

/** Absolute route polyline for rendering the receiver's route. */
export const getReceiverRoutePoints = (state: SimulationState): Vec2[] =>
  state.runners[ENTITY_IDS.receiver].path.points;

export const getOutletRoutePoints = (state: SimulationState): Vec2[] | null =>
  state.runners[ENTITY_IDS.outlet]?.path.points ?? null;
