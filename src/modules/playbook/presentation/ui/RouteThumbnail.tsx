import type { Route } from "../../domain/route";

type RouteThumbnailProps = {
  route: Route;
  className?: string;
};

/** Fixed window so every thumbnail is drawn at the same scale: x in [-9, 11] yd, y in [-3, 29] yd. */
const X_MIN = -9;
const X_MAX = 11;
const Y_MIN = -3;
const Y_MAX = 29;
const YARD_LINES = [5, 10, 15, 20, 25];

const ARROW_LENGTH = 1.7;

/** Top-down thumbnail of a route (downfield is up, inside is right). Uses the same shapes as the field. */
export const RouteThumbnail = ({ route, className }: RouteThumbnailProps) => {
  const toX = (x: number): number => x - X_MIN;
  const toY = (y: number): number => Y_MAX - y;
  const points = route.waypoints.map((waypoint) => [toX(waypoint.x), toY(waypoint.y)] as const);
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const angle = Math.atan2(last[1] - previous[1], last[0] - previous[0]);
  const arrowPoints = [
    [last[0], last[1]],
    [last[0] - Math.cos(angle - 0.45) * ARROW_LENGTH, last[1] - Math.sin(angle - 0.45) * ARROW_LENGTH],
    [last[0] - Math.cos(angle + 0.45) * ARROW_LENGTH, last[1] - Math.sin(angle + 0.45) * ARROW_LENGTH],
  ]
    .map((point) => point.join(","))
    .join(" ");
  const bodyEnd = [last[0] - Math.cos(angle) * ARROW_LENGTH * 0.6, last[1] - Math.sin(angle) * ARROW_LENGTH * 0.6];
  const body = [...points.slice(0, -1), bodyEnd].map((point) => point.join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${X_MAX - X_MIN} ${Y_MAX - Y_MIN}`}
      role="img"
      aria-label={`${route.name} route diagram: ${route.waypoints.length - 1} segments, ${route.waypoints.filter((waypoint) => waypoint.cut).length} cuts`}
      className={className}
    >
      <rect width={X_MAX - X_MIN} height={Y_MAX - Y_MIN} className="fill-turf" />
      {YARD_LINES.map((yard) => (
        <line key={yard} x1="0" x2={X_MAX - X_MIN} y1={toY(yard)} y2={toY(yard)} stroke="white" strokeOpacity="0.28" strokeWidth="0.12" />
      ))}
      <line x1="0" x2={X_MAX - X_MIN} y1={toY(0)} y2={toY(0)} className="stroke-team-offense" strokeWidth="0.3" />
      <polyline points={body} fill="none" stroke="white" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={arrowPoints} fill="white" />
      {route.waypoints.map((waypoint, index) =>
        waypoint.cut ? (
          <g key={index} transform={`translate(${toX(waypoint.x)} ${toY(waypoint.y)}) rotate(45)`}>
            <rect x="-0.7" y="-0.7" width="1.4" height="1.4" className="fill-warning" stroke="#1a0808" strokeWidth="0.15" />
          </g>
        ) : null,
      )}
      <circle cx={toX(0)} cy={toY(0)} r="0.95" className="fill-pos-wr" stroke="white" strokeWidth="0.25" />
    </svg>
  );
};
