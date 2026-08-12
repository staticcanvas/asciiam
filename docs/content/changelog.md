---
title: Changelog
description: Release history and behavior changes for asciiam.
weight: 50
type: changelog
---

## 0.10.0

**Current documented baseline.** This release establishes the public renderer, animation, sequencing, image-sampling, and web-utility contracts reflected in the API reference.

### Runtime

- WebGL2 renderer with instanced glyph batching, shader gradients, trail and backdrop blending, and Canvas 2D fallback.
- Runtime renderer selection through `auto`, `webgl2`, and `canvas2d`.
- Ordered animation sequences with delays, durations, looping, interruption, callbacks, and lifecycle events.
- Dense, spatial, reveal, sparse-particle, image, and custom animation modes.
- Added `irisIn`, `irisOut`, `dissolveIn`, `dissolveOut`, `lumaFold`, `riftLace`, and `echoBloom`, with the global mode inventory available to image-backed output.
- Image-to-ASCII sampling with mask modes, inclusive RGB animation ranges, and independent centered horizontal and vertical output scaling.
- Image fitting now uses rendered glyph-cell dimensions instead of treating ASCII cells as square, preserving source proportions.
- Animated GIF sources capture every composited frame into an ASCII grid through WebCodecs `ImageDecoder`, preserve per-frame timing, and release decoded bitmaps immediately. Browser-timed sampling remains the fallback; `imageFrameRate` controls only that compatibility path.
- `imageLuminance` adds `auto`, `normal`, and `invert` mappings. Auto mode detects dark artwork on transparency so common black silhouette SVGs map to visible glyphs.
- Image sampling reuses its readback canvas and retains glyph atlases while animated frames change.
- Shared frame scheduling, visibility pausing, quality tiers, glyph atlases, and static-wave caching.

### Web utility

- Interactive web utility with preset editing, undo and redo, generated code, renderer selection, local image upload, animated-image controls, independent image-axis controls, and luminance mapping.
- Versioned runtime loading and revalidated local library caching prevent new controls from executing against an older renderer bundle.
- Image-library cards use generated static 320×180 WebP previews, first-frame GIF thumbnails, low-priority lazy decoding, and off-screen content containment. Opening the Image popover no longer decodes every original media asset.

### Documentation

- Hugo documentation source and visibility-bounded live preset gallery.
- Full constructor, option, method, renderer, sequence, event, and callback reference.
- Web-utility workflow, preset gallery, version policy, GIF/SVG behavior, and integration guides.

### Compatibility

- Browser ESM and UMD bundles are provided in readable and minified forms.
- Canvas 2D and `requestAnimationFrame` are required.
- WebGL2, IntersectionObserver, and ResizeObserver are feature-detected.

### Upgrade notes

- This is the first documented API baseline; there are no earlier documented migrations.
- Prefer `renderer: 'auto'` when the application should use WebGL2 where available and retain Canvas 2D fallback.
- Call `destroy()` when removing an instance so observers, listeners, renderer resources, and scheduler membership are released.
- Pass `{ animated: true }` to `setImage()` for uploaded GIF object URLs because blob URLs do not retain the original filename or MIME type.
- Use `imageLuminance: 'normal'` when automatic silhouette detection is not appropriate for a transparent source.
