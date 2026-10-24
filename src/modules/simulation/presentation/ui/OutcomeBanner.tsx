"use client";

import { useState } from "react";
import { RotateCcw, Shuffle, SkipForward, Star, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { formatPercent } from "@/shared/ui/format";
import { cn } from "@/shared/ui/utils";
import { Badge } from "@/shared/ui/primitives/badge";
import { OUTCOME_LABELS } from "../../domain/labels";
import type { PassMetrics, PlayOutcome } from "../../domain/types";
import { isSuccessfulResult } from "../../application/sessionHistoryStore";
import { useSimulationStore } from "../../application/simulationStore";
import { OUTCOME_STYLES } from "../outcomeStyles";

const formatYards = (yards: number): string => `${yards >= 0 ? "+" : ""}${yards} yd`;

/** Plain-language sentence announced to screen readers when a play ends. */
const buildSummary = (outcome: PlayOutcome): string =>
  `${OUTCOME_LABELS[outcome.result]}${outcome.touchdown ? ", touchdown" : ""}. ${formatYards(outcome.yardsGained)}. ${outcome.reason}`;

type MetricChip = { label: string; value: string };

const getMetricChips = (metrics: PassMetrics | undefined): MetricChip[] =>
  metrics
    ? [
        { label: "Separation", value: `${metrics.separationYd.toFixed(1)} yd` },
        { label: "Throw timing", value: formatPercent(metrics.timingScore) },
        { label: "Pressure", value: formatPercent(metrics.pressure) },
        { label: "Throw", value: `${metrics.throwDistanceYd.toFixed(0)} yd` },
      ]
    : [];

type OddsSegmentProps = { label: string; value: number; className: string };

const OddsSegment = ({ label, value, className }: OddsSegmentProps) =>
  value > 0 ? (
    <div className={cn("flex h-full items-center justify-center overflow-hidden text-[0.625rem] font-semibold text-background", className)} style={{ width: `${value * 100}%` }} title={`${label} ${formatPercent(value)}`}>
      {value >= 0.18 && `${label} ${formatPercent(value)}`}
    </div>
  ) : null;

/**
 * Outcome card shown when a play ends: distinct icon, colour and motion per result, a short "why",
 * the odds at the moment of the throw, and the next-step actions. A visually hidden live region announces it.
 */
export const OutcomeBanner = () => {
  const outcome = useSimulationStore((state) => state.sim?.outcome ?? null);
  const mode = useSimulationStore((state) => state.sim?.config.mode ?? "VIEW");
  const category = useSimulationStore((state) => state.sim?.config.category ?? "OFFENSE");
  const routes = useSimulationStore((state) => state.routes);
  const routeId = useSimulationStore((state) => state.routeId);
  const play = useSimulationStore((state) => state.play);
  const setRouteId = useSimulationStore((state) => state.setRouteId);
  const [dismissedOutcome, setDismissedOutcome] = useState<PlayOutcome | null>(null);

  if (!outcome) return null;

  const style = OUTCOME_STYLES[outcome.result];
  const Icon = style.icon;
  const { probabilities } = outcome;
  const metricChips = getMetricChips(outcome.metrics);
  const isTactical = mode === "TACTICAL";

  const handleReplay = (): void => play();
  const handleNextPlay = (): void => {
    const currentIndex = routes.findIndex((route) => route.id === routeId);
    const nextRoute = routes[(currentIndex + 1) % Math.max(routes.length, 1)];
    if (nextRoute) setRouteId(nextRoute.id);
    play();
  };
  const handleDismiss = (): void => setDismissedOutcome(outcome);

  const liveRegion = (
    <p role="status" aria-live="polite" className="sr-only">
      {buildSummary(outcome)}
    </p>
  );

  if (dismissedOutcome === outcome) return liveRegion;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2 pb-2 md:px-4 md:pb-4">
      {liveRegion}
      <section
        aria-label="Play result"
        className={cn(
          "pointer-events-auto mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 bg-popover/95 shadow-overlay backdrop-blur",
          style.card,
          style.animation,
        )}
      >
        <div className="flex items-start gap-3 p-3 md:gap-4 md:p-4">
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl md:size-14", style.chip)}>
            <Icon className="size-7 md:size-8" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className={cn("font-display text-title leading-none font-semibold uppercase tracking-wide md:text-3xl", style.text)}>
                {OUTCOME_LABELS[outcome.result]}
              </h2>
              <span className="font-display text-xl font-semibold text-foreground tabular md:text-2xl">{formatYards(outcome.yardsGained)}</span>
              {category === "DEFENSE" && (
                <Badge variant={isSuccessfulResult(outcome.result, "DEFENSE") ? "success" : "danger"}>
                  {isSuccessfulResult(outcome.result, "DEFENSE") ? "Defensive stop" : "Offense wins the play"}
                </Badge>
              )}
              {outcome.touchdown && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-background">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  Touchdown
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-foreground">
              <span className="font-semibold">Why: </span>
              {outcome.reason}
            </p>

            {metricChips.length > 0 && (
              <dl className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                {metricChips.map(({ label, value }) => (
                  <div key={label} className="rounded-md bg-muted px-2 py-1">
                    <dt className="caption-label text-[0.625rem]">{label}</dt>
                    <dd className="font-mono text-xs font-semibold text-foreground tabular">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {probabilities && (
              <div className="mt-2.5">
                <p className="caption-label mb-1 text-[0.625rem]">Odds at arrival</p>
                <div className="flex h-5 overflow-hidden rounded-md bg-muted" role="img" aria-label={`Odds at arrival: complete ${formatPercent(probabilities.complete)}, intercept ${formatPercent(probabilities.intercept)}, incomplete ${formatPercent(probabilities.incomplete)}`}>
                  <OddsSegment label="Complete" value={probabilities.complete} className="bg-success" />
                  <OddsSegment label="Incomplete" value={probabilities.incomplete} className="bg-info" />
                  <OddsSegment label="INT" value={probabilities.intercept} className="bg-danger" />
                </div>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon-sm" onClick={handleDismiss} aria-label="Dismiss result" className="-mt-1 -mr-1 shrink-0">
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/40 px-3 py-2.5 md:px-4">
          {isTactical ? (
            <Button onClick={handleReplay}>
              <Shuffle aria-hidden="true" />
              Try another choice
            </Button>
          ) : (
            <Button onClick={handleReplay}>
              <RotateCcw aria-hidden="true" />
              Replay
            </Button>
          )}
          <Button variant="outline" onClick={handleNextPlay}>
            <SkipForward aria-hidden="true" />
            Next play
          </Button>
        </div>
      </section>
    </div>
  );
};
