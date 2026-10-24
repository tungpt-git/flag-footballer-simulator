import type { SimEntity } from "../../domain/types";
import { type Vec2, distance, normalize, sub } from "@/shared/kernel/geometry";
import { POSITION_THEME, getShapeVertices, type PositionShape } from "@/shared/ui/positionTheme";
import { type SimulationState, ENTITY_IDS } from "../../domain/simulation";
import { CANVAS_COLORS, getCanvasFonts } from "./colors";
import { ENTITY_POSITION, getEntityColor } from "./entityStyle";
import { drawLabel } from "./drawRoutes";
import type { FieldTransform } from "./fieldMetrics";

export type TrailMap = Map<string, Vec2[]>;

/** Interaction state read straight from the stage UI store each frame (no React re-render). */
export type PlayerDrawOptions = {
  selectedId: string | null;
  hoveredId: string | null;
  reducedMotion: boolean;
};

const DOT_RADIUS_YD = 1.0;
const MIN_DOT_RADIUS_PX = 11;
const PURSUIT_HALF_ANGLE_RAD = 0.28;
const CLOSE_DISTANCE_YD = 2.5;
const MOVING_SPEED_YPS = 0.4;
const SPOTLIGHT_PADDING_PX = 22;

const getDotRadiusPx = (transform: FieldTransform): number =>
  Math.max(MIN_DOT_RADIUS_PX, transform.yardsToPixels(DOT_RADIUS_YD));

