// Pure colour science for the Vectorscope panel: sRGB decode, XYZ/CIELAB/Oklab
// transforms, and the four ColourModel projections that graticule geometry,
// density plots and readouts are built on. YCbCr and luma8 read encoded
// (gamma, 0..1) R'G'B' directly; every other model decodes through DECODE
// first and works in linear light.

export type Rgb = readonly [number, number, number];

/** RGBA, display-encoded sRGB. */
export interface Sample {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// --- sRGB EOTF -------------------------------------------------------------

/** The sRGB electro-optical transfer function (encoded 0..1 -> linear light). */
export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** srgbToLinear(i / 255) for every 8-bit code value, as a lookup table. */
export const DECODE: Float32Array = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  DECODE[i] = srgbToLinear(i / 255);
}

// --- Linear sRGB -> XYZ ------------------------------------------------------

/** Standard sRGB (D65) linear-RGB -> XYZ matrix, row-major. */
export const SRGB_TO_XYZ: readonly number[] = [
  0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522, 0.072175, 0.0193339, 0.119192, 0.9503041,
];

export function linearToXyz(r: number, g: number, b: number): Rgb {
  const m = SRGB_TO_XYZ;
  return [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b];
}

/** XYZ of sRGB white (1, 1, 1) — the row sums of SRGB_TO_XYZ. */
export const WHITE_XYZ: Rgb = linearToXyz(1, 1, 1);

function d65Uv(): readonly [number, number] {
  const [x, y, z] = WHITE_XYZ;
  const denom = x + 15 * y + 3 * z;
  return [(4 * x) / denom, (9 * y) / denom];
}

/** The D65 reference white in CIE 1976 UCS (u', v'), derived from WHITE_XYZ. */
export const D65_UV: readonly [number, number] = d65Uv();

// --- Luma / tonal range ------------------------------------------------------

/** Rec. 709 luma weights — also the Y' term inside the YCbCr projection. */
function rec709Luma(rp: number, gp: number, bp: number): number {
  return 0.2126 * rp + 0.7152 * gp + 0.0722 * bp;
}

/** Encoded Rec. 709 luma of an 8-bit display-space sample, 0..1. */
export function luma8(r8: number, g8: number, b8: number): number {
  return rec709Luma(r8 / 255, g8 / 255, b8 / 255);
}

export type TonalRange = "all" | "shadows" | "mids" | "highlights";

export const RANGE_ORDER: readonly TonalRange[] = ["all", "shadows", "mids", "highlights"];

const SHADOWS_MIDS_BOUNDARY = 1 / 3;
const MIDS_HIGHLIGHTS_BOUNDARY = 2 / 3;

export function inRange(luma: number, range: TonalRange): boolean {
  if (range === "all") return true;
  if (range === "shadows") return luma < SHADOWS_MIDS_BOUNDARY;
  if (range === "mids") return luma >= SHADOWS_MIDS_BOUNDARY && luma < MIDS_HIGHLIGHTS_BOUNDARY;
  return luma >= MIDS_HIGHLIGHTS_BOUNDARY;
}

// --- CIELAB ------------------------------------------------------------------

const LAB_EPSILON = 216 / 24389;
const LAB_LINEAR_SLOPE = 841 / 108;
const LAB_LINEAR_OFFSET = 4 / 29;

function labF(t: number): number {
  return t > LAB_EPSILON ? Math.cbrt(t) : t * LAB_LINEAR_SLOPE + LAB_LINEAR_OFFSET;
}

