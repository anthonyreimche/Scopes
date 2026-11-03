// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-7-brief.md

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sample } from "../src/colour";
import { THROTTLE_MS, createRetainer, readbackBitmap, readbackFloatFrame, startSampler } from "../src/capture";
import type { DevelopParams, DevelopStoreState, FloatFrame, StoreApi } from "../src/safelight";

/** A minimal zustand-like fake for DevelopStoreState: getState, setState merging a partial, subscribe. */
function fakeDevelop(initial: DevelopStoreState): StoreApi<DevelopStoreState> {
  const listeners = new Set<(state: DevelopStoreState, prev: DevelopStoreState) => void>();
  let state = initial;

  const getState = (): DevelopStoreState => state;

  const setState = (partial: Partial<DevelopStoreState> | ((s: DevelopStoreState) => Partial<DevelopStoreState>)): void => {
    const prev = state;
    const patch = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state, prev);
  };

  function developStore(): DevelopStoreState;
  function developStore<U>(selector: (s: DevelopStoreState) => U): U;
  function developStore<U>(selector?: (s: DevelopStoreState) => U): DevelopStoreState | U {
    return selector ? selector(state) : state;
  }

  developStore.getState = getState;
  developStore.setState = setState;
  developStore.subscribe = (listener: (state: DevelopStoreState, prev: DevelopStoreState) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return developStore;
}

interface CaptureRig {
  calls: DevelopParams[];
  resolvers: Array<{ resolve(bitmap: ImageBitmap): void; reject(reason: unknown): void }>;
  capture(params: DevelopParams): Promise<ImageBitmap>;
}

/** Records every capture() call and hands back its resolve/reject so the test settles it by hand. */
function createCaptureRig(): CaptureRig {
  const calls: DevelopParams[] = [];
  const resolvers: CaptureRig["resolvers"] = [];

  const capture = (params: DevelopParams): Promise<ImageBitmap> => {
    calls.push(params);
    return new Promise<ImageBitmap>((resolve, reject) => {
      resolvers.push({ resolve, reject });
    });
  };

  return { calls, resolvers, capture };
}

function fakeBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close() {} };
}

const PARAMS = {} as DevelopParams;
const PREVIEW = {} as DevelopParams;
const FIXED_SAMPLE: Sample = { data: new Uint8ClampedArray(8), width: 2, height: 1 };

function baseState(overrides: Partial<DevelopStoreState> = {}): DevelopStoreState {
  return { photoId: "p1", params: PARAMS, previewParams: null, histogram: {}, ...overrides };
}

describe("startSampler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("captures once at start with a photo and again after THROTTLE_MS when histogram changes", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls).toEqual([PARAMS]);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([FIXED_SAMPLE]);

    develop.setState({ histogram: {} });
    expect(rig.calls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(2);

    rig.resolvers[1].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    stop();
  });

  it("uses previewParams when set", async () => {
    const develop = fakeDevelop(baseState({ previewParams: PREVIEW }));
    const rig = createCaptureRig();

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: () => {},
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls).toEqual([PREVIEW]);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    stop();
  });

  it("two changes inside the throttle window yield one later capture", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: () => {},
    });

    await vi.advanceTimersByTimeAsync(0);
    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    develop.setState({ histogram: {} });
    develop.setState({ histogram: {} });
    expect(rig.calls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(2);

    rig.resolvers[1].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    stop();
  });

  it("a change during an in-flight capture yields exactly one more capture after it resolves", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: () => {},
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    develop.setState({ histogram: {} });
    develop.setState({ histogram: {} });
    expect(rig.calls.length).toBe(1);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(2);

    rig.resolvers[1].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    stop();
  });

  it("no photo → no capture, then a photo → one capture, closing publishes null", async () => {
    const develop = fakeDevelop(baseState({ photoId: null }));
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(0);

    develop.setState({ photoId: "p1" });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(1);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([FIXED_SAMPLE]);

    develop.setState({ photoId: null });
    expect(published).toEqual([FIXED_SAMPLE, null]);
    expect(rig.calls.length).toBe(1);

    stop();
  });

  it("a result after stop() is dropped and later changes capture nothing", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];
    let closed = false;

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    stop();
    rig.resolvers[0].resolve({
      width: 2,
      height: 1,
      close() {
        closed = true;
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(closed).toBe(true);
    expect(published).toEqual([]);

    develop.setState({ histogram: {} });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(1);
  });

  it("a rejected capture publishes null", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    rig.resolvers[0].reject(new Error("capture failed"));
    await vi.advanceTimersByTimeAsync(0);

    expect(published).toEqual([null]);
    stop();
  });

  it("a readback that throws publishes null once, closes the bitmap, and the next capture still succeeds", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];
    let readbackCalls = 0;
    let closed = false;

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => {
        readbackCalls++;
        if (readbackCalls === 1) throw new Error("readback failed");
        return FIXED_SAMPLE;
      },
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    rig.resolvers[0].resolve({
      width: 2,
      height: 1,
      close() {
        closed = true;
      },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(published).toEqual([null]);
    expect(closed).toBe(true);

    develop.setState({ histogram: {} });
    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(2);

    rig.resolvers[1].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([null, FIXED_SAMPLE]);
    stop();
  });

  it("a capture in flight when the photo closes does not overwrite the published null", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    develop.setState({ photoId: null });
    expect(published).toEqual([null]);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);

    expect(published).toEqual([null]);
    stop();
  });

  it("a capture in flight when the photo switches is discarded and exactly one capture follows for the new photo", async () => {
    const develop = fakeDevelop(baseState({ photoId: "p1" }));
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls.length).toBe(1);

    develop.setState({ photoId: "B", histogram: {} });
    expect(rig.calls.length).toBe(1);

    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([]);
    expect(rig.calls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(THROTTLE_MS);
    expect(rig.calls.length).toBe(2);

    rig.resolvers[1].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([FIXED_SAMPLE]);
    stop();
  });
});

