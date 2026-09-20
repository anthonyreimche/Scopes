// Vectorscope session store: the sample capture.ts last published, the hover
// UV the overlay last placed, and how many Scopes panels are mounted. This
// is ephemeral view state, not a preference — it is never persisted, and
// deactivate() clears it. The hover overlay attaches its window listeners
// only while panels > 0, tracked by the panel's mount/unmount pair.

import type { Sample } from "./colour";
import { api } from "./runtime";
import type { StoreApi } from "./safelight";

export interface Uv {
  x: number;
  y: number;
}

export interface ScopesState {
  sample: Sample | null;
  hoverUv: Uv | null;
  panels: number;
  setSample(s: Sample | null): void;
  setHoverUv(uv: Uv | null): void;
  retainPanel(): void;
  releasePanel(): void;
}

let boundStore: StoreApi<ScopesState> | null = null;

export function initStore(): void {
  boundStore = api().stores.create<ScopesState>((set, get) => ({
    sample: null,
    hoverUv: null,
    panels: 0,
    setSample(sample) {
      set({ sample });
    },
    setHoverUv(hoverUv) {
      set({ hoverUv });
    },
    retainPanel() {
      set({ panels: get().panels + 1 });
    },
    releasePanel() {
      set({ panels: Math.max(0, get().panels - 1) });
    },
  }));
}

export function store(): StoreApi<ScopesState> {
  if (boundStore === null) throw new Error("[vectorscope] store() called before activate()");
  return boundStore;
}
