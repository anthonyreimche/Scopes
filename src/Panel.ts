// The Scopes panel body: the scope picker, the canvas, and the control rows
// that belong to one scope each. Core owns the panel chrome — title, docking,
// floating — so this renders the body alone.
//
// The trace picker appears for the waveform only: a parade traces the three
// channels by definition, so it has nothing to pick and nothing to colourize.
// Mounting is what starts the frame sampler, and unmounting is what stops it.

import type { ReactElement } from "react";
import { retainSampler } from "./capture";
import type { TonalRange } from "./colour";
import { MODELS, MODEL_ORDER, RANGE_ORDER } from "./colour";
import type { Scale, Zoom } from "./graticule";
import type { Prefs } from "./prefs";
import { SCALE_ORDER, SCOPE_ORDER, TRACE_ORDER, ZOOM_ORDER, effectiveTrace, setPref, usePrefs } from "./prefs";
import { api, h } from "./runtime";
import { ScopeView } from "./ScopeView";
import { store } from "./store";
import type { ScopeType, Trace } from "./waveform";

const GAP = 6;

const SCOPE_LABELS: Readonly<Record<ScopeType, string>> = {
  vector: "Vectorscope",
  wave: "Waveform",
  parade: "Parade",
};

const TRACE_LABELS: Readonly<Record<Trace, string>> = {
  luma: "Luma",
  rgb: "RGB",
};

const SCALE_LABELS: Readonly<Record<Scale, string>> = {
  linear: "Lin",
  log: "Log",
};

const SCALE_TITLES: Readonly<Record<Scale, string>> = {
  linear: "Linear chroma",
  log: "Logarithmic chroma, expands the neutral core",
};

const ZOOM_LABELS: Readonly<Record<Zoom, string>> = {
  1: "1×",
  2: "2×",
  4: "4×",
};

const RANGE_LABELS: Readonly<Record<TonalRange, string>> = {
  all: "All",
  shadows: "Shadows",
  mids: "Mids",
  highlights: "Highlights",
};

const RANGE_TITLE = "Isolate a tonal range, as the Color Grading wheels split it";
const COLORIZE_TITLE = "Colour the trace by hue";

/** The controls only ever emit a value they were handed, but re-finding it in the order list keeps the pref types honest without a cast. */
function apply<T extends string>(value: string, order: readonly T[], write: (member: T) => void): void {
  const member = order.find((candidate) => candidate === value);
  if (member !== undefined) write(member);
}

/** Zoom is the one numeric pref behind a string control. */
function applyZoom(value: string): void {
  const parsed = Number(value);
  const member = ZOOM_ORDER.find((candidate) => candidate === parsed);
  if (member !== undefined) setPref("zoom", member);
}

function scopePicker(prefs: Prefs): ReactElement {
  const { SegmentedControl } = api().ui;
  return h(SegmentedControl, {
    size: "sm",
    value: prefs.scope,
    options: SCOPE_ORDER.map((scope) => ({ value: scope, label: SCOPE_LABELS[scope] })),
    onChange: (value: string): void => apply(value, SCOPE_ORDER, (scope) => setPref("scope", scope)),
  });
}

function modelSelect(prefs: Prefs): ReactElement {
  const { Select } = api().ui;
  return h(Select, {
    value: prefs.model,
    ariaLabel: "Colour model",
    options: MODEL_ORDER.map((model) => ({ value: model, label: MODELS[model].label })),
    onChange: (value: string): void => apply(value, MODEL_ORDER, (model) => setPref("model", model)),
  });
}

function traceSelect(prefs: Prefs): ReactElement {
  const { Select } = api().ui;
  return h(Select, {
    value: prefs.trace,
    ariaLabel: "Trace",
    options: TRACE_ORDER.map((trace) => ({ value: trace, label: TRACE_LABELS[trace] })),
    onChange: (value: string): void => apply(value, TRACE_ORDER, (trace) => setPref("trace", trace)),
  });
}

function scopeSelect(prefs: Prefs): ReactElement | null {
  if (prefs.scope === "vector") return modelSelect(prefs);
  if (prefs.scope === "wave") return traceSelect(prefs);
  return null;
}

function selectorRow(prefs: Prefs): ReactElement {
  const { Button, Row } = api().ui;
  const selector = scopeSelect(prefs);
  return h(
    Row,
    { gap: GAP },
    selector === null ? null : h("div", { style: { flex: "1 1 auto", minWidth: 0 } }, selector),
    h(
      Button,
      {
        size: "sm",
        active: prefs.colorize,
        disabled: prefs.scope !== "vector" && effectiveTrace(prefs) === "rgb",
        title: COLORIZE_TITLE,
        onClick: (): void => setPref("colorize", !prefs.colorize),
      },
      "Colorize",
    ),
  );
}

function scaleRow(prefs: Prefs): ReactElement {
  const { Row, SegmentedControl } = api().ui;
  return h(
    Row,
    { gap: GAP },
    h(SegmentedControl, {
      size: "sm",
      value: prefs.scale,
      options: SCALE_ORDER.map((scale) => ({ value: scale, label: SCALE_LABELS[scale], title: SCALE_TITLES[scale] })),
      onChange: (value: string): void => apply(value, SCALE_ORDER, (scale) => setPref("scale", scale)),
    }),
    h(SegmentedControl, {
      size: "sm",
      value: String(prefs.zoom),
      options: ZOOM_ORDER.map((zoom) => ({ value: String(zoom), label: ZOOM_LABELS[zoom] })),
      onChange: applyZoom,
    }),
  );
}

function rangePicker(prefs: Prefs): ReactElement {
  const { SegmentedControl } = api().ui;
  return h(SegmentedControl, {
    size: "sm",
    value: prefs.range,
    options: RANGE_ORDER.map((range) => ({ value: range, label: RANGE_LABELS[range], title: RANGE_TITLE })),
    onChange: (value: string): void => apply(value, RANGE_ORDER, (range) => setPref("range", range)),
  });
}

export function ScopesPanel(): ReactElement {
  const { useEffect } = api().react;
  const prefs = usePrefs();
  const { Stack } = api().ui;

  useEffect(() => {
    const releaseSampler = retainSampler();
    store().getState().retainPanel();
    return () => {
      releaseSampler();
      store().getState().releasePanel();
    };
  }, []);

  const vector = prefs.scope === "vector";

  return h(
    Stack,
    { gap: GAP, style: { padding: "6px 8px 8px", userSelect: "text" } },
    scopePicker(prefs),
    h(ScopeView, { prefs }),
    selectorRow(prefs),
    vector ? scaleRow(prefs) : null,
    vector ? rangePicker(prefs) : null,
  );
}
