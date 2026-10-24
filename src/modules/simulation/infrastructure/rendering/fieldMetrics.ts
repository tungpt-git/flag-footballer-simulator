import type { Vec2 } from "@/shared/kernel/geometry";
import { FIELD_CENTER_X, FIELD_TOTAL_YD, FIELD_WIDTH_YD } from "@/shared/kernel/field";
import { PLAY_VIEW_AHEAD_LOS_YD, PLAY_VIEW_BEHIND_LOS_YD } from "../../domain/constants";

export type FieldViewMode = "PLAY" | "FULL";

export type FieldViewport = { yMin: number; yMax: number };

/** User zoom/pan on top of the base viewport. Lives in a ref inside the canvas, never in the store. */
export type FieldView = {
  zoom: number;
  /** Offset of the view centre from the base centre, in yards. */
  panX: number;
  panY: number;
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const DEFAULT_FIELD_VIEW: FieldView = { zoom: 1, panX: 0, panY: 0 };

export type VisibleYards = { xMin: number; xMax: number; yMin: number; yMax: number };

export type FieldTransform = {
  /** Pixels per yard. */
  scale: number;
  viewport: FieldViewport;
  /** Field-space window currently inside the canvas. */
  visible: VisibleYards;
  /** Canvas-space rectangle of the whole playable field (may extend past the canvas when zoomed). */
  fieldRect: { left: number; top: number; width: number; height: number };
  toCanvas: (point: Vec2) => Vec2;
  toField: (point: Vec2) => Vec2;
  yardsToPixels: (yards: number) => number;
};

/** Visible vertical range, in field yards. */
export const getFieldViewport = (viewMode: FieldViewMode, losY: number): FieldViewport => {
  if (viewMode === "FULL") return { yMin: 0, yMax: FIELD_TOTAL_YD };
  const span = PLAY_VIEW_BEHIND_LOS_YD + PLAY_VIEW_AHEAD_LOS_YD;
  const yMax = Math.min(FIELD_TOTAL_YD, losY + PLAY_VIEW_AHEAD_LOS_YD);
  return { yMin: Math.max(0, yMax - span), yMax };
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Keeps the zoom in range and the view centre inside the field. */
export const clampFieldView = (view: FieldView, viewport: FieldViewport): FieldView => {
  const baseCenterY = (viewport.yMin + viewport.yMax) / 2;
  return {
    zoom: clamp(view.zoom, MIN_ZOOM, MAX_ZOOM),
    panX: clamp(view.panX, -FIELD_CENTER_X, FIELD_CENTER_X),
    panY: clamp(view.panY, -baseCenterY, FIELD_TOTAL_YD - baseCenterY),
  };
};

/**
 * Maps field yards to canvas pixels. Downfield (+y) points up the screen. The viewport is fitted to the
 * canvas (with padding) and then zoomed/panned around its centre.
 */
export const createFieldTransform = (
  canvasWidthPx: number,
  canvasHeightPx: number,
  viewport: FieldViewport,
  paddingPx: number,
  view: FieldView = DEFAULT_FIELD_VIEW,
): FieldTransform => {
  const viewportHeightYd = viewport.yMax - viewport.yMin;
  const availableWidth = Math.max(1, canvasWidthPx - paddingPx * 2);
  const availableHeight = Math.max(1, canvasHeightPx - paddingPx * 2);
  const fitScale = Math.min(availableWidth / FIELD_WIDTH_YD, availableHeight / viewportHeightYd);
  const scale = fitScale * view.zoom;

  const centerX = FIELD_CENTER_X + view.panX;
  const centerY = (viewport.yMin + viewport.yMax) / 2 + view.panY;

  const toCanvas = (point: Vec2): Vec2 => ({
    x: canvasWidthPx / 2 + (point.x - centerX) * scale,
    y: canvasHeightPx / 2 - (point.y - centerY) * scale,
  });
  const toField = (point: Vec2): Vec2 => ({
    x: centerX + (point.x - canvasWidthPx / 2) / scale,
    y: centerY - (point.y - canvasHeightPx / 2) / scale,
  });

  const topLeft = toCanvas({ x: 0, y: FIELD_TOTAL_YD });
  const bottomRight = toCanvas({ x: FIELD_WIDTH_YD, y: 0 });

  return {
    scale,
    viewport,
    visible: {
      xMin: centerX - canvasWidthPx / (2 * scale),
      xMax: centerX + canvasWidthPx / (2 * scale),
      yMin: centerY - canvasHeightPx / (2 * scale),
      yMax: centerY + canvasHeightPx / (2 * scale),
    },
    fieldRect: { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y },
    toCanvas,
    toField,
    yardsToPixels: (yards) => yards * scale,
  };
};
