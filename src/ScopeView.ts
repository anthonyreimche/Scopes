// The Scopes canvas: sizing, subscriptions, the trace cache and pointer
// handling, with the drawing itself delegated to draw-vector/draw-wave.
//
// Ink cannot come from CSS: canvas strokes and ctx.font never resolve
// var(), so the palette is derived from the canvas's own resolved
// background colour and the mono family is read off the document element
// once per draw. Both are re-read whenever the theme store changes or the
// document element's style or class does, which is how overrides such as
// high contrast recolour the surface without changing the active theme.
//
// Rebuilding a trace costs a pass over every sampled pixel, so one painted
// layer per channel is cached against a key covering everything that can
// change it — the sample's identity, every pref the paint depends on, the
// grid size and the ink direction.

import type { PointerEvent as ReactPointerEvent, ReactElement, RefObject } from "react";
import type { ColourModel, ModelId, Sample } from "./colour";
import { MODELS } from "./colour";
import type { Palette } from "./density";
import { accumulate, gridSize, paintDensity } from "./density";
import { discGeometry, discMapping, drawVectorscope } from "./draw-vector";
import { drawWaveform, wavePlot } from "./draw-wave";
import { gamutOutline, hueLut } from "./graticule";
import type { Prefs } from "./prefs";
import { effectiveTrace } from "./prefs";
import { api, h } from "./runtime";
import type { StoreApi, ThemeStoreState } from "./safelight";
import { store } from "./store";
import { accumulateWave, paintWave, waveGridSize } from "./waveform";

export { PLOT_MARGIN } from "./draw-vector";
export { LEVEL_GUTTER } from "./draw-wave";

const WAVE_HEIGHT_RATIO = 0.55;
const WAVE_HEIGHT_MIN = 96;

/** The waveform and parade are letterboxed: 55 % of the panel width, never under 96 px. */
export function waveHeight(width: number): number {
  return Math.max(WAVE_HEIGHT_MIN, Math.round(WAVE_HEIGHT_RATIO * width));
}

// --- Palette -------------------------------------------------------------------

export interface PaletteChoice {
  palette: Palette;
  dark: boolean;
}

const DARK_SURFACE: PaletteChoice = {
  palette: { ink: [235, 235, 235], neutral: [200, 200, 200], lift: [255, 255, 255] },
  dark: true,
};

const LIGHT_SURFACE: PaletteChoice = {
  palette: { ink: [25, 25, 25], neutral: [70, 70, 70], lift: [0, 0, 0] },
  dark: false,
};

const DARK_SURFACE_MEAN = 128;

export function paletteForBackground(r: number, g: number, b: number): PaletteChoice {
  return (r + g + b) / 3 < DARK_SURFACE_MEAN ? DARK_SURFACE : LIGHT_SURFACE;
}

const RGB_CHANNELS = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/;

