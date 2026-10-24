import type { OffensivePlay, SkillPosition } from "../../domain/offensivePlays";

type OffensivePlayDiagramProps = {
  play: OffensivePlay;
  className?: string;
};

/** Fixed window so every play is drawn at the same scale. Downfield is up. */
const X_MIN = 0;
const X_MAX = 30;
const Y_MIN = -17;
const Y_MAX = 26;
const YARD_LINES = [5, 10, 15, 20, 25];
const ARROW_LENGTH = 1.35;
const MARKER_RADIUS = 1.05;

const MARKER_INK = "#1a0808";

/** Distinct hues on the turf, always paired with a letter so colour is not the only cue. */
const POSITION_COLOR: Record<SkillPosition | "Q", string> = {
  Q: "#f2b705",
  X: "#ffffff",
  Y: "#e69f00",
  Z: "#56b4e9",
  C: "#f4a3c2",
};

const toX = (x: number): number => x - X_MIN;
const toY = (y: number): number => Y_MAX - y;

const arrowPoints = (fromX: number, fromY: number, tipX: number, tipY: number): string => {
  const angle = Math.atan2(tipY - fromY, tipX - fromX);
  const left = [tipX - Math.cos(angle - 0.45) * ARROW_LENGTH, tipY - Math.sin(angle - 0.45) * ARROW_LENGTH];
  const right = [tipX - Math.cos(angle + 0.45) * ARROW_LENGTH, tipY - Math.sin(angle + 0.45) * ARROW_LENGTH];
  return [[tipX, tipY], left, right].map((spot) => spot.join(",")).join(" ");
};

/** Top-down 5-on-5 diagram. Each skill player keeps one colour and one letter for the whole route. */
export const OffensivePlayDiagram = ({ play, className }: OffensivePlayDiagramProps) => {
  const summary = play.assignments.map((assignment) => `${assignment.position} ${assignment.routeName}`).join(", ");

  return (
    <svg
      viewBox={`0 0 ${X_MAX - X_MIN} ${Y_MAX - Y_MIN}`}
      role="img"
      aria-label={`${play.name}. Quarterback at the snap. ${summary}.`}
      className={className}
    >
      <rect width={X_MAX - X_MIN} height={Y_MAX - Y_MIN} className="fill-turf" />
      {YARD_LINES.map((yard) => (
        <line
          key={yard}
          x1="0"
          x2={X_MAX - X_MIN}
          y1={toY(yard)}
          y2={toY(yard)}
          stroke="white"
          strokeOpacity="0.28"
          strokeWidth="0.12"
        />
      ))}
      <line x1="0" x2={X_MAX - X_MIN} y1={toY(0)} y2={toY(0)} className="stroke-team-offense" strokeWidth="0.28" />

      {play.assignments.map((assignment) => {
        const color = POSITION_COLOR[assignment.position];
        const screen = assignment.points.map((spot) => [toX(spot.x), toY(spot.y)] as const);
        const last = screen[screen.length - 1];
        const previous = screen[screen.length - 2];
        const angle = Math.atan2(last[1] - previous[1], last[0] - previous[0]);
        const bodyEnd = [last[0] - Math.cos(angle) * ARROW_LENGTH * 0.55, last[1] - Math.sin(angle) * ARROW_LENGTH * 0.55];
        const body = [...screen.slice(0, -1), bodyEnd].map((spot) => spot.join(",")).join(" ");
        return (
          <g key={assignment.position}>
            <polyline points={body} fill="none" stroke={color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
            <polygon points={arrowPoints(previous[0], previous[1], last[0], last[1])} fill={color} />
          </g>
        );
      })}

      {play.assignments.map((assignment) => {
        const start = assignment.points[0];
        return (
          <g key={`${assignment.position}-marker`}>
            <circle cx={toX(start.x)} cy={toY(start.y)} r={MARKER_RADIUS} fill={POSITION_COLOR[assignment.position]} stroke={MARKER_INK} strokeWidth="0.18" />
            <text
              x={toX(start.x)}
              y={toY(start.y)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={MARKER_INK}
              fontSize="1.15"
              fontWeight="700"
            >
              {assignment.position}
            </text>
          </g>
        );
      })}

      <circle
        cx={toX(play.quarterback.x)}
        cy={toY(play.quarterback.y)}
        r={MARKER_RADIUS}
        fill={POSITION_COLOR.Q}
        stroke={MARKER_INK}
        strokeWidth="0.18"
      />
      <text
        x={toX(play.quarterback.x)}
        y={toY(play.quarterback.y)}
        textAnchor="middle"
        dominantBaseline="central"
        fill={MARKER_INK}
        fontSize="1.15"
        fontWeight="700"
      >
        Q
      </text>
    </svg>
  );
};
