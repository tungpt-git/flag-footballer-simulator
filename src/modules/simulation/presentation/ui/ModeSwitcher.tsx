"use client";

import { usePathname, useRouter } from "next/navigation";
import { Crosshair, Eye, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/ui/utils";
import { useSimulationStore } from "../../application/simulationStore";
import type { SimulationMode } from "../../domain/types";

type ModeOption = { value: SimulationMode; label: string; shortLabel: string; description: string; icon: LucideIcon; activeClassName: string };

export const MODE_OPTIONS: ModeOption[] = [
  {
    value: "VIEW",
    label: "View only",
    shortLabel: "View",
    description: "Watch the play run. No decisions.",
    icon: Eye,
    activeClassName: "border-mode-view bg-mode-view/15 text-mode-view",
  },
  {
    value: "TACTICAL",
    label: "Interactive",
    shortLabel: "Live",
    description: "The play pauses and you call the action.",
    icon: Crosshair,
    activeClassName: "border-mode-live bg-mode-live/15 text-mode-live",
  },
];

const SIMULATOR_PATH = "/simulator";

/**
 * Global mode switcher in the top bar. Picking a mode on any other page also opens the simulator,
 * so "View only" and "Interactive" are always one tap away.
 */
export const ModeSwitcher = () => {
  const mode = useSimulationStore((state) => state.mode);
  const setMode = useSimulationStore((state) => state.setMode);
  const pathname = usePathname();
  const router = useRouter();

  const handleSelect = (value: SimulationMode) => (): void => {
    if (value !== mode) setMode(value);
    if (pathname !== SIMULATOR_PATH) router.push(SIMULATOR_PATH);
  };

  return (
    <div role="radiogroup" aria-label="Simulation mode" className="flex gap-1 rounded-xl border border-border bg-background p-1">
      {MODE_OPTIONS.map(({ value, label, shortLabel, description, icon: Icon, activeClassName }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} mode. ${description}`}
            title={description}
            onClick={handleSelect(value)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground pointer-coarse:h-10",
              isActive && activeClassName,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
            <span className="lg:hidden">{shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
