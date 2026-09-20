// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-4-brief.md

import { describe, expect, it } from "vitest";
import { MODELS, angleDeg } from "../src/colour";
import type { Sample } from "../src/colour";
import { gamutOutline, hueLut, mapPoint } from "../src/graticule";
import type { Mapping } from "../src/graticule";
import { accumulate, gridSize, paintDensity, toneMap } from "../src/density";
import type { Palette, Rgb8 } from "../src/density";

function close(a: number, b: number, tol: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
}

function sum(counts: Uint32Array): number {
  let total = 0;
  for (let i = 0; i < counts.length; i++) total += counts[i];
  return total;
}

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

const SIZE = 256;
const CENTRE = SIZE / 2;
const RADIUS = CENTRE - 0.5;

/** Reimplements accumulate's cell-placement formula from primitives, to cross-check the SUT. */
function cellOf(px: number, py: number): [number, number] {
  const ix = Math.min(SIZE - 1, Math.max(0, Math.round(CENTRE + px * RADIUS)));
  const iy = Math.min(SIZE - 1, Math.max(0, Math.round(CENTRE - py * RADIUS)));
  return [ix, iy];
}

function ycbcrMapping(): Mapping {
  return { unit: gamutOutline(MODELS.ycbcr).unit, scale: "linear", zoom: 1 };
}

describe("gridSize", () => {
  const cases: Array<[number, number, number]> = [
    [68000, 1000, 261],
    [1000, 1000, 128],
    [1e6, 1000, 384],
    [68000, 200, 200],
  ];

  it.each(cases)("gridSize(%i, %i) = %i", (sampleCount, maxPx, expected) => {
    expect(gridSize(sampleCount, maxPx)).toBe(expected);
  });
});

describe("accumulate", () => {
  it("a single pure-red pixel lands in exactly one cell, at the mapPoint-derived location", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(1, 1, 255, 0, 0);

    const [modelX, modelY] = MODELS.ycbcr.project(255, 0, 0);
    const mapped = mapPoint(modelX, modelY, mapping);
    expect(mapped).not.toBeNull();
    if (!mapped) return;
    const [ix, iy] = cellOf(mapped[0], mapped[1]);

    const grid = accumulate(sample, MODELS.ycbcr, mapping, "all", SIZE);
    expect(grid.counts[iy * SIZE + ix]).toBe(1);
    expect(sum(grid.counts)).toBe(1);
    expect(grid.total).toBe(1);
  });

  it("range 'shadows' keeps a pure-red pixel (luma 0.2126); 'highlights' drops it", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(1, 1, 255, 0, 0);

    const shadows = accumulate(sample, MODELS.ycbcr, mapping, "shadows", SIZE);
    expect(sum(shadows.counts)).toBe(1);

    const highlights = accumulate(sample, MODELS.ycbcr, mapping, "highlights", SIZE);
    expect(sum(highlights.counts)).toBe(0);
  });

  it("an all-black 4-pixel sample puts 4 in the centre cell and no NaN", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(2, 2, 0, 0, 0);
    const grid = accumulate(sample, MODELS.ycbcr, mapping, "all", SIZE);

    for (const count of grid.counts) expect(Number.isNaN(count)).toBe(false);

    // px = py = 0 for black -> ix = iy = round(CENTRE), independent of mapping.
    expect(grid.counts[CENTRE * SIZE + CENTRE]).toBe(4);
    expect(sum(grid.counts)).toBe(4);
  });

  it("total is the sample's full pixel count, independent of the range filter", () => {
    const mapping = ycbcrMapping();
    const data = new Uint8ClampedArray(2 * 1 * 4);
    data.set([255, 0, 0, 255], 0); // red: luma 0.2126, a shadow
    data.set([255, 255, 255, 255], 4); // white: luma 1, not a shadow
    const sample: Sample = { data, width: 2, height: 1 };

    const grid = accumulate(sample, MODELS.ycbcr, mapping, "shadows", SIZE);
    expect(grid.total).toBe(2);
    expect(sum(grid.counts)).toBe(1);
  });
});

describe("toneMap", () => {
  it("matches the documented curve", () => {
    close(toneMap(1, 100, 100, 1), 0.1175, 0.005);
    close(toneMap(10, 100, 100, 1), 0.7135, 0.005);
    close(toneMap(20, 100, 100, 1), 0.918, 0.005);
  });

  it("intensity and count trade off multiplicatively: 2x intensity at count 1 equals 1x at count 2", () => {
    close(toneMap(1, 100, 100, 2), toneMap(2, 100, 100, 1), 1e-9);
  });
});

