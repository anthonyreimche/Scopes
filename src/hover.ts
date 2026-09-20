// Vectorscope hover mapping and readouts: turns a pointer position over the
// Develop canvas overlay into a sample pixel, and a colour model + rgb
// triple into the text the scopes print beside the cursor. The host applies
// an interface-scale CSS zoom to <body>, so client coordinates and
// getBoundingClientRect() arrive in zoomed layout units; multiplying by
// clientWidth / box.width converts back to true layout pixels before
// locating the point inside `rect`. Never use offsetX/offsetY — they are
// wrong under that zoom.

import type { ColourModel, Sample } from "./colour";
import { luma8 } from "./colour";
import type { Mapping } from "./graticule";
import { unmapPoint } from "./graticule";
import type { OverlayRect } from "./safelight";
import type { Uv } from "./store";
import type { Trace } from "./waveform";

export interface ClientBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const BYTE_MAX = 255;
const PERCENT_SCALE = 100;

/** Client point -> uv within `rect` (0..1 both axes), or null off the image or off a degenerate box/rect. */
export function pointToUv(clientX: number, clientY: number, box: ClientBox, clientWidth: number, rect: OverlayRect | null): Uv | null {
  if (rect === null) return null;
  if (box.width <= 0 || box.height <= 0 || rect.w <= 0 || rect.h <= 0) return null;

  const scale = clientWidth / box.width;
  const lx = (clientX - box.left) * scale;
  const ly = (clientY - box.top) * scale;
  const x = (lx - rect.x) / rect.w;
  const y = (ly - rect.y) / rect.h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;

  return { x, y };
}

/** The RGB bytes of the sample pixel nearest `uv`, clamped to the last row/column. */
export function samplePixel(sample: Sample, uv: Uv): [number, number, number] {
  const { data, width, height } = sample;
  const px = Math.max(0, Math.min(width - 1, Math.floor(uv.x * width)));
  const py = Math.max(0, Math.min(height - 1, Math.floor(uv.y * height)));
  const o = (py * width + px) * 4;
  return [data[o], data[o + 1], data[o + 2]];
}

/** The hovered pixel's model-plane position and the readout text for it. */
export function vectorReadout(
  model: ColourModel,
  rgb: [number, number, number],
  unit: number,
): { x: number; y: number; text: string } {
  const [x, y] = model.project(...rgb);
  const t = Math.hypot(x, y) / unit;
  return { x, y, text: model.readout(x, y, t) };
}

/** The readout text for a point already placed on the scope's unit disc. */
export function cursorReadout(model: ColourModel, px: number, py: number, mapping: Mapping): string {
  const [x, y] = unmapPoint(px, py, mapping);
  const t = Math.hypot(x, y) / mapping.unit;
  return model.readout(x, y, t);
}

/** "Y ⟨%⟩ %" for a luma trace, "R ⟨%⟩  G ⟨%⟩  B ⟨%⟩ %" for an rgb trace — percent of 255, rounded. */
export function waveReadout(trace: Trace, rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  if (trace === "luma") {
    return `Y ${Math.round(PERCENT_SCALE * luma8(r, g, b))} %`;
  }
  const pr = Math.round((PERCENT_SCALE * r) / BYTE_MAX);
  const pg = Math.round((PERCENT_SCALE * g) / BYTE_MAX);
  const pb = Math.round((PERCENT_SCALE * b) / BYTE_MAX);
  return `R ${pr}  G ${pg}  B ${pb} %`;
}