/** CIE XYZ (D65) -> CIELAB, returned as [L, a, b]. */
export function xyzToLab(x: number, y: number, z: number): Rgb {
  const [xn, yn, zn] = WHITE_XYZ;
  const fx = labF(x / xn);
  const fy = labF(y / yn);
  const fz = labF(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// --- Oklab ---------------------------------------------------------------------

/** Linear sRGB -> Oklab (Björn Ottosson), returned as [L, a, b]. */
export function linearToOklab(r: number, g: number, b: number): Rgb {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l3 = Math.cbrt(l);
  const m3 = Math.cbrt(m);
  const s3 = Math.cbrt(s);
  return [
    0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3,
    1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3,
    0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3,
  ];
}

// --- Angles --------------------------------------------------------------------

const FULL_TURN_DEG = 360;

/** Degrees counter-clockwise from +x, normalised to [0, 360). */
export function angleDeg(x: number, y: number): number {
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return deg < 0 ? deg + FULL_TURN_DEG : deg;
}

// --- Readout formatting ---------------------------------------------------------

const MINUS_SIGN = "−";

function withMinusSign(digits: string): string {
  return digits.startsWith("-") ? MINUS_SIGN + digits.slice(1) : digits;
}

function fixed(n: number, digits: number): string {
  return withMinusSign(n.toFixed(digits));
}

function rounded(n: number): string {
  return withMinusSign(String(Math.round(n)));
}

/** Math.round(angleDeg(x, y)), normalised so a rounded 360 prints as 0. */
function angleLabel(x: number, y: number): string {
  return String(Math.round(angleDeg(x, y)) % FULL_TURN_DEG);
}

function percentLabel(t: number): string {
  return rounded(100 * t);
}

// --- Colour models ---------------------------------------------------------------

export type ModelId = "ycbcr" | "uv" | "lab" | "oklab";

export interface ColourModel {
  id: ModelId;
  label: string;
  axes: readonly [string, string];
  /** Neutral (grey) samples project to the origin. */
  project(r8: number, g8: number, b8: number): [number, number];
  /** t = radius / unit radius (0..1+). */
  readout(x: number, y: number, t: number): string;
}

const YCBCR_CB_DIVISOR = 1.8556;
const YCBCR_CR_DIVISOR = 1.5748;

function projectYCbCr(r8: number, g8: number, b8: number): [number, number] {
  const rp = r8 / 255;
  const gp = g8 / 255;
  const bp = b8 / 255;
  const yp = rec709Luma(rp, gp, bp);
  return [(bp - yp) / YCBCR_CB_DIVISOR, (rp - yp) / YCBCR_CR_DIVISOR];
}

function readoutYCbCr(x: number, y: number, t: number): string {
  return `Cb ${fixed(x, 2)}  Cr ${fixed(y, 2)} · ${angleLabel(x, y)}°  ${percentLabel(t)} %`;
}

function projectUv(r8: number, g8: number, b8: number): [number, number] {
  const [x, y, z] = linearToXyz(DECODE[r8], DECODE[g8], DECODE[b8]);
  const d = x + 15 * y + 3 * z;
  if (d === 0) return [0, 0];
  return [(4 * x) / d - D65_UV[0], (9 * y) / d - D65_UV[1]];
}

function readoutUv(x: number, y: number, t: number): string {
  const uPrime = x + D65_UV[0];
  const vPrime = y + D65_UV[1];
  return `u′ ${fixed(uPrime, 3)}  v′ ${fixed(vPrime, 3)} · ${angleLabel(x, y)}°  ${percentLabel(t)} %`;
}

function projectLab(r8: number, g8: number, b8: number): [number, number] {
  const [x, y, z] = linearToXyz(DECODE[r8], DECODE[g8], DECODE[b8]);
  const [, a, b] = xyzToLab(x, y, z);
  return [a, b];
}

function readoutLab(x: number, y: number, _t: number): string {
  const chroma = Math.hypot(x, y);
  return `a ${rounded(x)}  b ${rounded(y)} · C ${rounded(chroma)}  h ${angleLabel(x, y)}°`;
}

function projectOklab(r8: number, g8: number, b8: number): [number, number] {
  const [, a, b] = linearToOklab(DECODE[r8], DECODE[g8], DECODE[b8]);
  return [a, b];
}

function readoutOklab(x: number, y: number, _t: number): string {
  const chroma = Math.hypot(x, y);
  return `a ${fixed(x, 2)}  b ${fixed(y, 2)} · C ${fixed(chroma, 2)}  h ${angleLabel(x, y)}°`;
}

export const MODELS: Readonly<Record<ModelId, ColourModel>> = {
  ycbcr: {
    id: "ycbcr",
    label: "YCbCr (Rec. 709)",
    axes: ["Cb", "Cr"],
    project: projectYCbCr,
    readout: readoutYCbCr,
  },
  uv: {
    id: "uv",
    label: "CIE u′v′",
    axes: ["u′", "v′"],
    project: projectUv,
    readout: readoutUv,
  },
  lab: {
    id: "lab",
    label: "CIELAB",
    axes: ["a", "b"],
    project: projectLab,
    readout: readoutLab,
  },
  oklab: {
    id: "oklab",
    label: "Oklab",
    axes: ["a", "b"],
    project: projectOklab,
    readout: readoutOklab,
  },
};

export const MODEL_ORDER: readonly ModelId[] = ["ycbcr", "uv", "lab", "oklab"];