/** Traces a position silhouette (circle, diamond, square, hexagon) centered on `center`. */
const traceShape = (ctx: CanvasRenderingContext2D, shape: PositionShape, center: Vec2, radius: number): void => {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    return;
  }
  if (shape === "square") {
    ctx.roundRect(center.x - radius * 0.95, center.y - radius * 0.95, radius * 1.9, radius * 1.9, radius * 0.28);
    return;
  }
  getShapeVertices(shape).forEach(([x, y], index) => {
    const px = center.x + x * radius;
    const py = center.y + y * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
};

const getShapeOf = (entity: SimEntity): PositionShape => POSITION_THEME[ENTITY_POSITION[entity.role]].shape;

const speedOf = (entity: SimEntity): number => Math.hypot(entity.vel.x, entity.vel.y);

/** Records recent positions so moving dots leave a fading trail. */
export const updateTrails = (trails: TrailMap, entities: SimEntity[], maxPoints: number): void => {
  entities.forEach((entity) => {
    const trail = trails.get(entity.id) ?? [];
    const last = trail[trail.length - 1];
    if (!last || distance(last, entity.pos) > 0.15) trail.push({ ...entity.pos });
    if (trail.length > maxPoints) trail.shift();
    trails.set(entity.id, trail);
  });
};

/** Tapered speed trail: thin and faint at the tail, wide and bright at the dot. */
const drawTrail = (ctx: CanvasRenderingContext2D, transform: FieldTransform, trail: Vec2[], color: string): void => {
  if (trail.length < 2) return;
  const maxWidth = getDotRadiusPx(transform) * 0.9;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (let index = 1; index < trail.length; index += 1) {
    const from = transform.toCanvas(trail[index - 1]);
    const to = transform.toCanvas(trail[index]);
    const ratio = index / trail.length;
    ctx.globalAlpha = ratio * 0.5;
    ctx.lineWidth = Math.max(1.5, maxWidth * ratio);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawSelectionRing = (ctx: CanvasRenderingContext2D, center: Vec2, radius: number, kind: "selected" | "hovered"): void => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius + (kind === "selected" ? 6 : 4), 0, Math.PI * 2);
  ctx.lineWidth = kind === "selected" ? 2.5 : 1.5;
  ctx.strokeStyle = CANVAS_COLORS.selection;
  ctx.globalAlpha = kind === "selected" ? 1 : 0.7;
  if (kind === "selected") {
    ctx.shadowColor = CANVAS_COLORS.selection;
    ctx.shadowBlur = 10;
  }
  ctx.stroke();
  ctx.restore();
};

const drawDot = (ctx: CanvasRenderingContext2D, transform: FieldTransform, entity: SimEntity, options: PlayerDrawOptions): void => {
  const center = transform.toCanvas(entity.pos);
  const radius = getDotRadiusPx(transform);
  const color = getEntityColor(entity.role);
  const shape = getShapeOf(entity);
  const isDefense = entity.role === "DEFENDER" || entity.role === "RUSHER";
  const isSecondary = entity.role === "OUTLET";

  // Ground shadow.
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(center.x + 1, center.y + radius * 0.85, radius * 0.95, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (entity.id === options.selectedId) drawSelectionRing(ctx, center, radius, "selected");
  else if (entity.id === options.hoveredId) drawSelectionRing(ctx, center, radius, "hovered");

  ctx.save();
  if (isSecondary) ctx.globalAlpha = 0.88;
  traceShape(ctx, shape, center, radius);
  ctx.fillStyle = color;
  ctx.fill();

  // Offense: white outline. Defense: dark outline inside a thin white one, so teams differ beyond hue and shape.
  ctx.lineWidth = isDefense ? 3 : 2;
  ctx.strokeStyle = isDefense ? CANVAS_COLORS.defenseRing : CANVAS_COLORS.offenseRing;
  if (isSecondary) ctx.setLineDash([4, 3]);
  ctx.stroke();
  if (isDefense) {
    traceShape(ctx, shape, center, radius + 1.5);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = CANVAS_COLORS.ink;
  ctx.font = `700 ${Math.round(radius * (entity.label.length > 2 ? 0.8 : 0.95))}px ${getCanvasFonts().mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(entity.label, center.x, center.y + 0.5);
};

/** Chip under the selected dot with its role and live speed. */
const drawSelectedChip = (ctx: CanvasRenderingContext2D, transform: FieldTransform, entity: SimEntity): void => {
  const center = transform.toCanvas(entity.pos);
  const radius = getDotRadiusPx(transform);
  const text = `${entity.role === "OUTLET" ? "CD" : ENTITY_POSITION[entity.role]} · ${speedOf(entity).toFixed(1)} yd/s`;
  drawLabel(ctx, text, center.x - 38, center.y + radius + 18);
};

/** Pursuit: translucent cone from each defender toward its target, a dashed line and a live distance chip. */
const drawPursuit = (ctx: CanvasRenderingContext2D, transform: FieldTransform, state: SimulationState): void => {
  if (state.phase === "PRE_SNAP" || state.phase === "FINISHED") return;

  state.entities
    .filter((entity) => (entity.role === "DEFENDER" || entity.role === "RUSHER") && entity.targetId)
    .forEach((defender) => {
      const target = state.entities.find((candidate) => candidate.id === defender.targetId);
      if (!target) return;

      const gapYd = distance(defender.pos, target.pos);
      const isClose = gapYd < CLOSE_DISTANCE_YD;
      const color = isClose ? CANVAS_COLORS.pursuitDanger : CANVAS_COLORS.pursuit;
      const from = transform.toCanvas(defender.pos);
      const to = transform.toCanvas(target.pos);
      const direction = normalize(sub(to, from));
      const lengthPx = Math.hypot(to.x - from.x, to.y - from.y);
      const rotate = (angle: number): Vec2 => ({
        x: direction.x * Math.cos(angle) - direction.y * Math.sin(angle),
        y: direction.x * Math.sin(angle) + direction.y * Math.cos(angle),
      });
      const left = rotate(PURSUIT_HALF_ANGLE_RAD);
      const right = rotate(-PURSUIT_HALF_ANGLE_RAD);

      ctx.save();
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, isClose ? "rgba(255,77,77,0.42)" : "rgba(255,107,61,0.34)");
      gradient.addColorStop(1, "rgba(255,107,61,0.04)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(from.x + left.x * lengthPx * 1.05, from.y + left.y * lengthPx * 1.05);
      ctx.lineTo(from.x + right.x * lengthPx * 1.05, from.y + right.y * lengthPx * 1.05);
      ctx.closePath();
      ctx.fill();

      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();

      const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      drawLabel(ctx, `${gapYd.toFixed(1)} yd`, midpoint.x + 10, midpoint.y, color);
    });
};

const drawBall = (ctx: CanvasRenderingContext2D, transform: FieldTransform, state: SimulationState): void => {
  const { ball } = state;
  if (!ball) return;

  const from = transform.toCanvas(ball.from);
  const to = transform.toCanvas(ball.to);
  const position = transform.toCanvas(ball.pos);

  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = CANVAS_COLORS.throwLine;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Landing target.
  const crossSize = 7;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(to.x - crossSize, to.y - crossSize);
  ctx.lineTo(to.x + crossSize, to.y + crossSize);
  ctx.moveTo(to.x + crossSize, to.y - crossSize);
  ctx.lineTo(to.x - crossSize, to.y + crossSize);
  ctx.stroke();

  // Football.
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const radius = Math.max(7, transform.yardsToPixels(0.6));
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.4, radius, 0, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_COLORS.ball;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = CANVAS_COLORS.white;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-radius * 0.5, 0);
  ctx.lineTo(radius * 0.5, 0);
  ctx.strokeStyle = CANVAS_COLORS.ballLace;
  ctx.stroke();
  ctx.restore();
};

const SPOTLIGHT_IDS: string[] = [ENTITY_IDS.receiver, ENTITY_IDS.outlet, ENTITY_IDS.quarterback, ENTITY_IDS.rusher, ENTITY_IDS.cornerback];

/**
 * Dims the field while the play is paused for a decision, leaving soft spotlights on the key players.
 * Drawn before routes and players so they stay bright.
 */
export const drawDecisionSpotlight = (
  ctx: CanvasRenderingContext2D,
  transform: FieldTransform,
  state: SimulationState,
  canvasWidthPx: number,
  canvasHeightPx: number,
  options: Pick<PlayerDrawOptions, "reducedMotion">,
  timeMs: number,
): void => {
  if (state.phase !== "PAUSED_FOR_DECISION") return;
  const pulse = options.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(timeMs / 260);
  const radius = getDotRadiusPx(transform) + SPOTLIGHT_PADDING_PX;
  const spotlit = state.entities.filter((entity) => SPOTLIGHT_IDS.includes(entity.id));

  ctx.save();
  ctx.fillStyle = CANVAS_COLORS.dim;
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidthPx, canvasHeightPx);
  spotlit.forEach((entity) => {
    const center = transform.toCanvas(entity.pos);
    ctx.moveTo(center.x + radius, center.y);
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  });
  ctx.fill("evenodd");
  ctx.restore();

  // Pulsing ring on the two throwing targets.
  state.entities
    .filter((entity) => entity.id === ENTITY_IDS.receiver || entity.id === ENTITY_IDS.outlet)
    .forEach((entity) => {
      const center = transform.toCanvas(entity.pos);
      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, getDotRadiusPx(transform) + 9 + pulse * 5, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = CANVAS_COLORS.decisionRing;
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.stroke();
      ctx.restore();
    });
};

/** Trails, pursuit cones with distances, the ball and every player dot. */
export const drawPlayers = (
  ctx: CanvasRenderingContext2D,
  transform: FieldTransform,
  state: SimulationState,
  trails: TrailMap,
  options: PlayerDrawOptions,
): void => {
  state.entities.forEach((entity) => {
    const trail = trails.get(entity.id);
    if (trail && speedOf(entity) > MOVING_SPEED_YPS) drawTrail(ctx, transform, trail, getEntityColor(entity.role));
  });

  drawPursuit(ctx, transform, state);
  state.entities.forEach((entity) => drawDot(ctx, transform, entity, options));
  drawBall(ctx, transform, state);

  const selected = state.entities.find((entity) => entity.id === options.selectedId);
  if (selected) drawSelectedChip(ctx, transform, selected);
};

/** Entity under a canvas point, or null. Used for hover and click selection. */
export const findEntityAt = (transform: FieldTransform, state: SimulationState, point: Vec2): SimEntity | null => {
  const hitRadius = getDotRadiusPx(transform) + 6;
  const hits = state.entities
    .map((entity) => ({ entity, gap: distance(transform.toCanvas(entity.pos), point) }))
    .filter(({ gap }) => gap <= hitRadius)
    .sort((first, second) => first.gap - second.gap);
  return hits[0]?.entity ?? null;
};
