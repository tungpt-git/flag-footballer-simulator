"use client";

import Link from "next/link";
import { PlayCircle, Star, Trash2 } from "lucide-react";
import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button, buttonVariants } from "@/shared/ui/primitives/button";
import { formatPercent } from "@/shared/ui/format";
import { cn } from "@/shared/ui/utils";
import { DECISION_LABELS, OUTCOME_LABELS } from "../../domain/labels";
import type { DecisionAction, OutcomeResult } from "../../domain/types";
import { isSuccessfulResult, useSessionHistoryStore, type SessionEntry } from "../../application/sessionHistoryStore";
import { OUTCOME_STYLES } from "../outcomeStyles";

const OUTCOME_ORDER: OutcomeResult[] = ["COMPLETED_PASS", "SCRAMBLE_GAIN", "INCOMPLETE", "FLAG_PULLED", "INTERCEPTED", "TURNOVER"];

const OUTCOME_BAR_CLASSES: Record<OutcomeResult, string> = {
  COMPLETED_PASS: "bg-success",
  SCRAMBLE_GAIN: "bg-success",
  FLAG_PULLED: "bg-warning",
  INCOMPLETE: "bg-info",
  INTERCEPTED: "bg-danger",
  TURNOVER: "bg-danger",
};

type SessionStats = {
  plays: number;
  successes: number;
  successRate: number;
  touchdowns: number;
  averageYards: number;
};

export const computeSessionStats = (entries: SessionEntry[]): SessionStats => {
  const successes = entries.filter((entry) => isSuccessfulResult(entry.result)).length;
  return {
    plays: entries.length,
    successes,
    successRate: entries.length === 0 ? 0 : successes / entries.length,
    touchdowns: entries.filter((entry) => entry.touchdown).length,
    averageYards: entries.length === 0 ? 0 : entries.reduce((sum, entry) => sum + entry.yardsGained, 0) / entries.length,
  };
};

const formatYards = (yards: number): string => `${yards >= 0 ? "+" : ""}${yards}`;

type SuccessDonutProps = { rate: number; plays: number };

const SuccessDonut = ({ rate, plays }: SuccessDonutProps) => (
  <div
    role="img"
    aria-label={`Success rate ${formatPercent(rate)} over ${plays} plays`}
    className="relative size-32 shrink-0 rounded-full"
    style={{ background: `conic-gradient(var(--success) ${rate * 360}deg, var(--muted) 0deg)` }}
  >
    <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
      <span className="font-display text-stat font-semibold text-foreground tabular">{plays === 0 ? "-" : formatPercent(rate)}</span>
      <span className="caption-label text-[0.5625rem]">Success</span>
    </div>
  </div>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card px-4 py-3">
    <dt className="caption-label">{label}</dt>
    <dd className="font-display text-title font-semibold text-foreground tabular">{value}</dd>
  </div>
);

const EmptyState = () => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <PlayCircle className="size-6" aria-hidden="true" />
    </span>
    <h2 className="text-heading font-semibold text-foreground">No plays this session yet</h2>
    <p className="text-sm text-muted-foreground">Run a play in the simulator. Every finished play and the decision behind it is logged here.</p>
    <Link href="/simulator" className={buttonVariants()}>
      Open simulator
    </Link>
  </div>
);

type DecisionRow = { action: DecisionAction; calls: number; successRate: number; averageYards: number };

const buildDecisionRows = (entries: SessionEntry[]): DecisionRow[] => {
  const actions = Object.keys(DECISION_LABELS) as DecisionAction[];
  return actions
    .map((action) => {
      const calls = entries.filter((entry) => entry.decision === action);
      const stats = computeSessionStats(calls);
      return { action, calls: calls.length, successRate: stats.successRate, averageYards: stats.averageYards };
    })
    .filter((row) => row.calls > 0);
};

