// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-2-brief.md
//
// Note on the oklab readout case: the brief's prose (line 36) prints "h 29°"
// but its authoritative failing-tests line (line 38) prints "h 31°" for the
// same (0.22, 0.13, 0.8) input. Math.atan2(0.13, 0.22) is ~30.58deg, which
// rounds to 31 — confirmed against line 38 and independent computation.

import { describe, expect, it } from "vitest";
import {
  D65_UV,
  DECODE,
  MODEL_ORDER,
  MODELS,
  RANGE_ORDER,
  WHITE_XYZ,
  angleDeg,
  inRange,
  linearToOklab,
  linearToXyz,
  luma8,
  srgbToLinear,
  xyzToLab,
} from "../src/colour";

function close(a: number, b: number, tol: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
}

describe("srgbToLinear / DECODE", () => {
  it("has exact endpoints", () => {
    expect(DECODE[0]).toBe(0);
    expect(DECODE[255]).toBe(1);
  });

  it("matches the published midpoint value", () => {
    close(DECODE[128], 0.21586, 1e-4);
  });

  it("is exactly the float32-rounded output of srgbToLinear", () => {
    expect(DECODE[128]).toBe(Math.fround(srgbToLinear(128 / 255)));
  });
});

describe("SRGB_TO_XYZ derivatives", () => {
  it("WHITE_XYZ is the D65 reference white", () => {
    close(WHITE_XYZ[0], 0.95047, 1e-5);
    close(WHITE_XYZ[1], 1.0, 1e-5);
    close(WHITE_XYZ[2], 1.08883, 1e-5);
  });

  it("D65_UV is the D65 white point in CIE 1976 u'v'", () => {
    close(D65_UV[0], 0.19783, 5e-4);
    close(D65_UV[1], 0.46832, 5e-4);
  });
});

describe("MODELS.ycbcr.project — the six 100% bars", () => {
  const bars: Array<{ name: string; rgb: [number, number, number]; expected: [number, number] }> = [
    { name: "R", rgb: [255, 0, 0], expected: [-0.1146, 0.5] },
    { name: "G", rgb: [0, 255, 0], expected: [-0.3854, -0.4541] },
    { name: "B", rgb: [0, 0, 255], expected: [0.5, -0.0458] },
    { name: "Yl", rgb: [255, 255, 0], expected: [-0.5, 0.0458] },
    { name: "Cy", rgb: [0, 255, 255], expected: [0.1146, -0.5] },
    { name: "Mg", rgb: [255, 0, 255], expected: [0.3854, 0.4541] },
  ];

  it.each(bars)("$name projects to the documented (Cb, Cr)", ({ rgb, expected }) => {
    const [cb, cr] = MODELS.ycbcr.project(...rgb);
    close(cb, expected[0], 1e-3);
    close(cr, expected[1], 1e-3);
  });
});

describe("xyzToLab", () => {
  it("matches the reference Lab of sRGB blue", () => {
    const [x, y, z] = linearToXyz(0, 0, 1);
    const [l, a, b] = xyzToLab(x, y, z);
    close(l, 32.3, 0.5);
    close(a, 79.19, 0.5);
    close(b, -107.86, 0.5);
  });
});

describe("linearToOklab", () => {
  it("maps white to (1, 0, 0)", () => {
    const [l, a, b] = linearToOklab(1, 1, 1);
    close(l, 1, 1e-3);
    expect(Math.abs(a)).toBeLessThan(1e-3);
    expect(Math.abs(b)).toBeLessThan(1e-3);
  });

  it("matches the reference Oklab of sRGB red", () => {
    const [l, a, b] = linearToOklab(1, 0, 0);
    close(l, 0.628, 2e-3);
    close(a, 0.225, 2e-3);
    close(b, 0.126, 2e-3);
  });
});

describe("MODEL_ORDER", () => {
  it("lists the four models in the documented order", () => {
    expect(MODEL_ORDER).toEqual(["ycbcr", "uv", "lab", "oklab"]);
  });
});

describe("every model — neutral projects to the origin", () => {
  it.each(MODEL_ORDER)("%s: black is exactly the origin", (id) => {
    const [x, y] = MODELS[id].project(0, 0, 0);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });

  it.each(MODEL_ORDER)("%s: white is within 1e-6 of the origin", (id) => {
    const [x, y] = MODELS[id].project(255, 255, 255);
    close(Math.hypot(x, y), 0, 1e-6);
  });
});

describe("luma8", () => {
  it("reads encoded Rec. 709 luma", () => {
    expect(luma8(255, 255, 255)).toBe(1);
    expect(luma8(0, 0, 0)).toBe(0);
    close(luma8(255, 0, 0), 0.2126, 1e-9);
  });
});

describe("RANGE_ORDER", () => {
  it("lists all and the three tonal bands", () => {
    expect(RANGE_ORDER).toEqual(["all", "shadows", "mids", "highlights"]);
  });
});

describe("inRange", () => {
  it("splits shadows/mids/highlights at 1/3 and 2/3, mids-inclusive of both edges", () => {
    expect(inRange(0.33, "shadows")).toBe(true);
    expect(inRange(1 / 3, "mids")).toBe(true);
    expect(inRange(0.66, "mids")).toBe(true);
    expect(inRange(2 / 3, "highlights")).toBe(true);
  });

  it("'all' always matches", () => {
    for (const luma of [0, 0.1, 1 / 3, 0.5, 2 / 3, 1]) {
      expect(inRange(luma, "all")).toBe(true);
    }
  });
});

describe("readout formatting", () => {
  it("ycbcr: Cb/Cr, angle and percent", () => {
    expect(MODELS.ycbcr.readout(-0.1146, 0.5, 0.86)).toBe("Cb \u22120.11  Cr 0.50 \u00b7 103\u00b0  86 %");
  });

  it("uv: u'/v' with the D65 white point added back", () => {
    const x = 0.451 - D65_UV[0];
    const y = 0.523 - D65_UV[1];
    expect(MODELS.uv.readout(x, y, 0.83)).toBe("u\u2032 0.451  v\u2032 0.523 \u00b7 12\u00b0  83 %");
  });

  it("lab: integer a/b/C/h", () => {
    expect(MODELS.lab.readout(60, 40, 0.54)).toBe("a 60  b 40 \u00b7 C 72  h 34\u00b0");
  });

  it("oklab: two-decimal a/b/C, integer h", () => {
    expect(MODELS.oklab.readout(0.22, 0.13, 0.8)).toBe("a 0.22  b 0.13 \u00b7 C 0.26  h 31\u00b0");
  });
});

describe("angleDeg", () => {
  it("is counter-clockwise from +x in [0, 360)", () => {
    expect(angleDeg(0, 1)).toBe(90);
    expect(angleDeg(0, -1)).toBe(270);
  });
});