describe("createRetainer", () => {
  it("start runs on the first retain only, stop runs on the last release only, a release called twice is inert", () => {
    let startCalls = 0;
    let stopCalls = 0;
    const start = (): (() => void) => {
      startCalls++;
      return () => {
        stopCalls++;
      };
    };

    const retain = createRetainer(start);

    const releaseA = retain();
    const releaseB = retain();
    expect(startCalls).toBe(1);

    releaseA();
    releaseA();
    expect(stopCalls).toBe(0);

    releaseB();
    expect(stopCalls).toBe(1);
  });
});

class FakeOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      clearRect() {},
      drawImage() {},
      getImageData(_x: number, _y: number, w: number, h: number) {
        return { data: new Uint8ClampedArray(w * h * 4) };
      },
    };
  }
}

describe("readbackBitmap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when either dimension is under 2 px", () => {
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    expect(readbackBitmap(fakeBitmap(1, 1), 320)).toBeNull();
  });

  it("scales a 3000x2000 bitmap to long edge 320", () => {
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    const sample = readbackBitmap(fakeBitmap(3000, 2000), 320);
    expect(sample?.width).toBe(320);
    expect(sample?.height).toBe(213);
    expect(sample?.data.length).toBe(320 * 213 * 4);
  });
});

function floatFrame(values: number[], width: number, height: number): FloatFrame {
  return {
    data: new Float32Array(values),
    width,
    height,
    space: { encoding: "perceptual", primaries: "rec709" },
    point: "pre-output",
  };
}

describe("readbackFloatFrame", () => {
  it("keeps the unclamped floats and clamps the bytes beside them", () => {
    const frame = floatFrame([1.5, 0.5, -0.25, 1, 0, 1, 2, 1, 0, 0, 0, 1, 1, 1, 1, 1], 2, 2);
    const sample = readbackFloatFrame(frame);
    expect(sample?.width).toBe(2);
    expect(sample?.height).toBe(2);
    expect(Array.from(sample?.floats?.slice(0, 8) ?? [])).toEqual([1.5, 0.5, -0.25, 1, 0, 1, 2, 1]);
    expect(Array.from(sample?.data.slice(0, 8) ?? [])).toEqual([255, 128, 0, 255, 0, 255, 255, 255]);
  });

  it("returns null under 2 px in either dimension", () => {
    expect(readbackFloatFrame(floatFrame([0, 0, 0, 1], 1, 1))).toBeNull();
  });
});

describe("startSampler — float capture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes a float sample and never captures 8-bit when the float frame arrives", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];
    const frame = floatFrame([2, 0, -1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 2, 2);

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      captureFloat: () => Promise.resolve(frame),
      readbackFloat: readbackFloatFrame,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls).toHaveLength(0);
    expect(published).toHaveLength(1);
    expect(published[0]?.floats?.[0]).toBe(2);
    stop();
  });

  it("falls back to the 8-bit capture when the float frame is null", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      captureFloat: () => Promise.resolve(null),
      readbackFloat: readbackFloatFrame,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls).toHaveLength(1);
    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([FIXED_SAMPLE]);
    stop();
  });

  it("falls back to the 8-bit capture when the float capture rejects", async () => {
    const develop = fakeDevelop(baseState());
    const rig = createCaptureRig();
    const published: Array<Sample | null> = [];

    const stop = startSampler({
      develop,
      capture: rig.capture,
      readback: () => FIXED_SAMPLE,
      captureFloat: () => Promise.reject(new Error("no float targets")),
      readbackFloat: readbackFloatFrame,
      publish: (s) => published.push(s),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(rig.calls).toHaveLength(1);
    rig.resolvers[0].resolve(fakeBitmap(2, 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(published).toEqual([FIXED_SAMPLE]);
    stop();
  });
});
