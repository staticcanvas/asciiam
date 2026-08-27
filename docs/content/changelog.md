---
title: Changelog
description: Release history and behavior changes for asciiam.
weight: 50
type: changelog
date: 2026-08-13
lastmod: 2026-08-14
tags: [release, compatibility, changes]
keywords: [asciiam changelog, release notes, upgrade notes]
---

## Unreleased

- **Behavior change:** `meshEnabled`/`imageEnabled` now default to `false` (`chartEnabled` already did) — `setImage()`/`setMesh()`/`setModel()` load a source but no longer show it until the corresponding flag is set explicitly. Fixed two built-in presets (`imageReveal`, `telemetryChart`) that never set their own flag and so never actually rendered anything.
- `setLayers()` layers can now carry their own independent `image`/`imageOptions` and `meshPrimitive`/`model`/`modelOptions`, decoded and rasterized separately from the shared instance-wide image/mesh and from every other layer's, so different layers can show different sources at once. A layer without its own source still falls back to the shared one.
- Added `autoQuality` (default `false`): steps `resolutionScale`, then `quality`, down under sustained frame-time pressure and back up under headroom, never past what was requested at construction. New `autoQualityChange` event.
- **Behavior change:** sequence `transition.type: 'morph'` is now a real per-cell transition — individual ASCII cells transition character, color, and opacity (or position, in `style: 'flow'`) instead of crossfading the whole canvas. The original whole-canvas crossfade moved to `transition.type: 'blend'`; an existing sequence using `type: 'morph'` will start getting the new per-cell behavior automatically. `morph` accepts `style: 'dissolve' | 'scramble' | 'flow'` (default `'dissolve'`) and `spread` (wavefront band width, default `0.22`), and falls back to `blend` automatically for a `setLayers()` composite, a step whose own `options` resize the grid mid-transition, or while a step's image/model source is still loading. See [Animation sequences]({{< relref "/guides/sequences" >}}).
- Added `assemble` and `breakApart` seeded fragment modes for directional entry and exit transitions. The modes use the existing logical grid and reveal-duration controls across Canvas 2D, WebGL2, image-backed output, and headless rendering.
- **Fixed:** with the default `renderer: 'auto'`, falling back from WebGPU to WebGL2 could leave the canvas permanently frozen on its first frame (reading as a blank/background-colored surface) because the visibility observer wasn't re-attached to the replacement canvas element. Affected any instance that fell back off WebGPU, most visibly the docs site's page headers and the gallery's `orbitalFlow`/`risingEmbers` presets.
- **Fixed (docs site build):** the docs site's own script tags and module imports (`docs.js`, `gallery.js`, `examples.js`, `home.js`, and their references to the core library bundle) were never cache-busted, unlike the Web Utility playground — a cached copy of any of them could keep serving a fixed bug after a new deploy. All now carry the same content-derived revision query string as the playground.
- **Fixed (WebGPU):** the trail overlay and backdrop surfaces shared one GPU uniform buffer with the glyph draw pass; because WebGPU only executes a frame's draws after `queue.submit()`, every draw ended up reading whichever one's data was written last (always the glyph pass's own unrelated placeholder color), rendering trail and backdrop as solid opaque white instead of their configured color on every frame with any WebGPU adapter in use. Each draw now gets its own uniform buffer.
- **Fixed:** the `imageReveal` built-in preset had no `image` source at all, so it could never actually preview in the gallery even with `imageEnabled: true`. Now points at a real bundled default image.
- Docs-site build tooling: media assets moved from one flat, mixed-format folder into `docs/assets/{images/{png,webp,svg,gifs,jpg},meshes}/`, organized by type. Adding or replacing a file there is now the only step needed — the Web Utility image picker, the docs splash background, and the gallery all pick it up automatically on the next build. Not a library API change.
- **Fixed:** an empty `charSet` (constructor, `setOption()`, or a layer's `options.charSet`) rendered the literal text `"undefined"` across the canvas instead of nothing.
- **Fixed:** an explicitly-`undefined` `imageBrightness`/`imageContrast` silently corrupted every sampled image pixel's color.
- **Fixed:** `_resampleImage()` threw uncaught on a tainted (cross-origin, no CORS headers) image source instead of degrading gracefully.
- **Fixed (WebGPU):** `gradientViews` grew without bound for the life of an instance using any gradient, worst-case an animated one (`gradient.animate: true`) whose cache key changes roughly every 50ms forever; the underlying GPU texture cache was already correctly capped, but this parallel cache wasn't trimmed alongside it. Bind-group caching was also being defeated on effectively every frame for an animated gradient specifically. Both fixed.
- Calling `start()` after `destroy()` is now a no-op instead of silently resuming the render loop against torn-down state.
- Web Utility playground: every slider, dropdown, and toggle now has an in-context Lume tooltip — a quick tip on the label, and for controls with real nuance, a small "i" badge with a richer, structured explanation. Not a library API change.

## 0.11.0

### Runtime & API Extensions

- **Multi-Layer Compositing**: Introduced `setLayers()`, `getLayers()`, and `options.layers` for multi-pass animation blending, opacity masking, and per-layer mode composition.
- **3D Software Renderer Acceleration**: Precomputed $4\times4$ view-model transformations for 3D GLB/glTF rendering; added `registerGltfDecoder()` for custom 3D model decoders.
- **Dynamic Density & State Preservation**: Integrated particle state preservation across dynamic `density` updates (`setOption('density', ...)`), retaining trajectory states for Matrix, Sparkle, Fire, Snow, Starfield, and Orbit modes during live resizing.
- **Subpixel Font Calibration**: Added `calibrateFontMetrics()` for subpixel character ratio measurement and high-precision ASCII canvas alignment.
- **Headless Generator**: Added `renderToString()` and `renderFrame()` for generating static ASCII strings and frame arrays in Node.js, CLI, and headless environments.
- **Data Chart Mode**: Added `chart` animation mode supporting 6 visualization types (`bar`, `horizontalBar`, `line`, `sparkline`, `heatmap`, `donut`), with custom titles and CSV data inputs.
- **Sweep Timing & Delay Curves**: Added `sweepDuration` (seconds) and `delayCurve` (`linear`, `easeIn`, `easeOut`, `easeInOut`, `stagger`) options for reveal animations.

### Web Utility & Documentation

- **Light Theme Support**: Added comprehensive Light Theme styling across the documentation site and Web Utility with zero FOUC, theme persistence (`asciiam:theme`), and automatic logo color switching.
- **Web Utility Expansion**: Integrated `chart` mode with full interactive controls, sweep timing/delay curve selectors, and multi-layer compositing options into the Web Utility.
- **Navigation Alignment**: Restructured documentation sidebar navigation to place "Web Utility" as a primary top-level item preceding the JSON Builder.
- **Homepage Showcase**: Enhanced splash page 3D mesh resolution and added an 8-card live animation showcase grid featuring real-time procedural, media, and 3D demos.

## 0.10.0

**Current documented baseline.** This release establishes the public renderer, animation, sequencing, image-sampling, and web-utility contracts reflected in the API reference.

### Runtime

- WebGL2 renderer with instanced glyph batching, shader gradients, trail and backdrop blending, and Canvas 2D fallback.
- Runtime renderer selection through `auto`, `webgl2`, and `canvas2d`.
- Ordered animation sequences with delays, durations, independent per-step mode repeat, whole-sequence looping, interruption, callbacks, and lifecycle events. Replaying a completed sequence restarts from step zero.
- Sequence nodes can retain, clear, or asynchronously replace image sources. Node timing waits for decoding; failures pause playback and emit `sequenceStepError`.
- Sequence nodes can also retain, clear, or asynchronously replace glTF/GLB model sources. Retained-frame morphs capture outgoing output before source preparation and reveal the live destination only after readiness.
- Dense, spatial, reveal, sparse-particle, image, and custom animation modes.
- Added `irisIn`, `irisOut`, `dissolveIn`, `dissolveOut`, `lumaFold`, `riftLace`, and `echoBloom`, with the global mode inventory available to image-backed output.
- Added `hoverZone` and `clickZone` for pointer-local and triggered interaction fields, with programmatic `setCursor()` and `triggerInteraction()` control.
- Expanded spatial alignment to a nine-position grid for every mode with a meaningful configurable origin.
- Added compact technical, geometric, circuit, wave, terminal, and minimal character sets while retaining `asciiExtended` as the documented default.
- Backdrops accept explicit `behind` or `over` placement. Exact opacity `1` in the over layer fully covers the glyph animation.
- Image-to-ASCII sampling with mask modes, inclusive RGB animation ranges, and independent centered horizontal and vertical output scaling.
- Image fitting now uses rendered glyph-cell dimensions instead of treating ASCII cells as square, preserving source proportions.
- Animated GIF sources capture every composited frame into an ASCII grid through WebCodecs `ImageDecoder`, preserve per-frame timing, and release decoded bitmaps immediately. Browser-timed sampling remains the fallback; `imageFrameRate` controls only that compatibility path.
- GIF capture keeps decode-time grids private and publishes the completed frame set at frame zero, preventing visible decode fast-forward.
- `imageLuminance` adds `auto`, `normal`, and `invert` mappings. Auto mode detects dark artwork on transparency so common black silhouette SVGs map to visible glyphs.
- Image sampling reuses its readback canvas and retains glyph atlases while animated frames change.
- Shared frame scheduling, visibility pausing, quality tiers, glyph atlases, and static-wave caching.
- Added bounded `resolutionScale` control for logical grid detail independent of canvas DPR, including live cell dimensions in the Web Utility.
- Web Utility runtime assets now share a content-derived cache revision, preventing new controls from loading with stale JavaScript. Cache-sensitive controls consistently use `setOption()` invalidation, and a built-site Chromium, Firefox, and WebKit suite covers pointer, renderer, canvas-output, 3D, responsive, reset, and asset-integrity behavior.

### Web utility

- Interactive web utility with preset editing, undo and redo, generated code, renderer selection, local image upload, animated-image controls, independent image-axis controls, and luminance mapping.
- 3D primitives and glTF/GLB upload use a dedicated toolbar control immediately after Image.
- Local 3D upload is limited to self-contained GLB. The 3D menu can load remote glTF/GLB URLs, including relative external `.bin` buffers, and exposes geometry scale, camera FOV, and rotation controls.
- Added `resolveUri` for application-managed glTF plus external-buffer input, image rotation and mirroring, and shared rotation/mirroring controls for procedural and imported meshes.
- Sequence steps expose a mode-repeat switch enabled by default for utility previews; exported configuration retains the explicit value.
- Replaced the vertical sequence stack with an ordered node flow and per-node image-source controls.
- Split web-utility behavior into a module entry point plus focused code-formatting and sequence-data modules; documentation scripts remain separated by site-wide and page-specific responsibility.
- Kept Reset in the primary dock and aligned Documentation, About, and FPS as direct stage actions.
- Kept quality, charset, alignment, and backdrop in the primary toolbar; workspace actions remain under Advanced.
- Character-set selection includes the expanded built-in inventory; interaction modes expose radius and duration controls; spatial alignment exposes all nine anchors.
- Versioned runtime loading and revalidated local library caching prevent new controls from executing against an older renderer bundle.
- Image-library cards use generated static 320×180 WebP previews, first-frame GIF thumbnails, low-priority lazy decoding, and off-screen content containment. Opening the Image popover no longer decodes every original media asset.

### Documentation

- Audited the README and authored documentation for direct language and factual alignment with the released package and runtime.
- Hugo documentation source and a live preset gallery limited to six concurrent renderers.
- Constructor, option, method, renderer, sequence, event, and callback reference.
- Web-utility workflow, preset gallery, version policy, GIF/SVG behavior, and integration guides.
- Default and included character sets are documented in a focused guide and the repository README.
- Added a single-instance usage editor with examples from minimum initialization through a broad serializable configuration, reset and copy controls, and web-utility configuration transfer.
- Added page descriptions, dates, tags, keywords, modified-time metadata, and GitLab/GitHub edit links across the documentation set.
- Added `/` alongside `Ctrl+K` and `Command+K` for current-page search focus.
- Hardened site search with combobox semantics, deduplicated index loading, stale-query suppression, malformed-field tolerance, and deploy-path-safe result links.
- Expanded search metadata and vocabulary aliases, added safe literal-word highlighting, and visually selected matching tag chips.
- Made the documentation root a chrome-free splash with an asciiam-rendered background; inner documentation pages retain navigation and search.
- Corrected the splash height to `100svh` on desktop and mobile so its canvas owns the complete initial viewport and documentation content begins below the fold.
- Added maintained Lucide, SVG Repo, PAT, media-provider, registry, and delivery-service attribution references.

### Compatibility

- Canonical `.mjs` ESM and `.cjs` CommonJS package entries are provided alongside the readable/minified browser ESM and UMD bundles.
- Canvas 2D and `requestAnimationFrame` are required.
- WebGL2, IntersectionObserver, and ResizeObserver are feature-detected.

### Upgrade notes

- This is the first documented API baseline; there are no earlier documented migrations.
- Prefer `renderer: 'auto'` when the application should use WebGL2 where available and retain Canvas 2D fallback.
- Call `destroy()` when removing an instance so observers, listeners, renderer resources, and scheduler membership are released.
- Pass `{ animated: true }` to `setImage()` for uploaded GIF blob URLs because their URL strings contain neither a `.gif` suffix nor an `image/gif` data-URL prefix.
- Use `imageLuminance: 'normal'` when automatic silhouette detection is not appropriate for a transparent source.
