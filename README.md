# staticcanvas /// asciiam (Ascii Background Animator) v1.0.0

A dependency-free canvas engine for animated ASCII backgrounds — hero panels, section
backdrops, image-to-ASCII reveals. Renders on `<canvas>` for performance, not DOM nodes.

## Files

- `src/asciiam.js` — the source module.
- `public/index.html` — interactive static demo with live controls for every mode/option.

The build produces UMD and ESM bundles in `dist/asciiam/dist` and copies the browser
bundles to `public/libs`, so `public` can be deployed as a standalone Cloudflare Pages app.

## Cloudflare Pages demo

Configure the Pages project with `npm run build` as the build command and `public` as
the output directory. Add `UNSPLASH_ACCESS_KEY` as an encrypted secret under
**Settings > Variables and Secrets**. The Pages Function in `functions/api/unsplash.js`
keeps this credential out of the browser.

Place the included demo images in `public/assets/bg`, then run `npm run prepare:bg`
(also run automatically before `dev` and `build`) to regenerate
`public/assets/backgrounds.json`. Exact Unsplash searches are cached in the browser
for one hour and at the Cloudflare edge for one day. Photos continue to use the
hotlinked Unsplash URLs required by the API; normal CDN and browser HTTP caching still
applies.

For local Pages Function development, copy `.dev.vars.example` to `.dev.vars`, set the
access key, build once, and run `npx wrangler pages dev public`.

## Quick start

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

## Presets

Modes are the rendering algorithms; presets are named option objects that configure
those modes for common use cases. They are complementary, not duplicates.

```js
asciiam.presets.heroWave      // single sweeping line, bold-on-peak
asciiam.presets.subtleCurrent // gentle flowing texture, low opacity
asciiam.presets.matrixRain    // classic falling-column rain
asciiam.presets.softRipple    // concentric rings from center
asciiam.presets.introReveal   // one-shot staggered fade-in, no loop
asciiam.presets.auroraCurrent // multicolor flowing current
asciiam.presets.terminalMatrix // green Japanese matrix rain
asciiam.presets.blueprintWave // cool block-character scan
asciiam.presets.deepRipple    // radial violet ripple
asciiam.presets.snowDrift     // sparse drifting snow
asciiam.presets.emberSparkle  // warm sparse sparkles
asciiam.presets.imageReveal   // image-to-ASCII reveal configuration
```

Use one directly, or spread it and override:

```js
new asciiam('#hero', { ...asciiam.presets.heroWave, color: '#C04FFF' });
```

## Modes

| mode | description |
|---|---|
| `wave` | A line sweeps across the field; nearby characters go bolder/larger/more opaque with a smooth falloff. |
| `current` | Layered sine waves for a flowing, water-like texture (no single hard edge). |
| `ripple` | Concentric rings expanding from the center. |
| `fadeIn` | Staggered left-to-right reveal; loops by default, or set `loop: false` for a one-shot intro. |
| `matrix` | Classic falling-character rain, per-column speed/length/flicker. |
| `image` | Converts a supplied image into an ASCII grid (brightness → character ramp), with the `wave` reveal optionally animated on top. |

Switch modes live: `anim.setMode('ripple')`.

## Options

```js
new asciiam(target, {
  mode: 'wave',                 // wave | current | ripple | fadeIn | matrix | image
  quality: 'balanced',          // ultra | high | balanced | performance — sets maxDPR/density/targetFPS
  charSet: ' .:-=+*#%@',        // light -> heavy character ramp; see CHARACTER_SETS
  fontFamily: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
  fontSize: 14,
  density: 1,                   // >1 = looser grid, <1 = tighter
  color: '#4FA8FF',
  gradient: null,                // see Gradients below
  background: 'transparent',
  speed: 1,
  direction: 'horizontal',      // wave mode: horizontal | vertical | diagonal
  minOpacity: 0.05,
  maxOpacity: 0.85,
  boldOnPeak: true,
  edgeFade: 0,                  // 0..1, vignette strength at the edges
  maxDPR: 2,                    // cap device pixel ratio (set via `quality`, or override directly)
  targetFPS: null,              // null = uncapped (vsync); e.g. 30 to throttle
  showStats: false,             // pair with anim.attachStats(el) for a live fps/cell readout
  respectReducedMotion: true,   // honor prefers-reduced-motion: reduce
  onReady: null,                // (animation) => {}
  image: null,                  // URL, for image mode
  imageChars: ' .:-=+*#%@',
  fit: 'cover',                 // cover | contain
  imageScale: 1,                // source zoom multiplier
  imageFov: 1,                  // visible source fraction: 1 = full image
  colorFromImage: false,        // sample per-cell color from the image instead of `color`
  onImageError: null,           // (err) => {}
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
`imageScale` option zooms the source around its center, while `imageFov` controls the
fraction of the source visible in the ASCII frame.

When loading a user-selected file, revoke its temporary object URL after `setImage()`
finishes decoding it:

```js
const objectUrl = URL.createObjectURL(file);
try {
  await anim.setImage(objectUrl);
} finally {
  URL.revokeObjectURL(objectUrl);
}
```

Built once per frame (not per character), so it's effectively free performance-wise.

### Performance

`ultra` is the performance-first tier: it uses a lower device-pixel-ratio cap and a
looser character grid without imposing a frame-rate ceiling. `high` maximizes detail,
`balanced` is the default quality tier, and `performance` trades detail for a 30 FPS
cap. Dense modes (`wave`, `current`, `ripple`, `fadeIn`, and `image`) draw every grid
cell each frame; reducing DPR and increasing density has the largest impact on FPS.
Gradients are cached per frame, and edge-fade factors are precomputed on resize.

## API

```js
anim.start()
anim.stop()
anim.destroy()                  // removes canvas, disconnects all observers/listeners
const unsubscribe = anim.on('resize', ({ width, height, cols, rows }) => {})
anim.on('frame', ({ time, delta, drawn }) => {})
anim.off('resize', listener)    // or call the returned unsubscribe function
anim.setMode(mode)
anim.setOption(key, value)
anim.setImage(url)              // returns a Promise, resolves with the loaded Image
anim.attachStats(el)            // el.textContent gets "N fps · WxH cells · N drawn" every ~500ms
asciiam.isSupported()     // static: feature-detect before constructing
asciiam.presets           // static: named preset configs
asciiam.QUALITY           // static: quality tier definitions
```

Lifecycle events are `ready` (emitted on the microtask after construction), `resize`,
and `frame`. `frame` payloads are only allocated when that event has subscribers.
The `onReady` option is available when a constructor callback is more convenient.

## Behavior you should know about

- **Auto-pauses** when the element scrolls off-screen (`IntersectionObserver`) or the
  tab is hidden (`visibilitychange`) — no manual wiring needed.
- **Respects `prefers-reduced-motion`** by default: renders a single static frame
  instead of animating. Set `respectReducedMotion: false` to opt out.
- **Fails safely**: if canvas 2D isn't supported, the instance becomes a no-op instead
  of throwing (a console warning is logged).
- **Warns once** if the container has ~zero height/width — the most common integration
  mistake (a div with no explicit height collapses the grid to nothing).
- Re-measures its character grid once web fonts finish loading, in case a custom font
  was still loading at construction time.

## Browser support

Requires Canvas 2D and `requestAnimationFrame` (universal). `IntersectionObserver` and
`ResizeObserver` are used when available and degrade gracefully if not (falls back to
`window.resize`, and assumes always-visible for pause detection).

## Known limitations

See `pending-tasks.md` for the current gap list and rough priority.
