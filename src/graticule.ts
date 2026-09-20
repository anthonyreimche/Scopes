// Graticule geometry for the Vectorscope panel: everything drawn around the
// trace — gamut outline, hue ring colours, colour-bar targets, skin-tone
// line, grid rings and the Planckian locus — plus the radial mapping from a
// model's plane onto the unit disc the scope is drawn in.
//
// The gamut hexagon's `unit` radius is sampled at every 8-bit byte along
// each edge, not just the 24-step polyline used for drawing: the polyline
// is a coarse drawing aid, and sampling only its vertices could undershoot
// the true maximum and let real 8-bit colours plot outside the disc. Angles
// throughout follow angleDeg's convention: degrees counter-clockwise from
// +x, in [0, 360).

import type { ColourModel, Rgb } from "./colour";
import { D65_UV, angleDeg } from "./colour";

// --- Gamut outline -----------------------------------------------------------

export interface Outline {
  points: Float32Array;
  colours: Uint8ClampedArray;
  unit: number;
}

export const OUTLINE_STEPS = 24;

const BYTE_MAX = 255;
const UNIT_SAMPLE_STEPS = 256;

export const BAR_ORDER: readonly { label: string; rgb: Rgb }[] = [
  { label: "R", rgb: [1, 0, 0] },
  { label: "Yl", rgb: [1, 1, 0] },
  { label: "G", rgb: [0, 1, 0] },
  { label: "Cy", rgb: [0, 1, 1] },
  { label: "B", rgb: [0, 0, 1] },
  { label: "Mg", rgb: [1, 0, 1] },
];

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(BYTE_MAX * (a + (b - a) * t));
}

/** The 8-bit RGB at fraction `t` (0..1) along the edge from bar `e` to bar `e + 1`, wrapping. */
function edgeBytes(e: number, t: number): readonly [number, number, number] {
  const a = BAR_ORDER[e].rgb;
  const b = BAR_ORDER[(e + 1) % BAR_ORDER.length].rgb;
  return [lerpByte(a[0], b[0], t), lerpByte(a[1], b[1], t), lerpByte(a[2], b[2], t)];
}

/** The largest projected radius over all six edges, sampled at every byte (not just OUTLINE_STEPS). */
function maxEdgeRadius(model: ColourModel): number {
  let unit = 0;
  for (let e = 0; e < BAR_ORDER.length; e++) {
    for (let k = 0; k < UNIT_SAMPLE_STEPS; k++) {
      const [r8, g8, b8] = edgeBytes(e, k / UNIT_SAMPLE_STEPS);
      const [x, y] = model.project(r8, g8, b8);
      const r = Math.hypot(x, y);
      if (r > unit) unit = r;
    }
  }
  return unit;
}

function buildOutline(model: ColourModel): Outline {
  const pointCount = BAR_ORDER.length * OUTLINE_STEPS;
  const points = new Float32Array(pointCount * 2);
  const colours = new Uint8ClampedArray(pointCount * 3);

  let i = 0;
  for (let e = 0; e < BAR_ORDER.length; e++) {
    for (let k = 0; k < OUTLINE_STEPS; k++) {
      const [r8, g8, b8] = edgeBytes(e, k / OUTLINE_STEPS);
      const [x, y] = model.project(r8, g8, b8);
      points[i * 2] = x;
      points[i * 2 + 1] = y;
      colours[i * 3] = r8;
      colours[i * 3 + 1] = g8;
      colours[i * 3 + 2] = b8;
      i++;
    }
  }

  return { points, colours, unit: maxEdgeRadius(model) };
}

const outlineCache = new Map<string, Outline>();

/** The gamut hexagon for `model`, memoised per `model.id`. */
export function gamutOutline(model: ColourModel): Outline {
  const cached = outlineCache.get(model.id);
  if (cached) return cached;
  const outline = buildOutline(model);
  outlineCache.set(model.id, outline);
  return outline;
}

// --- Hue ring ------------------------------------------------------------------

const HUE_DEGREES = 360;
const HALF_TURN_DEG = 180;
const FULL_TURN_DEG = 360;

function circularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % FULL_TURN_DEG;
  return diff > HALF_TURN_DEG ? FULL_TURN_DEG - diff : diff;
}

/** 360 x 3 bytes: entry `d` is the colour of the outline point whose angle is nearest `d`. */
export function hueLut(outline: Outline): Uint8ClampedArray {
  const pointCount = outline.points.length / 2;
  const angles = new Float32Array(pointCount);
  for (let p = 0; p < pointCount; p++) {
    angles[p] = angleDeg(outline.points[p * 2], outline.points[p * 2 + 1]);
  }

  const lut = new Uint8ClampedArray(HUE_DEGREES * 3);
  for (let d = 0; d < HUE_DEGREES; d++) {
    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < pointCount; p++) {
      const dist = circularDistanceDeg(angles[p], d);
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    lut[d * 3] = outline.colours[best * 3];
    lut[d * 3 + 1] = outline.colours[best * 3 + 1];
    lut[d * 3 + 2] = outline.colours[best * 3 + 2];
  }
  return lut;
}

// --- Radial mapping --------------------------------------------------------------

export type Scale = "linear" | "log";
export type Zoom = 1 | 2 | 4;
export const LOG_BASE = 16;

const LOG_BASE_MINUS_ONE = LOG_BASE - 1;
const LN_LOG_BASE = Math.log(LOG_BASE);

/** t (0..1, fraction of unit) -> disc radius (0..1). Linear is the identity; log expands low t. */
export function radial(t: number, scale: Scale): number {
  if (scale === "linear") return t;
  return Math.log1p(LOG_BASE_MINUS_ONE * t) / LN_LOG_BASE;
}

/** The exact inverse of radial: disc radius (0..1) -> t (0..1, fraction of unit). */
export function unradial(s: number, scale: Scale): number {
  if (scale === "linear") return s;
  return (Math.exp(s * LN_LOG_BASE) - 1) / LOG_BASE_MINUS_ONE;
}

export interface Mapping {
  unit: number;
  scale: Scale;
  zoom: Zoom;
}

/** Rescale (x, y) from radius `fromRadius` to radius `toRadius`, keeping direction. */
function alongDirection(x: number, y: number, fromRadius: number, toRadius: number): [number, number] {
  const factor = toRadius / fromRadius;
  return [x * factor, y * factor];
}

/** Model-plane (x, y) -> unit-disc coords, or null past the rim. */
export function mapPoint(x: number, y: number, m: Mapping): [number, number] | null {
  const r = Math.hypot(x, y);
  if (r === 0) return [0, 0];
  const t = r / m.unit;
  const s = radial(t, m.scale) * m.zoom;
  if (s > 1) return null;
  return alongDirection(x, y, r, s);
}

/** Unit-disc coords -> model-plane (x, y); the inverse of mapPoint. */
export function unmapPoint(px: number, py: number, m: Mapping): [number, number] {
  const r = Math.hypot(px, py);
  if (r === 0) return [0, 0];
  const s = r / m.zoom;
  const t = unradial(s, m.scale);
  return alongDirection(px, py, r, t * m.unit);
}

// --- Colour-bar targets ------------------------------------------------------------

export interface Target {
  label: string;
  level: 0.75 | 1;
  x: number;
  y: number;
}

const LEVEL_1_BYTE = BYTE_MAX;
const LEVEL_075_BYTE = Math.round(0.75 * BYTE_MAX);
const TARGET_LEVELS: readonly (0.75 | 1)[] = [1, 0.75];

/** The six bars at 100% and 75%: 12 targets, BAR_ORDER order within each level. */
export function targets(model: ColourModel): Target[] {
  const result: Target[] = [];
  for (const bar of BAR_ORDER) {
    for (const level of TARGET_LEVELS) {
      const lit = level === 1 ? LEVEL_1_BYTE : LEVEL_075_BYTE;
      const [x, y] = model.project(bar.rgb[0] * lit, bar.rgb[1] * lit, bar.rgb[2] * lit);
      result.push({ label: bar.label, level, x, y });
    }
  }
  return result;
}

