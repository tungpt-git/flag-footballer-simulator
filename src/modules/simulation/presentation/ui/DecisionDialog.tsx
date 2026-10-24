"use client";

import { useEffect, useRef } from "react";
import { Shuffle, Target } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { formatPercent } from "@/shared/ui/format";
import { cn } from "@/shared/ui/utils";
import { CALL_DESCRIPTIONS, CALL_LABELS, TRIGGER_LABELS } from "../../domain/labels";
import { useSessionHistoryStore } from "../../application/sessionHistoryStore";
import { useSimulationStore } from "../../application/simulationStore";
import type { DecisionAction, DefensiveAction, PlayCall } from "../../domain/types";
import { CALL_PRESENTATION, findCallByShortcut, getPressureLevel, type PressureLevel } from "../decisionCopy";

const PRESSURE_STYLES: Record<PressureLevel, { label: string; segments: number; className: string }> = {
  LOW: { label: "Low pressure", segments: 1, className: "bg-success" },
  MEDIUM: { label: "Medium pressure", segments: 2, className: "bg-warning" },
  HIGH: { label: "High pressure", segments: 3, className: "bg-danger" },
};

type PressureMeterProps = { rusherDistanceYd: number | null };

/** Pass-rush pressure: three segments plus a text label, so the level never depends on colour. */
const PressureMeter = ({ rusherDistanceYd }: PressureMeterProps) => {
  if (rusherDistanceYd === null) return null;
  const level = PRESSURE_STYLES[getPressureLevel(rusherDistanceYd)];

  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${level.label}: rusher ${rusherDistanceYd.toFixed(1)} yards from the quarterback`}>
      <div className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((segment) => (
          <span key={segment} className={cn("h-3 w-2.5 rounded-sm", segment <= level.segments ? level.className : "bg-muted")} />
        ))}
      </div>
      <span className="text-xs font-semibold text-foreground">{level.label}</span>
      <span className="font-mono text-xs text-muted-foreground tabular">{rusherDistanceYd.toFixed(1)} yd</span>
    </div>
  );
};

type OddsChipProps = { label: string; value: number; className: string };

const OddsChip = ({ label, value, className }: OddsChipProps) => (
  <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold tabular", className)}>
    {label} {formatPercent(value)}
  </span>
);

/**
 * Decision overlay shown while the simulation is paused. The canvas dims everything except the key
 * players, and this panel offers large actions with keyboard shortcuts (1/2/3) and risk/reward hints.
 * It is pinned to the top of the field: that is the end zone area, so the QB, rusher and receivers
 * stay visible below it.
 */
export const DecisionDialog = () => {
  const pendingDecision = useSimulationStore((state) => state.sim?.pendingDecision ?? null);
  const pausedAtSec = useSimulationStore((state) => (state.sim?.phase === "PAUSED_FOR_DECISION" ? state.sim.t : 0));
  const trigger = useSimulationStore((state) => state.sim?.config.decisionTrigger ?? "AT_TIME");
  const previews = useSimulationStore((state) => state.decisionPreviews);
  const rusherDistance = useSimulationStore((state) => state.snapshot?.metrics.rusherDistanceYd ?? null);
  const submitDecision = useSimulationStore((state) => state.submitDecision);
  const submitOffenseChoice = useSimulationStore((state) => state.submitOffenseChoice);
  const submitDefensiveDecision = useSimulationStore((state) => state.submitDefensiveDecision);
  const recordDecision = useSessionHistoryStore((state) => state.recordDecision);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pendingDecision) return;
    firstOptionRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const choices = pendingDecision.category === "OFFENSE" ? pendingDecision.choices : undefined;
      if (choices) {
        const choice = choices[Number(event.key) - 1];
        if (!choice) return;
        recordDecision(choice.label);
        submitOffenseChoice(choice.id);
        return;
      }
      const action = findCallByShortcut<PlayCall>(pendingDecision.options, event.key);
      if (!action) return;
      recordDecision(action);
      if (pendingDecision.category === "DEFENSE") submitDefensiveDecision(action as DefensiveAction);
      else submitDecision(action as DecisionAction);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingDecision, submitDecision, submitOffenseChoice, submitDefensiveDecision, recordDecision]);

  if (!pendingDecision) return null;

  const isDefense = pendingDecision.category === "DEFENSE";
  const choices = pendingDecision.category === "OFFENSE" ? pendingDecision.choices : undefined;
  const options: PlayCall[] = pendingDecision.options;

  const handleChooseChoice = (choiceId: string, label: string) => (): void => {
    recordDecision(label);
    submitOffenseChoice(choiceId);
  };

  const handleChoose = (action: PlayCall) => (): void => {
    recordDecision(action);
    if (isDefense) submitDefensiveDecision(action as DefensiveAction);
    else submitDecision(action as DecisionAction);
  };

  const renderOdds = (action: PlayCall) => {
    const preview = previews[action as DecisionAction];
    if (!preview) return null;
    return (
      <span className="hidden flex-wrap gap-1 md:flex">
        <OddsChip label="Complete" value={preview.probabilities.complete} className="bg-success-soft text-success" />
        <OddsChip label="INT" value={preview.probabilities.intercept} className="bg-danger-soft text-danger" />
      </span>
    );
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 animate-slide-up bg-linear-to-b from-black/70 via-black/35 to-transparent px-2 pt-2 pb-10 md:px-4 md:pt-3">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="decision-title"
        aria-describedby="decision-description"
        className="pointer-events-auto mx-auto max-w-4xl rounded-2xl border border-mode-live/60 bg-popover/95 shadow-overlay backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-3 py-2">
          <h2 id="decision-title" className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-foreground">
            <span className="size-2.5 animate-pulse-ring rounded-full bg-mode-live" aria-hidden="true" />
            {isDefense ? "Defensive call" : "Your call"}
            <span className="font-mono text-xs font-medium text-muted-foreground tabular normal-case">t = {pausedAtSec.toFixed(2)}s</span>
          </h2>
          <PressureMeter rusherDistanceYd={rusherDistance} />
          <p id="decision-description" className="sr-only">
            Play paused {TRIGGER_LABELS[trigger].toLowerCase()}. Choose an action, or press 1, 2 or 3.
          </p>
        </div>

        {choices ? (
          <ul className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 md:grid-cols-5 md:gap-2">
            {choices.map((choice, index) => {
              const Icon = choice.targetId ? Target : Shuffle;
              const preview = choice.targetId ? previews[choice.id] : undefined;
              return (
                <li key={choice.id} className="flex">
                  <Button
                    ref={index === 0 ? firstOptionRef : undefined}
                    variant="outline"
                    onClick={handleChooseChoice(choice.id, choice.label)}
                    aria-keyshortcuts={String(index + 1)}
                    className="h-auto min-h-16 w-full flex-col items-stretch justify-start gap-1.5 whitespace-normal rounded-xl p-2 text-left hover:border-mode-live hover:bg-accent md:p-2.5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mode-live/15 text-mode-live">
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 font-display text-sm leading-tight font-semibold uppercase tracking-wide">{choice.label}</span>
                      <kbd className="hidden size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-semibold text-foreground md:flex">
                        {index + 1}
                      </kbd>
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">{choice.description}</span>
                    {preview ? (
                      <span className="hidden flex-wrap gap-1 md:flex">
                        <OddsChip label="Complete" value={preview.probabilities.complete} className="bg-success-soft text-success" />
                        <OddsChip label="INT" value={preview.probabilities.intercept} className="bg-danger-soft text-danger" />
                      </span>
                    ) : null}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {choices ? null : (
        <ul className="grid grid-cols-3 gap-1.5 p-2 md:gap-2">
          {options.map((action, index) => {
            const { icon: Icon, shortcut, risk, reward } = CALL_PRESENTATION[action];
            return (
              <li key={action} className="flex">
                <Button
                  ref={index === 0 ? firstOptionRef : undefined}
                  variant="outline"
                  onClick={handleChoose(action)}
                  aria-keyshortcuts={shortcut}
                  aria-describedby={`decision-hint-${action}`}
                  className="h-auto min-h-16 w-full flex-col items-stretch justify-start gap-1.5 whitespace-normal rounded-xl p-2 text-left hover:border-mode-live hover:bg-accent md:p-2.5"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mode-live/15 text-mode-live">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-sm leading-tight font-semibold uppercase tracking-wide md:text-base">{CALL_LABELS[action]}</span>
                    <kbd className="hidden size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs font-semibold text-foreground md:flex">
                      {shortcut}
                    </kbd>
                  </span>
                  <span id={`decision-hint-${action}`} className="hidden flex-col gap-0.5 text-xs font-normal sm:flex">
                    <span className="sr-only">{CALL_DESCRIPTIONS[action]}</span>
                    <span className="text-success">
                      <span className="font-semibold">+ </span>
                      {reward}
                    </span>
                    <span className="text-danger">
                      <span className="font-semibold">− </span>
                      {risk}
                    </span>
                  </span>
                  {renderOdds(action)}
                </Button>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
};