/** Compact version for the simulator's side panel. */
export const SessionSummary = () => {
  const entries = useSessionHistoryStore((state) => state.entries);
  const stats = computeSessionStats(entries);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Finished plays are tallied here. Run a play to start your session.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <SuccessDonut rate={stats.successRate} plays={stats.plays} />
        <dl className="grid flex-1 gap-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Plays</dt><dd className="font-mono font-semibold tabular">{stats.plays}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Touchdowns</dt><dd className="font-mono font-semibold tabular">{stats.touchdowns}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Avg gain</dt><dd className="font-mono font-semibold tabular">{formatYards(Math.round(stats.averageYards * 10) / 10)} yd</dd></div>
        </dl>
      </div>
      <ol aria-label="Latest plays" className="flex flex-col gap-1.5">
        {entries.slice(0, 5).map((entry) => {
          const { icon: Icon, text } = OUTCOME_STYLES[entry.result];
          return (
            <li key={entry.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm">
              <Icon className={cn("size-4 shrink-0", text)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{OUTCOME_LABELS[entry.result]}</span>
              <span className="font-mono text-xs text-muted-foreground tabular">{formatYards(entry.yardsGained)} yd</span>
            </li>
          );
        })}
      </ol>
      <Link href="/results" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Open full results
      </Link>
    </div>
  );
};

/** Full results screen: success rate, outcome mix, per-decision effectiveness and the play log. */
export const SessionHistory = () => {
  const entries = useSessionHistoryStore((state) => state.entries);
  const clear = useSessionHistoryStore((state) => state.clear);
  const stats = computeSessionStats(entries);
  const decisionRows = buildDecisionRows(entries);

  const handleClear = (): void => clear();

  return (
    <>
      <PageHeading
        eyebrow="Session"
        title="Results"
        count={entries.length}
        description="Every finished play in this browser session, with the decision you made and why it worked or failed."
        actions={
          <Button variant="outline" onClick={handleClear} disabled={entries.length === 0}>
            <Trash2 aria-hidden="true" />
            Clear session
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-4 pb-8 md:px-8">
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section aria-label="Summary" className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <div className="flex items-center justify-center rounded-xl border border-border bg-card p-5">
                <SuccessDonut rate={stats.successRate} plays={stats.plays} />
              </div>
              <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard label="Plays" value={String(stats.plays)} />
                <StatCard label="Successful" value={`${stats.successes} / ${stats.plays}`} />
                <StatCard label="Touchdowns" value={String(stats.touchdowns)} />
                <StatCard label="Avg gain" value={`${formatYards(Math.round(stats.averageYards * 10) / 10)} yd`} />
              </dl>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section aria-labelledby="mix-title" className="rounded-xl border border-border bg-card p-4">
                <h2 id="mix-title" className="caption-label mb-3">
                  Outcome mix
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {OUTCOME_ORDER.map((result) => {
                    const count = entries.filter((entry) => entry.result === result).length;
                    const { icon: Icon, text } = OUTCOME_STYLES[result];
                    return (
                      <li key={result} className="flex items-center gap-3 text-sm">
                        <span className="flex w-40 shrink-0 items-center gap-2 text-foreground">
                          <Icon className={cn("size-4", text)} aria-hidden="true" />
                          {OUTCOME_LABELS[result]}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className={cn("h-full rounded-full transition-[width] duration-300", OUTCOME_BAR_CLASSES[result])} style={{ width: `${(count / entries.length) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right font-mono text-xs font-semibold text-foreground tabular">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section aria-labelledby="decision-title" className="rounded-xl border border-border bg-card p-4">
                <h2 id="decision-title" className="caption-label mb-3">
                  Decisions
                </h2>
                {decisionRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Switch to Interactive mode to log decisions and compare how each call performs.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th scope="col" className="caption-label pb-2 font-semibold">Call</th>
                        <th scope="col" className="caption-label pb-2 text-right font-semibold">Made</th>
                        <th scope="col" className="caption-label pb-2 pl-4 font-semibold">Success</th>
                        <th scope="col" className="caption-label pb-2 text-right font-semibold">Avg gain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisionRows.map((row) => (
                        <tr key={row.action} className="border-t border-border">
                          <th scope="row" className="py-2 text-left font-medium text-foreground">{DECISION_LABELS[row.action]}</th>
                          <td className="py-2 text-right font-mono tabular">{row.calls}</td>
                          <td className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <div className="h-full rounded-full bg-success" style={{ width: `${row.successRate * 100}%` }} />
                              </div>
                              <span className="font-mono text-xs font-semibold tabular">{formatPercent(row.successRate)}</span>
                            </div>
                          </td>
                          <td className="py-2 text-right font-mono tabular">{formatYards(Math.round(row.averageYards * 10) / 10)} yd</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            <section aria-labelledby="log-title">
              <h2 id="log-title" className="caption-label mb-3">
                Play log
              </h2>
              <ol className="flex flex-col gap-2">
                {entries.map((entry, index) => {
                  const { icon: Icon, text, card } = OUTCOME_STYLES[entry.result];
                  return (
                    <li key={entry.id} className={cn("flex flex-wrap items-start gap-x-4 gap-y-1 rounded-xl border border-l-4 bg-card px-4 py-3", card)}>
                      <span className="w-6 font-mono text-xs text-muted-foreground tabular">{entries.length - index}</span>
                      <Icon className={cn("mt-0.5 size-5 shrink-0", text)} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                          {OUTCOME_LABELS[entry.result]}
                          <span className="font-mono text-sm tabular">{formatYards(entry.yardsGained)} yd</span>
                          {entry.touchdown && (
                            <Badge variant="warning">
                              <Star aria-hidden="true" />
                              TD
                            </Badge>
                          )}
                          <Badge variant={entry.mode === "TACTICAL" ? "warning" : "info"}>{entry.mode === "TACTICAL" ? "Interactive" : "View only"}</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.receiverLabel} · {entry.routeName}
                          {entry.decision && ` · Called: ${DECISION_LABELS[entry.decision]}`}
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">{entry.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </div>
    </>
  );
};
