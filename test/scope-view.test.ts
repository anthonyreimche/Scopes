// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-9-brief.md

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Sample } from "../src/colour";
import { MODELS } from "../src/colour";
import type { Palette } from "../src/density";
import type { VectorFrame } from "../src/draw-vector";
import { discGeometry, drawVectorscope } from "../src/draw-vector";
import type { WaveFrame } from "../src/draw-wave";
import { drawWaveform, levelY, wavePlot } from "../src/draw-wave";
import type { Mapping } from "../src/graticule";
import { gamutOutline, hueLut, mapPoint } from "../src/graticule";
import { cursorReadout, vectorReadout, waveReadout } from "../src/hover";
import type { Prefs } from "../src/prefs";
import { DEFAULT_PREFS, effectiveTrace } from "../src/prefs";
import { initRuntime } from "../src/runtime";
import type { SafelightAPI, StateCreator, StoreApi } from "../src/safelight";
import { initStore } from "../src/store";
import {
  LEVEL_GUTTER,
  PLOT_MARGIN,
  ScopeView,
  layerKey,
  paletteFor,
  paletteForBackground,
  waveHeight,
  watchTheme,
} from "../src/ScopeView";

const DARK = {
  palette: { ink: [235, 235, 235], neutral: [200, 200, 200], lift: [255, 255, 255] },
  dark: true,
};

const LIGHT = {
  palette: { ink: [25, 25, 25], neutral: [70, 70, 70], lift: [0, 0, 0] },
  dark: false,
};

describe("plot constants", () => {
  it("are the sizes the panel lays out to", () => {
    expect(PLOT_MARGIN).toBe(10);
    expect(LEVEL_GUTTER).toBe(22);
  });
});

describe("waveHeight", () => {
  it("is 55 % of the width, rounded", () => {
    expect(waveHeight(268)).toBe(147);
    expect(waveHeight(400)).toBe(220);
  });

  it("floors at 96 px", () => {
    expect(waveHeight(100)).toBe(96);
    expect(waveHeight(0)).toBe(96);
  });
});

describe("paletteForBackground", () => {
  it("lifts ink off a dark surface", () => {
    expect(paletteForBackground(30, 30, 30)).toEqual(DARK);
  });

  it("darkens ink on a light surface", () => {
    expect(paletteForBackground(240, 240, 240)).toEqual(LIGHT);
  });

  it("switches on a mean channel of 128", () => {
    expect(paletteForBackground(127, 127, 127).dark).toBe(true);
    expect(paletteForBackground(128, 128, 128).dark).toBe(false);
  });

  it("means the three channels rather than reading one", () => {
    expect(paletteForBackground(0, 200, 0).dark).toBe(true);
    expect(paletteForBackground(255, 60, 255).dark).toBe(false);
  });
});

function canvasWithBackground(backgroundColor: string): HTMLCanvasElement {
  vi.stubGlobal("getComputedStyle", () => ({ backgroundColor }));
  return {} as unknown as HTMLCanvasElement;
}

describe("paletteFor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the canvas's resolved background", () => {
    expect(paletteFor(canvasWithBackground("rgb(30, 30, 30)"))).toEqual(DARK);
    expect(paletteFor(canvasWithBackground("rgb(240, 240, 240)"))).toEqual(LIGHT);
  });

  it("accepts rgba() and space-separated channels", () => {
    expect(paletteFor(canvasWithBackground("rgba(240, 240, 240, 0.5)"))).toEqual(LIGHT);
    expect(paletteFor(canvasWithBackground("rgb(240 240 240 / 50%)"))).toEqual(LIGHT);
  });

  it("treats an unreadable background as dark", () => {
    expect(paletteFor(canvasWithBackground("transparent"))).toEqual(DARK);
    expect(paletteFor(canvasWithBackground(""))).toEqual(DARK);
  });
});

// --- Drawing ---------------------------------------------------------------------
//
// The two draw passes only ever run against a real canvas, so these record
// the calls they make: the order the brief fixes, the preference each
// element hangs off, the conic gradient's mirrored angles, and where the
// hover marks land.

interface Call {
  op: string;
  args: unknown[];
}

