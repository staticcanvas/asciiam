---
title: Performance and diagnostics
description: Quality tiers, logical grid resolution, multi-instance and multi-layer behavior, and the built-in diagnostics overlay.
weight: 12
date: 2026-08-27
lastmod: 2026-08-27
tags: [performance, quality, diagnostics, multi-instance, layers, benchmarking]
keywords: [asciiam quality tiers, resolutionScale, showStats, extendedStats, multi-instance rendering, setLayers, subpixel baseline calibration]
---

Quality tiers and `resolutionScale` bound how much work each frame does. The diagnostics overlay reports that work without adding a persistent timer or observer. State survives grid recalculation for stateful animation modes, and `setLayers()` composites multiple modes on one surface without per-frame allocation.

## Quality tiers

| Tier | Maximum DPR | Density | Font levels | Alpha levels | Canvas atlas | Static wave cache |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| `high` | 3 | 0.9 | 6 | 64 | No | No |
| `balanced` | 2 | 1.0 | 5 | 32 | No | No |
| `performance` | 1.5 | 1.4 | 4 | 16 | Yes | No |
| `ultra` | 1 | 2.4 | 2 | 8 | Yes | Yes |

Higher density values produce fewer cells because they increase cell spacing. `targetFPS: null` does not impose a library frame cap; the browser display and scheduler remain the physical limit.

## Logical grid resolution

Browser zoom changes the CSS-pixel size reported by the target, so the automatic column
and row count changes with it. `resolutionScale` provides an explicit adjustment without
changing canvas DPR:

`app.js`

```js
const animation = new asciiam('#target', {
  resolutionScale: 0.75
});
```

`1` retains automatic sizing. `0.5` produces the coarsest supported grid and reduces
cell work. `2` produces the finest supported grid. Glyph size and cell spacing change
together, so the grid remains contiguous. The option applies to procedural animation,
images, GIF frames, and 3D meshes. On a fixed-size surface, cell count grows approximately
with the square of the scale; test values above `1` on the intended device class.

## Diagnostics

`showStats: true` retains the compact FPS, grid, and drawn-cell line. Add
`extendedStats: true` to measure and display:

- estimated active display cadence from raw `requestAnimationFrame` intervals;
- resolved renderer, quality tier, and effective DPR;
- mean CPU-side asciiam frame work with a 24-sample text sparkline;
- drawn-cell occupancy with a 24-sample text sparkline;
- WebGL adapter text when the browser permits `WEBGL_debug_renderer_info`;
- vertex, primitive, topology, raster style, and model state for active 3D input.

`requestAnimationFrame` generally follows display refresh, but browsers do not expose a
portable hardware refresh-rate property. The reported Hz value is therefore an estimate
and is reset after visibility suspension. WebGL adapter strings can be unavailable under
browser privacy controls. The fill chart reports submitted or drawn ASCII-cell occupancy;
it is not GPU utilization. CPU utilization and GPU utilization percentages are not
reported because the required portable browser APIs do not exist.

Extended diagnostics allocate their fixed history lazily and sample `performance.now()`
only while both statistics flags are active. Output changes at most every 500 ms. They do
not install a polling timer, `PerformanceObserver`, GPU timer query, or dependency. Run
`npm run benchmark:stats` after changing this path.

Browser references: [requestAnimationFrame cadence](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame),
[WEBGL_debug_renderer_info privacy behavior](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info),
and the limited-availability [WebGL timer-query extension](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query).

## Multiple instances

All running instances share one `requestAnimationFrame` scheduler. Each instance retains independent timing, visibility, renderer, and target state. For galleries or grids, construct only visible previews and destroy off-screen instances after a short delay. Browsers limit the number of simultaneous WebGL contexts.

## State preservation on grid resizing

Dynamic container resizing and option changes (such as `density`, `fontSize`, or `resolutionScale`) trigger a logical grid recalculation. Stateful animation modes (`matrix`, `snow`, `sparkle`, `fire`, `starfield`, `orbit`) preserve active particle and rain-column coordinates during resizes by scaling positions relative to the new grid dimensions. This prevents animation drops from restarting at position zero when responsive viewports change.

## Multi-pass layer compositing

`setLayers()` allows stacking and blending multiple animation modes with per-layer opacity and composition blend modes on a single canvas surface with zero per-frame buffer allocation. Per-cell option overrides (`color`, `speed`, `charSet`, etc.) go inside a layer's `options`, applied only during that layer's own draw pass and restored afterward.

Each layer can also carry its own independent `image` or `meshPrimitive`/`model`, decoded
and rasterized separately from the instance-wide `setImage()`/`setModel()` and from every
other layer's — so, for example, one layer can show one photo while another shows a
different 3D primitive, composited together. A layer without its own source falls back to
reading the shared instance-wide image/mesh, matching the behavior before these fields
existed. Per-layer images are sampled statically (no GIF frame capture); `imageOptions`/
`modelOptions` mirror sequence steps' `imageOptions`/`modelOptions`.

`app.js`

```js
const anim = new asciiam('#hero');

// Blend multiple animation modes, each with its own independent media source
anim.setLayers([
  { mode: 'current', opacity: 0.5, options: { color: '#005fff' } },
  { mode: 'wave', opacity: 0.4, options: { speed: 1.2, color: '#00ffff' } },
  { mode: 'sparkle', opacity: 0.3, options: { color: '#ffffff' } },
  { mode: 'image', opacity: 0.6, image: '/media/texture.webp', blendMode: 'screen' },
  { mode: 'mesh', opacity: 0.5, meshPrimitive: 'torus' }
]);

anim.start();
```

## Subpixel font metric calibration

Safari and WebKit engines exhibit known subpixel baseline text offsets. `calibrateFontMetrics(target, fontFamily, fontSize)` and static `asciiam.calibrateFontMetrics()` measure exact 2D `TextMetrics` (`actualBoundingBoxAscent`/`Descent`) to compute subpixel baseline alignment offsets (`baselineOffset`), eliminating vertical glyph clipping across cross-browser viewports.

## Reference

| Property or method | Type | Default | Effect |
| --- | --- | --- | --- |
| `quality` | quality name | `balanced` | Applies tier values. |
| `resolutionScale` | number | `1` | Scales logical grid detail; clamped to `0.5`–`2`. |
| `autoQuality` | boolean | `false` | Automatically steps `resolutionScale`, then `quality`, down under sustained frame-time pressure and back up under headroom — never past what was requested at construction. |
| `maxDPR` | number | tier value | Caps backing-store pixel ratio. |
| `targetFPS` | number or `null` | `null` | Adds a per-instance frame cap when numeric. |
| `showStats` | boolean | `false` | Enables the compact attached output. |
| `extendedStats` | boolean | `false` | Enables opt-in sampling and extended attached output. |
| `getStats()` | method | — | Returns a structured diagnostics snapshot. |
| `setLayers(layers)` | method | — | Configures zero-allocation multi-mode composition layers. |
| `calibrateFontMetrics(target)` | static / method | — | Measures exact subpixel glyph baselines across WebKit and Blink. |

See [Renderers and performance]({{< relref "/guides/rendering" >}}) for backend selection, WebGPU/WebGL2/Canvas 2D fallback, and 3D and SSR rendering boundaries.
