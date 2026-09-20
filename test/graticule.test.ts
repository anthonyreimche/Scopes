// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-3-brief.md

import { describe, expect, it } from "vitest";
import { MODEL_ORDER, MODELS, angleDeg } from "../src/colour";
import type { ColourModel } from "../src/colour";
import {
  BAR_ORDER,
  GRID_RINGS,
  LOG_BASE,
  OUTLINE_STEPS,
  gamutOutline,
  hueLut,
  mapPoint,
  planckianLocus,
  planckianXy,
  radial,
  skinDirection,
  targets,
  unmapPoint,
  unradial,
} from "../src/graticule";

function close(a: number, b: number, tol: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
}

/** Forward angular step from `fromDeg` to `toDeg`, counter-clockwise, in [0, 360). */
function circularForwardDiff(fromDeg: number, toDeg: number): number {
  return (((toDeg - fromDeg) % 360) + 360) % 360;
}

/** Undirected angular distance, in [0, 180]. */
function circularAbsDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe("BAR_ORDER", () => {
  it("lists the six bars in the documented order, encoded 0..1", () => {
    expect(BAR_ORDER.map((bar) => bar.label)).toEqual(["R", "Yl", "G", "Cy", "B", "Mg"]);
    expect(BAR_ORDER.map((bar) => bar.rgb)).toEqual([
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
      [1, 0, 1],
    ]);
  });
});

describe("module constants", () => {
  it("OUTLINE_STEPS is 24", () => {
    expect(OUTLINE_STEPS).toBe(24);
  });

  it("LOG_BASE is 16", () => {
    expect(LOG_BASE).toBe(16);
  });

  it("GRID_RINGS is 0.25, 0.5, 0.75", () => {
    expect(GRID_RINGS).toEqual([0.25, 0.5, 0.75]);
  });
});

describe("gamutOutline", () => {
  it("ycbcr: 144 (x,y) points as 288 floats, 144 rgb bytes as 432 values", () => {
    const outline = gamutOutline(MODELS.ycbcr);
    expect(outline.points.length).toBe(288);
    expect(outline.colours.length).toBe(432);
  });

  it("is memoised per model id", () => {
    expect(gamutOutline(MODELS.ycbcr)).toBe(gamutOutline(MODELS.ycbcr));
  });

  // ycbcr's project() is affine in R'G'B', so every outline edge is provably
  // a straight line in Cb-Cr space and its angle is exactly monotone. uv/lab
  // decode through the nonlinear sRGB EOTF and oklab additionally through a
  // cube root, so their edges carry real curvature. At full 256-sample
  // (byte-resolution) sampling every model, including oklab, is monotone to
  // within float noise (<0.006 deg) — confirmed with a scratch scan. But
  // oklab's boundary has a smooth, genuine ~0.05 deg-deep dip right at the
  // pure-blue vertex (angle decreases approaching B, is lowest exactly at
  // B, then increases leaving it — verified DOWN...DOWN,MIN,UP...UP byte by
  // byte, not noise), and OUTLINE_STEPS=24 is coarse enough to land two
  // samples either side of that dip. BACKWARD_TOLERANCE_DEG absorbs that one
  // real, sub-tenth-of-a-degree dip without masking an actual mis-ordering
  // bug, which would show as a jump of tens of degrees, not hundredths.
  const BACKWARD_TOLERANCE_DEG = 0.1;

  it.each(MODEL_ORDER)("%s: consecutive outline points advance counter-clockwise", (id) => {
    const outline = gamutOutline(MODELS[id]);
    const pointCount = outline.points.length / 2;
    const angles: number[] = [];
    for (let i = 0; i < pointCount; i++) {
      angles.push(angleDeg(outline.points[i * 2], outline.points[i * 2 + 1]));
    }
    for (let i = 0; i < pointCount; i++) {
      const next = (i + 1) % pointCount;
      const diff = circularForwardDiff(angles[i], angles[next]);
      const signed = diff > 180 ? diff - 360 : diff;
      expect(signed).toBeGreaterThan(-BACKWARD_TOLERANCE_DEG);
      expect(signed).toBeLessThan(180);
    }
  });

  describe("unit — the byte-resolution max radius", () => {
    const UNIT_SAMPLE_STEPS = 256;

    function lerpByte(a: number, b: number, t: number): number {
      return Math.round(255 * (a + (b - a) * t));
    }

    function recomputeUnit(model: ColourModel): number {
      let unit = 0;
      for (let e = 0; e < BAR_ORDER.length; e++) {
        const a = BAR_ORDER[e].rgb;
        const b = BAR_ORDER[(e + 1) % BAR_ORDER.length].rgb;
        for (let k = 0; k < UNIT_SAMPLE_STEPS; k++) {
          const t = k / UNIT_SAMPLE_STEPS;
          const [x, y] = model.project(lerpByte(a[0], b[0], t), lerpByte(a[1], b[1], t), lerpByte(a[2], b[2], t));
          unit = Math.max(unit, Math.hypot(x, y));
        }
      }
      return unit;
    }

    it.each(MODEL_ORDER)("%s: unit equals the independently recomputed max radius", (id) => {
      close(gamutOutline(MODELS[id]).unit, recomputeUnit(MODELS[id]), 1e-9);
    });
  });

  describe("8-bit colours never exceed unit", () => {
    function makeLcgByte(seed: number): () => number {
      let state = seed >>> 0;
      return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return (state >>> 24) & 0xff;
      };
    }

    it("2000 seeded pseudo-random 8-bit colours stay within unit + 1e-6, in every model", () => {
      const next = makeLcgByte(0x5eed1919);
      const colours: Array<[number, number, number]> = [];
      for (let i = 0; i < 2000; i++) {
        colours.push([next(), next(), next()]);
      }

      for (const id of MODEL_ORDER) {
        const model = MODELS[id];
        const unit = gamutOutline(model).unit;
        for (const [r, g, b] of colours) {
          const [x, y] = model.project(r, g, b);
          expect(Math.hypot(x, y)).toBeLessThanOrEqual(unit + 1e-6);
        }
      }
    });
  });
});

