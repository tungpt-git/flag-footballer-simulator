import {
  END_ZONE_YD,
  FIELD_LENGTH_YD,
  FIELD_TOTAL_YD,
  FIELD_WIDTH_YD,
  GOAL_LINE_Y,
  HASH_X_LEFT,
  HASH_X_RIGHT,
} from "@/shared/kernel/field";
import { CANVAS_COLORS, getCanvasFonts } from "./colors";
import type { FieldTransform } from "./fieldMetrics";

const STRIPE_YD = 5;
const LINE_SPACING_YD = 5;

const strokeLine = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
  color: string,
): void => {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
};

/** Mowing stripes every 5 yards plus a soft edge shade so the turf reads as a surface, not a flat fill. */
const drawTurf = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  const widthPx = transform.yardsToPixels(FIELD_WIDTH_YD);
  const stripes = GOAL_LINE_Y / STRIPE_YD;

  for (let stripe = 0; stripe < stripes; stripe += 1) {
    const top = transform.toCanvas({ x: 0, y: (stripe + 1) * STRIPE_YD });
    ctx.fillStyle = stripe % 2 === 0 ? CANVAS_COLORS.turfLight : CANVAS_COLORS.turfDark;
    ctx.fillRect(top.x, top.y - 0.5, widthPx, transform.yardsToPixels(STRIPE_YD) + 1);
  }
};

const drawEndZone = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  const top = transform.toCanvas({ x: 0, y: FIELD_TOTAL_YD });
  const widthPx = transform.yardsToPixels(FIELD_WIDTH_YD);
  const heightPx = transform.yardsToPixels(END_ZONE_YD);
  ctx.fillStyle = CANVAS_COLORS.endZone;
  ctx.fillRect(top.x, top.y, widthPx, heightPx);

  // Diagonal pylon hatching.
  ctx.save();
  ctx.beginPath();
  ctx.rect(top.x, top.y, widthPx, heightPx);
  ctx.clip();
  ctx.strokeStyle = CANVAS_COLORS.endZoneStripe;
  ctx.lineWidth = Math.max(2, transform.yardsToPixels(0.9));
  const step = transform.yardsToPixels(2.2);
  for (let offset = -heightPx; offset < widthPx; offset += step) {
    ctx.beginPath();
    ctx.moveTo(top.x + offset, top.y + heightPx);
    ctx.lineTo(top.x + offset + heightPx, top.y);
    ctx.stroke();
  }
  ctx.restore();

  const center = transform.toCanvas({ x: FIELD_WIDTH_YD / 2, y: GOAL_LINE_Y + END_ZONE_YD / 2 });
  ctx.save();
  ctx.fillStyle = CANVAS_COLORS.endZoneText;
  ctx.font = `600 ${Math.max(14, transform.yardsToPixels(2.6))}px ${getCanvasFonts().display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("E N D   Z O N E", center.x, center.y);
  ctx.restore();
};

const drawYardLines = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  const widthPx = transform.yardsToPixels(FIELD_WIDTH_YD);
  const unit = Math.max(1, transform.yardsToPixels(0.11));

  for (let yard = 0; yard <= GOAL_LINE_Y; yard += LINE_SPACING_YD) {
    if (yard < transform.visible.yMin - 1 || yard > transform.visible.yMax + 1) continue;
    const left = transform.toCanvas({ x: 0, y: yard });
    const isMajor = yard === 0 || yard === GOAL_LINE_Y || yard % 10 === 0;
    const isBoundary = yard === GOAL_LINE_Y;
    strokeLine(
      ctx,
      left,
      { x: left.x + widthPx, y: left.y },
      isBoundary ? unit * 2 : isMajor ? unit * 1.3 : unit,
      isMajor ? CANVAS_COLORS.line : CANVAS_COLORS.lineSoft,
    );
  }
};

const drawYardNumbers = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  ctx.save();
  ctx.fillStyle = CANVAS_COLORS.yardNumber;
  ctx.font = `600 ${Math.max(12, transform.yardsToPixels(2.5))}px ${getCanvasFonts().display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let yard = 10; yard < GOAL_LINE_Y; yard += 10) {
    if (yard < transform.visible.yMin - 2 || yard > transform.visible.yMax + 2) continue;
    const label = String(FIELD_LENGTH_YD - yard);
    const leftPoint = transform.toCanvas({ x: 3.4, y: yard - 1.2 });
    const rightPoint = transform.toCanvas({ x: FIELD_WIDTH_YD - 3.4, y: yard - 1.2 });

    ctx.save();
    ctx.translate(leftPoint.x, leftPoint.y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(rightPoint.x, rightPoint.y);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
};

const drawHashMarks = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  const firstYard = Math.max(0, Math.ceil(transform.visible.yMin));
  const lastYard = Math.min(GOAL_LINE_Y, Math.floor(transform.visible.yMax));
  const tickLengthPx = transform.yardsToPixels(0.8);
  const lineWidth = Math.max(1, transform.yardsToPixels(0.09));
  const leftEdge = transform.toCanvas({ x: 0, y: 0 }).x;
  const rightEdge = transform.toCanvas({ x: FIELD_WIDTH_YD, y: 0 }).x;

  for (let yard = firstYard; yard <= lastYard; yard += 1) {
    if (yard % LINE_SPACING_YD === 0) continue;
    const rowY = transform.toCanvas({ x: 0, y: yard }).y;
    [HASH_X_LEFT, HASH_X_RIGHT].forEach((hashX) => {
      const x = transform.toCanvas({ x: hashX, y: 0 }).x;
      strokeLine(ctx, { x: x - tickLengthPx / 2, y: rowY }, { x: x + tickLengthPx / 2, y: rowY }, lineWidth, CANVAS_COLORS.line);
    });
    strokeLine(ctx, { x: leftEdge, y: rowY }, { x: leftEdge + tickLengthPx, y: rowY }, lineWidth, CANVAS_COLORS.lineSoft);
    strokeLine(ctx, { x: rightEdge, y: rowY }, { x: rightEdge - tickLengthPx, y: rowY }, lineWidth, CANVAS_COLORS.lineSoft);
  }
};

