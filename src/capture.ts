// Frame sampler for the Scopes panels: after each settled Develop render it
// captures an off-screen frame through the host, reads it back at a small
// size and publishes it to the session store. One capture runs at a time —
// a change that arrives mid-capture or inside the throttle window coalesces
// into a single follow-up — and nothing runs while no panel is mounted.

import type { Sample } from "./colour";
import { SAMPLE_EDGES, livePrefs } from "./prefs";
import { api } from "./runtime";
import type { DevelopParams, DevelopStoreState, StoreApi } from "./safelight";
import { store } from "./store";

export const THROTTLE_MS = 150;

// --- Readback ------------------------------------------------------------------

let readbackCanvas: OffscreenCanvas | null = null;

/** Downscales a captured bitmap through a reused OffscreenCanvas; null under 2 px in either dimension or without a 2D context. */
export function readbackBitmap(bitmap: ImageBitmap, longEdge: number): Sample | null {
  if (bitmap.width < 2 || bitmap.height < 2) return null;

  const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  if (readbackCanvas === null) {
    readbackCanvas = new OffscreenCanvas(width, height);
  } else if (readbackCanvas.width !== width || readbackCanvas.height !== height) {
    readbackCanvas.width = width;
    readbackCanvas.height = height;
  }

  const ctx = readbackCanvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) return null;

  // A reused canvas at an unchanged size is not implicitly cleared, and a
  // bitmap with any transparent pixels would otherwise blend into the
  // previous frame's content.
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { data, width, height };
}

// --- Scheduler -------------------------------------------------------------------

export interface SamplerDeps {
  develop: StoreApi<DevelopStoreState>;
  capture(params: DevelopParams): Promise<ImageBitmap>;
  readback(bitmap: ImageBitmap): Sample | null;
  publish(sample: Sample | null): void;
  throttleMs?: number;
}

/**
 * Captures once per settled render. request() throttles from the start of
 * the last capture; a request while one is in flight, or while a timer is
 * already pending, coalesces into that one. A capture in flight when the
 * photo changes (or closes) is discarded when it resolves — its result is
 * for a photo that is no longer current. The returned stop function
 * unsubscribes and drops any result still in flight.
 */
export function startSampler(deps: SamplerDeps): () => void {
  const { develop, capture, readback, publish } = deps;
  const throttle = deps.throttleMs ?? THROTTLE_MS;

  let stopped = false;
  let inFlight = false;
  let queued = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastStart = -Infinity;
  let generation = 0;

  function run(): void {
    timer = null;
    const { photoId, params, previewParams } = develop.getState();
    if (stopped || photoId === null) return;

    inFlight = true;
    lastStart = Date.now();
    const started = generation;

    capture(previewParams ?? params)
      .then(
        (bitmap) => {
          const current = !stopped && started === generation;
          let sample: Sample | null;
          try {
            sample = current ? readback(bitmap) : null;
          } catch {
            // A throw here must not escape as an unhandled rejection: the
            // bitmap still needs closing, and a subscriber still needs its null.
            bitmap.close?.();
            if (current) publish(null);
            return;
          }
          bitmap.close?.();
          if (current) publish(sample);
        },
        () => {
          if (!stopped && started === generation) publish(null);
        },
      )
      .finally(() => {
        inFlight = false;
        if (queued && !stopped) {
          queued = false;
          request();
        }
      });
  }

  function request(): void {
    if (stopped) return;
    if (inFlight) {
      queued = true;
      return;
    }
    if (timer !== null) return;
    timer = setTimeout(run, Math.max(0, throttle - (Date.now() - lastStart)));
  }

  const unsubscribe = develop.subscribe((state, prev) => {
    if (state.photoId !== prev.photoId) {
      generation++;
    }
    if (state.photoId === null) {
      queued = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      publish(null);
      return;
    }
    if (state.histogram !== prev.histogram || state.photoId !== prev.photoId) {
      request();
    }
  });

  request();

  return () => {
    stopped = true;
    unsubscribe();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

// --- Retainer --------------------------------------------------------------------

/** retain() starts `start` on the 0→1 transition; each release stops it on the 1→0 transition. A release is idempotent. */
export function createRetainer(start: () => () => void): () => () => void {
  let count = 0;
  let stop: (() => void) | null = null;

  return () => {
    count++;
    if (count === 1) stop = start();

    let released = false;
    return () => {
      if (released) return;
      released = true;
      count--;
      if (count === 0) {
        stop?.();
        stop = null;
      }
    };
  };
}

// --- Live wiring -----------------------------------------------------------------

function startLiveSampler(): () => void {
  return startSampler({
    develop: api().stores.useDevelopStore,
    capture: (params) => api().develop.captureFrame(params),
    readback: (bitmap) => readbackBitmap(bitmap, SAMPLE_EDGES[livePrefs().sampleSize]),
    publish: (sample) => store().getState().setSample(sample),
  });
}

export const retainSampler: () => () => void = createRetainer(startLiveSampler);