describe("hueLut", () => {
  it.each(BAR_ORDER.map((bar) => bar.label))("ycbcr: %s's own angle returns exactly that bar's bytes", (label) => {
    const model = MODELS.ycbcr;
    const lut = hueLut(gamutOutline(model));
    const bar = BAR_ORDER.find((b) => b.label === label);
    const target = targets(model).find((t) => t.label === label && t.level === 1);
    if (!bar || !target) throw new Error(`missing bar/target for ${label}`);
    const d = Math.round(angleDeg(target.x, target.y)) % 360;
    expect(lut[d * 3]).toBe(bar.rgb[0] * 255);
    expect(lut[d * 3 + 1]).toBe(bar.rgb[1] * 255);
    expect(lut[d * 3 + 2]).toBe(bar.rgb[2] * 255);
  });

  // uv/lab/oklab: a hexagon vertex's true angle almost never lands exactly
  // on an integer degree, and among the outline's 144 points one immediate
  // neighbour of the vertex can sit fractionally closer to that degree than
  // the vertex itself does — e.g. uv's R vertex is at 12.174 deg, but the
  // point one 24th of the way around the adjacent Mg->R edge (bytes
  // 255,0,11) is at 11.925 deg, 0.075 deg from bucket 12 versus the vertex's
  // own 0.174 deg. hueLut's "nearest point by circular distance" contract
  // (correctly implemented) picks that neighbour, not the vertex. Verified
  // with a scratch dump that the winner is always the vertex's immediate
  // quantization-neighbour, so its colour is a near-exact match; this checks
  // that bound rather than byte-exact equality.
  const NEAR_TIE_MODELS = ["uv", "lab", "oklab"] as const;
  const NEAR_TIE_CHANNEL_TOLERANCE = 40;

  it.each(NEAR_TIE_MODELS)("%s: each bar's own angle is within a quantization tie of that bar's bytes", (id) => {
    const model = MODELS[id];
    const lut = hueLut(gamutOutline(model));
    const level1 = targets(model).filter((t) => t.level === 1);

    for (const bar of BAR_ORDER) {
      const target = level1.find((t) => t.label === bar.label);
      if (!target) throw new Error(`missing level-1 target for ${bar.label}`);
      const d = Math.round(angleDeg(target.x, target.y)) % 360;
      for (let channel = 0; channel < 3; channel++) {
        close(lut[d * 3 + channel], bar.rgb[channel] * 255, NEAR_TIE_CHANNEL_TOLERANCE);
      }
    }
  });
});

describe("radial", () => {
  it("log branch: exact endpoints", () => {
    expect(radial(0, "log")).toBe(0);
    close(radial(1, "log"), 1, 1e-12);
  });

  it("log branch expands small t outward past the diagonal", () => {
    expect(radial(0.1, "log")).toBeGreaterThan(0.1);
  });

  it("log branch is monotone increasing over 100 steps", () => {
    let prev = radial(0, "log");
    for (let i = 1; i <= 100; i++) {
      const value = radial(i / 100, "log");
      expect(value).toBeGreaterThan(prev);
      prev = value;
    }
  });

  it("linear branch is the identity", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(radial(t, "linear")).toBe(t);
    }
  });
});

describe("unradial", () => {
  it("exactly inverts radial for both scales", () => {
    const scales = ["linear", "log"] as const;
    for (const scale of scales) {
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        close(unradial(radial(t, scale), scale), t, 1e-9);
      }
    }
  });
});

