// The vectorscope's drawing pass over a plain frame the view assembles:
// graticule, cached trace layer, hue ring, hover marker, in that order, so
// the trace sits over the reference marks and under the rim and the cursor.
// Canvas strokes cannot resolve CSS variables, so every colour comes from
// the palette the view derived from the canvas's own background. The hue
// ring's conic gradient runs clockwise from +x with y pointing down, the
// opposite sense to the plot's angles, so a stop at fraction f carries the
// hue of plot angle (360 − 360·f) mod 360.

import type { ColourModel, Sample } from "./colour";
import { MODELS } from "./colour";
import type { Palette, Rgb8 } from "./density";
import type { Locus, Mapping, Outline } from "./graticule";
import { GRID_RINGS, gamutOutline, mapPoint, planckianLocus, radial, skinDirection, targets } from "./graticule";
import { cursorReadout, samplePixel, vectorReadout } from "./hover";
import type { Prefs } from "./prefs";
import type { Uv } from "./store";

export const PLOT_MARGIN = 10;

export interface VectorFrame {
  /** Plot size in CSS pixels; the vectorscope is square. */
  width: number;
  prefs: Prefs;
  sample: Sample | null;
  hoverUv: Uv | null;
  /** The pointer in disc coordinates, or null while it is away. */
  cursor: [number, number] | null;
  /** The current model's 360 x 3 hue lookup, as hueLut builds it. */
  hues: Uint8ClampedArray;
  /** The cached trace layer, or null before the first sample. */
  density: HTMLCanvasElement | null;
  palette: Palette;
  /** The resolved --font-mono family, for ctx.font. */
  mono: string;
}

export interface Disc {
  cx: number;
  cy: number;
  r: number;
}

export function discGeometry(width: number): Disc {
  const half = width / 2;
  return { cx: half, cy: half, r: half - PLOT_MARGIN };
}

/** The projection the graticule and the trace must share, or the two drift apart. */
export function discMapping(prefs: Prefs): Mapping {
  return { unit: gamutOutline(MODELS[prefs.model]).unit, scale: prefs.scale, zoom: prefs.zoom };
}

const TAU = Math.PI * 2;
const FULL_TURN_DEG = 360;
const HAIRLINE = 1;

const GRID_ALPHA = 0.18;
const OUTLINE_ALPHA = 0.45;
const GUIDE_ALPHA = 0.6;
const RING_ALPHA = 0.85;
const HALO_ALPHA = 0.5;

const TARGET_SIZE_100 = 5;
const TARGET_SIZE_75 = 4;
const TARGET_LABEL_PX = 9;
const TARGET_LABEL_OFFSET = 8;
const SKIN_DASH: number[] = [4, 3];
const LOCUS_TICK_PX = 3;
const RING_STOPS = 72;
const RING_WIDTH = 3;
const MARKER_RADIUS = 5;
const MARKER_WIDTH = 1.5;
const MARKER_HALO_WIDTH = 1;
const READOUT_PX = 10;
const READOUT_INSET = 6;

function rgbCss(colour: Rgb8): string {
  return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}

/** The one stroke style the graticule is drawn in: a hairline of ink at `alpha`. */
function hairline(ctx: CanvasRenderingContext2D, ink: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ink;
  ctx.lineWidth = HAIRLINE;
}

/** Disc coordinates (x right, y up, radius 1) -> canvas pixels. */
function toCanvas(disc: Disc, px: number, py: number): [number, number] {
  return [disc.cx + px * disc.r, disc.cy - py * disc.r];
}

function drawGrid(ctx: CanvasRenderingContext2D, disc: Disc, mapping: Mapping, ink: string): void {
  ctx.save();
  hairline(ctx, ink, GRID_ALPHA);
  ctx.beginPath();
  ctx.moveTo(disc.cx - disc.r, disc.cy);
  ctx.lineTo(disc.cx + disc.r, disc.cy);
  ctx.moveTo(disc.cx, disc.cy - disc.r);
  ctx.lineTo(disc.cx, disc.cy + disc.r);
  for (const ring of GRID_RINGS) {
    const s = radial(ring, mapping.scale) * mapping.zoom;
    if (s > 1) continue;
    ctx.moveTo(disc.cx + s * disc.r, disc.cy);
    ctx.arc(disc.cx, disc.cy, s * disc.r, 0, TAU);
  }
  ctx.stroke();
  ctx.restore();
}

