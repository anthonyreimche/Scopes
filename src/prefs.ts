// Vectorscope display preferences: the panel's own controls (scope, model,
// trace, scale, zoom, range, colourize) and the Preferences rows (sample
// size, intensity, the graticule toggles). All of it is global — shared
// across every photo, never saved into a develop edit. It persists through
// the host's per-extension settings store, which keeps any key written via
// settings.set whether or not it is declared in SETTINGS_FIELDS, so
// validate() treats every stored value as untrusted and falls back to
// DEFAULT_PREFS for anything malformed.

import type { ModelId, TonalRange } from "./colour";
import { MODEL_ORDER, RANGE_ORDER } from "./colour";
import type { Scale, Zoom } from "./graticule";
import { api } from "./runtime";
import type { SettingsField } from "./safelight";
import type { ScopeType, Trace } from "./waveform";

// --- Keys and defaults -------------------------------------------------------

export type SampleSize = "low" | "medium" | "high";

export const SAMPLE_EDGES: Readonly<Record<SampleSize, number>> = {
  low: 192,
  medium: 320,
  high: 512,
};

export interface Prefs {
  scope: ScopeType;
  model: ModelId;
  trace: Trace;
  scale: Scale;
  zoom: Zoom;
  range: TonalRange;
  colorize: boolean;
  sampleSize: SampleSize;
  intensity: number;
  showRing: boolean;
  showTargets: boolean;
  showSkin: boolean;
  showGamut: boolean;
  showGrid: boolean;
  showLocus: boolean;
  showLevels: boolean;
}

export const SCOPE_ORDER: readonly ScopeType[] = ["vector", "wave", "parade"];
export const TRACE_ORDER: readonly Trace[] = ["luma", "rgb"];
export const SCALE_ORDER: readonly Scale[] = ["linear", "log"];
export const ZOOM_ORDER: readonly Zoom[] = [1, 2, 4];
export const SAMPLE_SIZE_ORDER: readonly SampleSize[] = ["low", "medium", "high"];

export const DEFAULT_PREFS: Readonly<Prefs> = {
  scope: "vector",
  model: "ycbcr",
  trace: "luma",
  scale: "linear",
  zoom: 1,
  range: "all",
  colorize: true,
  sampleSize: "medium",
  intensity: 1,
  showRing: true,
  showTargets: true,
  showSkin: true,
  showGamut: true,
  showGrid: true,
  showLocus: true,
  showLevels: true,
};

export const PREF_KEYS: readonly (keyof Prefs)[] = [
  "scope",
  "model",
  "trace",
  "scale",
  "zoom",
  "range",
  "colorize",
  "sampleSize",
  "intensity",
  "showRing",
  "showTargets",
  "showSkin",
  "showGamut",
  "showGrid",
  "showLocus",
  "showLevels",
];

// --- Validation ----------------------------------------------------------------

