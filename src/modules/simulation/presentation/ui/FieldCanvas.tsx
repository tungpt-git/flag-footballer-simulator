"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, ScanLine } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { usePrefersReducedMotion } from "@/shared/ui/hooks/usePrefersReducedMotion";
import { cn } from "@/shared/ui/utils";
import { DEFAULT_LOS_Y } from "@/shared/kernel/field";
import { getOutletRoutePoints, getReceiverRoutePoints, type SimulationState } from "../../domain/simulation";
import { CANVAS_COLORS } from "../../infrastructure/rendering/colors";
import { drawField } from "../../infrastructure/rendering/drawField";
import {
  TrailMap,
  drawDecisionSpotlight,
  drawPlayers,
  findEntityAt,
  updateTrails,
} from "../../infrastructure/rendering/drawPlayers";
import { drawRoute } from "../../infrastructure/rendering/drawRoutes";
import {
  DEFAULT_FIELD_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  clampFieldView,
  createFieldTransform,
  getFieldViewport,
  type FieldTransform,
  type FieldView,
} from "../../infrastructure/rendering/fieldMetrics";
import { OUTCOME_LABELS } from "../../domain/labels";
import { useSimulationStore } from "../../application/simulationStore";
import { useStageUiStore } from "../../application/stageUiStore";

const FIELD_PADDING_PX = 16;
const MIN_CANVAS_SIZE_PX = 200;
const MAX_TRAIL_POINTS = 60;
const ZOOM_STEP = 0.5;
const PAN_STEP_YD = 3;
const DRAG_THRESHOLD_PX = 4;

type Size = { width: number; height: number };

const drawRoutes = (ctx: CanvasRenderingContext2D, transform: FieldTransform, sim: SimulationState): void => {
  const outletPoints = getOutletRoutePoints(sim);
  if (outletPoints) {
    drawRoute(ctx, transform, outletPoints, { color: CANVAS_COLORS.routeOutlet, lineWidth: 2 });
  }

  const { waypoints } = sim.config.route;
  const cutIndices = waypoints.flatMap((waypoint, index) => (waypoint.cut ? [index] : []));
  const cutAngles = Object.fromEntries(
    waypoints.flatMap((waypoint, index) => (waypoint.cutAngleDeg === undefined ? [] : [[index, waypoint.cutAngleDeg]])),
  );
  const receiver = sim.entities.find((entity) => entity.role === "RECEIVER");

  drawRoute(ctx, transform, getReceiverRoutePoints(sim), {
    color: CANVAS_COLORS.routeActive,
    lineWidth: 3,
    progress: receiver?.routeProgress ?? 0,
    cutIndices,
    cutAngles,
    showWaypoints: true,
  });
};

const buildAriaLabel = (sim: SimulationState | null): string => {
  if (!sim) return "Flag football field. Select a receiver and a route to begin.";
  const { receiver, route } = sim.config;
  const base = `Top-down flag football field: receiver number ${receiver.jerseyNumber} running a ${route.name} route.`;
  if (sim.phase === "PAUSED_FOR_DECISION") return `${base} Play paused, waiting for your decision.`;
  if (sim.phase === "FINISHED" && sim.outcome) return `${base} Result: ${OUTCOME_LABELS[sim.outcome.result]}.`;
  if (sim.phase === "FINISHED") return `${base} Route complete.`;
  return base;
};

/**
 * Top-down field renderer and animation loop. The loop reads simulation state straight from
 * the Zustand store (no React re-render per frame) and draws it onto a DPR-aware canvas.
 * Zoom and pan live in a ref, so gestures never touch React state or the store.
 */