/** The ink for a canvas, from its resolved background; anything unreadable counts as dark. */
export function paletteFor(canvas: HTMLCanvasElement): PaletteChoice {
  const match = RGB_CHANNELS.exec(getComputedStyle(canvas).backgroundColor);
  if (match === null) return DARK_SURFACE;
  return paletteForBackground(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Calls onChange when the active theme switches or the document element's style or class changes; returns the cleanup. */
export function watchTheme(themeStore: StoreApi<ThemeStoreState>, onChange: () => void): () => void {
  const unsubscribe = themeStore.subscribe((state, previous) => {
    if (state.activeId !== previous.activeId) onChange();
  });
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  return () => {
    unsubscribe();
    observer.disconnect();
  };
}

const FALLBACK_MONO = "ui-monospace, monospace";

function monoFamily(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || FALLBACK_MONO;
}

// --- Hue lookup ------------------------------------------------------------------

const hueCache = new Map<ModelId, Uint8ClampedArray>();

/** hueLut scans every outline point per degree, so it is built once per model. */
function huesFor(model: ColourModel): Uint8ClampedArray {
  const cached = hueCache.get(model.id);
  if (cached !== undefined) return cached;
  const hues = hueLut(gamutOutline(model));
  hueCache.set(model.id, hues);
  return hues;
}

// --- Trace cache -------------------------------------------------------------------

interface LayerCache {
  key: string;
  layers: HTMLCanvasElement[];
}

interface SampleIdentity {
  sample: Sample | null;
  id: number;
}

/** A counter that steps whenever capture publishes a different sample object. */
function sampleIdOf(ref: RefObject<SampleIdentity>, sample: Sample | null): number {
  if (ref.current.sample !== sample) ref.current = { sample, id: ref.current.id + 1 };
  return ref.current.id;
}

export function layerKey(id: number, prefs: Prefs, size: string, dark: boolean): string {
  return [
    id,
    prefs.scope,
    prefs.model,
    effectiveTrace(prefs),
    prefs.scale,
    prefs.zoom,
    prefs.range,
    prefs.colorize,
    prefs.intensity,
    size,
    dark,
  ].join("|");
}

function cachedLayers(cache: RefObject<LayerCache | null>, key: string, build: () => HTMLCanvasElement[]): HTMLCanvasElement[] {
  const current = cache.current;
  if (current !== null && current.key === key) return current.layers;
  const layers = build();
  cache.current = { key, layers };
  return layers;
}

function layerFrom(rgba: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    const image = ctx.createImageData(width, height);
    image.data.set(rgba);
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}

function vectorLayers(sample: Sample, prefs: Prefs, palette: Palette, hues: Uint8ClampedArray, size: number): HTMLCanvasElement[] {
  const grid = accumulate(sample, MODELS[prefs.model], discMapping(prefs), prefs.range, size);
  const rgba = paintDensity(grid, prefs.colorize ? hues : null, palette, prefs.intensity);
  return [layerFrom(rgba, size, size)];
}

function waveLayers(sample: Sample, prefs: Prefs, palette: Palette, width: number, height: number): HTMLCanvasElement[] {
  const grid = accumulateWave(sample, effectiveTrace(prefs), prefs.colorize, width, height);
  return paintWave(grid, palette, prefs.intensity, prefs.colorize).map((rgba) => layerFrom(rgba, width, height));
}

// --- Component ---------------------------------------------------------------------

const DEFAULT_WIDTH = 240;
const CANVAS_RADIUS = 4;
const HOVER_HINT = "Hover the image to place its pixel on the scope";

const SCOPE_LABELS: Readonly<Record<Prefs["scope"], string>> = {
  vector: "Vectorscope",
  wave: "Waveform",
  parade: "RGB parade",
};

export function ScopeView({ prefs }: { prefs: Prefs }): ReactElement {
  const { useEffect, useRef, useState } = api().react;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<LayerCache | null>(null);
  const sampleRef = useRef<SampleIdentity>({ sample: null, id: 0 });

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [themeEpoch, setThemeEpoch] = useState(0);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const sample = store()((s) => s.sample);
  const hoverUv = store()((s) => s.hoverUv);
  const height = prefs.scope === "vector" ? width : waveHeight(width);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (wrap === null) return;
    const observer = new ResizeObserver((entries) => {
      const measured = Math.round(entries[0].contentRect.width);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => watchTheme(api().stores.useThemeStore, () => setThemeEpoch((epoch) => epoch + 1)), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const dpr = window.devicePixelRatio || 1;
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { palette, dark } = paletteFor(canvas);
    const mono = monoFamily();
    const id = sampleIdOf(sampleRef, sample);

    if (prefs.scope === "vector") {
      const disc = discGeometry(width);
      const hues = huesFor(MODELS[prefs.model]);
      const size = sample === null ? 0 : gridSize(sample.width * sample.height, Math.round(disc.r * 2 * dpr));
      const density =
        sample !== null && size > 0
          ? cachedLayers(cacheRef, layerKey(id, prefs, String(size), dark), () =>
              vectorLayers(sample, prefs, palette, hues, size),
            )[0]
          : null;
      drawVectorscope(ctx, { width, prefs, sample, hoverUv, cursor, hues, density, palette, mono });
      return;
    }

    const plot = wavePlot(width, height, prefs.scope);
    const laneWidth = Math.round(plot.lanes[0].width * dpr);
    const laneHeight = Math.round(plot.height * dpr);
    const grid = sample === null ? null : waveGridSize(sample, laneWidth, laneHeight);
    const layers =
      sample !== null && grid !== null && grid.width > 0 && grid.height > 0
        ? cachedLayers(cacheRef, layerKey(id, prefs, `${grid.width}x${grid.height}`, dark), () =>
            waveLayers(sample, prefs, palette, grid.width, grid.height),
          )
        : [];
    drawWaveform(ctx, { width, height, prefs, sample, hoverUv, layers, palette, dark, mono });
  }, [sample, hoverUv, cursor, prefs, width, themeEpoch]);

  // getBoundingClientRect and clientX arrive in the host's zoomed layout
  // units; clientWidth / box.width converts back, as hover.ts does for the
  // image overlay. offsetX/offsetY are wrong under that zoom.
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const canvas = event.currentTarget;
    const disc = discGeometry(width);
    if (prefs.scope !== "vector" || disc.r <= 0) {
      setCursor(null);
      return;
    }
    const box = canvas.getBoundingClientRect();
    if (box.width <= 0) return;
    const scale = canvas.clientWidth / box.width;
    const x = (event.clientX - box.left) * scale;
    const y = (event.clientY - box.top) * scale;
    setCursor([(x - disc.cx) / disc.r, (disc.cy - y) / disc.r]);
  }

  return h(
    "div",
    { ref: wrapRef, style: { width: "100%" } },
    h("canvas", {
      ref: canvasRef,
      title: HOVER_HINT,
      role: "img",
      "aria-label": `${SCOPE_LABELS[prefs.scope]} of the open photo`,
      onPointerMove,
      onPointerLeave: () => setCursor(null),
      style: {
        width,
        height,
        display: "block",
        borderRadius: CANVAS_RADIUS,
        background: "var(--color-surface-0)",
        touchAction: "none",
      },
    }),
  );
}
