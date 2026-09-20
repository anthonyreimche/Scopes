// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-8-brief.md

import { describe, expect, it } from "vitest";
import type { Sample } from "../src/colour";
import { MODELS } from "../src/colour";
import type { Mapping } from "../src/graticule";
import { gamutOutline, mapPoint } from "../src/graticule";
import type { ClientBox } from "../src/hover";
import { cursorReadout, pointToUv, samplePixel, vectorReadout, waveReadout } from "../src/hover";

function close(a: number, b: number, tol: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
}

const BOX: ClientBox = { left: 100, top: 50, width: 400, height: 300 };
const RECT = { x: 20, y: 10, w: 360, h: 280 };

describe("pointToUv", () => {
  it("maps a client point through the box and rect at scale 1", () => {
    const uv = pointToUv(200, 150, BOX, 400, RECT);
    expect(uv).not.toBeNull();
    if (!uv) return;
    close(uv.x, 0.2222, 1e-4);
    close(uv.y, 0.3214, 1e-4);
  });

  it("scales by clientWidth / box.width under an interface zoom (1.25x)", () => {
    const uv = pointToUv(200, 150, BOX, 500, RECT);
    expect(uv).not.toBeNull();
    if (!uv) return;
    close(uv.x, (125 - 20) / 360, 1e-9);
    close(uv.y, (125 - 10) / 280, 1e-9);
  });

  it("returns null outside the rect", () => {
    expect(pointToUv(110, 55, BOX, 400, RECT)).toBeNull();
  });

  it("returns null when rect is null", () => {
    expect(pointToUv(200, 150, BOX, 400, null)).toBeNull();
  });

  it("keeps uv on the closed [0, 1] boundary — the rect's own top-left corner", () => {
    const uv = pointToUv(120, 60, BOX, 400, RECT);
    expect(uv).not.toBeNull();
    if (!uv) return;
    close(uv.x, 0, 1e-9);
    close(uv.y, 0, 1e-9);
  });

  it.each([
    ["box.width", { ...BOX, width: 0 }, RECT],
    ["box.height", { ...BOX, height: 0 }, RECT],
    ["rect.w", BOX, { ...RECT, w: 0 }],
    ["rect.h", BOX, { ...RECT, h: 0 }],
  ] as const)("returns null when %s is <= 0", (_label, box, rect) => {
    expect(pointToUv(200, 150, box, 400, rect)).toBeNull();
  });
});

describe("samplePixel", () => {
  // 2x2, each pixel a distinct RGB so a wrong index is caught, not masked.
  const sample: Sample = {
    data: new Uint8ClampedArray([
      10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
    ]),
    width: 2,
    height: 2,
  };

  it("(0.5, 0.5) floors into the bottom-right pixel", () => {
    expect(samplePixel(sample, { x: 0.5, y: 0.5 })).toEqual([100, 110, 120]);
  });

  it("(1, 1) clamps to the same bottom-right pixel", () => {
    expect(samplePixel(sample, { x: 1, y: 1 })).toEqual([100, 110, 120]);
  });

  it("(0, 0) reads the top-left pixel", () => {
    expect(samplePixel(sample, { x: 0, y: 0 })).toEqual([10, 20, 30]);
  });
});

describe("vectorReadout", () => {
  it("matches MODELS.ycbcr.readout for pure red, at the gamut's own unit", () => {
    const unit = gamutOutline(MODELS.ycbcr).unit;
    const result = vectorReadout(MODELS.ycbcr, [255, 0, 0], unit);
    expect(result.text).toBe("Cb \u22120.11  Cr 0.50 \u00b7 103\u00b0  86 %");
  });
});

describe("cursorReadout", () => {
  it("reproduces vectorReadout's text from mapPoint's disc coordinates", () => {
    const model = MODELS.ycbcr;
    const unit = gamutOutline(model).unit;
    const mapping: Mapping = { unit, scale: "linear", zoom: 1 };
    const [x, y] = model.project(255, 0, 0);
    const mapped = mapPoint(x, y, mapping);
    expect(mapped).not.toBeNull();
    if (!mapped) return;
    expect(cursorReadout(model, mapped[0], mapped[1], mapping)).toBe("Cb \u22120.11  Cr 0.50 \u00b7 103\u00b0  86 %");
  });
});

describe("waveReadout", () => {
  it("luma: percent of encoded Rec. 709 luma", () => {
    expect(waveReadout("luma", [140, 140, 140])).toBe("Y 55 %");
  });

  it("rgb: percent per channel, two spaces between pairs, one before %", () => {
    expect(waveReadout("rgb", [158, 122, 102])).toBe("R 62  G 48  B 40 %");
  });
});