const INTENSITY_MIN = 0.25;
const INTENSITY_MAX = 4;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** The one membership check every enum-valued pref key shares. */
function validateEnum<T>(value: unknown, order: readonly T[], fallback: T): T {
  return (order as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function validateBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validateIntensity(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(value, INTENSITY_MIN, INTENSITY_MAX);
}

export function validate<K extends keyof Prefs>(key: K, value: unknown): Prefs[K] {
  switch (key) {
    case "scope":
      return validateEnum(value, SCOPE_ORDER, DEFAULT_PREFS.scope) as Prefs[K];
    case "model":
      return validateEnum(value, MODEL_ORDER, DEFAULT_PREFS.model) as Prefs[K];
    case "trace":
      return validateEnum(value, TRACE_ORDER, DEFAULT_PREFS.trace) as Prefs[K];
    case "scale":
      return validateEnum(value, SCALE_ORDER, DEFAULT_PREFS.scale) as Prefs[K];
    case "zoom":
      return validateEnum(value, ZOOM_ORDER, DEFAULT_PREFS.zoom) as Prefs[K];
    case "range":
      return validateEnum(value, RANGE_ORDER, DEFAULT_PREFS.range) as Prefs[K];
    case "sampleSize":
      return validateEnum(value, SAMPLE_SIZE_ORDER, DEFAULT_PREFS.sampleSize) as Prefs[K];
    case "intensity":
      return validateIntensity(value, DEFAULT_PREFS.intensity) as Prefs[K];
    default:
      return validateBoolean(value, DEFAULT_PREFS[key] as boolean) as Prefs[K];
  }
}

/** Writes into a local Prefs object through a generic K, so key and value stay correlated — `prefs[key] = value` does not typecheck once key is widened to `keyof Prefs`. */
function assignPref<K extends keyof Prefs>(prefs: Prefs, key: K, value: Prefs[K]): void {
  prefs[key] = value;
}

export type Getter = <T>(key: string, fallback: T) => T;

export function readPrefs(get: Getter): Prefs {
  const prefs: Prefs = { ...DEFAULT_PREFS };
  for (const key of PREF_KEYS) {
    assignPref(prefs, key, validate(key, get(key, DEFAULT_PREFS[key])));
  }
  return prefs;
}

// --- Preferences panel fields ---------------------------------------------------

export const SETTINGS_FIELDS: readonly SettingsField[] = [
  {
    key: "sampleSize",
    label: "Sample resolution",
    hint: "Long edge of the frame the scopes sample after each render.",
    type: "select",
    default: DEFAULT_PREFS.sampleSize,
    options: [
      { value: "low", label: "Low (192 px)" },
      { value: "medium", label: "Medium (320 px)" },
      { value: "high", label: "High (512 px)" },
    ],
  },
  {
    key: "intensity",
    label: "Trace intensity",
    hint: "Brightness of the trace.",
    type: "number",
    default: DEFAULT_PREFS.intensity,
    min: INTENSITY_MIN,
    max: INTENSITY_MAX,
    step: 0.25,
  },
  {
    key: "showRing",
    label: "Hue ring",
    hint: "The hue circle at the rim, coloured from the gamut outline.",
    type: "boolean",
    default: DEFAULT_PREFS.showRing,
  },
  {
    key: "showTargets",
    label: "Colour-bar targets",
    hint: "75 % and 100 % boxes for R, Mg, B, Cy, G, Yl.",
    type: "boolean",
    default: DEFAULT_PREFS.showTargets,
  },
  {
    key: "showSkin",
    label: "Skin-tone line",
    hint: "The mean direction of the ColorChecker skin patches.",
    type: "boolean",
    default: DEFAULT_PREFS.showSkin,
  },
  {
    key: "showGamut",
    label: "Gamut outline",
    hint: "The reach of sRGB in the current model.",
    type: "boolean",
    default: DEFAULT_PREFS.showGamut,
  },
  {
    key: "showGrid",
    label: "Grid",
    hint: "Axes and rings at 25, 50 and 75 % of the gamut reach.",
    type: "boolean",
    default: DEFAULT_PREFS.showGrid,
  },
  {
    key: "showLocus",
    label: "Planckian locus",
    hint: "Blackbody colours from 2000 to 20000 K, in CIE u′v′ only.",
    type: "boolean",
    default: DEFAULT_PREFS.showLocus,
  },
  {
    key: "showLevels",
    label: "Level lines",
    hint: "0 to 100 % lines on the waveform and parade.",
    type: "boolean",
    default: DEFAULT_PREFS.showLevels,
  },
];

// --- Live accessors --------------------------------------------------------------

export function livePrefs(): Prefs {
  return readPrefs(api().settings.get);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  api().settings.set(key, value);
}

export function resetPrefs(): void {
  for (const key of PREF_KEYS) {
    setPref(key, DEFAULT_PREFS[key]);
  }
}

/** A parade is three lanes of channels by definition; a stale luma pref must not collapse it to one. */
export function effectiveTrace(prefs: Prefs): Trace {
  return prefs.scope === "parade" ? "rgb" : prefs.trace;
}

export function usePrefs(): Prefs {
  const { useState, useEffect } = api().react;
  const [prefs, setPrefs] = useState(livePrefs);

  useEffect(() => {
    return api().settings.onChange(() => setPrefs(livePrefs()));
  }, []);

  return prefs;
}