export const FieldCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<FieldView>(DEFAULT_FIELD_VIEW);
  const layerVersionRef = useRef(0);
  const transformRef = useRef<FieldTransform | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number; hasMoved: boolean } | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_FIELD_VIEW.zoom);
  const isReducedMotion = usePrefersReducedMotion();

  const viewMode = useSimulationStore((state) => state.viewMode);
  const losY = useSimulationStore((state) => state.sim?.config.losY ?? DEFAULT_LOS_Y);
  const ariaLabel = useSimulationStore((state) => buildAriaLabel(state.sim));

  const applyView = useCallback(
    (nextView: FieldView): void => {
      viewRef.current = clampFieldView(nextView, getFieldViewport(viewMode, losY));
      setZoom(viewRef.current.zoom);
    },
    [viewMode, losY],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fonts load after first paint; redraw the static layer once they are ready.
  useEffect(() => {
    void document.fonts.ready.then(() => {
      layerVersionRef.current += 1;
    });
  }, []);

  // A new view mode starts from the fitted view.
  const [appliedViewMode, setAppliedViewMode] = useState(viewMode);
  if (appliedViewMode !== viewMode) {
    setAppliedViewMode(viewMode);
    setZoom(DEFAULT_FIELD_VIEW.zoom);
  }
  useEffect(() => {
    viewRef.current = DEFAULT_FIELD_VIEW;
  }, [viewMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < MIN_CANVAS_SIZE_PX || size.height < MIN_CANVAS_SIZE_PX) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const { width: widthPx, height: heightPx } = size;
    const viewport = getFieldViewport(viewMode, losY);

    canvas.width = Math.round(widthPx * devicePixelRatio);
    canvas.height = Math.round(heightPx * devicePixelRatio);

    const fieldLayer = document.createElement("canvas");
    fieldLayer.width = canvas.width;
    fieldLayer.height = canvas.height;
    const fieldContext = fieldLayer.getContext("2d");
    if (!fieldContext) return;

    let transform = createFieldTransform(widthPx, heightPx, viewport, FIELD_PADDING_PX, viewRef.current);
    let drawnSignature = "";
    const trails: TrailMap = new Map();
    let lastSimulatedSec = 0;
    let lastFrameMs = 0;
    let animationFrameId = 0;

    // The static field layer is redrawn only when size, view or fonts change.
    const refreshFieldLayer = (): void => {
      const view = viewRef.current;
      const signature = `${view.zoom}|${view.panX}|${view.panY}|${layerVersionRef.current}`;
      if (signature === drawnSignature) return;
      drawnSignature = signature;
      transform = createFieldTransform(widthPx, heightPx, viewport, FIELD_PADDING_PX, view);
      transformRef.current = transform;
      fieldContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      fieldContext.clearRect(0, 0, widthPx, heightPx);
      drawField(fieldContext, transform, losY);
    };

    const renderFrame = (timestampMs: number): void => {
      const deltaSec = lastFrameMs ? (timestampMs - lastFrameMs) / 1000 : 0;
      lastFrameMs = timestampMs;

      useSimulationStore.getState().tick(deltaSec);
      const { sim } = useSimulationStore.getState();
      const { selectedEntityId, hoveredEntityId } = useStageUiStore.getState();

      refreshFieldLayer();
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, widthPx, heightPx);
      ctx.drawImage(fieldLayer, 0, 0, widthPx, heightPx);

      if (sim) {
        if (sim.phase === "PRE_SNAP" || sim.t < lastSimulatedSec) trails.clear();
        lastSimulatedSec = sim.t;
        updateTrails(trails, sim.entities, MAX_TRAIL_POINTS);

        const options = { selectedId: selectedEntityId, hoveredId: hoveredEntityId, reducedMotion: isReducedMotion };
        drawDecisionSpotlight(ctx, transform, sim, widthPx, heightPx, options, timestampMs);
        drawRoutes(ctx, transform, sim);
        drawPlayers(ctx, transform, sim, trails, options);
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [size, viewMode, losY, isReducedMotion]);

  const getPointerPoint = (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPointerPoint(event);
    dragRef.current = { startX: point.x, startY: point.y, lastX: point.x, lastY: point.y, hasMoved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const point = getPointerPoint(event);
    const drag = dragRef.current;
    const transform = transformRef.current;

    if (drag) {
      const movedPx = Math.hypot(point.x - drag.startX, point.y - drag.startY);
      if (movedPx > DRAG_THRESHOLD_PX) drag.hasMoved = true;
      if (drag.hasMoved && transform && viewRef.current.zoom > MIN_ZOOM) {
        const view = viewRef.current;
        applyView({
          ...view,
          panX: view.panX - (point.x - drag.lastX) / transform.scale,
          panY: view.panY + (point.y - drag.lastY) / transform.scale,
        });
      }
      drag.lastX = point.x;
      drag.lastY = point.y;
      return;
    }

    const { sim } = useSimulationStore.getState();
    const hit = sim && transform ? findEntityAt(transform, sim, point) : null;
    useStageUiStore.getState().hoverEntity(hit?.id ?? null);
    event.currentTarget.style.cursor = hit ? "pointer" : viewRef.current.zoom > MIN_ZOOM ? "grab" : "default";
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.hasMoved) return;

    const { sim } = useSimulationStore.getState();
    const transform = transformRef.current;
    if (!sim || !transform) return;
    const hit = findEntityAt(transform, sim, getPointerPoint(event));
    if (hit) useStageUiStore.getState().selectEntity(hit.id);
  };

  const handlePointerLeave = (): void => useStageUiStore.getState().hoverEntity(null);

  const handleZoomIn = (): void => applyView({ ...viewRef.current, zoom: viewRef.current.zoom + ZOOM_STEP });
  const handleZoomOut = (): void => applyView({ ...viewRef.current, zoom: viewRef.current.zoom - ZOOM_STEP });
  const handleFit = (): void => applyView(DEFAULT_FIELD_VIEW);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const view = viewRef.current;
    const handlers: Record<string, () => void> = {
      "+": handleZoomIn,
      "=": handleZoomIn,
      "-": handleZoomOut,
      "0": handleFit,
      ArrowLeft: () => applyView({ ...view, panX: view.panX - PAN_STEP_YD }),
      ArrowRight: () => applyView({ ...view, panX: view.panX + PAN_STEP_YD }),
      ArrowUp: () => applyView({ ...view, panY: view.panY + PAN_STEP_YD }),
      ArrowDown: () => applyView({ ...view, panY: view.panY - PAN_STEP_YD }),
    };
    const handler = handlers[event.key];
    if (!handler || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    handler();
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Field view. Press plus or minus to zoom, arrow keys to pan when zoomed, zero to fit."
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ width: size.width, height: size.height }}
        className={cn("block", zoom > MIN_ZOOM && "touch-none")}
      />

      <div role="group" aria-label="Zoom controls" className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-lg border border-border bg-popover/90 shadow-raised backdrop-blur">
        <Button variant="ghost" size="icon-sm" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className="rounded-none">
          <Plus aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" className="rounded-none border-y border-border">
          <Minus aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleFit} disabled={zoom === MIN_ZOOM} aria-label="Fit field to view" className="rounded-none">
          <ScanLine aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
