// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-5-brief.md

import { describe, expect, it } from "vitest";
import type { Sample } from "../src/colour";
import { luma8 } from "../src/colour";
import type { Palette } from "../src/density";
import { toneMap } from "../src/density";
import { CHANNEL_COLOURS, LEVEL_LINES, accumulateWave, laneLayout, paintWave, waveGridSize } from "../src/waveform";

function solidSample(width: number, height: number, r: number, g: number, b: number): Sample {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

/** Builds a Sample from an explicit per-pixel RGB list, row-major, alpha 255. */
function sampleFromPixels(width: number, height: number, pixels: ReadonlyArray<readonly [number, number, number]>): Sample {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i];
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function sum(counts: Uint32Array): number {
  let total = 0;
  for (let i = 0; i < counts.length; i++) total += counts[i];
  return total;
}

const PALETTE: Palette = {
  ink: [220, 220, 220],
  neutral: [12, 16, 24],
  lift: [255, 255, 255],
};

describe("waveGridSize", () => {
  it("width clamps to min(sample.width, plotW); height clamps to min(256, plotH)", () => {
    const sample = solidSample(320, 213, 0, 0, 0);
    expect(waveGridSize(sample, 500, 300)).toEqual({ width: 320, height: 256 });
    expect(waveGridSize(sample, 200, 100)).toEqual({ width: 200, height: 100 });
  });
});

describe("accumulateWave — luma", () => {
  it("a white pixel at column 0 lands at row 7 of an 8-row grid; other column-0 rows stay empty", () => {
    // 2x1 sample: column 0 white, column 1 black — also exercises the
    // column mapping (the two pixels must not collapse into one cell).
    const sample = sampleFromPixels(2, 1, [
      [255, 255, 255],
      [0, 0, 0],
    ]);
    const grid = accumulateWave(sample, "luma", false, 2, 8);

    expect(grid.width).toBe(2);
    expect(grid.height).toBe(8);
    expect(grid.channels).toBe(1);
    expect(grid.total).toBe(2);
    expect(grid.sums).toBeNull();

    expect(grid.counts[7 * 2 + 0]).toBe(1);
    for (let row = 0; row < 7; row++) {
      expect(grid.counts[row * 2 + 0]).toBe(0);
    }
    // The black pixel (column 1) lands at its own cell — columns map
    // independently rather than collapsing to column 0.
    expect(grid.counts[0 * 2 + 1]).toBe(1);
    expect(sum(grid.counts)).toBe(2);
  });
});

describe("accumulateWave — column mapping when the grid is narrower than the sample", () => {
  it("a 4x1 sample into a 2-column grid packs source columns 0,1 into grid column 0 and 2,3 into grid column 1", () => {
    const sample = solidSample(4, 1, 128, 128, 128);
    // height 1 forces every pixel to row 0 regardless of luma, isolating the column mapping.
    const grid = accumulateWave(sample, "luma", false, 2, 1);
    expect(Array.from(grid.counts)).toEqual([2, 2]);
  });

  it("a 320px-wide sample into a 117-column grid maps its last column (px 319) to grid column 116, dropping nothing", () => {
    const BLACK: readonly [number, number, number] = [0, 0, 0];
    const WHITE: readonly [number, number, number] = [255, 255, 255];
    const pixels: Array<readonly [number, number, number]> = Array.from({ length: 320 }, (_, px) =>
      px === 319 ? WHITE : BLACK,
    );
    const sample = sampleFromPixels(320, 1, pixels);
    // height 8 separates the one white pixel (row 7) from the black run (row 0),
    // so its grid column is directly readable rather than merged into a sum.
    const grid = accumulateWave(sample, "luma", false, 117, 8);

    expect(grid.width).toBe(117);
    expect(grid.counts[7 * 117 + 116]).toBe(1);
    for (let col = 0; col < 116; col++) {
      expect(grid.counts[7 * 117 + col]).toBe(0);
    }
    // The width-1 clamp never lets a column index reach 117: if it did, that
    // pixel's count would silently vanish past the end of the typed array.
    expect(sum(grid.counts)).toBe(320);
  });
});

describe("accumulateWave — rgb", () => {
  it("a red pixel puts channel 0 at the top row, channels 1 and 2 at the bottom row", () => {
    const sample = sampleFromPixels(1, 1, [[255, 0, 0]]);
    const grid = accumulateWave(sample, "rgb", false, 1, 2);

    expect(grid.channels).toBe(3);
    expect(grid.sums).toBeNull();
    // index = (channel*height + row)*width + col; width=1, col=0, height=2.
    expect(Array.from(grid.counts)).toEqual([
      0, 1, // channel 0 (R): row 0 empty, row 1 (top) hit
      1, 0, // channel 1 (G): row 0 (bottom) hit, row 1 empty
      1, 0, // channel 2 (B): row 0 (bottom) hit, row 1 empty
    ]);
    expect(sum(grid.counts)).toBe(3);
  });
});

describe("accumulateWave — colourised luma", () => {
  it("sums accumulate the pixel's own RGB bytes at its luma row", () => {
    const sample = sampleFromPixels(1, 1, [[200, 130, 40]]);
    const grid = accumulateWave(sample, "luma", true, 1, 4);

    const row = Math.round(luma8(200, 130, 40) * (4 - 1));
    expect(grid.counts[row * 1 + 0]).toBe(1);

    const sums = grid.sums;
    if (!sums) throw new Error("expected sums to be allocated for a colourised luma trace");
    expect(sums[(0 * 4 + row) * 1 + 0]).toBe(200);
    expect(sums[(1 * 4 + row) * 1 + 0]).toBe(130);
    expect(sums[(2 * 4 + row) * 1 + 0]).toBe(40);
  });

  it("leaves sums null for a monochrome luma trace and for an rgb trace", () => {
    const sample = sampleFromPixels(1, 1, [[200, 130, 40]]);
    expect(accumulateWave(sample, "luma", false, 1, 4).sums).toBeNull();
    expect(accumulateWave(sample, "rgb", true, 1, 4).sums).toBeNull();
  });
});

describe("laneLayout", () => {
  it("splits 3 lanes with the default 4px gap", () => {
    expect(laneLayout(300, 3)).toEqual([
      { x0: 0, width: 97 },
      { x0: 101, width: 97 },
      { x0: 202, width: 97 },
    ]);
  });

  it("a single lane spans the full width with no gap applied", () => {
    expect(laneLayout(300, 1)).toEqual([{ x0: 0, width: 300 }]);
  });
});

describe("paintWave — luma monochrome", () => {
  it("paints ink at the white pixel's cell, alpha from toneMap, at image row height-1-7", () => {
    const sample = sampleFromPixels(2, 1, [
      [255, 255, 255],
      [0, 0, 0],
    ]);
    const grid = accumulateWave(sample, "luma", false, 2, 8);
    const layers = paintWave(grid, PALETTE, 1, false);

    expect(layers.length).toBe(1);

    // cells = width*height = 2*8 = 16, total = grid.total = 2 (both source pixels).
    const v = toneMap(1, 16, 2, 1);
    const offset = (0 * 2 + 0) * 4; // image row 8-1-7 = 0, column 0
    expect(layers[0][offset]).toBe(PALETTE.ink[0]);
    expect(layers[0][offset + 1]).toBe(PALETTE.ink[1]);
    expect(layers[0][offset + 2]).toBe(PALETTE.ink[2]);
    expect(layers[0][offset + 3]).toBe(Math.round(255 * v));

    // An untouched cell (image row 4, column 0) stays fully transparent.
    const emptyOffset = (4 * 2 + 0) * 4;
    expect(layers[0][emptyOffset]).toBe(0);
    expect(layers[0][emptyOffset + 3]).toBe(0);
  });
});

describe("paintWave — colourised luma", () => {
  it("blends the cell's mean colour toward `lift` by 0.4v", () => {
    const sample = sampleFromPixels(1, 1, [[200, 130, 40]]);
    const grid = accumulateWave(sample, "luma", true, 1, 4);
    const layers = paintWave(grid, PALETTE, 1, true);

    const row = Math.round(luma8(200, 130, 40) * (4 - 1));
    const v = toneMap(1, 1 * 4, grid.total, 1);
    const mean: readonly [number, number, number] = [200, 130, 40]; // count 1: mean == the pixel's own bytes
    const expected = mean.map((c, i) => Math.round(c + (PALETTE.lift[i] - c) * 0.4 * v));

    const imageRow = 4 - 1 - row;
    const offset = (imageRow * 1 + 0) * 4;
    expect(layers[0][offset]).toBe(expected[0]);
    expect(layers[0][offset + 1]).toBe(expected[1]);
    expect(layers[0][offset + 2]).toBe(expected[2]);
    expect(layers[0][offset + 3]).toBe(Math.round(255 * v));
  });
});

describe("paintWave — rgb", () => {
  it("returns three layers, each channel painted in CHANNEL_COLOURS[ch]", () => {
    const sample = sampleFromPixels(1, 1, [[255, 0, 0]]);
    const grid = accumulateWave(sample, "rgb", false, 1, 2);
    const layers = paintWave(grid, PALETTE, 1, false);

    expect(layers.length).toBe(3);
    const v = toneMap(1, 1 * 2, grid.total, 1);

    // Channel 0 (R): hit at row 1 -> image row 2-1-1 = 0.
    const rOffset = (0 * 1 + 0) * 4;
    expect(layers[0][rOffset]).toBe(CHANNEL_COLOURS[0][0]);
    expect(layers[0][rOffset + 1]).toBe(CHANNEL_COLOURS[0][1]);
    expect(layers[0][rOffset + 2]).toBe(CHANNEL_COLOURS[0][2]);
    expect(layers[0][rOffset + 3]).toBe(Math.round(255 * v));

    // Channel 1 (G): hit at row 0 -> image row 2-1-0 = 1.
    const gOffset = (1 * 1 + 0) * 4;
    expect(layers[1][gOffset]).toBe(CHANNEL_COLOURS[1][0]);
    expect(layers[1][gOffset + 1]).toBe(CHANNEL_COLOURS[1][1]);
    expect(layers[1][gOffset + 2]).toBe(CHANNEL_COLOURS[1][2]);
    expect(layers[1][gOffset + 3]).toBe(Math.round(255 * v));
  });
});

describe("constants", () => {
  it("CHANNEL_COLOURS is red, green, blue", () => {
    expect(CHANNEL_COLOURS).toEqual([
      [231, 76, 60],
      [46, 204, 113],
      [74, 163, 255],
    ]);
  });

  it("LEVEL_LINES marks the quarter levels", () => {
    expect(LEVEL_LINES).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
