// Vectorscope waveform and RGB parade: accumulates a sampled frame into a
// per-channel value/column grid and tone-maps it into one RGBA layer per
// channel. Grid layout is channels x height x width, row-major; row 0 is
// level 0, the bottom of the plot. Painted layers flip that vertically so
// level 1 lands at image row 0, the top.

import type { Sample } from "./colour";
import { luma8 } from "./colour";
import type { Palette, Rgb8 } from "./density";
import { mix, toneMap } from "./density";

export type Trace = "luma" | "rgb";
export type ScopeType = "vector" | "wave" | "parade";

export const CHANNEL_COLOURS: readonly Rgb8[] = [
  [231, 76, 60],
  [46, 204, 113],
  [74, 163, 255],
];

export const LEVEL_LINES: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

// --- Grid sizing -------------------------------------------------------------

const WAVE_GRID_MAX_HEIGHT = 256;

/** One grid column per source pixel (capped to the plot width); rows capped to the plot height and the 8-bit level range. */
export function waveGridSize(sample: Sample, plotW: number, plotH: number): { width: number; height: number } {
  return {
    width: Math.min(sample.width, plotW),
    height: Math.min(WAVE_GRID_MAX_HEIGHT, plotH),
  };
}

// --- Accumulation --------------------------------------------------------------

export interface WaveGrid {
  width: number;
  height: number;
  channels: 1 | 3;
  counts: Uint32Array;
  /** RGB byte sums per cell for the colourised luma trace (divide by count for the mean); null otherwise. */
  sums: Float32Array | null;
  total: number;
}

/** Row-major flat index into a (planes x height x width) buffer; row 0 = level 0 (bottom). */
function planeIndex(plane: number, row: number, col: number, height: number, width: number): number {
  return (plane * height + row) * width + col;
}

const BYTE_MAX = 255;

/** Accumulates every pixel of `sample` into a width x height grid: one row plane for luma, three (R/G/B) for rgb. */
export function accumulateWave(sample: Sample, trace: Trace, colorize: boolean, width: number, height: number): WaveGrid {
  const { data, width: sampleWidth, height: sampleHeight } = sample;
  const total = sampleWidth * sampleHeight;
  const channels: 1 | 3 = trace === "luma" ? 1 : 3;
  const counts = new Uint32Array(channels * height * width);
  const sums = trace === "luma" && colorize ? new Float32Array(3 * height * width) : null;

  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const px = i % sampleWidth;
    const col = Math.min(width - 1, Math.floor((px * width) / sampleWidth));

    if (trace === "luma") {
      const value = luma8(r, g, b) * BYTE_MAX;
      const row = Math.round((value / BYTE_MAX) * (height - 1));
      counts[planeIndex(0, row, col, height, width)]++;
      if (sums !== null) {
        sums[planeIndex(0, row, col, height, width)] += r;
        sums[planeIndex(1, row, col, height, width)] += g;
        sums[planeIndex(2, row, col, height, width)] += b;
      }
    } else {
      const bytes = [r, g, b];
      for (let ch = 0; ch < 3; ch++) {
        const row = Math.round((bytes[ch] / BYTE_MAX) * (height - 1));
        counts[planeIndex(ch, row, col, height, width)]++;
      }
    }
  }

  return { width, height, channels, counts, sums, total };
}

// --- Lane geometry --------------------------------------------------------------

export interface Lane {
  x0: number;
  width: number;
}

const DEFAULT_LANE_GAP = 4;

/** Splits `plotWidth` into `lanes` equal-width lanes separated by `gap` px. */
export function laneLayout(plotWidth: number, lanes: 1 | 3, gap: number = DEFAULT_LANE_GAP): Lane[] {
  const width = Math.floor((plotWidth - gap * (lanes - 1)) / lanes);
  const result: Lane[] = [];
  for (let i = 0; i < lanes; i++) {
    result.push({ x0: i * (width + gap), width });
  }
  return result;
}

// --- Painting --------------------------------------------------------------------

/** Weight given to `lift` in the colourised-luma blend, scaled by density v. */
const LUMA_LIFT_WEIGHT = 0.4;

/**
 * Renders a wave grid to one RGBA buffer per channel (width*height*4,
 * row-major, image row 0 at the top — level 1). Empty cells stay
 * transparent (Uint8ClampedArray is zero-initialised). A luma grid paints
 * `palette.ink` monochrome, or — when `colorize` and the grid carries
 * `sums` — the cell's mean colour lifted toward `palette.lift`; an rgb
 * grid paints each channel plane in `CHANNEL_COLOURS[ch]`.
 */
export function paintWave(grid: WaveGrid, palette: Palette, intensity: number, colorize: boolean): Uint8ClampedArray[] {
  const { width, height, channels, counts, sums, total } = grid;
  const cells = width * height;
  const layers: Uint8ClampedArray[] = [];

  for (let ch = 0; ch < channels; ch++) {
    const out = new Uint8ClampedArray(cells * 4);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const count = counts[planeIndex(ch, row, col, height, width)];
        if (count === 0) continue;

        const v = toneMap(count, cells, total, intensity);
        const imageRow = height - 1 - row;
        const o = (imageRow * width + col) * 4;
        out[o + 3] = Math.round(255 * v);

        let rgb: Rgb8;
        if (channels === 3) {
          rgb = CHANNEL_COLOURS[ch];
        } else if (colorize && sums !== null) {
          const mean: Rgb8 = [
            sums[planeIndex(0, row, col, height, width)] / count,
            sums[planeIndex(1, row, col, height, width)] / count,
            sums[planeIndex(2, row, col, height, width)] / count,
          ];
          rgb = mix(mean, palette.lift, LUMA_LIFT_WEIGHT * v);
        } else {
          rgb = palette.ink;
        }

        out[o] = Math.round(rgb[0]);
        out[o + 1] = Math.round(rgb[1]);
        out[o + 2] = Math.round(rgb[2]);
      }
    }

    layers.push(out);
  }

  return layers;
}