const drawGameLineTag = (ctx: CanvasRenderingContext2D, transform: FieldTransform, y: number, text: string, color: string): void => {
  const anchor = transform.toCanvas({ x: 0, y });
  const fontPx = Math.max(10, transform.yardsToPixels(1.15));
  ctx.save();
  ctx.font = `700 ${fontPx}px ${getCanvasFonts().mono}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const padding = 5;
  const textWidth = ctx.measureText(text).width;
  const height = fontPx + 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(anchor.x + 4, anchor.y - height - 3, textWidth + padding * 2, height, 4);
  ctx.fill();
  ctx.fillStyle = CANVAS_COLORS.ink;
  ctx.fillText(text, anchor.x + 4 + padding, anchor.y - height / 2 - 3);
  ctx.restore();
};

/** Scrimmage and first-down lines, each with a text tag so they are identifiable without colour. */
const drawGameLines = (ctx: CanvasRenderingContext2D, transform: FieldTransform, losY: number): void => {
  const widthPx = transform.yardsToPixels(FIELD_WIDTH_YD);
  const toGainY = losY + 10;

  if (toGainY < GOAL_LINE_Y) {
    const toGain = transform.toCanvas({ x: 0, y: toGainY });
    strokeLine(ctx, toGain, { x: toGain.x + widthPx, y: toGain.y }, Math.max(2, transform.yardsToPixels(0.28)), CANVAS_COLORS.toGain);
    drawGameLineTag(ctx, transform, toGainY, "1ST DOWN", CANVAS_COLORS.toGain);
  }

  const scrimmage = transform.toCanvas({ x: 0, y: losY });
  strokeLine(ctx, scrimmage, { x: scrimmage.x + widthPx, y: scrimmage.y }, Math.max(2, transform.yardsToPixels(0.28)), CANVAS_COLORS.scrimmage);
  drawGameLineTag(ctx, transform, losY, "LOS", CANVAS_COLORS.scrimmage);
};

/** Soft darkening toward the sidelines. */
const drawVignette = (ctx: CanvasRenderingContext2D, transform: FieldTransform): void => {
  const { left, top, width, height } = transform.fieldRect;
  const gradient = ctx.createLinearGradient(left, 0, left + width, 0);
  gradient.addColorStop(0, CANVAS_COLORS.turfShade);
  gradient.addColorStop(0.16, "rgba(4, 28, 14, 0)");
  gradient.addColorStop(0.84, "rgba(4, 28, 14, 0)");
  gradient.addColorStop(1, CANVAS_COLORS.turfShade);
  ctx.fillStyle = gradient;
  ctx.fillRect(left, top, width, height);
};

/**
 * Draws the static field layer on a transparent canvas: turf, end zone, yard lines, hash marks,
 * yard numbers, scrimmage and first-down lines. The stage colour behind it comes from the DOM.
 */
export const drawField = (ctx: CanvasRenderingContext2D, transform: FieldTransform, losY: number): void => {
  const { left, top, width, height } = transform.fieldRect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();

  drawTurf(ctx, transform);
  drawEndZone(ctx, transform);
  drawVignette(ctx, transform);
  drawYardLines(ctx, transform);
  drawHashMarks(ctx, transform);
  drawYardNumbers(ctx, transform);
  drawGameLines(ctx, transform, losY);
  ctx.restore();

  ctx.lineWidth = Math.max(2, transform.yardsToPixels(0.2));
  ctx.strokeStyle = CANVAS_COLORS.line;
  ctx.strokeRect(left, top, width, height);
};
