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
- Web Utility runtime assets now share a content-derived cache revision, preventing new controls from loading with stale JavaScript. Cache-sensitive controls consistently use `setOption()` invalidation, and a built-site Chromium suite covers pointer, renderer, reset, and asset-integrity behavior.

### Web utility

- Interactive web utility with preset editing, undo and redo, generated code, renderer selection, local image upload, animated-image controls, independent image-axis controls, and luminance mapping.
- 3D primitives and glTF/GLB upload use a dedicated toolbar control immediately after Image.
- Local 3D upload is limited to self-contained GLB. The 3D menu can load remote glTF/GLB URLs, including relative external `.bin` buffers, and exposes geometry scale, camera FOV, and rotation controls.
- Added `resolveUri` for application-managed glTF plus external-buffer input, image rotation and mirroring, and shared rotation/mirroring controls for procedural and imported meshes.
- Sequence steps expose a mode-repeat switch enabled by default for utility previews; exported configuration retains the explicit value.
- Replaced the vertical sequence stack with an ordered node flow and per-node image-source controls.
- Split web-utility behavior into a module entry point plus focused code-formatting and sequence-data modules; documentation scripts remain separated by site-wide and page-specific responsibility.
- Kept Reset in the primary dock and aligned Documentation, About, and FPS as direct stage actions.
- Kept charset, alignment, and backdrop in the primary toolbar after auditing repeated procedural, image, and mesh authoring flows; render quality and workspace actions remain under Advanced.
- Character-set selection includes the expanded built-in inventory; interaction modes expose radius and duration controls; spatial alignment exposes all nine anchors.
- Versioned runtime loading and revalidated local library caching prevent new controls from executing against an older renderer bundle.
- Image-library cards use generated static 320×180 WebP previews, first-frame GIF thumbnails, low-priority lazy decoding, and off-screen content containment. Opening the Image popover no longer decodes every original media asset.

### Documentation

- Hugo documentation source and visibility-bounded live preset gallery.
- Full constructor, option, method, renderer, sequence, event, and callback reference.
- Web-utility workflow, preset gallery, version policy, GIF/SVG behavior, and integration guides.
- Default and included character sets are documented in a focused guide and the repository README.
- Added a single-instance live usage workbench with minimum-to-complete JSON-safe examples, reset/copy controls, and web-utility configuration transfer.
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
- Pass `{ animated: true }` to `setImage()` for uploaded GIF object URLs because blob URLs do not retain the original filename or MIME type.
- Use `imageLuminance: 'normal'` when automatic silhouette detection is not appropriate for a transparent source.
