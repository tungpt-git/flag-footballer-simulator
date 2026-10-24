"use client";

import { useEffect, useMemo, useRef } from "react";
import { END_OF_ROUTE_HOLD_SEC } from "../../domain/constants";
import { useSimulationStore } from "../../application/simulationStore";
import { cn } from "@/shared/ui/utils";

type MarkerKind = "snap" | "cut" | "decision" | "end";

type TimelineMarker = { kind: MarkerKind; timeSec: number };

const MARKER_LABELS: Record<MarkerKind, string> = {
  snap: "Snap",
  cut: "Cut",
  decision: "Decision",
  end: "End of play",
};

/** Shapes differ per marker so they are readable without colour. */
const MARKER_SHAPES: Record<MarkerKind, string> = {
  snap: "size-2.5 rounded-full bg-foreground",
  cut: "size-2.5 rotate-45 bg-warning",
  decision: "h-3 w-1.5 rounded-sm bg-mode-live",
  end: "size-2.5 rounded-[2px] bg-muted-foreground",
};

const MERGE_TOLERANCE_SEC = 0.05;

const formatClock = (timeSec: number, totalSec: number): string => `${timeSec.toFixed(1)} / ${totalSec.toFixed(1)} s`;

/**
 * Read-only play timeline with markers for the snap, the cut, the decision point and the end of play.
 * The playhead is moved straight from a store subscription, so it never re-renders React per frame.
 */
export const PlaybackTimeline = () => {
  const mode = useSimulationStore((state) => state.sim?.config.mode ?? "VIEW");
  const breakTimeSec = useSimulationStore((state) => state.sim?.breakTimeSec ?? 0);
  const routeEndSec = useSimulationStore((state) => state.sim?.routeEndSec ?? 0);
  const decisionTimeSec = useSimulationStore((state) => {
    const point = state.sim?.decisionPoint;
    if (!point) return 0;
    return point.trigger === "AT_TIME" ? (point.timeSec ?? 0) : (state.sim?.breakTimeSec ?? 0);
  });
  const hasCut = useSimulationStore((state) => state.sim?.config.route.waypoints.some((waypoint) => waypoint.cut) ?? false);
  const hasSimulation = useSimulationStore((state) => state.sim !== null);

  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalSec = Math.max(0.1, routeEndSec + END_OF_ROUTE_HOLD_SEC);

  const markers = useMemo<TimelineMarker[]>(() => {
    if (!hasSimulation) return [];
    const list: TimelineMarker[] = [{ kind: "snap", timeSec: 0 }];
    if (hasCut) list.push({ kind: "cut", timeSec: breakTimeSec });
    if (mode === "TACTICAL") list.push({ kind: "decision", timeSec: decisionTimeSec });
    list.push({ kind: "end", timeSec: routeEndSec });
    return list;
  }, [hasSimulation, hasCut, breakTimeSec, mode, decisionTimeSec, routeEndSec]);

  useEffect(() => {
    let lastSecond = -1;
    const paint = (elapsedSec: number): void => {
      const ratio = Math.min(1, Math.max(0, elapsedSec / totalSec));
      if (fillRef.current) fillRef.current.style.width = `${ratio * 100}%`;
      if (headRef.current) headRef.current.style.left = `${ratio * 100}%`;
      if (clockRef.current) clockRef.current.textContent = formatClock(Math.min(elapsedSec, totalSec), totalSec);
      const tenths = Math.round(elapsedSec * 10);
      if (trackRef.current && tenths !== lastSecond) {
        lastSecond = tenths;
        trackRef.current.setAttribute("aria-valuenow", String(tenths / 10));
        trackRef.current.setAttribute("aria-valuetext", `${(tenths / 10).toFixed(1)} seconds after the snap`);
      }
    };

    paint(useSimulationStore.getState().sim?.t ?? 0);
    return useSimulationStore.subscribe((state) => paint(state.sim?.t ?? 0));
  }, [totalSec]);

  const groupedMarkers = markers.reduce<{ timeSec: number; kinds: MarkerKind[] }[]>((groups, marker) => {
    const existing = groups.find((group) => Math.abs(group.timeSec - marker.timeSec) < MERGE_TOLERANCE_SEC);
    if (existing) existing.kinds.push(marker.kind);
    else groups.push({ timeSec: marker.timeSec, kinds: [marker.kind] });
    return groups;
  }, []);

  const description = markers.map((marker) => `${MARKER_LABELS[marker.kind]} at ${marker.timeSec.toFixed(1)} seconds`).join(", ");

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="caption-label">Play timeline</span>
        <span ref={clockRef} className="font-mono text-xs font-semibold text-foreground tabular" aria-hidden="true">
          0.0 / {totalSec.toFixed(1)} s
        </span>
      </div>

      <div
        ref={trackRef}
        role="progressbar"
        aria-label={`Play timeline. ${description}`}
        aria-valuemin={0}
        aria-valuemax={totalSec}
        aria-valuenow={0}
        className="relative mx-1.5 h-6"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div ref={fillRef} className="absolute top-1/2 left-0 h-1.5 w-0 -translate-y-1/2 rounded-full bg-primary" />
        {groupedMarkers.map((group) => (
          <div
            key={group.timeSec}
            aria-hidden="true"
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5"
            style={{ left: `${Math.min(100, (group.timeSec / totalSec) * 100)}%` }}
          >
            {group.kinds.map((kind) => (
              <span key={kind} className={cn("block ring-2 ring-background", MARKER_SHAPES[kind])} />
            ))}
          </div>
        ))}
        <div
          ref={headRef}
          aria-hidden="true"
          className="absolute top-0 h-6 w-0.5 -translate-x-1/2 rounded-full bg-foreground shadow-raised"
        />
      </div>

      <div className="relative mx-1.5 hidden h-3.5 sm:block" aria-hidden="true">
        {groupedMarkers.map((group) => (
          <span
            key={group.timeSec}
            className="absolute -translate-x-1/2 text-[0.625rem] leading-none font-medium whitespace-nowrap text-muted-foreground"
            style={{ left: `${Math.min(96, Math.max(4, (group.timeSec / totalSec) * 100))}%` }}
          >
            {group.kinds.map((kind) => MARKER_LABELS[kind]).join(" · ")}
          </span>
        ))}
      </div>
    </div>
  );
};
