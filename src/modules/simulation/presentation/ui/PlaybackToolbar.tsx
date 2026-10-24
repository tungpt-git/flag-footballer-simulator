"use client";

import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/utils";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { useEffect } from "react";
import { useSimulationStore } from "../../application/simulationStore";
import { PlaybackTimeline } from "./PlaybackTimeline";

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2];

/** One "frame step" runs two engine ticks of 0.05 s each (scaled by the speed setting). */
const STEP_TICK_SEC = 0.05;
const STEP_TICK_COUNT = 2;

const INTERACTIVE_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "A",
]);

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    INTERACTIVE_TAGS.has(target.tagName) ||
    target.getAttribute("role") === "combobox" ||
    target.isContentEditable
  );
};

/** Advances a paused play by a few tenths of a second using the store's public actions. */
const stepFrame = (): void => {
  const phase = useSimulationStore.getState().sim?.phase;
  if (!phase || phase === "PAUSED_FOR_DECISION" || phase === "FINISHED") return;

  useSimulationStore.setState({ isPlaying: true });
  for (let index = 0; index < STEP_TICK_COUNT; index += 1) {
    useSimulationStore.getState().tick(STEP_TICK_SEC);
  }
  useSimulationStore.getState().pause();
};

export const PlaybackToolbar = () => {
  const phase = useSimulationStore((state) => state.sim?.phase ?? null);
  const hasSimulation = useSimulationStore((state) => state.sim !== null);
  const isPlaying = useSimulationStore((state) => state.isPlaying);
  const speedMultiplier = useSimulationStore((state) => state.speedMultiplier);
  const play = useSimulationStore((state) => state.play);
  const pause = useSimulationStore((state) => state.pause);
  const reset = useSimulationStore((state) => state.reset);
  const setSpeedMultiplier = useSimulationStore(
    (state) => state.setSpeedMultiplier,
  );

  const isAwaitingDecision = phase === "PAUSED_FOR_DECISION";
  const isFinished = phase === "FINISHED";
  const isMidPlay = phase !== null && phase !== "PRE_SNAP" && !isFinished;
  const canStep =
    hasSimulation && !isPlaying && !isAwaitingDecision && !isFinished;

  const playLabel = [
    isPlaying && "Pause",
    !isPlaying && isFinished && "Replay",
    !isPlaying && isMidPlay && !isAwaitingDecision && "Resume",
    !isPlaying && isAwaitingDecision && "Decide",
    !isPlaying && !isMidPlay && !isFinished && "Play",
  ].find(Boolean) as string;

  const handleTogglePlay = (): void => {
    if (isPlaying) {
      pause();
      return;
    }
    play();
  };

  const handleReset = (): void => reset();
  const handleStep = (): void => stepFrame();
  const handleSpeedClick = (speed: number) => (): void =>
    setSpeedMultiplier(speed);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        isInteractiveTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const store = useSimulationStore.getState();
      if (store.sim?.phase === "PAUSED_FOR_DECISION") return;

      if (event.code === "Space") {
        event.preventDefault();
        if (store.isPlaying) store.pause();
        else store.play();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        store.reset();
        return;
      }
      if ((event.key === "s" || event.key === "S") && !store.isPlaying)
        stepFrame();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      role="toolbar"
      aria-label="Playback controls"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface px-3 py-2.5 md:px-4"
    >
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          disabled={!hasSimulation}
          aria-label="Restart play"
          aria-keyshortcuts="R"
          title="Restart (R)"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
        <Button
          onClick={handleTogglePlay}
          disabled={!hasSimulation || isAwaitingDecision}
          aria-label={playLabel}
          aria-keyshortcuts="Space"
          className="min-w-28"
          size="lg"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {playLabel}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleStep}
          disabled={!canStep}
          aria-label="Step forward one frame"
          aria-keyshortcuts="S"
          title="Step one frame (S)"
        >
          <StepForward aria-hidden="true" />
        </Button>
      </div>

      <PlaybackTimeline />

      <div className="flex flex-col gap-1">
        <span id="speed-label" className="caption-label">
          Speed
        </span>
        <div
          role="radiogroup"
          aria-labelledby="speed-label"
          className="inline-flex overflow-hidden rounded-lg border border-border bg-background"
        >
          {SPEED_OPTIONS.map((speed) => {
            const isSelected = speedMultiplier === speed;
            return (
              <button
                key={speed}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={handleSpeedClick(speed)}
                className={cn(
                  "h-8 min-w-11 border-r border-border px-2 font-mono text-xs font-semibold text-muted-foreground transition-colors duration-150 last:border-r-0 hover:bg-accent hover:text-foreground pointer-coarse:h-10",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
