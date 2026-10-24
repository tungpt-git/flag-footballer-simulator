"use client";

import { Badge } from "@/shared/ui/primitives/badge";
import { cn } from "@/shared/ui/utils";
import { Maximize2, ScanSearch } from "lucide-react";
import { useSimulationStore } from "../../application/simulationStore";
import { getDefensivePlay } from "../../domain/defensivePlays";
import { CATEGORY_LABELS } from "../../domain/labels";
import type { FieldViewMode } from "../../domain/types";
import { PHASE_LABELS } from "./LiveMetricsPanel";
import { MODE_OPTIONS } from "./ModeSwitcher";

const VIEW_OPTIONS: {
  value: FieldViewMode;
  label: string;
  icon: typeof ScanSearch;
}[] = [
  { value: "PLAY", label: "Play view", icon: ScanSearch },
  { value: "FULL", label: "Full field", icon: Maximize2 },
];

/** Names the mode in its own colour, shows the play being run, phase, and the camera toggle. */
export const StageHeader = () => {
  const mode = useSimulationStore((state) => state.mode);
  const config = useSimulationStore((state) => state.sim?.config ?? null);
  const phase = useSimulationStore((state) => state.sim?.phase ?? null);
  const viewMode = useSimulationStore((state) => state.viewMode);
  const setViewMode = useSimulationStore((state) => state.setViewMode);

  const modeOption =
    MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0];
  const ModeIcon = modeOption.icon;
  const handleSelectView = (value: FieldViewMode) => (): void =>
    setViewMode(value);

  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-t-2 border-border bg-card px-4 py-2.5",
        mode === "VIEW" ? "border-t-mode-view" : "border-t-mode-live",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            modeOption.activeClassName,
          )}
        >
          <ModeIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-heading font-semibold uppercase tracking-wide text-foreground">
            {CATEGORY_LABELS[config?.category ?? "OFFENSE"]}{" "}
            <span className="text-muted-foreground">·</span> {modeOption.label}{" "}
            <span className="text-muted-foreground">·</span>{" "}
            {mode === "VIEW" ? "Film room" : "Live call"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {config
              ? `#${config.receiver.jerseyNumber} ${config.receiver.name} · ${config.route.name} · vs ${getDefensivePlay(config.defensivePlayId).name}`
              : "Choose a receiver and a route"}
          </p>
        </div>
      </div>

      {phase && (
        <Badge variant={PHASE_LABELS[phase].variant}>
          {PHASE_LABELS[phase].label}
        </Badge>
      )}

      <div
        role="radiogroup"
        aria-label="Camera"
        className="flex gap-0.5 rounded-lg border border-border bg-background p-0.5"
      >
        {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={viewMode === value}
            onClick={handleSelectView(value)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground pointer-coarse:h-9",
              viewMode === value && "bg-secondary text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
