import { type Vec2, distance, normalize, sub } from "@/shared/kernel/geometry";
import { CANVAS_COLORS, getCanvasFonts } from "./colors";
import type { FieldTransform } from "./fieldMetrics";

type DrawRouteOptions = {
  color: string;
  lineWidth: number;
  /** Fraction (0-1) of the route already run; drawn solid over the dashed ghost of the full route. */
  progress?: number;
  /** Indices (into `points`) that are cuts, drawn as diamond handles with an angle indicator. */
  cutIndices?: number[];
  /** Cut angles in degrees keyed by point index, drawn next to the marker. */
  cutAngles?: Record<number, number>;
  showWaypoints?: boolean;
};

const drawArrowHead = (ctx: CanvasRenderingContext2D, tip: Vec2, direction: Vec2, sizePx: number, color: string): void => {
  const normal = { x: -direction.y, y: direction.x };
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - direction.x * sizePx + normal.x * sizePx * 0.55, tip.y - direction.y * sizePx + normal.y * sizePx * 0.55);
  ctx.lineTo(tip.x - direction.x * sizePx - normal.x * sizePx * 0.55, tip.y - direction.y * sizePx - normal.y * sizePx * 0.55);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
};

/** Returns the leading part of a polyline covering `fraction` of its length. */
const slicePolyline = (points: Vec2[], fraction: number): Vec2[] => {
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = total * Math.min(1, Math.max(0, fraction));
  const result: Vec2[] = [points[0]];

  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= 0) break;
    const segment = lengths[index];
    const next = points[index + 1];
    if (remaining >= segment) {
      result.push(next);
      remaining -= segment;
      continue;
    }
    const ratio = remaining / segment;
    result.push({ x: points[index].x + (next.x - points[index].x) * ratio, y: points[index].y + (next.y - points[index].y) * ratio });
    break;
  }
  return result;
};

const tracePolyline = (ctx: CanvasRenderingContext2D, points: Vec2[]): void => {
  ctx.beginPath();
  points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
};

/** Small arc at a cut vertex showing the turn between the incoming and outgoing legs. */
const drawCutAngleArc = (ctx: CanvasRenderingContext2D, vertex: Vec2, before: Vec2, after: Vec2, radiusPx: number): void => {
  const toBefore = Math.atan2(before.y - vertex.y, before.x - vertex.x);
  const toAfter = Math.atan2(after.y - vertex.y, after.x - vertex.x);
  let delta = toAfter - toBefore;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = CANVAS_COLORS.cut;
  ctx.beginPath();
  ctx.arc(vertex.x, vertex.y, radiusPx, toBefore, toBefore + delta, delta < 0);
  ctx.stroke();
  ctx.restore();
};

const drawDiamond = (ctx: CanvasRenderingContext2D, center: Vec2, radius: number): void => {
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - radius);
  ctx.lineTo(center.x + radius, center.y);
  ctx.lineTo(center.x, center.y + radius);
  ctx.lineTo(center.x - radius, center.y);
  ctx.closePath();
};

/**
 * Draws a route as a dashed ghost of the full path, a solid highlight of the part already run,
 * waypoint handles, cut-angle indicators and a directional arrowhead.
 */
export const drawRoute = (ctx: CanvasRenderingContext2D, transform: FieldTransform, points: Vec2[], options: DrawRouteOptions): void => {
  if (points.length < 2) return;
  const canvasPoints = points.map(transform.toCanvas);
  const arrowSizePx = Math.max(10, transform.yardsToPixels(1.2));
  const lastPoint = canvasPoints[canvasPoints.length - 1];
  const lastDirection = normalize(sub(lastPoint, canvasPoints[canvasPoints.length - 2]));

  // Stop the line short of the arrow tip so the dash pattern doesn't poke through it.
  const lineEnd = { x: lastPoint.x - lastDirection.x * arrowSizePx * 0.8, y: lastPoint.y - lastDirection.y * arrowSizePx * 0.8 };
  const linePoints = [...canvasPoints.slice(0, -1), lineEnd];

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Ghost preview of the whole route.
  ctx.lineWidth = options.lineWidth;
  ctx.strokeStyle = CANVAS_COLORS.routeGhost;
  ctx.setLineDash([transform.yardsToPixels(0.7), transform.yardsToPixels(0.5)]);
  tracePolyline(ctx, linePoints);
  ctx.stroke();
  ctx.setLineDash([]);
  drawArrowHead(ctx, lastPoint, lastDirection, arrowSizePx, CANVAS_COLORS.routeGhost);

  // Solid, glowing trail of the part already run.
  if (options.progress && options.progress > 0.001) {
    ctx.save();
    ctx.shadowColor = options.color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = options.lineWidth + 1.5;
    ctx.strokeStyle = options.color;
    tracePolyline(ctx, slicePolyline(canvasPoints, options.progress));
    ctx.stroke();
    ctx.restore();
  }

  // Start marker.
  ctx.beginPath();
  ctx.arc(canvasPoints[0].x, canvasPoints[0].y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = options.color;
  ctx.fill();

  if (options.showWaypoints) {
    canvasPoints.slice(1, -1).forEach((point, offset) => {
      const index = offset + 1;
      const isCut = options.cutIndices?.includes(index) ?? false;

      if (isCut) {
        drawCutAngleArc(ctx, point, canvasPoints[index - 1], canvasPoints[index + 1], 16);
        drawDiamond(ctx, point, 7);
        ctx.fillStyle = CANVAS_COLORS.cut;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = CANVAS_COLORS.ink;
        ctx.stroke();

        const angle = options.cutAngles?.[index];
        if (angle !== undefined) drawLabel(ctx, `${angle}°`, point.x + 14, point.y - 14);
        return;
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = CANVAS_COLORS.white;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = CANVAS_COLORS.ink;
      ctx.stroke();
    });
  }
  ctx.restore();
};

/** Dark rounded chip with monospaced text, used for angles, distances and tags on the field. */
export const drawLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, accentColor?: string): void => {
  ctx.save();
  ctx.font = `600 11px ${getCanvasFonts().mono}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const padding = 5;
  const textWidth = ctx.measureText(text).width;
  ctx.fillStyle = CANVAS_COLORS.labelBackground;
  ctx.beginPath();
  ctx.roundRect(x - padding, y - 9, textWidth + padding * 2, 18, 5);
  ctx.fill();
  if (accentColor) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = accentColor;
    ctx.stroke();
  }
  ctx.fillStyle = CANVAS_COLORS.labelText;
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
};