describe("mapPoint / unmapPoint", () => {
  it("maps the origin to the origin", () => {
    const mapping = { unit: 10, scale: "linear" as const, zoom: 1 as const };
    expect(mapPoint(0, 0, mapping)).toEqual([0, 0]);
    expect(unmapPoint(0, 0, mapping)).toEqual([0, 0]);
  });

  it("the documented zoom-2 boundary example", () => {
    const unit = 10;
    const mapping = { unit, scale: "linear" as const, zoom: 2 as const };
    expect(mapPoint(unit * 0.6, 0, mapping)).toBeNull();

    const mapped = mapPoint(unit * 0.4, 0, mapping);
    expect(mapped).not.toBeNull();
    if (mapped) {
      close(mapped[0], 0.8, 1e-9);
      close(mapped[1], 0, 1e-9);
    }
  });

  it("preserves angle and round-trips through unmapPoint, across scales/angles/fractions", () => {
    const unit = 37.5;
    const scales = ["linear", "log"] as const;
    const fractions = [0.1, 0.3, 0.5, 0.7, 0.9];
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    for (const scale of scales) {
      for (const frac of fractions) {
        for (const deg of angles) {
          const rad = (deg * Math.PI) / 180;
          const x = unit * frac * Math.cos(rad);
          const y = unit * frac * Math.sin(rad);
          const mapping = { unit, scale, zoom: 1 as const };

          const mapped = mapPoint(x, y, mapping);
          expect(mapped).not.toBeNull();
          if (!mapped) continue;

          close(angleDeg(mapped[0], mapped[1]), angleDeg(x, y), 1e-6);

          const back = unmapPoint(mapped[0], mapped[1], mapping);
          const tol = unit * 1e-6;
          close(back[0], x, tol);
          close(back[1], y, tol);
        }
      }
    }
  });
});

describe("targets", () => {
  const bars = [
    { label: "R", angle: 103 },
    { label: "Yl", angle: 175 },
    { label: "G", angle: 230 },
    { label: "Cy", angle: 283 },
    { label: "B", angle: 355 },
    { label: "Mg", angle: 50 },
  ];

  it("has 12 entries: six bars at two levels, BAR_ORDER order within each level", () => {
    const result = targets(MODELS.ycbcr);
    expect(result).toHaveLength(12);
    const expectedLabels = BAR_ORDER.map((bar) => bar.label);
    expect(result.filter((t) => t.level === 1).map((t) => t.label)).toEqual(expectedLabels);
    expect(result.filter((t) => t.level === 0.75).map((t) => t.label)).toEqual(expectedLabels);
  });

  it.each(bars)("$label: level-1 YCbCr angle is documented", ({ label, angle }) => {
    const target = targets(MODELS.ycbcr).find((t) => t.label === label && t.level === 1);
    if (!target) throw new Error("missing target");
    close(angleDeg(target.x, target.y), angle, 1);
  });

  it.each(bars)("$label: the 0.75 target sits at the same angle but a smaller radius", ({ label }) => {
    const all = targets(MODELS.ycbcr);
    const level1 = all.find((t) => t.label === label && t.level === 1);
    const level075 = all.find((t) => t.label === label && t.level === 0.75);
    if (!level1 || !level075) throw new Error("missing target");

    close(circularAbsDiff(angleDeg(level1.x, level1.y), angleDeg(level075.x, level075.y)), 0, 0.5);
    expect(Math.hypot(level075.x, level075.y)).toBeLessThan(Math.hypot(level1.x, level1.y));
  });
});

describe("skinDirection", () => {
  it("is a unit vector", () => {
    const [x, y] = skinDirection(MODELS.ycbcr);
    close(Math.hypot(x, y), 1, 1e-9);
  });

  it("in YCbCr, points at about 123 degrees", () => {
    const [x, y] = skinDirection(MODELS.ycbcr);
    close(angleDeg(x, y), 123, 2);
  });

  it.each(MODEL_ORDER)("%s: sits strictly between the R and Yl bar angles, going counter-clockwise", (id) => {
    const model = MODELS[id];
    const level1 = targets(model).filter((t) => t.level === 1);
    const r = level1.find((t) => t.label === "R");
    const yl = level1.find((t) => t.label === "Yl");
    if (!r || !yl) throw new Error("missing R/Yl target");

    const rAngle = angleDeg(r.x, r.y);
    const ylAngle = angleDeg(yl.x, yl.y);
    const [sx, sy] = skinDirection(model);
    const skinAngle = angleDeg(sx, sy);

    const span = circularForwardDiff(rAngle, ylAngle);
    const rel = circularForwardDiff(rAngle, skinAngle);
    expect(rel).toBeGreaterThan(0);
    expect(rel).toBeLessThan(span);
  });
});

describe("planckianXy", () => {
  it("6500K", () => {
    const [x, y] = planckianXy(6500);
    close(x, 0.3135, 0.002);
    close(y, 0.3237, 0.002);
  });

  it("2856K", () => {
    const [x, y] = planckianXy(2856);
    close(x, 0.4476, 0.002);
    close(y, 0.4074, 0.002);
  });
});

describe("planckianLocus", () => {
  it("has 61 points uniform in mired from 2000K to 20000K", () => {
    expect(planckianLocus().points.length).toBe(61);
  });

  it("has the documented tick kelvins", () => {
    expect(planckianLocus().ticks.map((t) => t.kelvin)).toEqual([2500, 3200, 4000, 5500, 6500, 10000]);
  });

  it("the 6500K tick sits within 0.01 of the D65 origin", () => {
    const tick = planckianLocus().ticks.find((t) => t.kelvin === 6500);
    if (!tick) throw new Error("missing 6500K tick");
    expect(Math.hypot(tick.x, tick.y)).toBeLessThan(0.01);
  });
});
