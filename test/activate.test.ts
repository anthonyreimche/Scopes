// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-10-brief.md

import { beforeAll, describe, expect, it } from "vitest";
import type { Sample } from "../src/colour";
import { HOVER_ID, PANEL_ID, activate, deactivate } from "../src/index";
import { DEFAULT_PREFS, PREF_KEYS, SETTINGS_FIELDS } from "../src/prefs";
import type {
  PanelContribution,
  SafelightAPI,
  SettingsContribution,
  SlotContribution,
  StateCreator,
  StoreApi,
} from "../src/safelight";
import { store } from "../src/store";

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

interface Harness {
  api: SafelightAPI;
  panels: PanelContribution[];
  slots: SlotContribution[];
  settings: SettingsContribution[];
  unregistered: string[];
  sets: Array<[string, unknown]>;
}

/** A host stand-in that records every contribution; react and ui stay stubs because no component is rendered here. */
function createHarness(): Harness {
  const panels: PanelContribution[] = [];
  const slots: SlotContribution[] = [];
  const settings: SettingsContribution[] = [];
  const unregistered: string[] = [];
  const sets: Array<[string, unknown]> = [];
  const values = new Map<string, unknown>();

  const api = {
    version: 1,
    extensionId: "vectorscope",
    react: {},
    registerPanel: (contribution: PanelContribution): void => {
      panels.push(contribution);
    },
    registerSlot: (contribution: SlotContribution): void => {
      slots.push(contribution);
    },
    unregisterSlot: (id: string): void => {
      unregistered.push(id);
    },
    registerSettings: (contribution: SettingsContribution): void => {
      settings.push(contribution);
    },
    settings: {
      get: <T>(key: string, fallback: T): T => (values.has(key) ? (values.get(key) as T) : fallback),
      set: (key: string, value: unknown): void => {
        values.set(key, value);
        sets.push([key, value]);
      },
      onChange: () => () => {},
    },
    stores: { create: createFakeStore },
    develop: { useDevelopOverlay: () => ({ rect: null, nonce: 0 }) },
  } as unknown as SafelightAPI;

  return { api, panels, slots, settings, unregistered, sets };
}

// activate() binds module-level singletons (the runtime API and the store),
// so the never-activated case has to be asserted before anything activates.
describe("deactivate() before activate()", () => {
  it("does not throw", () => {
    expect(() => deactivate()).not.toThrow();
  });
});

describe("activate()", () => {
  const harness = createHarness();

  beforeAll(() => {
    activate(harness.api);
  });

  it("registers one Scopes panel, docked right in Develop", () => {
    expect(PANEL_ID).toBe("vectorscope.panel");
    expect(harness.panels).toHaveLength(1);

    const panel = harness.panels[0];
    expect(panel.id).toBe("vectorscope.panel");
    expect(panel.title).toBe("Scopes");
    expect(panel.defaultDock).toEqual({ module: "develop", direction: "right", order: 1.5, width: 268 });
    expect(typeof panel.component).toBe("function");
    expect(typeof panel.onReset).toBe("function");
  });

  it("registers one hover overlay on the develop canvas", () => {
    expect(HOVER_ID).toBe("vectorscope.hover");
    expect(harness.slots).toHaveLength(1);

    const slot = harness.slots[0];
    expect(slot.id).toBe("vectorscope.hover");
    expect(slot.slot).toBe("develop-canvas-overlay");
    expect(typeof slot.component).toBe("function");
  });

  it("registers the Preferences rows under Scopes", () => {
    expect(harness.settings).toHaveLength(1);

    const contribution = harness.settings[0];
    expect(contribution.title).toBe("Scopes");
    expect(contribution.keywords).toEqual(["vectorscope", "waveform", "parade", "skin tone", "gamut"]);
    expect(contribution.fields.map((field) => field.key)).toEqual(SETTINGS_FIELDS.map((field) => field.key));
  });

  it("wires the panel's onReset to write every preference default", () => {
    const from = harness.sets.length;

    harness.panels[0].onReset?.();

    const written = harness.sets.slice(from);
    expect(written).toHaveLength(PREF_KEYS.length);
    for (const key of PREF_KEYS) {
      expect(written).toContainEqual([key, DEFAULT_PREFS[key]]);
    }
  });

  it("deactivate() clears the session state and unregisters the hover overlay", () => {
    const sample: Sample = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
    store().getState().setSample(sample);
    store().getState().setHoverUv({ x: 0.25, y: 0.75 });

    deactivate();

    expect(harness.unregistered).toEqual(["vectorscope.hover"]);
    expect(store().getState().sample).toBeNull();
    expect(store().getState().hoverUv).toBeNull();
  });
});
