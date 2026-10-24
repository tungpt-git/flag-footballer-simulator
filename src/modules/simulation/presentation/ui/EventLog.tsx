"use client";

import { AlertTriangle, CheckCircle2, Circle, Info, XOctagon, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import type { Tone } from "@/shared/kernel/tone";
import { cn } from "@/shared/ui/utils";
import { useSimulationStore } from "../../application/simulationStore";

const TONE_ICONS: Record<Tone, { icon: LucideIcon; className: string }> = {
  neutral: { icon: Circle, className: "text-muted-foreground" },
  info: { icon: Info, className: "text-info" },
  success: { icon: CheckCircle2, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  danger: { icon: XOctagon, className: "text-danger" },
};

export const EventLog = () => {
  const eventLog = useSimulationStore((state) => state.eventLog);
  const clearLog = useSimulationStore((state) => state.clearLog);

  const handleClear = (): void => clearLog();

  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 id="activity-title" className="caption-label">
          Activity
        </h3>
        <Button variant="ghost" size="xs" onClick={handleClear} disabled={eventLog.length === 0} aria-label="Clear activity log">
          Clear
        </Button>
      </div>
      {eventLog.length === 0 && <p className="text-sm text-muted-foreground">No plays yet. Press Play to run the first snap.</p>}
      <ol className="scroll-thin flex flex-col gap-2.5" aria-label="Play activity, newest first">
        {eventLog.map((entry) => {
          const { icon: Icon, className } = TONE_ICONS[entry.tone];
          return (
            <li key={entry.id} className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
              <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{entry.message}</p>
                <p className="font-mono text-xs text-muted-foreground tabular">t = {entry.atSec.toFixed(1)}s</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
