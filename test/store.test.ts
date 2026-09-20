// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-6-brief.md

import { describe, expect, it } from "vitest";
import type { Sample } from "../src/colour";
import { initRuntime } from "../src/runtime";
import type { SafelightAPI, StateCreator, StoreApi } from "../src/safelight";
import { initStore, store } from "../src/store";
import type { Uv } from "../src/store";

/** A minimal zustand-like factory: state object, getState, setState merging partials, subscribe. */
function createFakeStore<T extends object>(init: StateCreator<T>): StoreApi<T> {
  const listeners = new Set<(state: T, prev: T) => void>();
  let state: T;

  const setState = (partial: Partial<T> | ((s: T) => Partial<T>)): void => {
    const prev = state;
    const patch = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state, prev);
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
  fakeStore.subscribe = (listener: (state: T, prev: T) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return fakeStore;
}

function fakeApi(): SafelightAPI {
  return { stores: { create: createFakeStore } } as unknown as SafelightAPI;
}

// store() is a module-level singleton, so this must run before initStore()
// is called anywhere else in this file.
describe("store()", () => {
  it("throws before initStore()", () => {
    expect(() => store()).toThrow("[vectorscope] store() called before activate()");
  });
});

describe("initStore()", () => {
  it("retain/release clamps panels at 0, and sample/hoverUv round-trip", () => {
    initRuntime(fakeApi());
    initStore();
    const s = store();

    s.getState().retainPanel();
    s.getState().retainPanel();
    s.getState().releasePanel();
    s.getState().releasePanel();
    s.getState().releasePanel();
    expect(s.getState().panels).toBe(0);

    const sample: Sample = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
    s.getState().setSample(sample);
    expect(s.getState().sample).toBe(sample);

    const uv: Uv = { x: 0.25, y: 0.75 };
    s.getState().setHoverUv(uv);
    expect(s.getState().hoverUv).toEqual(uv);
  });
});