const PALETTE: Palette = {
  ink: [220, 220, 220],
  neutral: [12, 16, 24],
  lift: [255, 255, 255],
};

describe("paintDensity — monochrome", () => {
  it("an empty cell is fully transparent; a hit cell is ink-coloured with alpha from toneMap", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(1, 1, 255, 0, 0);
    const grid = accumulate(sample, MODELS.ycbcr, mapping, "all", SIZE);

    const [modelX, modelY] = MODELS.ycbcr.project(255, 0, 0);
    const mapped = mapPoint(modelX, modelY, mapping);
    if (!mapped) throw new Error("expected an in-gamut mapping");
    const [ix, iy] = cellOf(mapped[0], mapped[1]);

    // The centre cell is untouched by a single non-black pixel.
    expect(grid.counts[CENTRE * SIZE + CENTRE]).toBe(0);

    const intensity = 1;
    const painted = paintDensity(grid, null, PALETTE, intensity);

    const emptyOffset = (CENTRE * SIZE + CENTRE) * 4;
    expect(painted[emptyOffset]).toBe(0);
    expect(painted[emptyOffset + 1]).toBe(0);
    expect(painted[emptyOffset + 2]).toBe(0);
    expect(painted[emptyOffset + 3]).toBe(0);

    const v = toneMap(1, SIZE * SIZE, grid.total, intensity);
    const hitOffset = (iy * SIZE + ix) * 4;
    expect(painted[hitOffset]).toBe(PALETTE.ink[0]);
    expect(painted[hitOffset + 1]).toBe(PALETTE.ink[1]);
    expect(painted[hitOffset + 2]).toBe(PALETTE.ink[2]);
    expect(painted[hitOffset + 3]).toBe(Math.round(255 * v));
  });
});

describe("paintDensity — colourised", () => {
  it("the rim cell (t > 0.5) takes the LUT hue at full saturation, lifted toward `lift`", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(1, 1, 255, 0, 0);
    const grid = accumulate(sample, MODELS.ycbcr, mapping, "all", SIZE);
    const lut = hueLut(gamutOutline(MODELS.ycbcr));

    const [modelX, modelY] = MODELS.ycbcr.project(255, 0, 0);
    const mapped = mapPoint(modelX, modelY, mapping);
    if (!mapped) throw new Error("expected an in-gamut mapping");
    const [ix, iy] = cellOf(mapped[0], mapped[1]);

    const dx = ix - CENTRE;
    const dy = CENTRE - iy;
    const t = Math.hypot(dx, dy) / RADIUS;
    expect(t).toBeGreaterThan(0.5); // confirms min(1, 2t) saturates: base is pure hue, no neutral

    const intensity = 1;
    const v = toneMap(1, SIZE * SIZE, grid.total, intensity);
    const hueIndex = Math.round(angleDeg(dx, dy)) % 360;
    const hue: Rgb8 = [lut[hueIndex * 3], lut[hueIndex * 3 + 1], lut[hueIndex * 3 + 2]];
    const expected = hue.map((channel, i) => Math.round(channel + (PALETTE.lift[i] - channel) * 0.4 * v));

    const painted = paintDensity(grid, lut, PALETTE, intensity);
    const offset = (iy * SIZE + ix) * 4;
    expect(painted[offset]).toBe(expected[0]);
    expect(painted[offset + 1]).toBe(expected[1]);
    expect(painted[offset + 2]).toBe(expected[2]);
    expect(painted[offset + 3]).toBe(Math.round(255 * v));
  });

  it("the centre cell (from an all-black sample) takes `neutral` lifted toward `lift`", () => {
    const mapping = ycbcrMapping();
    const sample = solidSample(2, 2, 0, 0, 0);
    const grid = accumulate(sample, MODELS.ycbcr, mapping, "all", SIZE);
    const lut = hueLut(gamutOutline(MODELS.ycbcr));

    const intensity = 1;
    const v = toneMap(4, SIZE * SIZE, grid.total, intensity);
    const expected = PALETTE.neutral.map((channel, i) => Math.round(channel + (PALETTE.lift[i] - channel) * 0.4 * v));

    const painted = paintDensity(grid, lut, PALETTE, intensity);
    const offset = (CENTRE * SIZE + CENTRE) * 4;
    expect(painted[offset]).toBe(expected[0]);
    expect(painted[offset + 1]).toBe(expected[1]);
    expect(painted[offset + 2]).toBe(expected[2]);
    expect(painted[offset + 3]).toBe(Math.round(255 * v));
  });
});
