// Vectorscope — Safelight extension (MIT).
//
// Scopes for Develop: a vectorscope, waveform and RGB parade over the live
// render. This file is registration and teardown only — the panel body lives
// in Panel.ts, the click-through hover layer in HoverOverlay.ts.

import { HoverOverlay } from "./HoverOverlay";
import { ScopesPanel } from "./Panel";
import { SETTINGS_FIELDS, resetPrefs } from "./prefs";
import { api, initRuntime } from "./runtime";
import type { SafelightAPI } from "./safelight";
import { initStore, store } from "./store";

export const PANEL_ID = "vectorscope.panel";
export const HOVER_ID = "vectorscope.hover";

/** Places the panel between the core Histogram (order 1) and Transform (order 2) in the Develop right rail; core sorts docked panels by this. */
const PANEL_ORDER = 1.5;
const PANEL_WIDTH = 268;
const HOVER_ORDER = 40;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  initStore();

  host.registerPanel({
    id: PANEL_ID,
    title: "Scopes",
    component: ScopesPanel,
    defaultDock: { module: "develop", direction: "right", order: PANEL_ORDER, width: PANEL_WIDTH },
    onReset: resetPrefs,
  });

  host.registerSlot({
    id: HOVER_ID,
    slot: "develop-canvas-overlay",
    component: HoverOverlay,
    order: HOVER_ORDER,
  });

  host.registerSettings({
    title: "Scopes",
    keywords: ["vectorscope", "waveform", "parade", "skin tone", "gamut"],
    fields: [...SETTINGS_FIELDS],
  });
}

export function deactivate(): void {
  try {
    const state = store().getState();
    state.setSample(null);
    state.setHoverUv(null);
    api().unregisterSlot(HOVER_ID);
  } catch {
    // Disabling an extension that never finished activate(): nothing is bound, so there is nothing to tear down.
  }
}