interface Recorder {
  ctx: CanvasRenderingContext2D;
  calls: Call[];
  stops: [number, string][];
  ops(): string[];
  first(op: string): number;
  last(op: string): number;
  count(op: string): number;
  texts(): string[];
}

function recorder(): Recorder {
  const calls: Call[] = [];
  const stops: [number, string][] = [];
  const record =
    (op: string) =>
    (...args: unknown[]): void => {
      calls.push({ op, args });
    };

  const ctx = {
    save: record("save"),
    restore: record("restore"),
    beginPath: record("beginPath"),
    closePath: record("closePath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    arc: record("arc"),
    stroke: record("stroke"),
    fill: record("fill"),
    strokeRect: record("strokeRect"),
    fillText: record("fillText"),
    setLineDash: record("setLineDash"),
    drawImage: record("drawImage"),
    createConicGradient: (...args: unknown[]) => {
      calls.push({ op: "createConicGradient", args });
      return {
        addColorStop: (offset: number, colour: string): void => {
          stops.push([offset, colour]);
        },
      };
    },
  } as unknown as CanvasRenderingContext2D;

  const ops = (): string[] => calls.map((call) => call.op);
  return {
    ctx,
    calls,
    stops,
    ops,
    first: (op) => ops().indexOf(op),
    last: (op) => ops().lastIndexOf(op),
    count: (op) => ops().filter((candidate) => candidate === op).length,
    texts: () => calls.filter((call) => call.op === "fillText").map((call) => String(call.args[0])),
  };
}

function lastText(rec: Recorder): string {
  const texts = rec.texts();
  return texts[texts.length - 1];
}

function argAt(call: Call, index: number): number {
  return Number(call.args[index]);
}

function callsOf(rec: Recorder, op: string): Call[] {
  return rec.calls.filter((call) => call.op === op);
}

const PALETTE: Palette = { ink: [235, 235, 235], neutral: [200, 200, 200], lift: [255, 255, 255] };
const MONO = "test-mono";
const LAYER = {} as HTMLCanvasElement;

const YCBCR = MODELS.ycbcr;
const UNIT = gamutOutline(YCBCR).unit;
const MAPPING: Mapping = { unit: UNIT, scale: "linear", zoom: 1 };
const HUES = hueLut(gamutOutline(YCBCR));

// 2 x 2; the hovered pixel is the top-left red one.
const SAMPLE: Sample = {
  data: new Uint8ClampedArray([200, 60, 60, 255, 60, 200, 60, 255, 60, 60, 200, 255, 128, 128, 128, 255]),
  width: 2,
  height: 2,
};
const HOVER = { x: 0.25, y: 0.25 };
const HOVER_RGB: [number, number, number] = [200, 60, 60];

const VECTOR_WIDTH = 240;

function vectorFrame(overrides: Partial<VectorFrame> = {}): VectorFrame {
  return {
    width: VECTOR_WIDTH,
    prefs: DEFAULT_PREFS,
    sample: null,
    hoverUv: null,
    cursor: null,
    hues: HUES,
    density: null,
    palette: PALETTE,
    mono: MONO,
    ...overrides,
  };
}

describe("drawVectorscope", () => {
  it("draws graticule, trace, ring and readout in the brief's order", () => {
    const rec = recorder();
    drawVectorscope(rec.ctx, vectorFrame({ prefs: { ...DEFAULT_PREFS, model: "uv" }, density: LAYER }));

    expect(rec.first("arc")).toBeLessThan(rec.first("closePath"));
    expect(rec.first("closePath")).toBeLessThan(rec.first("strokeRect"));
    expect(rec.first("strokeRect")).toBeLessThan(rec.first("setLineDash"));
    expect(rec.first("setLineDash")).toBeLessThan(rec.first("drawImage"));
    expect(rec.first("drawImage")).toBeLessThan(rec.first("createConicGradient"));
    expect(rec.first("createConicGradient")).toBeLessThan(rec.last("fillText"));
  });

  it("scales the cached trace across the disc", () => {
    const rec = recorder();
    drawVectorscope(rec.ctx, vectorFrame({ density: LAYER }));
    const disc = discGeometry(VECTOR_WIDTH);
    const [call] = callsOf(rec, "drawImage");
    expect([argAt(call, 1), argAt(call, 2), argAt(call, 3), argAt(call, 4)]).toEqual([
      disc.cx - disc.r,
      disc.cy - disc.r,
      disc.r * 2,
      disc.r * 2,
    ]);
  });

  it("draws the Planckian locus in CIE u′v′ only", () => {
    const shown = recorder();
    drawVectorscope(shown.ctx, vectorFrame({ prefs: { ...DEFAULT_PREFS, model: "uv" } }));
    const hidden = recorder();
    drawVectorscope(hidden.ctx, vectorFrame({ prefs: { ...DEFAULT_PREFS, model: "uv", showLocus: false } }));
    const ycbcr = recorder();
    drawVectorscope(ycbcr.ctx, vectorFrame());

    expect(shown.count("stroke")).toBeGreaterThan(hidden.count("stroke"));
    expect(ycbcr.count("stroke")).toBe(hidden.count("stroke"));
  });

  it("drops every graticule element its preference turns off", () => {
    const rec = recorder();
    drawVectorscope(
      rec.ctx,
      vectorFrame({
        prefs: {
          ...DEFAULT_PREFS,
          showGrid: false,
          showGamut: false,
          showTargets: false,
          showSkin: false,
          showLocus: false,
          showRing: false,
        },
      }),
    );

    for (const op of ["arc", "closePath", "strokeRect", "setLineDash", "createConicGradient"]) {
      expect(rec.ops()).not.toContain(op);
    }
    expect(rec.texts()).toEqual([YCBCR.label]);
  });

  it("labels the six 75 % targets", () => {
    const rec = recorder();
    drawVectorscope(rec.ctx, vectorFrame());
    expect(rec.count("strokeRect")).toBe(12);
    expect(rec.texts()).toEqual(["R", "Yl", "G", "Cy", "B", "Mg", YCBCR.label]);
  });

  it("mirrors the hue ring: a stop at f carries plot angle 360 − 360·f", () => {
    const rec = recorder();
    drawVectorscope(rec.ctx, vectorFrame());

    expect(rec.stops).toHaveLength(73);
    expect(rec.stops.map((stop) => stop[0])).toEqual(Array.from({ length: 73 }, (_, i) => i / 72));
    expect(rec.stops[72][1]).toBe(rec.stops[0][1]);
    expect(rec.stops[18][0]).toBeCloseTo(0.25, 12);
    expect(rec.stops[18][1]).toBe(`rgb(${HUES[270 * 3]}, ${HUES[270 * 3 + 1]}, ${HUES[270 * 3 + 2]})`);
  });

  it("rings the hovered pixel where the model projects it, ahead of the cursor", () => {
    const rec = recorder();
    drawVectorscope(rec.ctx, vectorFrame({ sample: SAMPLE, hoverUv: HOVER, cursor: [0.3, 0.2] }));

    const readout = vectorReadout(YCBCR, HOVER_RGB, UNIT);
    const mapped = mapPoint(readout.x, readout.y, MAPPING);
    expect(mapped).not.toBeNull();
    if (mapped === null) return;

    const disc = discGeometry(VECTOR_WIDTH);
    const arcs = callsOf(rec, "arc");
    for (const marker of arcs.slice(-2)) {
      expect(argAt(marker, 0)).toBeCloseTo(disc.cx + mapped[0] * disc.r, 9);
      expect(argAt(marker, 1)).toBeCloseTo(disc.cy - mapped[1] * disc.r, 9);
    }
    expect(lastText(rec)).toBe(readout.text);
  });

  it("reads out the cursor inside the rim, and the model label outside it", () => {
    const inside = recorder();
    drawVectorscope(inside.ctx, vectorFrame({ cursor: [0.3, 0.2] }));
    expect(lastText(inside)).toBe(cursorReadout(YCBCR, 0.3, 0.2, MAPPING));

    const outside = recorder();
    drawVectorscope(outside.ctx, vectorFrame({ cursor: [0.9, 0.9] }));
    expect(lastText(outside)).toBe(YCBCR.label);
  });
});

const WAVE_WIDTH = 268;
const WAVE_HEIGHT = waveHeight(WAVE_WIDTH);

function waveFrame(overrides: Partial<WaveFrame> = {}): WaveFrame {
  return {
    width: WAVE_WIDTH,
    height: WAVE_HEIGHT,
    prefs: { ...DEFAULT_PREFS, scope: "wave" },
    sample: null,
    hoverUv: null,
    layers: [],
    palette: PALETTE,
    dark: true,
    mono: MONO,
    ...overrides,
  };
}

const RGB_LAYERS = [LAYER, LAYER, LAYER];

describe("effectiveTrace", () => {
  it("forces a parade to three channels", () => {
    expect(effectiveTrace({ ...DEFAULT_PREFS, scope: "parade", trace: "luma" })).toBe("rgb");
    expect(effectiveTrace({ ...DEFAULT_PREFS, scope: "parade", trace: "rgb" })).toBe("rgb");
  });

  it("leaves every other scope's trace alone", () => {
    expect(effectiveTrace({ ...DEFAULT_PREFS, scope: "wave", trace: "luma" })).toBe("luma");
    expect(effectiveTrace({ ...DEFAULT_PREFS, scope: "wave", trace: "rgb" })).toBe("rgb");
    expect(effectiveTrace({ ...DEFAULT_PREFS, scope: "vector", trace: "luma" })).toBe("luma");
  });
});

describe("drawWaveform", () => {
  it("spreads a parade across its lanes and stacks a waveform in one", () => {
    const parade = recorder();
    drawWaveform(
      parade.ctx,
      waveFrame({ prefs: { ...DEFAULT_PREFS, scope: "parade", trace: "rgb" }, layers: RGB_LAYERS }),
    );
    const spread = wavePlot(WAVE_WIDTH, WAVE_HEIGHT, "parade");
    expect(callsOf(parade, "drawImage").map((call) => argAt(call, 1))).toEqual(
      spread.lanes.map((lane) => spread.x0 + lane.x0),
    );

    const stacked = recorder();
    drawWaveform(stacked.ctx, waveFrame({ prefs: { ...DEFAULT_PREFS, scope: "wave", trace: "rgb" }, layers: RGB_LAYERS }));
    const single = wavePlot(WAVE_WIDTH, WAVE_HEIGHT, "wave");
    expect(callsOf(stacked, "drawImage").map((call) => argAt(call, 1))).toEqual([single.x0, single.x0, single.x0]);
  });

  it("adds overlapping channel layers only on a dark surface", () => {
    const dark = recorder();
    drawWaveform(dark.ctx, waveFrame({ prefs: { ...DEFAULT_PREFS, scope: "wave", trace: "rgb" }, layers: RGB_LAYERS }));
    expect(dark.ctx.globalCompositeOperation).toBe("lighter");

    const light = recorder();
    drawWaveform(
      light.ctx,
      waveFrame({ prefs: { ...DEFAULT_PREFS, scope: "wave", trace: "rgb" }, layers: RGB_LAYERS, dark: false }),
    );
    expect(light.ctx.globalCompositeOperation).toBe("source-over");

    const luma = recorder();
    drawWaveform(luma.ctx, waveFrame({ layers: [LAYER] }));
    expect(luma.ctx.globalCompositeOperation).toBe("source-over");
  });

  it("labels the level lines under showLevels", () => {
    const shown = recorder();
    drawWaveform(shown.ctx, waveFrame());
    expect(shown.texts()).toEqual(["0", "25", "50", "75", "100"]);

    const hidden = recorder();
    drawWaveform(hidden.ctx, waveFrame({ prefs: { ...DEFAULT_PREFS, scope: "wave", showLevels: false } }));
    expect(hidden.texts()).toEqual([]);
  });

  it("dots every channel at its level and prints the hovered pixel", () => {
    const rec = recorder();
    drawWaveform(
      rec.ctx,
      waveFrame({
        prefs: { ...DEFAULT_PREFS, scope: "parade", trace: "rgb" },
        layers: RGB_LAYERS,
        sample: SAMPLE,
        hoverUv: HOVER,
      }),
    );

    const plot = wavePlot(WAVE_WIDTH, WAVE_HEIGHT, "parade");
    expect(rec.count("fill")).toBe(3);
    expect(callsOf(rec, "arc").map((call) => argAt(call, 1))).toEqual(
      HOVER_RGB.map((byte) => levelY(plot, byte / 255)),
    );
    expect(callsOf(rec, "arc").map((call) => argAt(call, 0))).toEqual(
      plot.lanes.map((lane) => plot.x0 + lane.x0 + HOVER.x * lane.width),
    );
    expect(lastText(rec)).toBe(waveReadout("rgb", HOVER_RGB));
  });

  it("stays three-channel in parade mode whatever the trace pref says", () => {
    const rec = recorder();
    drawWaveform(
      rec.ctx,
      waveFrame({
        prefs: { ...DEFAULT_PREFS, scope: "parade", trace: "luma" },
        layers: RGB_LAYERS,
        sample: SAMPLE,
        hoverUv: HOVER,
      }),
    );

    const plot = wavePlot(WAVE_WIDTH, WAVE_HEIGHT, "parade");
    expect(callsOf(rec, "drawImage").map((call) => argAt(call, 1))).toEqual(
      plot.lanes.map((lane) => plot.x0 + lane.x0),
    );
    expect(rec.count("fill")).toBe(3);
    expect(lastText(rec)).toBe(waveReadout("rgb", HOVER_RGB));
  });

  it("dots a luma trace once", () => {
    const rec = recorder();
    drawWaveform(rec.ctx, waveFrame({ layers: [LAYER], sample: SAMPLE, hoverUv: HOVER }));
    expect(rec.count("fill")).toBe(1);
    expect(lastText(rec)).toBe(waveReadout("luma", HOVER_RGB));
  });
});

describe("layerKey", () => {
  const ID = 1;
  const SIZE = "240";

  function withOverride<K extends keyof Prefs>(key: K, value: Prefs[K]): Prefs {
    return { ...DEFAULT_PREFS, [key]: value };
  }

  function keyFor(prefs: Prefs, id: number = ID, size: string = SIZE, dark = true): string {
    return layerKey(id, prefs, size, dark);
  }

  const BASE = keyFor(DEFAULT_PREFS);

  it("changing scope changes the key", () => {
    expect(keyFor(withOverride("scope", "wave"))).not.toBe(BASE);
  });

  it("changing model changes the key", () => {
    expect(keyFor(withOverride("model", "lab"))).not.toBe(BASE);
  });

  it("changing trace changes the key", () => {
    expect(keyFor(withOverride("trace", "rgb"))).not.toBe(BASE);
  });

  it("changing scale changes the key", () => {
    expect(keyFor(withOverride("scale", "log"))).not.toBe(BASE);
  });

  it("changing zoom changes the key", () => {
    expect(keyFor(withOverride("zoom", 4))).not.toBe(BASE);
  });

  it("changing range changes the key", () => {
    expect(keyFor(withOverride("range", "mids"))).not.toBe(BASE);
  });

  it("changing colourize changes the key", () => {
    expect(keyFor(withOverride("colorize", false))).not.toBe(BASE);
  });

  it("changing intensity changes the key", () => {
    expect(keyFor(withOverride("intensity", 2))).not.toBe(BASE);
  });

  const SHOW_KEYS = ["showRing", "showTargets", "showSkin", "showGamut", "showGrid", "showLocus", "showLevels"] as const;

  it.each(SHOW_KEYS)("toggling %s leaves the key unchanged", (field) => {
    expect(keyFor(withOverride(field, !DEFAULT_PREFS[field]))).toBe(BASE);
  });

  it("a different sample id changes the key", () => {
    expect(keyFor(DEFAULT_PREFS, 2)).not.toBe(keyFor(DEFAULT_PREFS, ID));
  });

  it("a flipped dark flag changes the key", () => {
    expect(keyFor(DEFAULT_PREFS, ID, SIZE, false)).not.toBe(keyFor(DEFAULT_PREFS, ID, SIZE, true));
  });
});

describe("watchTheme", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function rig(): {
    observed: Array<{ target: unknown; options: unknown }>;
    disconnects: number;
    fire(): void;
    themeListeners: Array<(state: { activeId: string }, prev: { activeId: string }) => void>;
    unsubscribed: number;
    root: object;
    api: Parameters<typeof watchTheme>[0];
  } {
    const state = {
      observed: [] as Array<{ target: unknown; options: unknown }>,
      disconnects: 0,
      callback: null as (() => void) | null,
      themeListeners: [] as Array<(state: { activeId: string }, prev: { activeId: string }) => void>,
      unsubscribed: 0,
    };
    const root = {};
    vi.stubGlobal("document", { documentElement: root });
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(callback: () => void) {
          state.callback = callback;
        }
        observe(target: unknown, options: unknown): void {
          state.observed.push({ target, options });
        }
        disconnect(): void {
          state.disconnects++;
        }
      },
    );
    const api = {
      subscribe(listener: (state: { activeId: string }, prev: { activeId: string }) => void): () => void {
        state.themeListeners.push(listener);
        return () => {
          state.unsubscribed++;
        };
      },
    } as unknown as Parameters<typeof watchTheme>[0];
    return {
      get observed() {
        return state.observed;
      },
      get disconnects() {
        return state.disconnects;
      },
      fire: () => state.callback?.(),
      themeListeners: state.themeListeners,
      get unsubscribed() {
        return state.unsubscribed;
      },
      root,
      api,
    };
  }

  it("re-derives when the root element's style or class changes, as the accessibility overrides do", () => {
    const r = rig();
    const onChange = vi.fn();
    watchTheme(r.api, onChange);

    expect(r.observed).toHaveLength(1);
    expect(r.observed[0].target).toBe(r.root);
    expect(r.observed[0].options).toEqual({ attributes: true, attributeFilter: ["style", "class"] });

    r.fire();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("still re-derives on a theme switch, but not on an unchanged theme", () => {
    const r = rig();
    const onChange = vi.fn();
    watchTheme(r.api, onChange);

    r.themeListeners[0]({ activeId: "b" }, { activeId: "a" });
    expect(onChange).toHaveBeenCalledTimes(1);
    r.themeListeners[0]({ activeId: "b" }, { activeId: "b" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("stops observing and unsubscribes on cleanup", () => {
    const r = rig();
    const stop = watchTheme(r.api, () => {});
    stop();
    expect(r.disconnects).toBe(1);
    expect(r.unsubscribed).toBe(1);
  });
});

function createStaticStore<T extends object>(init: StateCreator<T>): StoreApi<T> {
  const state = init(() => {}, () => state);
  function fakeStore(): T;
  function fakeStore<U>(selector: (s: T) => U): U;
  function fakeStore<U>(selector?: (s: T) => U): T | U {
    return selector ? selector(state) : state;
  }
  fakeStore.getState = (): T => state;
  fakeStore.setState = (): void => {};
  fakeStore.subscribe = (): (() => void) => () => {};
  return fakeStore;
}

describe("ScopeView canvas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function canvasProps(scope: Prefs["scope"]): Record<string, unknown> {
    const created: Array<{ type: unknown; props: Record<string, unknown> }> = [];
    initRuntime({
      react: {
        useRef: (initial: unknown) => ({ current: initial }),
        useState: (initial: unknown) => [initial, () => {}],
        useEffect: () => {},
        createElement: (type: unknown, props: Record<string, unknown>) => {
          created.push({ type, props });
          return null;
        },
      },
      stores: { create: createStaticStore },
    } as unknown as SafelightAPI);
    initStore();
    ScopeView({ prefs: { ...DEFAULT_PREFS, scope } });
    const canvas = created.find((entry) => entry.type === "canvas");
    if (canvas === undefined) throw new Error("no canvas created");
    return canvas.props;
  }

  it("is an image with a label naming the scope", () => {
    expect(canvasProps("vector").role).toBe("img");
    expect(canvasProps("vector")["aria-label"]).toBe("Vectorscope of the open photo");
    expect(canvasProps("wave")["aria-label"]).toBe("Waveform of the open photo");
    expect(canvasProps("parade")["aria-label"]).toBe("RGB parade of the open photo");
  });
});
