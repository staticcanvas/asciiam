# asciiam (Ascii Animator) v0.10.0

![asciiam — ASCII Background Animator](branding/asciiam-banner.svg)

[![gitlab-license](https://img.shields.io/gitlab/license/staticcanvas/asciiam?style=flat-square&logo=gitlab&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://gitlab.com/staticcanvas/asciiam) [![gitlab-pipeline](https://img.shields.io/gitlab/pipeline-status/staticcanvas/asciiam?style=flat-square&logo=gitlab&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://gitlab.com/staticcanvas/asciiam) [![gitlab-issues](https://img.shields.io/gitlab/issues/open/staticcanvas/asciiam?style=flat-square&logo=gitlab&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://gitlab.com/staticcanvas/asciiam) [![jsr-version](https://img.shields.io/jsr/v/%40staticcanvas/asciiam?style=flat-square&logo=jsr&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://jsr.io/%40staticcanvas/asciiam) [![jsdelivr-hitsperweek](https://img.shields.io/jsdelivr/npm/hw/asciiam?style=flat-square&logo=jsdelivr&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://cdn.jsdelivr.net/package/npm/asciiam) [![npm-sizeMin](https://img.shields.io/bundlephobia/min/@staticcanvas/asciiam?style=flat-square&logo=npm&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://www.npmjs.com/package/asciiam) [![npm-sizeZipped](https://img.shields.io/bundlephobia/minzip/@staticcanvas/asciiam?style=flat-square&logo=npm&labelColor=%231c1c1c&color=%23005fff&logoColor=%2300afff)](https://www.npmjs.com/package/asciiam)

## About this project

A dependency-free canvas engine for procedural ASCII media, hero image regions, section
backgrounds, splash pages, and image-to-ASCII reveals. WebGL2 is selected first by
default, with Canvas 2D available as an automatic fallback or explicit CPU renderer.

## Feature list

- WebGL2 glyph rendering with instanced quad batching and Canvas 2D fallback.
- Developer-selectable `auto`, `webgl2`, and `canvas2d` rendering policies.
- Seventeen built-in animation modes plus registered and per-instance custom cells.
- Ordered animation sequences with delays, durations, looping, interruption, callbacks,
  and lifecycle events.
- Image-to-ASCII sampling with cover/contain fitting, field-of-view controls, sampled
  colors, six animation masks, and inclusive RGB animation ranges.
- Linear, radial, and cubic multi-stop gradients, animated color, trails, pulse, edge
  fade, cursor response, solid backgrounds, and backdrop layers.
- Shared frame scheduling, off-screen pausing, reduced-motion handling, quality tiers,
  glyph caches, spatial caches, and a static-wave cache.
- Browser utility with presets, live controls, renderer selection, code generation,
  history, image upload, hero/splash previews, and ordered sequence editing.
- Hugo documentation with guides, full API reference, release information, and a live,
  visibility-bounded preset gallery.

## Releases

The current package and documentation version is `0.10.0`. Release behavior is recorded
in the [documentation changelog](docs/content/changelog.md). Distributed browser bundles
contain readable and minified ESM and UMD variants with source maps.

Version sources that must remain aligned:

| Source                   | Role                                                      |
| ------------------------ | --------------------------------------------------------- |
| `package.json`           | Package version and generated documentation data version. |
| `docs/data/presets.json` | Generated Hugo version and gallery data.                  |
| `README.md`              | Repository-facing version and release summary.            |
| `public/index.html`      | Web utility version labels and install badges.            |

## Package Repositories and installation

Install the package from npm:

```bash
# shell
npm install @staticcanvas/asciiam
```

Use a pinned browser bundle from jsDelivr when a package manager is not used:

```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/@staticcanvas/asciiam@0.10.0/dist/asciiam.min.js"></script>
```

| Location                                                   | Purpose                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| [npm](https://www.npmjs.com/package/@staticcanvas/asciiam) | Versioned package distribution.                              |
| [GitLab](https://gitlab.com/staticcanvas/asciiam)          | Primary source repository and issue tracking.                |
| [GitHub](https://github.com/staticcanvas/asciiam)          | Source mirror.                                               |
| jsDelivr / unpkg                                           | Versioned ESM and UMD browser delivery from the npm package. |

## Files

- `src/asciiam.js` — the source module.
- `src/asciiam.d.ts` — TypeScript declarations for options, events, and methods.
- `public/index.html` — interactive static demo with live controls for every mode/option.
- `docs/` — Hugo source for the homepage, guides, gallery, API reference, changelog,
  and version pages.
- `docs/static-sot-template.html` — structural design reference for Hugo layouts.
- `docs/static/css/docs.css` — readable SOT-derived documentation stylesheet with
  web utility color tokens and compatibility fallbacks.
- `docs/assets/images/` — Hugo pipeline source directory for future gallery images.
- `scripts/generate-docs-data.js` — generates gallery data and copies the current ESM
  browser bundle and brand asset into the Hugo static tree.

The build produces UMD and ESM bundles in `dist/asciiam/dist` and copies the browser
bundles to `public/libs`, so `public` can be deployed as a standalone Cloudflare Pages app.

## Cloudflare Pages demo

Configure the Pages project with `npm run site:build` as the build command and `public`
as the output directory. `site:build` generates Hugo into `public/docs` before building
the library bundles used by the web utility. Using `npm run build` alone builds the
library and utility assets but does not generate documentation.

The demo does not require runtime API credentials or a server-side image service.

### Local image library

The Image popover provides two image sources:

| Source            | Behavior                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Included defaults | Selects an image listed in `public/assets/backgrounds.json`.                                                        |
| Upload            | Reads a file selected from the user's device through a temporary object URL; the file is not uploaded or persisted. |

To add images to a clone:

1. Copy PNG, JPEG, GIF, WebP, AVIF, or SVG files into `public/assets/images`.
2. Run `npm run prepare:bg` to regenerate `public/assets/backgrounds.json`.
3. Reload the demo and open Image to select the new entry.

`npm run dev` and `npm run build` run the manifest generator automatically. The
generated manifest contains display names and URL-encoded `/assets/images/...` paths;
it does not embed image data.

### Hugo documentation site

Install Hugo Extended, or run Docker, then build the documentation into `public/docs`:

```bash
# shell
npm run docs:build
```

The build prefers `hugo` from `PATH`. When it is unavailable, the build script uses the
pinned `ghcr.io/gohugoio/hugo:v0.164.0` container. Deployment environments without
Docker should install Hugo Extended before running `npm run site:build`.

Start the documentation development server with generated preset data:

```bash
# shell
npm run docs:serve
```

The Hugo development server publishes the documentation at its own root. The deployable
site build publishes the same output under `public/docs`. Documentation asset URLs are
relative, so the output works at `/docs/` and beneath a project path such as
`/asciiam/docs/`.

### Documentation map

| Destination                                                | Owns                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Getting started](docs/content/getting-started.md)         | Installation, initialization, renderer selection, and lifecycle.                     |
| [Web utility workflow](docs/content/guides/web-utility.md) | Controls, previews, validation, persistence, and generated configuration.            |
| [Rendering](docs/content/guides/rendering.md)              | WebGL2, Canvas 2D, quality tiers, frame rate, and multi-instance behavior.           |
| [Images](docs/content/guides/images.md)                    | Image-to-ASCII sampling, fitting, masks, and RGB animation ranges.                   |
| [Sequences](docs/content/guides/sequences.md)              | Ordered steps, staggering, interruption, callbacks, and events.                      |
| [API reference](docs/content/api/_index.md)                | Constructor, options, methods, events, renderer information, and callback contracts. |

The web utility About view intentionally contains only product orientation, installation,
and links to these references. Detailed operational material belongs in Hugo so it has
stable URLs, search, syntax highlighting, and a table of contents.

The preset gallery is generated from `asciiam.presets`. It creates renderers only near
the viewport, retains no more than six concurrent preview instances, destroys off-screen
instances after a delay, and supports copying a configuration or opening it in the web
utility through `?preset=<name>`.

## Usage and export formats

The package provides ESM and UMD builds in readable and minified forms. Import the
package root when using a bundler or an ESM-aware runtime:

```js
// app.js
import asciiam from '@staticcanvas/asciiam';

const anim = new asciiam('#hero', {
  ...asciiam.presets.heroWave,
  renderer: 'auto', // WebGL2 first, Canvas 2D fallback
});
anim.start();
```

Use a native browser module when the ESM bundle is served with the site:

```html
<!-- index.html -->
<div id="hero" style="height: 480px;"></div>
<script type="module">
  import asciiam from './libs/asciiam.esm.min.js';

  new asciiam('#hero', asciiam.presets.heroWave).start();
</script>
```

Use the UMD bundle for a classic script tag. It provides the global `asciiam`
constructor:

```html
<!-- index.html -->
<div id="hero" style="height: 480px;"></div>
<script src="./libs/asciiam.min.js"></script>
<script>
  new asciiam('#hero', asciiam.presets.heroWave).start();
</script>
```

| Export                | File or specifier         | Intended use                                                              |
| --------------------- | ------------------------- | ------------------------------------------------------------------------- |
| Package ESM           | `@staticcanvas/asciiam`   | Bundlers and ESM-aware runtimes; resolves to `dist/asciiam.esm.js`.       |
| Browser ESM           | `dist/asciiam.esm.js`     | Native module script with readable source.                                |
| Browser ESM, minified | `dist/asciiam.esm.min.js` | Native module script for deployment.                                      |
| UMD                   | `dist/asciiam.js`         | Classic script with readable source and the global `asciiam` constructor. |
| UMD, minified         | `dist/asciiam.min.js`     | Classic script for deployment and the default jsDelivr/unpkg entry.       |

Source maps are emitted beside all four browser bundles for debugging.
For CDN delivery, replace the local browser path with a versioned jsDelivr URL such
as `https://cdn.jsdelivr.net/npm/@staticcanvas/asciiam@0.10.0/dist/asciiam.min.js` or
the matching `asciiam.esm.min.js` path for a module script.

## Quick start: background

```html
<div id="hero" style="height: 480px;">
  <h1>Your content sits on top, unaffected</h1>
</div>

<script src="./libs/asciiam.js"></script>
<script>
  const anim = new asciiam('#hero', asciiam.presets.heroWave);
  anim.start();
</script>
```

The engine injects its own canvas as the first child of the target element, positioned
to fill it (`z-index:-1`, `pointer-events:none`), so it sits behind your content
automatically — no extra CSS required on your end.

You can also hand it an existing `<canvas>` element directly instead of a container:

```js
new asciiam(document.querySelector('canvas#bg'), { mode: 'current' });
```

## Hero-card and splash templates

Hero and splash layouts should give asciiam a dedicated media region instead of using
the canvas as a full-card content overlay. The renderer then occupies the same layout
slot as an image while headings, copy, and actions remain normal document content.

```html
<!-- index.html -->
<article class="hero-card">
  <div
    id="hero-media"
    class="hero-card__media"
    role="img"
    aria-label="Animated ASCII product artwork"
  ></div>
  <div class="hero-card__body">
    <h2>Build with text as media.</h2>
    <p>The renderer replaces this card's conventional image region.</p>
  </div>
</article>

<style>
  .hero-card {
    display: grid;
    grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.2fr);
  }
  .hero-card__media {
    position: relative;
    isolation: isolate;
    min-height: 20rem;
    overflow: hidden;
  }
  .hero-card__body {
    padding: 2rem;
  }
</style>

<script type="module">
  import asciiam from './libs/asciiam.esm.min.js';

  const media = new asciiam('#hero-media', asciiam.presets.imageReveal);
  await media.setImage('./product-art.jpg');
  media.start();
</script>
```

The same instance can move between template media regions without starting another
animation loop:

```js
// app.js
media.setTarget('#splash-media');
```

## Presets

Modes are the rendering algorithms; presets are named option objects that configure
those modes for common use cases. They are complementary, not duplicates.

```js
asciiam.presets.heroWave; // single sweeping line, bold-on-peak
asciiam.presets.subtleCurrent; // gentle flowing texture, low opacity
asciiam.presets.matrixRain; // classic falling-column rain
asciiam.presets.softRipple; // concentric rings from center
asciiam.presets.vortexFlow; // three-arm spiral around the selected origin
asciiam.presets.plasmaField; // layered low-frequency organic field
asciiam.presets.introReveal; // one-shot staggered fade-in, no loop
asciiam.presets.auroraCurrent; // multicolor flowing current
asciiam.presets.terminalMatrix; // green Japanese matrix rain
asciiam.presets.blueprintWave; // cool block-character scan
asciiam.presets.deepRipple; // radial violet ripple
asciiam.presets.snowDrift; // sparse drifting snow
asciiam.presets.emberSparkle; // warm sparse sparkles
asciiam.presets.risingEmbers; // bottom-origin fire and embers
asciiam.presets.deepSpace; // depth-projected starfield
asciiam.presets.signalGlitch; // displaced scan bands
asciiam.presets.terminalType; // deterministic row-by-row reveal
asciiam.presets.orbitalFlow; // particles orbiting the selected origin
asciiam.presets.imageReveal; // image-to-ASCII reveal configuration
```

Use one directly, or spread it and override:

```js
new asciiam('#hero', { ...asciiam.presets.heroWave, color: '#C04FFF' });
```

## Modes

| mode         | description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `wave`       | A line sweeps across the field; nearby characters go bolder/larger/more opaque with a smooth falloff.                          |
| `current`    | Layered sine waves for a flowing, water-like texture (no single hard edge).                                                    |
| `ripple`     | Concentric rings expanding from the center.                                                                                    |
| `vortex`     | Three rotating spiral arms around the selected spatial origin.                                                                 |
| `plasma`     | Three layered low-frequency fields producing organic color and glyph motion.                                                   |
| `fadeIn`     | Staggered reveal from the left, right, or center; loops by default, or set `loop: false` for a one-shot intro.                 |
| `fadeOut`    | The matching directional exit animation for dismissals and scene transitions.                                                  |
| `irisIn` / `irisOut` | Radial entrance and exit centered on the selected spatial origin.                                                    |
| `dissolveIn` / `dissolveOut` | Seeded directional transitions suitable for sequence boundaries.                                         |
| `lumaFold`   | Folded luminance ridges that travel across the glyph field.                                                                       |
| `riftLace`   | Intersecting animated seams forming a shifting lace lattice.                                                                      |
| `echoBloom`  | Layered radial echoes that open from the selected origin.                                                                          |
| `matrix`     | Classic falling-character rain, per-column speed/length/flicker.                                                               |
| `snow`       | Sparse falling particles with horizontal drift.                                                                                |
| `sparkle`    | Sparse fixed particles with independent brightness cycles.                                                                     |
| `fire`       | A bottom-origin heat ramp with sparse embers, drift, and lifetime decay.                                                       |
| `starfield`  | Sparse depth-projected particles moving outward from the selected origin.                                                      |
| `glitch`     | Dense timed character displacement with moving scan-band corruption.                                                           |
| `typewriter` | Deterministic row-major character reveal with a visible cursor.                                                                |
| `orbit`      | Sparse glyph particles following elliptical paths around the selected origin.                                                  |
| `image`      | Converts a supplied image into an ASCII grid (brightness → character ramp), with the `wave` reveal optionally animated on top. |

Switch modes live: `anim.setMode('ripple')`.

## Options

```js
new asciiam(target, {
  mode: 'wave', // includes fields, reveals, transitions, coined modes, and sparse particles
  quality: 'balanced', // ultra | high | balanced | performance — sets maxDPR/density/targetFPS
  charSet: ' .:-=+*#%@', // light -> heavy character ramp; see CHARACTER_SETS
  fontFamily: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
  fontSize: 14,
  density: 1, // >1 = looser grid, <1 = tighter
  color: '#4FA8FF',
  gradient: null, // see Gradients below
  background: 'transparent',
  backdrop: { enabled: true, opacity: 0.5, color: '#0A0C10' }, // opacity: 0..1
  speed: 1,
  direction: 'horizontal', // wave mode: horizontal | vertical | diagonal
  revealDirection: 'center', // horizontal, vertical, diagonal, center-out, or edges-in
  minOpacity: 0.05,
  maxOpacity: 0.85,
  boldOnPeak: true,
  edgeFade: 0, // 0..1, vignette strength at the edges
  maxDPR: 2, // cap device pixel ratio (set via `quality`, or override directly)
  targetFPS: null, // null = uncapped (vsync); e.g. 30 to throttle
  showStats: false, // pair with anim.attachStats(el) for a live fps/cell readout
  respectReducedMotion: true, // honor prefers-reduced-motion: reduce
  onReady: null, // (animation) => {}
  image: null, // URL, for image mode
  imageChars: ' .:-=+*#%@',
  fit: 'cover', // cover | contain
  imageScale: 1, // source zoom multiplier
  imageScaleX: 1, // centered output-width multiplier
  imageScaleY: 1, // centered output-height multiplier
  imageFov: 1, // visible source fraction: 1 = full image
  imageLuminance: 'auto', // auto | normal | invert; auto detects dark transparent silhouettes
  colorFromImage: false, // sample per-cell color from the image instead of `color`
  animateImageMask: true, // apply the selected image animation effect
  animateImageFrames: true, // resample browser-decoded animated GIF frames
  imageFrameRate: 12, // animated-image sampling cap; display rendering remains uncapped
  // Image sampling is a source layer. The global mode animates sampled glyphs.
  imageAnimationRange: null, // { min: '#800000', max: '#ff8080' }; unmatched cells remain static
  onImageError: null, // (err) => {}
  snowDensity: 0.02, // active snow count as a fraction of grid cells
  sparkleDensity: 0.05, // active sparkle count as a fraction of grid cells
  fireDensity: 0.035, // active ember count as a fraction of grid cells
  starfieldDensity: 0.018, // active star count as a fraction of grid cells
  orbitDensity: 0.014, // active orbiting glyph count as a fraction of grid cells
  glitchIntensity: 0.32, // 0..1, approximate fraction of displaced scan rows
  typewriterDuration: 4.5, // seconds to reveal the complete grid
});
```

### Gradients

```js
gradient: {
  type: 'linear',               // 'linear' | 'radial' | 'cubic'
  angle: 45,                    // degrees, linear only
  stops: ['#4FA8FF', '#C04FFF'],// strings, or [{ offset, color }] for custom stops
  steps: 2,                     // generated color steps, from 1 to 6
  animate: false,               // rotate the angle continuously
  center: [0.5, 0.5],           // radial only, 0..1 relative
  radius: 0.75,                 // radial only, relative to max(width,height)
}
```

`cubic` uses a smooth cubic blend between the supplied colors and renders it as a
cached canvas gradient. `linear` and `radial` use the corresponding Canvas 2D
gradient geometry. Two steps are used by default; the demo exposes 1–6 steps.

Built-in character ramps are available as `asciiam.CHARACTER_SETS`, including
`density`, `extended`, `blocks`, `binary`, `braille`, `japanese`, and `punctuation`.
You can also provide any string as `charSet` or `imageChars`.

### Image support

Image mode accepts any format supported by the browser, including PNG, JPEG, GIF,
WebP, AVIF, and SVG. Cross-origin images must provide suitable CORS headers. The
`imageScale` zooms the source uniformly around its center. `imageScaleX` and
`imageScaleY` change the centered output width and height independently, while
`imageFov` controls the fraction of the source visible in the ASCII frame. Fitting
uses the rendered glyph-cell dimensions so non-square character cells do not squash
the source proportions.

`imageLuminance: 'auto'` detects dark artwork on transparency, including common
black silhouette SVGs, and reverses density mapping so the subject does not map to
the ramp's blank glyph. Auto-inverted artwork uses the configured glyph color when
`colorFromImage` is enabled, avoiding black-on-dark output. Use `normal` or `invert`
to override detection. This changes density mapping only and does not rotate the SVG.

GIF URLs play automatically by resampling their browser-decoded frames. Uploaded
GIF object URLs should be identified explicitly, and the independent sampling cap
keeps this work below the presentation frame rate:

```js
// app.js
await anim.setImage(objectUrl, { animated: file.type === 'image/gif' });
anim.setOption('imageFrameRate', 12);
```

The web utility loads its runtime bundle with a versioned URL and serves local library
artifacts with revalidation. This prevents a newly deployed Mode menu from running
against an older cached renderer that does not contain the corresponding algorithms.

To animate only part of an uploaded image, set `imageAnimationRange`. The `min` and
`max` colors define inclusive bounds for each RGB channel. The match mask is generated
once whenever the image or range changes; unmatched ASCII cells render statically.

```js
// app.js
anim.setOption('imageAnimationRange', {
  min: '#800000',
  max: '#ff8080',
});
```

When loading a user-selected file, revoke its temporary object URL after `setImage()`
finishes decoding it:

```js
const objectUrl = URL.createObjectURL(file);
try {
  await anim.setImage(objectUrl, { animated: file.type === 'image/gif' });
} finally {
  URL.revokeObjectURL(objectUrl);
}
```

Built once per frame (not per character), so it's effectively free performance-wise.

### Performance

`ultra` is the performance-first tier: it uses a lower device-pixel-ratio cap, a
substantially looser character grid, two font levels, and eight cached opacity levels
without imposing a frame-rate ceiling. `high` maximizes detail,
`balanced` is the default quality tier, and `performance` trades detail for a smaller
cell grid. Every quality tier is uncapped and follows the display's animation-frame
rate. Dense modes (`wave`, `current`, `ripple`, `vortex`, `plasma`, `fadeIn`,
`fadeOut`, `glitch`, `typewriter`, and `image`) draw every grid cell each frame.
Sparse modes (`matrix`, `snow`, `sparkle`, `fire`, `starfield`, and `orbit`) scale
with their active particle count. Reducing DPR and increasing density has the largest
impact on dense-mode FPS.
Gradients are cached per frame. Edge-fade factors, cell coordinates, and baselines are
precomputed on resize. Opacity is quantized by quality tier so repeated cells avoid
redundant Canvas state mutations. Performance and Ultra rasterize their solid-color
glyph sets once into a shared, two-entry least-recently-used atlas. Subsequent frames
use sprite copies instead of repeating browser text shaping and glyph rasterization.
Gradients, animated colors, and image-derived per-cell colors retain direct text drawing
because their color output cannot be represented by one static atlas.
The solid horizontal `wave` path also caches its unchanged ambient field. Each frame
composites that layer once, clears the moving band, and evaluates only the cells inside
that band. Trails, backgrounds, backdrops, gradients, animated colors, pulse, active
cursor effects, and non-horizontal directions automatically use the full-frame path.
Static wave layers are enabled by the Ultra tier, shared between matching instances,
and held in a two-entry global cache. Set `cacheStaticWave: false` to trade CPU time for
lower bitmap memory. Higher-DPR tiers leave this cache disabled.
All active instances share one `requestAnimationFrame` scheduler, while each instance
retains its own time, FPS throttle, visibility, and draw state. This removes one browser
callback and closure per instance per frame. Blank glyphs are rejected before Canvas 2D
state changes or `fillText()` calls.

### Rendering backends

`renderer: 'auto'` is the default. It creates a WebGL2 context with
`powerPreference: 'high-performance'`, batches glyphs into one instanced draw, samples a
white glyph atlas in the fragment shader, and applies glyph gradients, trails, and
backdrops on the GPU. Mode state, sequence timing, and glyph selection remain on the
CPU. Image sampling uses a separate readback-optimized Canvas 2D surface.

If WebGL2 context or shader creation fails, `auto` uses Canvas 2D. A lost WebGL context
also switches the live instance to Canvas 2D and emits `rendererFallback`. Use
`renderer: 'webgl2'` to request GPU rendering explicitly while retaining that fallback,
or `renderer: 'canvas2d'` to choose the CPU renderer. The backend can be changed on a
live instance with `setRenderer()`; the presentation canvas is replaced while animation
state, target, event subscriptions, and sequence state remain attached to the instance.

```js
// app.js
const gpu = new asciiam('#gpu-hero', { mode: 'plasma', renderer: 'webgl2' });
const cpu = new asciiam('#cpu-hero', { mode: 'plasma', renderer: 'canvas2d' });

console.log(gpu.getRendererInfo().backend); // 'webgl2' or fallback 'canvas2d'
gpu.setRenderer('canvas2d');
```

The Canvas 2D fallback requests a desynchronized context with
`willReadFrequently: false` and compositor-layer promotion. Its actual acceleration is
browser-managed. Set `desynchronized: false` when presentation buffering is more
important than latency.

Animation sequences use the same renderer and canvas. Advancing a step changes mode and
step-level options; it does not create another animation instance or add work to the
per-cell drawing loop.

Run the JavaScript-side dense-renderer benchmark with configurable dimensions, frame
count, and concurrent instance count:

```bash
# shell
ASCIIAM_BENCH_WIDTH=1920 ASCIIAM_BENCH_HEIGHT=1080 \
ASCIIAM_BENCH_FRAMES=120 ASCIIAM_BENCH_INSTANCES=4 \
ASCIIAM_BENCH_MODE=wave npm run benchmark
```

## Animation sequences

Use an ordered sequence when a single surface needs timed, staggered, or interruptible
animation. `duration` is the time the step remains active. `delay` is a stagger before
that step starts; the previous animation remains active while it waits. Both are
wall-clock seconds and are intentionally independent of the mode's `speed` option.

```js
const sequence = [
  { mode: 'ripple', duration: 5 },
  { mode: 'fadeOut', duration: 2, options: { revealDirection: 'center' } },
  { mode: 'fadeIn', duration: 2, delay: 0.4 },
  { mode: 'ripple', duration: 5, options: { speed: 1.4 } },
  { mode: 'fadeOut', duration: 2 },
];

anim.setSequence(sequence, {
  loop: true,
  onStepStart({ index, step }) {
    console.log('started', index, step.mode);
  },
  onStepComplete({ index, step }) {
    console.log('completed', index, step.mode);
  },
  onStepInterrupt({ index, reason }) {
    console.log('interrupted', index, reason);
  },
});
anim.playSequence();
```

Steps may also define `onStart`, `onComplete`, and `onInterrupt`. Callback failures are
caught so they cannot stop the shared render scheduler. The same lifecycle is available
through `sequenceStepStart`, `sequenceStepComplete`, and `sequenceStepInterrupt` events.
Calling `setMode()` during playback interrupts the current step and pauses the sequence;
call `playSequence()` to resume it. Use `nextSequenceStep()` to skip or
`seekSequence(index)` to jump to a known step. `pauseSequence()`, `stopSequence()`, and
`clearSequence()` provide the remaining lifecycle controls.

## API

```js
anim.start();
anim.stop();
anim.destroy(); // removes canvas, disconnects all observers/listeners
const unsubscribe = anim.on('resize', ({ width, height, cols, rows }) => {});
anim.on('frame', ({ time, delta, drawn }) => {});
anim.off('resize', listener); // or call the returned unsubscribe function
anim.setMode(mode);
anim.setOption(key, value);
anim.setTarget(target); // moves the existing canvas to another container
anim.setSequence(steps, { loop: true });
anim.playSequence();
anim.pauseSequence();
anim.nextSequenceStep(); // interrupts the active step and advances
anim.seekSequence(2); // interrupts and activates the third step
anim.stopSequence();
anim.clearSequence();
anim.setRenderer('webgl2'); // live backend switch; returns the resolved backend
anim.getRendererInfo(); // requested and resolved backend
anim.setImage(url); // returns a Promise, resolves with the loaded Image
anim.attachStats(el); // el.textContent gets "N fps · WxH cells · N drawn" every ~500ms
asciiam.isSupported(); // static: feature-detect before constructing
asciiam.presets; // static: named preset configs
asciiam.QUALITY; // static: quality tier definitions
```

Lifecycle events are `ready` (emitted on the microtask after construction), `resize`,
`frame`, and the `sequence*` events described above. `frame` payloads are only allocated when that event has subscribers.
The `onReady` option is available when a constructor callback is more convenient.

## Behavior you should know about

- **Auto-pauses** when the element scrolls off-screen (`IntersectionObserver`) or the
  tab is hidden (`visibilitychange`) — no manual wiring needed.
- **Respects `prefers-reduced-motion`** by default: renders a single static frame
  instead of animating. Set `respectReducedMotion: false` to opt out.
- **Fails safely**: if WebGL2 is unavailable, the renderer falls back to Canvas 2D. If
  neither backend is available, the instance becomes a no-op instead of throwing.
- **Warns once** if the container has ~zero height/width — the most common integration
  mistake (a div with no explicit height collapses the grid to nothing).
- Re-measures its character grid once web fonts finish loading, in case a custom font
  was still loading at construction time.

## Browser support

Requires Canvas 2D and `requestAnimationFrame`; WebGL2 is optional and selected first by
the default `auto` renderer. `IntersectionObserver` and `ResizeObserver` are used when
available and degrade gracefully if not (falls back to `window.resize`, and assumes
always-visible for pause detection).

## Known limitations

See `pending-tasks.md` for the current gap list and rough priority.

## Installation

```bash
# shell
npm install @staticcanvas/asciiam
```

Browser builds can also be loaded from jsDelivr or unpkg using a pinned package
version. See Usage and export formats for the matching ESM and UMD filenames.

## Links

- [GitLab repository](https://gitlab.com/staticcanvas/asciiam)
- [Issue tracker](https://gitlab.com/staticcanvas/asciiam/-/issues)
- [npm package](https://www.npmjs.com/package/@staticcanvas/asciiam)

## Resources

- [Canvas 2D API](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D)
- [WebGL2 API](https://developer.mozilla.org/docs/Web/API/WebGL2RenderingContext)
- [npm documentation](https://docs.npmjs.com/)
- [jsDelivr documentation](https://www.jsdelivr.com/documentation)
- [GitLab CI/CD documentation](https://docs.gitlab.com/ci/)

## Support

Use the [issue tracker](https://gitlab.com/staticcanvas/asciiam/-/issues) for defects,
browser-specific rendering reports, and proposed API changes. Include the browser
version, active mode, options object, target dimensions, and a minimal example.

## Contributing

Merge requests should target `develop`.

1. Fork and clone the repository.
2. Create a feature branch from `develop`.
3. Run the test, lint, and build tasks.
4. Commit using a Conventional Commit message.
5. Push the branch and open a GitLab merge request.

```bash
# shell
git switch develop
git switch -c feature/ascii-media-change
npm test
npm run lint
npm run build
git commit -m "feat: add ASCII media change"
git push origin feature/ascii-media-change
```

## Acknowledgments

- [jsDelivr](https://www.jsdelivr.com/) and [unpkg](https://unpkg.com/) provide package CDN delivery.
- [npm](https://www.npmjs.com/) and [JSR](https://jsr.io/) provide package registries.
- [Shields.io](https://shields.io/) provides repository badge generation.

## API and configuration reference

| Name                                                | Type                                       | Default                     | Effect                                                             |
| --------------------------------------------------- | ------------------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| `mode`                                              | `asciiamMode`                              | `wave`                      | Selects the animation; `setMode()` restarts its local timeline.    |
| `quality`                                           | `high \| balanced \| performance \| ultra` | `balanced`                  | Applies the tier's DPR, density, FPS, and font-level values.       |
| `renderer`                                          | `auto \| webgl2 \| canvas2d`               | `auto`                      | Selects GPU-first, explicit GPU, or CPU rendering.                 |
| `powerPreference`                                   | WebGL power preference                     | `high-performance`          | Requests the preferred adapter class for WebGL2.                   |
| `charSet` / `imageChars`                            | `string`                                   | `asciiExtended`             | Maps intensity or image brightness to glyphs.                      |
| `fontFamily`                                        | `string`                                   | IBM Plex Mono stack         | Sets the font stack used to rasterize glyphs.                      |
| `fontSize` / `density` / `fontLevels`               | `number`                                   | `14` / tier / tier          | Controls grid measurement and cached font sizes.                   |
| `alphaLevels`                                       | `number`                                   | tier value                  | Quantizes opacity to reduce Canvas state changes.                  |
| `useGlyphAtlas`                                     | `boolean`                                  | tier value                  | Reuses rasterized solid-color glyphs in Performance and Ultra.     |
| `cacheStaticWave`                                   | `boolean`                                  | tier value                  | Caches and shares Ultra's unchanged horizontal wave field.         |
| `preferGPU`                                         | `boolean`                                  | `true`                      | Makes `auto` GPU-first; `false` defaults to Canvas 2D.             |
| `desynchronized`                                    | `boolean`                                  | `true`                      | Requests a low-latency presentation path from either backend.      |
| `color`                                             | CSS color                                  | `#4FA8FF`                   | Sets the fallback glyph color.                                     |
| `gradient`                                          | `object \| null`                           | `null`                      | Sets a cached linear, radial, or cubic glyph gradient.             |
| `background`                                        | CSS color                                  | `transparent`               | Clears to a solid canvas background.                               |
| `backdrop`                                          | `object \| null`                           | `null`                      | Draws a solid or gradient layer before glyphs.                     |
| `speed`                                             | `number`                                   | `1`                         | Scales the animation timeline once for every mode.                 |
| `direction`                                         | `horizontal \| vertical \| diagonal`       | `horizontal`                | Sets wave travel direction.                                        |
| `revealDirection`                                   | `left-to-right \| right-to-left \| center` | `center`                    | Sets fade sequencing.                                              |
| `align`                                             | spatial alignment                          | `center`                    | Sets the origin used by spatial modes.                             |
| `minOpacity` / `maxOpacity`                         | `number`                                   | `0.05` / `0.85`             | Sets glyph opacity bounds.                                         |
| `boldOnPeak` / `loop`                               | `boolean`                                  | `true` / `true`             | Controls high-intensity weight and timeline repetition.            |
| `edgeFade`                                          | `number`                                   | `0`                         | Applies a cached edge opacity falloff.                             |
| `trail` / `trailColor`                              | `number` / CSS color                       | `0` / `#070809`             | Controls retained-frame clearing.                                  |
| `pulse`                                             | `object \| null`                           | `null`                      | Applies one frame-level opacity multiplier.                        |
| `colorAnimation`                                    | `object \| null`                           | `null`                      | Applies `hueRotate` or `breathe` color animation.                  |
| `cursor`                                            | `object \| null`                           | `null`                      | Boosts opacity around pointer or supplied coordinates.             |
| `image`                                             | `string \| null`                           | `null`                      | Loads an initial image URL.                                        |
| `fit`                                               | `cover \| contain`                         | `cover`                     | Crops or letterboxes the sample without stretching.                |
| `imageScale` / `imageScaleX` / `imageScaleY` / `imageFov` | `number`                             | `1`                         | Controls source zoom, centered output width/height, and visible fraction. |
| `colorFromImage`                                    | `boolean`                                  | `false`                     | Uses cached sampled RGB colors per cell.                           |
| `imageLuminance`                                    | `auto \| normal \| invert`                | `auto`                      | Controls silhouette-aware image brightness mapping.                |
| `animateImageMask`                                  | `boolean`                                  | `true`                      | Enables image-cell animation.                                      |
| `imageMaskMode`                                     | legacy image-mask mode                     | `waveSweep`                 | Deprecated compatibility option for `mode: 'image'`; use global `mode`. |
| `imageAnimationRange`                               | `{ min, max } \| null`                     | `null`                      | Animates only cells inside inclusive RGB bounds.                   |
| `animateImageFrames`                               | `boolean`                                  | `true`                      | Resamples animated GIF frames while the instance is running.       |
| `imageFrameRate`                                   | `number`                                   | `12`                        | Caps animated-image sampling from 1 through 60 frames per second.  |
| `snowDensity` / `sparkleDensity`                    | `number`                                   | `0.02` / `0.05`             | Sets sparse particle counts as grid fractions.                     |
| `fireDensity` / `starfieldDensity` / `orbitDensity` | `number`                                   | `0.035` / `0.018` / `0.014` | Sets mode-specific sparse particle counts.                         |
| `glitchIntensity`                                   | `number`                                   | `0.32`                      | Sets the approximate displaced-row share.                          |
| `typewriterDuration`                                | seconds                                    | `4.5`                       | Sets full-grid reveal duration.                                    |
| `maxDPR` / `targetFPS`                              | `number` / `number \| null`                | tier values                 | Caps backing resolution and optional frame rate.                   |
| `showStats`                                         | `boolean`                                  | `false`                     | Updates an attached stats element.                                 |
| `respectReducedMotion`                              | `boolean`                                  | `true`                      | Draws a static frame when requested by the OS.                     |
| `onReady` / `onImageError`                          | `function \| null`                         | `null`                      | Handles initial readiness or image failure.                        |
| `customCell`                                        | `function \| null`                         | `null`                      | Supplies cells for `custom` mode.                                  |
| `sequence` / `sequenceOptions`                      | `array \| object`                          | `null`                      | Configures ordered, optionally looping animation steps.            |
| `start()` / `stop()` / `destroy()`                  | method                                     | —                           | Controls and disposes the renderer lifecycle.                      |
| `setMode(mode)`                                     | method                                     | —                           | Selects a mode and restarts its timeline.                          |
| `setOption(key, value)`                             | method                                     | —                           | Updates an option and dependent cached state.                      |
| `setImage(url, options?)`                           | async method                               | —                           | Decodes an image; `{ animated: true }` enables frame resampling for blob GIF URLs. |
| `setTarget(target)`                                 | method                                     | —                           | Moves the existing canvas and bindings to another container.       |
| `setSequence(steps, options)`                       | method                                     | —                           | Sets ordered modes, durations, staggers, overrides, and callbacks. |
| `playSequence()` / `pauseSequence()`                | method                                     | —                           | Starts, resumes, or pauses the configured sequence.                |
| `nextSequenceStep()` / `seekSequence(index)`        | method                                     | —                           | Interrupts the active step and changes sequence position.          |
| `stopSequence()` / `clearSequence()`                | method                                     | —                           | Stops playback or removes sequence configuration.                  |
| `setRenderer(renderer)`                             | method                                     | —                           | Replaces the presentation backend while retaining instance state.  |
| `getRendererInfo()`                                 | method                                     | —                           | Reports requested and resolved renderer information.               |
| `setCursor(x, y)`                                   | method                                     | —                           | Sets or clears cursor-reactive coordinates.                        |
| `attachStats(element)`                              | method                                     | —                           | Selects the statistics output element.                             |
| `on()` / `off()`                                    | method                                     | —                           | Subscribes or unsubscribes lifecycle listeners.                    |
