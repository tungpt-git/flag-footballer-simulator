import type { MetricScores } from "../metricScores";

type PlayerRadarProps = {
  scores: MetricScores;
  /** Team average drawn as a dashed outline. */
  teamAverage?: MetricScores | null;
  summary: string;
};

const AXES: { key: keyof MetricScores; label: string }[] = [
  { key: "speed", label: "Speed" },
  { key: "catching", label: "Hands" },
  { key: "flagPull", label: "Flags" },
  { key: "agility", label: "Agility" },
];

const CENTER = 100;
const RADIUS = 62;
const RINGS = [25, 50, 75, 100];

const pointFor = (axisIndex: number, score: number): [number, number] => {
  const angle = (Math.PI * 2 * axisIndex) / AXES.length - Math.PI / 2;
  const distance = (score / 100) * RADIUS;
  return [CENTER + Math.cos(angle) * distance, CENTER + Math.sin(angle) * distance];
};

const toPolygonPoints = (scores: MetricScores): string =>
  AXES.map(({ key }, index) => pointFor(index, scores[key]).join(",")).join(" ");

/** Four-axis radar with an optional team-average overlay. */
export const PlayerRadar = ({ scores, teamAverage, summary }: PlayerRadarProps) => (
  <svg viewBox="0 0 200 200" role="img" aria-label={summary} className="mx-auto w-full max-w-56">
    {RINGS.map((ring) => (
      <polygon
        key={ring}
        points={AXES.map((_, index) => pointFor(index, ring).join(",")).join(" ")}
        fill="none"
        className="stroke-border"
        strokeWidth="1"
      />
    ))}
    {AXES.map(({ key }, index) => {
      const [x, y] = pointFor(index, 100);
      return <line key={key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-border" strokeWidth="1" />;
    })}
    {teamAverage && (
      <polygon points={toPolygonPoints(teamAverage)} fill="none" className="stroke-muted-foreground" strokeWidth="1.5" strokeDasharray="4 3" />
    )}
    <polygon points={toPolygonPoints(scores)} className="fill-primary/25 stroke-primary" strokeWidth="2" strokeLinejoin="round" />
    {AXES.map(({ key, label }, index) => {
      const [x, y] = pointFor(index, 100);
      const [labelX, labelY] = [CENTER + (x - CENTER) * 1.28, CENTER + (y - CENTER) * 1.2];
      return (
        <text key={key} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[9px] font-semibold uppercase" style={{ letterSpacing: "0.08em" }}>
          {label}
        </text>
      );
    })}
  </svg>
);
