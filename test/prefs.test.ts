// TDD reference: D:\Repositories\Safelight Project\Vectorscope\.superpowers\sdd\2026-09-19-vectorscope\task-6-brief.md

import { describe, expect, it } from "vitest";
import { initRuntime } from "../src/runtime";
import type { SafelightAPI } from "../src/safelight";
import { DEFAULT_PREFS, PREF_KEYS, SAMPLE_EDGES, SETTINGS_FIELDS, readPrefs, resetPrefs, validate } from "../src/prefs";

/** A settings.set that only records calls — enough for resetPrefs, which never reads or subscribes. */
function fakeApi(sets: Array<[string, unknown]>): SafelightAPI {
  return {
    settings: {
      get: (_key: string, fallback: unknown) => fallback,
      set: (key: string, value: unknown) => {
        sets.push([key, value]);
      },
      onChange: () => () => {},
    },
  } as unknown as SafelightAPI;
}

describe("readPrefs", () => {
  it("returns DEFAULT_PREFS when the getter always returns its own fallback", () => {
    expect(readPrefs((_key, fallback) => fallback)).toEqual(DEFAULT_PREFS);
  });
});

const JUNK: readonly unknown[] = ["x", 3, null, "true"];

describe("validate — malformed values fall back to the default", () => {
  // intensity accepts the number 3 (it's in range), so it gets its own cases below.
  const keys = PREF_KEYS.filter((key) => key !== "intensity");

  it.each(keys)("%s", (key) => {
    for (const junk of JUNK) {
      expect(validate(key, junk)).toEqual(DEFAULT_PREFS[key]);
    }
  });
});

describe("validate — intensity", () => {
  it("clamps to [0.25, 4]", () => {
    expect(validate("intensity", 9)).toBe(4);
    expect(validate("intensity", 0.1)).toBe(0.25);
  });

  it("non-numeric junk falls back to the default", () => {
    expect(validate("intensity", "x")).toBe(DEFAULT_PREFS.intensity);
    expect(validate("intensity", null)).toBe(DEFAULT_PREFS.intensity);
    expect(validate("intensity", "true")).toBe(DEFAULT_PREFS.intensity);
  });
});

describe("validate — zoom", () => {
  it('treats the string "2" as invalid and reads the default (1)', () => {
    expect(validate("zoom", "2")).toBe(DEFAULT_PREFS.zoom);
  });
});

describe("PREF_KEYS / DEFAULT_PREFS — same key set", () => {
  it("PREF_KEYS lists exactly the keys DEFAULT_PREFS defines", () => {
    expect([...PREF_KEYS].sort()).toEqual(Object.keys(DEFAULT_PREFS).sort());
  });
});

describe("validate — valid values pass through unchanged", () => {
  it('scope: "wave"', () => {
    expect(validate("scope", "wave")).toBe("wave");
  });

  it('model: "lab"', () => {
    expect(validate("model", "lab")).toBe("lab");
  });

  it('trace: "rgb"', () => {
    expect(validate("trace", "rgb")).toBe("rgb");
  });

  it('scale: "log"', () => {
    expect(validate("scale", "log")).toBe("log");
  });

  it("zoom: 4", () => {
    expect(validate("zoom", 4)).toBe(4);
  });

  it('range: "mids"', () => {
    expect(validate("range", "mids")).toBe("mids");
  });

  it('sampleSize: "high"', () => {
    expect(validate("sampleSize", "high")).toBe("high");
  });

  it("showRing: false", () => {
    expect(validate("showRing", false)).toBe(false);
  });
});

describe("validate — intensity edge numbers", () => {
  it("NaN, Infinity and -Infinity all read as the default", () => {
    expect(validate("intensity", NaN)).toBe(DEFAULT_PREFS.intensity);
    expect(validate("intensity", Infinity)).toBe(DEFAULT_PREFS.intensity);
    expect(validate("intensity", -Infinity)).toBe(DEFAULT_PREFS.intensity);
  });

  it("2.5 passes through unchanged", () => {
    expect(validate("intensity", 2.5)).toBe(2.5);
  });
});

describe("SETTINGS_FIELDS", () => {
  it("lists the Preferences-row keys in order", () => {
    expect(SETTINGS_FIELDS.map((f) => f.key)).toEqual([
      "sampleSize",
      "intensity",
      "showRing",
      "showTargets",
      "showSkin",
      "showGamut",
      "showGrid",
      "showLocus",
      "showLevels",
    ]);
  });

  it("each field's default equals DEFAULT_PREFS[key]", () => {
    const defaultsByKey: Record<string, unknown> = { ...DEFAULT_PREFS };
    for (const field of SETTINGS_FIELDS) {
      expect(field.default).toEqual(defaultsByKey[field.key]);
    }
  });
});

describe("resetPrefs", () => {
  it("writes every PREF_KEYS entry with its default", () => {
    const sets: Array<[string, unknown]> = [];
    initRuntime(fakeApi(sets));

    resetPrefs();

    expect(sets.length).toBe(PREF_KEYS.length);
    for (const key of PREF_KEYS) {
      expect(sets).toContainEqual([key, DEFAULT_PREFS[key]]);
    }
  });
});

describe("SAMPLE_EDGES", () => {
  it("maps sample sizes to their long edge in pixels", () => {
    expect(SAMPLE_EDGES).toEqual({ low: 192, medium: 320, high: 512 });
  });
});
