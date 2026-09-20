# Vectorscope for SafeLight

A [SafeLight](https://github.com/anthonyreimche/SafeLight) extension that adds a
**Scopes** panel to the Develop module: a vectorscope in four colour models, a
waveform and an RGB parade, all drawn from the live render, plus a hover readout
that places the pixel under your cursor on the scope.

<!-- Screenshot: add docs/scopes.png (the Scopes panel in YCbCr over a colour-bar frame) and reference it here. -->

## What it shows

### Vectorscope

Every pixel of the render is plotted by chroma: neutral colours sit at the
centre, saturated colours reach toward the rim, and the angle is the hue. Four
colour models:

| Model | Plane | Use it for |
|---|---|---|
| YCbCr (Rec. 709) | Cb across, Cr up | The broadcast vectorscope: colour-bar targets at 75 % and 100 %, the skin-tone line, hue balance and saturation the way video scopes show them. |
| CIE u′v′ | Chromaticity around D65 | White balance and neutrals: the Planckian locus shows where blackbody light from 2000 to 20000 K falls, and the sRGB gamut is the triangle. |
| CIELAB a\*b\* | a\* across, b\* up | Perceptual chroma and hue in the space most colour tools use; the gamut outline is the sRGB cusp curve. |
| Oklab a/b | a across, b up | Hue-linear perceptual plotting; blues do not bend the way they do in CIELAB. |

The graticule, each part switchable in Preferences:

- **Hue ring** at the rim, coloured from the gamut outline.
- **Colour-bar targets**: R, Mg, B, Cy, G and Yl at 75 % and 100 %, computed
  from the model rather than copied from an analogue chart, so they are exact
  for Rec. 709.
- **Skin-tone line**: the mean direction of the ColorChecker light and dark skin
  patches. In YCbCr this is the classic I-line at 123°; in the other models it
  is the same reference hue.
- **Gamut outline**: the reach of sRGB. A hexagon in YCbCr, a triangle in u′v′,
  the cusp curve in CIELAB and Oklab. The rim is the gamut's farthest point.
- **Grid**: the axes and rings at 25, 50 and 75 % of the gamut reach.
- **Planckian locus** (u′v′ only), with ticks at 2500, 3200, 4000, 5500, 6500
  and 10000 K.

Under the plot: **Lin / Log** radius (log expands the neutral core),
**1× / 2× / 4×** zoom, and **All / Shadows / Mids / Highlights** to isolate a
tonal range, the same split the Color Grading wheels use. **Colorize** tints the
trace by hue; off, the trace draws in the theme's ink.

### Waveform and parade

The waveform plots level against image column: 0 % at the bottom, 100 % at the
top, brightness for how many pixels share a level. **Luma** draws Rec. 709
luma, **RGB** overlays the three channels in the histogram's colours, and
**Parade** puts the channels side by side. Level lines mark 0, 25, 50, 75 and
100 %. Colorize on the luma trace paints each point in the image's own colour.

### Hover readout

Move the pointer over the image and the scope marks that pixel: a ring on the
vectorscope with the model's coordinates (Cb/Cr with angle and percent of the
gamut reach, u′v′, a\*b\* with chroma and hue, or Oklab), or a hairline and dots
on the waveform with the levels. Hovering the scope canvas reads out the
coordinates under the cursor on the vectorscope, not the waveform.

## Controls

- **Panel**: the scope picker (Vectorscope / Waveform / Parade), the model or
  trace selector, Colorize, and for the vectorscope Lin/Log, zoom and the tonal
  range.
- **Preferences ▸ Extensions ▸ Scopes**: sample resolution (Low 192, Medium 320
  or High 512 px long edge), trace intensity, and the graticule toggles (hue
  ring, targets, skin line, gamut, grid, locus, level lines).
- **Reset to defaults** from the panel's dock header menu.

All of this is global display state. None of it is part of a photo's edit.

## How it samples

After each settled render of the Develop view the extension captures an
off-screen frame through `api.develop.captureFrame`, reads it back at the
chosen resolution and rebuilds the trace on the CPU: about 68 000 samples at
Medium, in a few milliseconds. Captures are throttled to 150 ms and coalesced
while one is in flight, a capture that outlives its photo is discarded, and
nothing runs while the panel is closed. The sample is the displayed viewport,
which is also what core's histogram measures; zoom in and the scopes show the
visible window.

## Known limitations

- The scopes sample the Develop display pass through `api.develop.captureFrame`,
  so display-only overlays are included in the trace while they are shown: the
  clipping indicators (the J key), a mask visualisation, and the Ctrl-view
  sharpen preview. Core's own histogram excludes them; switch them off to
  measure. A measurement-clean capture in core is the planned fix.
- When zoomed in, the scopes show the visible window, not the whole image.

## Install

Install from the SafeLight **Extensions** window, or load this folder via
Developer Tools ▸ Extensions during development. Build from source with
`npm install && npm run build` (outputs `dist/index.js`); if npm's resolver
fails on the peer set, use `npm install --legacy-peer-deps`. Needs SafeLight
2.5.4 or later.

## Tests

`npm test` runs the vitest suite in node: the colour transforms against
reference values, the graticule geometry (bar angles, gamut outline, skin line,
Planckian locus), density and waveform accumulation, the sampler's scheduling,
the hover mapping, preference validation, the pure drawing helpers and the
activation contract. Canvas drawing is verified in the app.

## License

MIT. The colour science is standard published maths: Rec. 709 YCbCr, CIE 1976
u′v′, CIELAB, Oklab and the Kim et al. approximation of the Planckian locus. No
code from darktable, RawTherapee or Resolve is involved.
