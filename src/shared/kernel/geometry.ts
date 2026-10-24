/**
 * Field coordinate system (yards):
 *   x: lateral, 0 (left sideline) .. FIELD_WIDTH_YD (right sideline)
 *   y: downfield, 0 (midfield) .. 50 (goal line) .. 60 (back of end zone)
 */
export type Vec2 = { x: number; y: number };

const EPSILON = 1e-9;

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, factor: number): Vec2 => ({
  x: a.x * factor,
  y: a.y * factor,
});
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const normalize = (a: Vec2): Vec2 => {
  const magnitude = length(a);
  if (magnitude < EPSILON) return { x: 0, y: 0 };
  return { x: a.x / magnitude, y: a.y / magnitude };
};

/** Move `current` toward `target` by at most `maxDelta` (vector-wise). */
export const moveToward = (
  current: Vec2,
  target: Vec2,
  maxDelta: number,
): Vec2 => {
  const delta = sub(target, current);
  const magnitude = length(delta);
  if (magnitude <= maxDelta) return { ...target };
  return add(current, scale(delta, maxDelta / magnitude));
};

export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;

/** Unsigned angle in degrees (0-180) between two vectors. */
export const angleBetweenDeg = (a: Vec2, b: Vec2): number => {
  const magnitudes = length(a) * length(b);
  if (magnitudes < EPSILON) return 0;
  return radToDeg(Math.acos(clamp(dot(a, b) / magnitudes, -1, 1)));
};

// ---------- Polyline paths ----------

export type Path = {
  points: Vec2[];
  /** cumulative[i] = arc length from points[0] to points[i]. */
  cumulative: number[];
  totalLength: number;
};

export const buildPath = (points: Vec2[]): Path => {
  const cumulative: number[] = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + distance(points[index - 1], points[index]),
    );
  }
  return {
    points,
    cumulative,
    totalLength: cumulative[cumulative.length - 1] ?? 0,
  };
};

/** Index of the segment containing `arcDistance` (clamped to the path). */
const findSegmentIndex = (path: Path, arcDistance: number): number => {
  const lastSegment = Math.max(0, path.points.length - 2);
  for (let index = 0; index <= lastSegment; index += 1) {
    if (arcDistance <= path.cumulative[index + 1]) return index;
  }
  return lastSegment;
};

export const pointAtDistance = (path: Path, arcDistance: number): Vec2 => {
  if (path.points.length === 0) return { x: 0, y: 0 };
  if (path.points.length === 1 || arcDistance <= 0)
    return { ...path.points[0] };
  if (arcDistance >= path.totalLength)
    return { ...path.points[path.points.length - 1] };

  const index = findSegmentIndex(path, arcDistance);
  const segmentLength = path.cumulative[index + 1] - path.cumulative[index];
  if (segmentLength < EPSILON) return { ...path.points[index] };
  const t = (arcDistance - path.cumulative[index]) / segmentLength;
  return {
    x: lerp(path.points[index].x, path.points[index + 1].x, t),
    y: lerp(path.points[index].y, path.points[index + 1].y, t),
  };
};

/** Unit direction of travel at `arcDistance`. */
export const directionAtDistance = (path: Path, arcDistance: number): Vec2 => {
  if (path.points.length < 2) return { x: 0, y: 0 };
  const index = findSegmentIndex(path, arcDistance);
  return normalize(sub(path.points[index + 1], path.points[index]));
};

/** Turn angle in degrees (0 = straight on, 180 = full reversal) at an interior vertex. */
export const turnAngleDeg = (
  previous: Vec2,
  current: Vec2,
  next: Vec2,
): number => angleBetweenDeg(sub(current, previous), sub(next, current));

// ---------- Pursuit ----------

/**
 * Smallest positive time `tau` at which a pursuer moving at `pursuerSpeed` from
 * `pursuerPos` can meet a target moving at constant velocity, i.e. solves
 * |targetPos + targetVel * tau - pursuerPos| = pursuerSpeed * tau.
 * Returns null when the target cannot be caught.
 */
export const solveInterceptTime = (
  pursuerPos: Vec2,
  pursuerSpeed: number,
  targetPos: Vec2,
  targetVel: Vec2,
): number | null => {
  const offset = sub(targetPos, pursuerPos);
  const a = dot(targetVel, targetVel) - pursuerSpeed * pursuerSpeed;
  const b = 2 * dot(offset, targetVel);
  const c = dot(offset, offset);

  if (c < EPSILON) return 0;

  if (Math.abs(a) < EPSILON) {
    if (b >= 0) return null;
    return -c / b;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((time) => time > 0)
    .sort((first, second) => first - second);
  return candidates[0] ?? null;
};