// --- Skin tone -------------------------------------------------------------------

const SKIN_LIGHT: Rgb = [194, 150, 130];
const SKIN_DARK: Rgb = [115, 82, 68];

/** The mean direction of two ColorChecker skin patches, as a unit vector. */
export function skinDirection(model: ColourModel): [number, number] {
  const [x1, y1] = model.project(SKIN_LIGHT[0], SKIN_LIGHT[1], SKIN_LIGHT[2]);
  const [x2, y2] = model.project(SKIN_DARK[0], SKIN_DARK[1], SKIN_DARK[2]);
  const r1 = Math.hypot(x1, y1);
  const r2 = Math.hypot(x2, y2);

  const sumX = x1 / r1 + x2 / r2;
  const sumY = y1 / r1 + y2 / r2;
  const sumR = Math.hypot(sumX, sumY);
  return [sumX / sumR, sumY / sumR];
}

// --- Grid rings ------------------------------------------------------------------

export const GRID_RINGS: readonly number[] = [0.25, 0.5, 0.75];

// --- Planckian locus (Kim et al. 2002 approximation) -------------------------------

const PLANCKIAN_X_BREAK = 4000;
const PLANCKIAN_Y_BREAK_LOW = 2222;
const PLANCKIAN_Y_BREAK_HIGH = 4000;

/** CCT (K, 1667..25000) -> chromaticity x, via the Kim et al. 2002 cubic-in-1/T fit. */
function planckianX(kelvin: number): number {
  const invT = 1 / kelvin;
  const invT2 = invT * invT;
  const invT3 = invT2 * invT;
  return kelvin <= PLANCKIAN_X_BREAK
    ? -0.2661239e9 * invT3 - 0.2343589e6 * invT2 + 0.8776956e3 * invT + 0.17991
    : -3.0258469e9 * invT3 + 2.1070379e6 * invT2 + 0.2226347e3 * invT + 0.24039;
}

/** Chromaticity x (at this CCT) -> chromaticity y, via the matching cubic-in-x fit. */
function planckianY(kelvin: number, x: number): number {
  const x2 = x * x;
  const x3 = x2 * x;
  if (kelvin <= PLANCKIAN_Y_BREAK_LOW) {
    return -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683;
  }
  if (kelvin <= PLANCKIAN_Y_BREAK_HIGH) {
    return -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867;
  }
  return 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483;
}

/** The Planckian locus's CIE 1931 (x, y) chromaticity at a given colour temperature. */
export function planckianXy(kelvin: number): [number, number] {
  const x = planckianX(kelvin);
  return [x, planckianY(kelvin, x)];
}

function xyToUvOffset(x: number, y: number): [number, number] {
  const d = -2 * x + 12 * y + 3;
  return [(4 * x) / d - D65_UV[0], (9 * y) / d - D65_UV[1]];
}

export interface Locus {
  points: [number, number][];
  ticks: { kelvin: number; x: number; y: number }[];
}

const MIRED_START = 1e6 / 2000;
const MIRED_END = 1e6 / 20000;
const LOCUS_POINTS = 61;
const MIRED_STEP = (MIRED_START - MIRED_END) / (LOCUS_POINTS - 1);

const TICK_KELVINS: readonly number[] = [2500, 3200, 4000, 5500, 6500, 10000];

/** The Planckian locus from 2000K to 20000K, 61 points uniform in mired, as u'v' offsets from D65. */
export function planckianLocus(): Locus {
  const points: [number, number][] = [];
  for (let i = 0; i < LOCUS_POINTS; i++) {
    const kelvin = 1e6 / (MIRED_START - i * MIRED_STEP);
    const [x, y] = planckianXy(kelvin);
    points.push(xyToUvOffset(x, y));
  }

  const ticks = TICK_KELVINS.map((kelvin) => {
    const [x, y] = planckianXy(kelvin);
    const [ux, uy] = xyToUvOffset(x, y);
    return { kelvin, x: ux, y: uy };
  });

  return { points, ticks };
}
