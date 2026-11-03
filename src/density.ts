// Vectorscope density: accumulates a sampled frame into a square density
// grid, tone-maps cell counts to an intensity curve, and colours the result
// into an RGBA buffer ready to paint on a canvas. The grid stays small
// (128..384 px per side, see gridSize) because it is rebuilt every time the
// scope redraws and only needs enough resolution to read as a trace, not
// photographic detail. DensityGrid.total is always the sample's full pixel
// count (width * height), never the count that survived a tonal-range
// filter — isolating "shadows" shows how sparse shadows are relative to the
// whole frame, instead of always renormalising density to fill the scope.

import type { ColourModel, Sample, TonalRange } from "./colour";
import { angleDeg, inRange, luma8 } from "./colour";
import type { Mapping } from "./graticule";
import { mapPoint } from "./graticule";

// --- Grid sizing -------------------------------------------------------------

const GRID_SIZE_MIN = 128;
const GRID_SIZE_MAX = 384;

/** min(maxPx, clamp(round(sqrt(sampleCount)), 128, 384)) — one cell per few source pixels. */
export function gridSize(sampleCount: number, maxPx: number): number {
  const bySampleCount = Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, Math.round(Math.sqrt(sampleCount))));
  return Math.min(maxPx, bySampleCount);
}

// --- Accumulation --------------------------------------------------------------

export interface DensityGrid {
  size: number;
  counts: Uint32Array;
  /** The sample's pixel count (width * height) — see the module comment. */
  total: number;
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Row-major flat index into a size x size grid, row 0 at the top. */
function cellIndex(ix: number, iy: number, size: number): number {
  return iy * size + ix;
}

/** Accumulates every in-range, in-gamut pixel of `sample`, projected by `model`, into a density grid. */
export function accumulate(
  sample: Sample,
  model: ColourModel,
  mapping: Mapping,
  range: TonalRange,
  size: number,
): DensityGrid {
  const { data, width, height } = sample;
  const total = width * height;
  const counts = new Uint32Array(size * size);
  const centre = size / 2;
  const radius = centre - 0.5;

  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (range !== "all" && !inRange(luma8(r, g, b), range)) continue;

    const [x, y] = model.project(r, g, b);
    const mapped = mapPoint(x, y, mapping);
    if (mapped === null) continue;
    const [px, py] = mapped;
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

    const ix = clampInt(Math.round(centre + px * radius), 0, size - 1);
    const iy = clampInt(Math.round(centre - py * radius), 0, size - 1);
    counts[cellIndex(ix, iy, size)]++;
  }

  return { size, counts, total };
}

// --- Tone mapping --------------------------------------------------------------

const TONE_CURVE_DIVISOR = 8;

/** 1 − exp(−count·intensity·cells / (8·total)); count and intensity trade off multiplicatively. */
export function toneMap(count: number, cells: number, total: number, intensity: number): number {
  return 1 - Math.exp((-count * intensity * cells) / (TONE_CURVE_DIVISOR * total));
}

// --- Painting --------------------------------------------------------------------

export type Rgb8 = readonly [number, number, number];

export interface Palette {
  ink: Rgb8;
  neutral: Rgb8;
  lift: Rgb8;
}

/** Per-channel linear interpolation: a + (b − a)·k. The one blend primitive paintDensity uses. */
export function mix(a: Rgb8, b: Rgb8, k: number): Rgb8 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const FULL_TURN_DEG = 360;
/** t (fraction of the disc radius) at which the neutral -> hue mix fully saturates. */
const HUE_SATURATION_RADIUS = 0.5;
/** Max weight given to `lift` as density v approaches its (sub-1) ceiling. */
const DENSITY_LIFT_WEIGHT = 0.4;

/**
 * Renders a density grid to an RGBA buffer (size*size*4, row-major, row 0 at
 * the top). Empty cells stay fully transparent. `lut === null` paints every
 * hit in `palette.ink`; otherwise hue comes from `lut` by angle, blended
 * toward `palette.lift` as density rises.
 */
export function paintDensity(
  grid: DensityGrid,
  lut: Uint8ClampedArray | null,
  palette: Palette,
  intensity: number,
): Uint8ClampedArray {
  const { size, counts, total } = grid;
  const cells = size * size;
  const out = new Uint8ClampedArray(cells * 4);
  const centre = size / 2;
  const radius = centre - 0.5;

  for (let iy = 0; iy < size; iy++) {
    for (let ix = 0; ix < size; ix++) {
      const count = counts[cellIndex(ix, iy, size)];
      if (count === 0) continue; // Uint8ClampedArray is zero-initialized: already transparent.

      const v = toneMap(count, cells, total, intensity);
      const o = cellIndex(ix, iy, size) * 4;
      out[o + 3] = Math.round(255 * v);

      if (lut === null) {
        out[o] = palette.ink[0];
        out[o + 1] = palette.ink[1];
        out[o + 2] = palette.ink[2];
        continue;
      }

      const dx = ix - centre;
      const dy = centre - iy;
      const t = Math.hypot(dx, dy) / radius;
      const hueIndex = Math.round(angleDeg(dx, dy)) % FULL_TURN_DEG;
      const hue: Rgb8 = [lut[hueIndex * 3], lut[hueIndex * 3 + 1], lut[hueIndex * 3 + 2]];
      const base = mix(palette.neutral, hue, Math.min(1, t / HUE_SATURATION_RADIUS));
      const colour = mix(base, palette.lift, DENSITY_LIFT_WEIGHT * v);

      out[o] = Math.round(colour[0]);
      out[o + 1] = Math.round(colour[1]);
      out[o + 2] = Math.round(colour[2]);
    }
  }

  return out;
}
