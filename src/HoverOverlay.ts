// The click-through layer over the Develop canvas that turns the pointer
// into the hover marker on the scopes. The host's overlay container is
// pointer-events: none, so this element can never receive a pointer event
// of its own: the listeners live on window and the element serves only as
// the measuring stick for the canvas box. Listening is gated on a mounted
// Scopes panel, so nothing is bound while the panel is closed, and the
// moves are coalesced to one store write per frame.

import type { ReactElement } from "react";
import { pointToUv } from "./hover";
import { api, h } from "./runtime";
import { store } from "./store";

const NO_FRAME = 0;

export function HoverOverlay(): ReactElement {
  const { useEffect, useRef } = api().react;
  const ref = useRef<HTMLDivElement | null>(null);
  const overlay = api().develop.useDevelopOverlay();
  const panels = store()((s) => s.panels);

  useEffect(() => {
    const element = ref.current;
    const rect = overlay.rect;
    if (element === null || rect === null || panels === 0) return;

    let frame = NO_FRAME;
    let latest: PointerEvent | null = null;

    const clear = (): void => {
      store().getState().setHoverUv(null);
    };

    const flush = (): void => {
      frame = NO_FRAME;
      const event = latest;
      latest = null;
      if (event === null) return;
      const box = element.getBoundingClientRect();
      store().getState().setHoverUv(pointToUv(event.clientX, event.clientY, box, element.clientWidth, rect));
    };

    const onPointerMove = (event: PointerEvent): void => {
      latest = event;
      if (frame === NO_FRAME) frame = requestAnimationFrame(flush);
    };

    window.addEventListener("pointermove", onPointerMove);
    // pointerleave does not bubble and is never dispatched on document, so
    // the root element is the one that sees the pointer leave the window.
    const root = document.documentElement;
    root.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
      if (frame !== NO_FRAME) cancelAnimationFrame(frame);
      clear();
    };
  }, [overlay.rect, overlay.nonce, panels]);

  return h("div", { ref, style: { position: "absolute", inset: 0, pointerEvents: "none" } });
}
