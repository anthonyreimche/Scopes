// The waveform and RGB parade drawing pass over a plain frame the view
// assembles: level lines, one cached layer per traced channel, then the
// hover column. Canvas strokes cannot resolve CSS variables, so every
// colour comes from the palette the view derived from the canvas's own
// background — and that background also decides the blend: overlapping
// channel layers only read as brighter where they add into darkness, so
// "lighter" is a dark-theme-only composite.

import type { Sample } from "./colour";
import { luma8 } from "./colour";
import type { Palette, Rgb8 } from "./density";
import { samplePixel, waveReadout } from "./hover";
import type { Prefs } from "./prefs";
import { effectiveTrace } from "./prefs";
import type { Uv } from "./store";
import type { Lane, ScopeType } from "./waveform";
import { CHANNEL_COLOURS, LEVEL_LINES, laneLayout } from "./waveform";

export const LEVEL_GUTTER = 22;

export interface WaveFrame {
  width: number;
  height: number;
  prefs: Prefs;
  sample: Sample | null;
  hoverUv: Uv | null;
  /** One cached layer per traced channel: 1 for luma, 3 for rgb. */
  layers: HTMLCanvasElement[];
  palette: Palette;
  dark: boolean;
  /** The resolved --font-mono family, for ctx.font. */
  mono: string;
}

export interface WavePlot {
  x0: number;
  y0: number;
  width: number;
  height: number;
  lanes: Lane[];
}

const PLOT_INSET = 4;
const PARADE_LANES = 3;

export function wavePlot(width: number, height: number, scope: ScopeType): WavePlot {
  const plotWidth = width - LEVEL_GUTTER - PLOT_INSET;
  return {
    x0: LEVEL_GUTTER,
    y0: PLOT_INSET,
    width: plotWidth,
    height: height - 2 * PLOT_INSET,
    lanes: laneLayout(plotWidth, scope === "parade" ? PARADE_LANES : 1),
  };
}

const BYTE_MAX = 255;
const PERCENT_SCALE = 100;
const HAIRLINE = 1;

const LEVEL_ALPHA = 0.18;
const LABEL_ALPHA = 0.6;
const HOVER_LINE_ALPHA = 0.6;

const LEVEL_LABEL_PX = 8;
const LEVEL_LABEL_INSET = 4;

const DOT_PX = 3;
const TAU = Math.PI * 2;

const READOUT_PX = 10;
const READOUT_INSET = 6;

function rgbCss(colour: Rgb8): string {
  return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;
}

/** Level (0..1) -> canvas y; level 1 sits at the top of the plot. */
function levelY(plot: WavePlot, level: number): number {
  return plot.y0 + (1 - level) * plot.height;
}

/** Column (0..1 across a lane) -> canvas x. */
function laneX(plot: WavePlot, lane: Lane, column: number): number {
  return plot.x0 + lane.x0 + column * lane.width;
}

function drawLevels(ctx: CanvasRenderingContext2D, plot: WavePlot, ink: string, mono: string): void {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = HAIRLINE;
  ctx.globalAlpha = LEVEL_ALPHA;
  ctx.beginPath();
  for (const level of LEVEL_LINES) {
    const y = levelY(plot, level);
    ctx.moveTo(plot.x0, y);
    ctx.lineTo(plot.x0 + plot.width, y);
  }
  ctx.stroke();

  ctx.globalAlpha = LABEL_ALPHA;
  ctx.fillStyle = ink;
  ctx.font = `${LEVEL_LABEL_PX}px ${mono}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const level of LEVEL_LINES) {
    ctx.fillText(String(Math.round(PERCENT_SCALE * level)), LEVEL_GUTTER - LEVEL_LABEL_INSET, levelY(plot, level));
  }
  ctx.restore();
}

/** The parade spreads its channels across lanes; every other trace stacks them in lane 0. */
function laneFor(plot: WavePlot, scope: ScopeType, channel: number): Lane {
  return plot.lanes[scope === "parade" ? channel : 0];
}

function drawLayers(ctx: CanvasRenderingContext2D, plot: WavePlot, frame: WaveFrame): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = frame.layers.length > 1 && frame.dark ? "lighter" : "source-over";
  for (let channel = 0; channel < frame.layers.length; channel++) {
    const lane = laneFor(plot, frame.prefs.scope, channel);
    ctx.drawImage(frame.layers[channel], laneX(plot, lane, 0), plot.y0, lane.width, plot.height);
  }
  ctx.restore();
}

interface Dot {
  lane: Lane;
  level: number;
  colour: string;
}

function hoverDots(plot: WavePlot, prefs: Prefs, rgb: [number, number, number], ink: string): Dot[] {
  if (effectiveTrace(prefs) === "luma") {
    return [{ lane: laneFor(plot, prefs.scope, 0), level: luma8(rgb[0], rgb[1], rgb[2]), colour: ink }];
  }
  return CHANNEL_COLOURS.map((colour, channel) => ({
    lane: laneFor(plot, prefs.scope, channel),
    level: rgb[channel] / BYTE_MAX,
    colour: rgbCss(colour),
  }));
}

function drawHover(ctx: CanvasRenderingContext2D, plot: WavePlot, frame: WaveFrame, ink: string): void {
  const { sample, hoverUv } = frame;
  if (sample === null || hoverUv === null) return;
  const rgb = samplePixel(sample, hoverUv);

  ctx.save();
  ctx.globalAlpha = HOVER_LINE_ALPHA;
  ctx.strokeStyle = ink;
  ctx.lineWidth = HAIRLINE;
  ctx.beginPath();
  for (const lane of plot.lanes) {
    const x = laneX(plot, lane, hoverUv.x);
    ctx.moveTo(x, plot.y0);
    ctx.lineTo(x, plot.y0 + plot.height);
  }
  ctx.stroke();

  ctx.globalAlpha = 1;
  for (const dot of hoverDots(plot, frame.prefs, rgb, ink)) {
    ctx.fillStyle = dot.colour;
    ctx.beginPath();
    ctx.arc(laneX(plot, dot.lane, hoverUv.x), levelY(plot, dot.level), DOT_PX / 2, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = ink;
  ctx.font = `${READOUT_PX}px ${frame.mono}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(waveReadout(effectiveTrace(frame.prefs), rgb), READOUT_INSET, frame.height - READOUT_INSET);
  ctx.restore();
}

export function drawWaveform(ctx: CanvasRenderingContext2D, frame: WaveFrame): void {
  const plot = wavePlot(frame.width, frame.height, frame.prefs.scope);
  if (plot.width <= 0 || plot.height <= 0) return;

  const ink = rgbCss(frame.palette.ink);
  if (frame.prefs.showLevels) drawLevels(ctx, plot, ink, frame.mono);
  drawLayers(ctx, plot, frame);
  drawHover(ctx, plot, frame, ink);
}
