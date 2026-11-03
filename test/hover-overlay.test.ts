import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoverOverlay } from "../src/HoverOverlay";
import { initRuntime } from "../src/runtime";
import type { SafelightAPI, StateCreator, StoreApi } from "../src/safelight";
import { initStore, store } from "../src/store";

function createFakeStore<T extends object>(init: StateCreator<T>): StoreApi<T> {
  let state: T;
  const setState = (partial: Partial<T> | ((s: T) => Partial<T>)): void => {
    state = { ...state, ...(typeof partial === "function" ? partial(state) : partial) };
  };
  const getState = (): T => state;
  state = init(setState, getState);

  function fakeStore(): T;
  function fakeStore<U>(selector: (s: T) => U): U;
  function fakeStore<U>(selector?: (s: T) => U): T | U {
    return selector ? selector(state) : state;
  }
  fakeStore.getState = getState;
  fakeStore.setState = setState;
  fakeStore.subscribe = (): (() => void) => () => {};
  return fakeStore;
}

type Listener = (event: unknown) => void;

class FakeTarget {
  readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  count(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  dispatch(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener({ type });
  }
}

describe("HoverOverlay — the pointer leaves the window", () => {
  const win = new FakeTarget();
  const doc = Object.assign(new FakeTarget(), { documentElement: new FakeTarget() });
  let cleanup: (() => void) | void;

  beforeEach(() => {
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const effects: Array<() => (() => void) | void> = [];
    const api = {
      react: {
        useRef: () => ({ current: { getBoundingClientRect: () => ({}), clientWidth: 100 } }),
        useEffect: (fn: () => (() => void) | void) => {
          effects.push(fn);
        },
        createElement: () => null,
      },
      develop: { useDevelopOverlay: () => ({ rect: { x: 0, y: 0, w: 1, h: 1 }, nonce: 0 }) },
      stores: { create: createFakeStore },
    } as unknown as SafelightAPI;

    initRuntime(api);
    initStore();
    store().setState({ panels: 1 });
    HoverOverlay();
    cleanup = effects[0]?.();
  });

  afterEach(() => {
    cleanup?.();
    vi.unstubAllGlobals();
  });

  it("clears the marker from a listener that fires: pointerleave on the root element, not on document", () => {
    store().setState({ hoverUv: { x: 0.5, y: 0.5 } });

    expect(doc.count("pointerleave")).toBe(0);
    expect(doc.documentElement.count("pointerleave")).toBe(1);

    doc.documentElement.dispatch("pointerleave");
    expect(store().getState().hoverUv).toBeNull();
  });

  it("removes the root listener on cleanup", () => {
    cleanup?.();
    cleanup = undefined;
    expect(doc.documentElement.count("pointerleave")).toBe(0);
  });

  it("still clears on window blur", () => {
    store().setState({ hoverUv: { x: 0.5, y: 0.5 } });
    win.dispatch("blur");
    expect(store().getState().hoverUv).toBeNull();
  });
});