/** Clamped to the rim rather than clipped: mapPoint drops points past it, which at 2x and 4x would open the polygon. */
function drawGamut(ctx: CanvasRenderingContext2D, disc: Disc, outline: Outline, mapping: Mapping, ink: string): void {
  ctx.save();
  hairline(ctx, ink, OUTLINE_ALPHA);
  ctx.beginPath();

  let started = false;
  const count = outline.points.length / 2;
  for (let i = 0; i < count; i++) {
    const x = outline.points[i * 2];
    const y = outline.points[i * 2 + 1];
    const r = Math.hypot(x, y);
    if (r === 0) continue;
    const s = Math.min(1, radial(r / mapping.unit, mapping.scale) * mapping.zoom);
    const [px, py] = toCanvas(disc, (x / r) * s, (y / r) * s);
    if (started) ctx.lineTo(px, py);
    else {
      ctx.moveTo(px, py);
      started = true;
    }
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawTargets(
  ctx: CanvasRenderingContext2D,
  disc: Disc,
  model: ColourModel,
  mapping: Mapping,
  ink: string,
  mono: string,
): void {
  ctx.save();
  hairline(ctx, ink, 1);
  ctx.fillStyle = ink;
  ctx.font = `${TARGET_LABEL_PX}px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const target of targets(model)) {
    const mapped = mapPoint(target.x, target.y, mapping);
    if (mapped === null) continue;
    const [tx, ty] = toCanvas(disc, mapped[0], mapped[1]);
    const size = target.level === 1 ? TARGET_SIZE_100 : TARGET_SIZE_75;
    ctx.strokeRect(tx - size / 2, ty - size / 2, size, size);

    if (target.level === 1) continue;
    const dx = tx - disc.cx;
    const dy = ty - disc.cy;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const offset = TARGET_LABEL_OFFSET / length;
    ctx.fillText(target.label, tx + dx * offset, ty + dy * offset);
  }

  ctx.restore();
}

function drawSkin(ctx: CanvasRenderingContext2D, disc: Disc, model: ColourModel, ink: string): void {
  const [dx, dy] = skinDirection(model);
  const [ex, ey] = toCanvas(disc, dx, dy);
  ctx.save();
  hairline(ctx, ink, GUIDE_ALPHA);
  ctx.setLineDash(SKIN_DASH);
  ctx.beginPath();
  ctx.moveTo(disc.cx, disc.cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.restore();
}

let locusCache: Locus | null = null;

function locus(): Locus {
  if (locusCache === null) locusCache = planckianLocus();
  return locusCache;
}

/** The unit normal of the drawn locus at (x, y), from its nearest drawn neighbours. */
function normalAt(path: readonly [number, number][], x: number, y: number): [number, number] | null {
  if (path.length < 2) return null;

  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const distance = Math.hypot(path[i][0] - x, path[i][1] - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  const before = path[Math.max(0, best - 1)];
  const after = path[Math.min(path.length - 1, best + 1)];
  const dx = after[0] - before[0];
  const dy = after[1] - before[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  return [-dy / length, dx / length];
}

function drawLocus(ctx: CanvasRenderingContext2D, disc: Disc, mapping: Mapping, ink: string): void {
  ctx.save();
  hairline(ctx, ink, GUIDE_ALPHA);

  const path: [number, number][] = [];
  ctx.beginPath();
  let started = false;
  for (const [x, y] of locus().points) {
    const mapped = mapPoint(x, y, mapping);
    if (mapped === null) {
      started = false;
      continue;
    }
    const point = toCanvas(disc, mapped[0], mapped[1]);
    path.push(point);
    if (started) ctx.lineTo(point[0], point[1]);
    else {
      ctx.moveTo(point[0], point[1]);
      started = true;
    }
  }
  ctx.stroke();

  const reach = LOCUS_TICK_PX / 2;
  ctx.beginPath();
  for (const tick of locus().ticks) {
    const mapped = mapPoint(tick.x, tick.y, mapping);
    if (mapped === null) continue;
    const [tx, ty] = toCanvas(disc, mapped[0], mapped[1]);
    const normal = normalAt(path, tx, ty);
    if (normal === null) continue;
    ctx.moveTo(tx - normal[0] * reach, ty - normal[1] * reach);
    ctx.lineTo(tx + normal[0] * reach, ty + normal[1] * reach);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrace(ctx: CanvasRenderingContext2D, disc: Disc, layer: HTMLCanvasElement): void {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer, disc.cx - disc.r, disc.cy - disc.r, disc.r * 2, disc.r * 2);
  ctx.restore();
}

function hueCss(hues: Uint8ClampedArray, degrees: number): string {
  const o = (degrees % FULL_TURN_DEG) * 3;
  return `rgb(${hues[o]}, ${hues[o + 1]}, ${hues[o + 2]})`;
}

function drawRing(ctx: CanvasRenderingContext2D, disc: Disc, hues: Uint8ClampedArray): void {
  const gradient = ctx.createConicGradient(0, disc.cx, disc.cy);
  for (let i = 0; i <= RING_STOPS; i++) {
    const fraction = i / RING_STOPS;
    const plotAngle = (FULL_TURN_DEG - fraction * FULL_TURN_DEG) % FULL_TURN_DEG;
    gradient.addColorStop(fraction, hueCss(hues, Math.round(plotAngle)));
  }

  ctx.save();
  ctx.globalAlpha = RING_ALPHA;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = RING_WIDTH;
  ctx.beginPath();
  ctx.arc(disc.cx, disc.cy, disc.r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette, ink: string): void {
  ctx.save();
  ctx.globalAlpha = HALO_ALPHA;
  ctx.strokeStyle = rgbCss(palette.lift);
  ctx.lineWidth = MARKER_WIDTH + 2 * MARKER_HALO_WIDTH;
  ctx.beginPath();
  ctx.arc(x, y, MARKER_RADIUS, 0, TAU);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = ink;
  ctx.lineWidth = MARKER_WIDTH;
  ctx.beginPath();
  ctx.arc(x, y, MARKER_RADIUS, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawReadout(ctx: CanvasRenderingContext2D, frame: VectorFrame, text: string, alpha: number, ink: string): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ink;
  ctx.font = `${READOUT_PX}px ${frame.mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, READOUT_INSET, frame.width - READOUT_INSET);
  ctx.restore();
}

/** The hovered pixel wins the readout; the pointer over the disc is the fallback, the model label the last resort. */
function drawHover(
  ctx: CanvasRenderingContext2D,
  frame: VectorFrame,
  disc: Disc,
  model: ColourModel,
  mapping: Mapping,
  ink: string,
): void {
  const { sample, hoverUv, cursor } = frame;

  if (sample !== null && hoverUv !== null) {
    const readout = vectorReadout(model, samplePixel(sample, hoverUv), mapping.unit);
    const mapped = mapPoint(readout.x, readout.y, mapping);
    if (mapped !== null) {
      const [mx, my] = toCanvas(disc, mapped[0], mapped[1]);
      drawMarker(ctx, mx, my, frame.palette, ink);
    }
    drawReadout(ctx, frame, readout.text, 1, ink);
    return;
  }

  if (cursor !== null && Math.hypot(cursor[0], cursor[1]) <= 1) {
    drawReadout(ctx, frame, cursorReadout(model, cursor[0], cursor[1], mapping), 1, ink);
    return;
  }

  drawReadout(ctx, frame, model.label, GUIDE_ALPHA, ink);
}

export function drawVectorscope(ctx: CanvasRenderingContext2D, frame: VectorFrame): void {
  const { prefs } = frame;
  const disc = discGeometry(frame.width);
  if (disc.r <= 0) return;

  const model = MODELS[prefs.model];
  const outline = gamutOutline(model);
  const mapping = discMapping(prefs);
  const ink = rgbCss(frame.palette.ink);

  if (prefs.showGrid) drawGrid(ctx, disc, mapping, ink);
  if (prefs.showGamut) drawGamut(ctx, disc, outline, mapping, ink);
  if (prefs.showTargets) drawTargets(ctx, disc, model, mapping, ink, frame.mono);
  if (prefs.showSkin) drawSkin(ctx, disc, model, ink);
  if (prefs.showLocus && model.id === "uv") drawLocus(ctx, disc, mapping, ink);
  if (frame.density !== null) drawTrace(ctx, disc, frame.density);
  if (prefs.showRing) drawRing(ctx, disc, frame.hues);
  drawHover(ctx, frame, disc, model, mapping, ink);
}
