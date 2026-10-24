import { cn } from "@/shared/ui/utils";

type StatMeterProps = {
  label: string;
  /** Normalised score, 0-100. Drives the bar length. */
  score: number;
  /** Human-readable value, e.g. "4.62 s" or "78%". */
  display: string;
  /** Team average score (0-100); drawn as a tick and described to screen readers. */
  averageScore?: number;
  /** Compact variant for cards (no delta text). */
  compact?: boolean;
  className?: string;
};

const clampScore = (score: number): number => Math.min(100, Math.max(0, score));

const describeDelta = (score: number, averageScore: number): { text: string; className: string } => {
  const delta = Math.round(score - averageScore);
  if (delta === 0) return { text: "= team avg", className: "text-muted-foreground" };
  return delta > 0
    ? { text: `▲ ${delta} vs team`, className: "text-success" }
    : { text: `▼ ${Math.abs(delta)} vs team`, className: "text-danger" };
};

/** Horizontal stat bar with an optional team-average marker. Direction is spelled out, never colour-only. */
export const StatMeter = ({ label, score, display, averageScore, compact = false, className }: StatMeterProps) => {
  const safeScore = clampScore(score);
  const delta = averageScore === undefined ? null : describeDelta(safeScore, clampScore(averageScore));
  const valueText = delta ? `${display}, ${delta.text}` : display;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{label}</span>
        <span className="flex items-baseline gap-2">
          {delta && !compact && <span className={cn("text-xs font-medium", delta.className)}>{delta.text}</span>}
          <span className={cn("font-mono font-semibold text-foreground tabular", compact ? "text-xs" : "text-sm")}>{display}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeScore)}
        aria-valuetext={valueText}
        className={cn("relative w-full rounded-full bg-muted", compact ? "h-1.5" : "h-2")}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-emphasized"
          style={{ width: `${safeScore}%` }}
        />
        {averageScore !== undefined && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-foreground/80"
            style={{ left: `${clampScore(averageScore)}%` }}
          />
        )}
      </div>
    </div>
  );
};
