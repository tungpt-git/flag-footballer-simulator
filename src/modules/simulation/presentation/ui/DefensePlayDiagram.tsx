import type { DefensivePlay } from "../../domain/defensivePlays";

type DefensePlayDiagramProps = {
  play: DefensivePlay;
  className?: string;
};

/** Window around the line of scrimmage (y = 0): x in [-3, 12] yd, y in [-8, 26] yd. Downfield is up, inside is right. */
const X_MIN = -3;
const X_MAX = 12;
const Y_MIN = -8;
const Y_MAX = 26;
const YARD_LINES = [5, 10, 15, 20, 25];
const RECEIVER_X = 0;
const CENTER_X = 6;
const QUARTERBACK_Y = -5;
const CORNERBACK_OFFSET_X = 0.8;
const ZONE_BLEND = 0.5;
const MAX_DRAWN_ZONE_YD = 12;

const toX = (x: number): number => x - X_MIN;
const toY = (y: number): number => Y_MAX - y;

/** Top-down alignment sketch of a defensive play: man ties are dashed lines, zones are dashed rings, the rush is an arrow. */
export const DefensePlayDiagram = ({ play, className }: DefensePlayDiagramProps) => {
  const cornerbackX = RECEIVER_X + CORNERBACK_OFFSET_X;
  const defenders = [
    { id: "cornerback", call: play.cornerback, x: cornerbackX, label: "CB" },
    { id: "safety", call: play.safety, x: CENTER_X, label: "S" },
  ];
  const zoneCenterX = (anchor: "CENTER" | "RECEIVER_SIDE"): number =>
    anchor === "CENTER" ? CENTER_X : RECEIVER_X + (CENTER_X - RECEIVER_X) * ZONE_BLEND;

  return (
    <svg
      viewBox={`0 0 ${X_MAX - X_MIN} ${Y_MAX - Y_MIN}`}
      role="img"
      aria-label={`${play.name} alignment diagram`}
      className={className}
    >
      <rect width={X_MAX - X_MIN} height={Y_MAX - Y_MIN} className="fill-turf" />
      {YARD_LINES.map((yard) => (
        <line key={yard} x1="0" x2={X_MAX - X_MIN} y1={toY(yard)} y2={toY(yard)} stroke="white" strokeOpacity="0.28" strokeWidth="0.12" />
      ))}
      <line x1="0" x2={X_MAX - X_MIN} y1={toY(0)} y2={toY(0)} className="stroke-team-offense" strokeWidth="0.3" />

      {defenders.map(({ id, call, x }) => {
        if (call.coverage.kind === "MAN") {
          return (
            <line
              key={`${id}-coverage`}
              x1={toX(x)}
              y1={toY(call.depthYd)}
              x2={toX(RECEIVER_X)}
              y2={toY(0)}
              stroke="white"
              strokeOpacity="0.8"
              strokeWidth="0.25"
              strokeDasharray="0.7 0.6"
            />
          );
        }
        const radius = Math.min(call.coverage.engageDistanceYd, MAX_DRAWN_ZONE_YD);
        return (
          <ellipse
            key={`${id}-coverage`}
            cx={toX(zoneCenterX(call.coverage.anchor))}
            cy={toY(call.depthYd)}
            rx={radius * 0.75}
            ry={radius * 0.5}
            className="fill-team-defense/25 stroke-team-defense"
            strokeWidth="0.2"
            strokeDasharray="0.7 0.5"
          />
        );
      })}

      <line
        x1={toX(CENTER_X)}
        y1={toY(play.rusher.startDepthYd)}
        x2={toX(CENTER_X)}
        y2={toY(QUARTERBACK_Y + 1.2)}
        className="stroke-pos-rusher"
        strokeWidth="0.45"
        strokeLinecap="round"
      />
      <polygon
        points={`${toX(CENTER_X)},${toY(QUARTERBACK_Y + 0.6)} ${toX(CENTER_X) - 0.6},${toY(QUARTERBACK_Y + 1.8)} ${toX(CENTER_X) + 0.6},${toY(QUARTERBACK_Y + 1.8)}`}
        className="fill-pos-rusher"
      />

      <circle cx={toX(CENTER_X)} cy={toY(QUARTERBACK_Y)} r="0.95" className="fill-pos-qb" stroke="white" strokeWidth="0.25" />
      <circle cx={toX(RECEIVER_X)} cy={toY(0)} r="0.95" className="fill-pos-wr" stroke="white" strokeWidth="0.25" />
      <circle cx={toX(CENTER_X)} cy={toY(play.rusher.startDepthYd)} r="0.95" className="fill-pos-rusher" stroke="white" strokeWidth="0.25" />
      {defenders.map(({ id, call, x, label }) => (
        <g key={id}>
          <circle cx={toX(x)} cy={toY(call.depthYd)} r="1.15" className="fill-team-defense" stroke="white" strokeWidth="0.25" />
          <text x={toX(x)} y={toY(call.depthYd) + 0.45} textAnchor="middle" fontSize="1.2" fontWeight="700" fill="white">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
};
