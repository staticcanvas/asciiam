---
title: API reference
description: Constructor, static members, options, methods, events, renderer data, sequence objects, and callback contracts.
weight: 40
date: 2026-08-13
lastmod: 2026-08-13
tags: [API, reference, JavaScript, TypeScript, options, methods, events]
keywords: [asciiam API, configuration reference, animation options, renderer methods, sequence events, callbacks, TypeScript declarations]
---

The package exports the `asciiam` class as its default export and provides TypeScript declarations in `src/asciiam.d.ts`.

## Choose an integration path

| Goal | Start with | Then use |
| --- | --- | --- |
| Render one animation | `new asciiam(target, options)` | `setOption()`, `setMode()` |
| Prefer GPU with a safe fallback | `renderer: 'auto'` | `getRendererInfo()`, `rendererFallback` |
| Play an ordered animation story | `setSequence(steps, options)` | sequence events and callbacks |
| Turn an image into animated ASCII | `setImage(source)` | image mask and RGB range options |
| Own application cleanup | instance lifecycle | `stop()` or `destroy()` |

All durations are expressed in seconds, dimensions and font sizes use CSS pixels unless noted, and normalized coordinates use the inclusive `0`–`1` range. Mutating methods apply to the live instance; sequence methods return the instance for chaining.

## Constructor

`app.js`

```js
import asciiam from '@staticcanvas/asciiam';

const animation = new asciiam('#target', {
  mode: 'wave',
  renderer: 'auto',
  quality: 'balanced'
});
```

### `new asciiam(target, options?)`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | CSS selector, `HTMLElement`, or `HTMLCanvasElement` | Yes | Container that receives an owned canvas, or a caller-owned canvas. |
| `options` | `asciiamOptions` | No | Initial renderer, mode, presentation, image, and lifecycle configuration. |

The constructor throws when the target cannot be found or when `renderer` has an unsupported value. If neither Canvas 2D nor WebGL2 can initialize, the instance becomes a no-op and logs a warning.

### Target ownership

Passing a container lets asciiam create and own its presentation canvas. Passing an `HTMLCanvasElement` uses the caller-supplied canvas. In both cases, call `destroy()` before permanently removing the instance so renderer resources and observers are released.

## Static members

| Member | Type | Description |
| --- | --- | --- |
| `asciiam.BUILT_IN_MODES` | readonly mode-name array | Canonical inventory implemented by the library. |
| `asciiam.QUALITY` | record | Quality-tier values for DPR, density, font levels, alpha levels, and caches. |
| `asciiam.CHARACTER_SETS` | record | Named glyph strings ordered for density mapping. |
| `asciiam.presets` | record | Included option objects keyed by preset name. |
| `asciiam.isSupported()` | method | Returns whether WebGL2 or Canvas 2D context creation succeeds. |
| `asciiam.registerMode(name, fn)` | method | Registers a named custom cell callback. |

## Core options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | mode string | `wave` | Selects the active animation algorithm. |
| `quality` | `high \| balanced \| performance \| ultra` | `balanced` | Applies one quality tier. |
| `renderer` | `auto \| webgl2 \| canvas2d` | `auto` when GPU preference is enabled | Selects GPU-first, explicit WebGL2, or Canvas 2D presentation. |
| `charSet` | string | `asciiExtended` | Supplies glyphs used by procedural modes. |
| `fontFamily` | string | IBM Plex Mono fallback stack | Sets glyph measurement and rasterization fonts. |
| `fontSize` | number | `14` | Sets the base font size in CSS pixels. |
| `density` | number | quality-tier value | Scales glyph-cell spacing. |
| `color` | CSS color string | `#4FA8FF` | Sets the fallback glyph color. |
| `background` | CSS color string | `transparent` | Sets the renderer clear color. |
| `speed` | number | `1` | Scales the animation timeline. |
| `direction` | `horizontal \| vertical \| diagonal` | `horizontal` | Sets wave travel direction. |
| `revealDirection` | reveal direction string | `center` | Sets horizontal, vertical, diagonal, center-out, or edge-in reveal order. |
| `align` | nine-position spatial alignment | `center` | Sets the origin for compatible spatial modes. |
| `minOpacity` | number | `0.05` | Sets the lower procedural opacity bound. |
| `maxOpacity` | number | `0.85` | Sets the upper procedural opacity bound. |
| `boldOnPeak` | boolean | `true` | Uses bold font variants for high-intensity cells. |
| `loop` | boolean | `true` | Loops mode-local reveal timelines. |
| `edgeFade` | number | `0` | Applies cached edge attenuation. |

## Renderer and performance options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `powerPreference` | `high-performance \| low-power \| default` | `high-performance` | Passes a preference to WebGL2 context creation. |
| `preferGPU` | boolean | `true` | Makes an omitted renderer GPU-first; `false` defaults to Canvas 2D. |
| `desynchronized` | boolean | `true` when GPU preference is enabled | Requests a low-latency presentation context. |
| `maxDPR` | number | quality-tier value | Caps backing-store device pixel ratio. |
| `targetFPS` | number or `null` | quality-tier value (`null`) | Adds a frame interval when numeric. |
| `fontLevels` | number | quality-tier value | Sets quantized font-size variants. |
| `alphaLevels` | number | quality-tier value | Sets opacity quantization. |
| `useGlyphAtlas` | boolean | quality-tier value | Enables the Canvas 2D solid glyph atlas. |
| `cacheStaticWave` | boolean | quality-tier value | Enables Ultra's static horizontal wave cache when compatible. |
| `showStats` | boolean | `false` | Enables attached stats output. |
| `respectReducedMotion` | boolean | `true` | Draws a static frame when reduced motion is requested. |

## Color and backdrop options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `gradient` | gradient object or `null` | `null` | Applies linear, radial, or cubic multi-stop glyph color. |
| `backdrop` | backdrop object or `null` | `null` | Draws a solid or gradient surface in the selected layer. |
| `trail` | number | `0` | Sets retained-frame overlay opacity. |
| `trailColor` | CSS color | `#070809` | Sets the retained-frame overlay color. |
| `pulse` | `{ amplitude, speed }` or `null` | `null` | Applies a frame-level opacity multiplier. |
| `colorAnimation` | color animation object or `null` | `null` | Applies `hueRotate` or `breathe`. |
| `cursor` | cursor options or `null` | `null` | Raises opacity near pointer or supplied coordinates. |
| `interactionRadius` | CSS pixels | `180` | Sets hover-zone extent and click-zone travel distance. |
| `interactionDuration` | seconds | `1.1` | Sets click-zone pulse duration. |

### Gradient object

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `linear \| radial \| cubic` | `linear` behavior | Selects gradient geometry or interpolation. |
| `stops` | CSS colors or `{ offset, color }[]` | blue and purple defaults | Sets colors and optional explicit offsets. |
| `steps` | integer from 1 through 6 | `2` | Expands simple color arrays into output stops. |
| `angle` | number | `0` | Sets linear gradient degrees. |
| `center` | `[x, y]` | `[0.5, 0.5]` | Sets radial center as normalized coordinates. |
| `radius` | number | `0.75` | Sets radial radius relative to the largest dimension. |
| `animate` | boolean | `false` | Rotates the angle over time. |

### Backdrop object

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | `false` | Enables the backdrop. |
| `opacity` | number | `0.5` | Sets backdrop alpha. |
| `color` | CSS color | `#0a0c10` | Sets solid or fallback color. |
| `placement` | `behind \| over` | `behind` | Draws before glyphs or composites after them. `over` at opacity `1` covers the animation. |
| `gradient` | gradient object or `null` | `null` | Sets backdrop gradient color. |

## Image options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `image` | URL string or `null` | `null` | Loads an initial image. |
| `imageChars` | string | `asciiExtended` | Maps sampled brightness to glyphs. |
| `fit` | `cover \| contain` | `cover` | Crops or letterboxes the sampled source. |
| `imageScale` | number | `1` | Applies centered source zoom. |
| `imageScaleX` | number | `1` | Scales sampled output width around its centre. |
| `imageScaleY` | number | `1` | Scales sampled output height around its centre. |
| `imageFov` | number | `1` | Controls visible source fraction. |
| `imageLuminance` | `auto \| normal \| invert` | `auto` | Controls silhouette-aware brightness mapping. |
| `colorFromImage` | boolean | `false` | Uses sampled RGB values for glyphs. |
| `animateImageMask` | boolean | `true` | Enables image mask animation. |
| `imageMaskMode` | legacy image mask string | `waveSweep` | Deprecated compatibility option for `mode: 'image'`; use global `mode` for new integrations. |
| `imageAnimationRange` | `{ min, max }` or `null` | `null` | Restricts animation to an inclusive RGB box. |
| `animateImageFrames` | boolean | `true` | Plays captured or fallback-sampled GIF frames. |
| `imageFrameRate` | number | `12` | Caps fallback GIF sampling from 1 through 60 fps. |

## Mode-specific options

| Property | Type | Default | Mode |
| --- | --- | --- | --- |
| `ambient` | number | `0.35` | `wave` |
| `bandWidth` | number | `0.14` | `wave` |
| `snowDensity` | number | `0.02` | `snow` |
| `sparkleDensity` | number | `0.05` | `sparkle` |
| `fireDensity` | number | `0.035` | `fire` |
| `starfieldDensity` | number | `0.018` | `starfield` |
| `orbitDensity` | number | `0.014` | `orbit` |
| `glitchIntensity` | number | `0.32` | `glitch` |
| `typewriterDuration` | seconds | `4.5` | `typewriter` |
| `customCell` | function or `null` | `null` | `custom` |

## Lifecycle and configuration methods

| Method | Return | Description |
| --- | --- | --- |
| `start()` | `void` | Starts or resumes scheduling. |
| `stop()` | `void` | Stops scheduling and retains state. |
| `destroy()` | `void` | Releases renderer, canvas, observers, event listeners, and scheduler membership. |
| `setMode(mode)` | `void` | Selects a mode, resets local time, and interrupts manual sequence playback. |
| `setOption(key, value)` | `void` | Updates an option and rebuilds affected caches or state. |
| `setTarget(target)` | `void` | Moves the presentation canvas and target bindings. |
| `setImage(source, options?)` | `Promise<HTMLImageElement \| null>` | Decodes an image; supported browsers capture every GIF frame and its delay. |
| `clearImage()` | instance | Cancels pending image work and clears sampled image state without changing the active mode. |
| `setCursor(x, y?)` | `void` | Sets cursor coordinates or clears them when `x` is `null`. |
| `triggerInteraction(x?, y?)` | `void` | Starts a click-zone pulse; omitted coordinates use the aligned origin. |
| `attachStats(element)` | `void` | Selects the element that receives FPS and grid output. |

### Live configuration

Use `setOption()` for focused changes and `setMode()` when the animation algorithm changes. Renderer changes should go through `setRenderer()` so backend resources are replaced consistently. Calling `setMode()` while a manual sequence is running interrupts that sequence and emits the corresponding interruption events.

## Renderer methods

### `setRenderer(renderer)`

Returns the resolved backend: `webgl2` or `canvas2d`. The method replaces the presentation canvas when backend type changes and retains animation and sequence state.

### `getRendererInfo()`

| Field | Type | Description |
| --- | --- | --- |
| `requested` | `auto \| webgl2 \| canvas2d` | Developer-selected policy. |
| `backend` | `webgl2 \| canvas2d` | Active presentation backend. |
| `gpuPreferred` | boolean | Whether GPU preference is enabled. |
| `acceleration` | status string | Reports GPU API preference, browser-managed Canvas, or no request. |
| `desynchronized` | boolean | Resolved or requested low-latency context flag. |
| `willReadFrequently` | boolean | Readback hint for the presentation context. |

## Sequence objects

### Sequence step

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | No | Stable application identifier. |
| `label` | string | No | Application-facing label. |
| `mode` | mode string | Yes | Mode activated for the step. |
| `duration` | seconds | No | Active step duration. |
| `delay` | seconds | No | Wait before step activation. |
| `repeat` | boolean | No | Repeats a finite mode timeline within the step; defaults to `false`. |
| `image` | string, `null`, or omitted | No | Decodes a new source before timing starts, clears the source, or retains it when omitted. |
| `imageOptions` | image option record | No | Passes decode hints such as `animated` to `setImage()`. |
| `options` | option record | No | Step-local option overrides. |
| `transition` | transition object | No | Incoming `cut` or snapshot `morph` transition. |
| `onStart` | callback | No | Runs when the step starts. |
| `onComplete` | callback | No | Runs on normal completion. |
| `onInterrupt` | callback | No | Runs when interrupted. |
| `onError` | callback | No | Runs when the step image fails to load; playback pauses. |

### Sequence options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `loop` | boolean | `true` behavior | Restarts after the final step. |
| `autoplay` | boolean | `false` | Starts after configuration. |
| `onStepStart` | callback | `null` | Runs for each start. |
| `onStepComplete` | callback | `null` | Runs for each normal completion. |
| `onStepInterrupt` | callback | `null` | Runs for each interruption. |
| `onComplete` | callback | `null` | Runs when a non-looping sequence completes. |

### Sequence methods

| Method | Return | Description |
| --- | --- | --- |
| `setSequence(steps, options?)` | instance | Configures ordered steps. |
| `playSequence(startIndex?)` | instance | Starts or resumes playback. |
| `pauseSequence(reason?)` | instance | Pauses playback. |
| `stopSequence()` | instance | Stops and resets playback. |
| `clearSequence()` | instance | Removes sequence configuration. |
| `seekSequence(index)` | instance | Interrupts and selects a normalized index. |
| `nextSequenceStep()` | instance | Advances according to loop policy. |
| `getSequenceState()` | state object | Returns current playback state. |

### Sequence state

| Field | Type | Description |
| --- | --- | --- |
| `configured` | boolean | Whether steps exist. |
| `running` | boolean | Whether sequence time advances. |
| `completed` | boolean | Whether a non-looping sequence reached its final boundary. |
| `index` | number | Active step index or `-1`. |
| `length` | number | Step count. |
| `loop` | boolean | Active loop policy. |
| `elapsed` | number | Seconds elapsed in the current phase. |
| `waiting` | boolean | Whether the active step delay is pending. |
| `loading` | boolean | Whether the active step is waiting for an image decode. Duration remains at zero. |
| `morphing` | boolean | Whether an outgoing snapshot is currently fading. |
| `morphProgress` | number | Normalized morph progress from `0` through `1`. |

## Events

Subscribe with `on(event, listener)`. The method returns an unsubscribe function. Remove a known listener with `off(event, listener)`.

`app.js`

```js
const unsubscribe = animation.on('rendererFallback', (detail, instance) => {
  console.log(detail.reason, detail.backend, instance);
});

unsubscribe();
```

Keep the returned unsubscribe function when a listener belongs to a component lifecycle. `off(event, listener)` is useful when the same stable listener reference is already available.

| Event | Trigger |
| --- | --- |
| `ready` | Construction and initial sizing complete. |
| `resize` | Target grid dimensions change. |
| `frame` | A frame is rendered. |
| `rendererChange` | Requested or resolved renderer changes. |
| `rendererFallback` | WebGL context loss switches presentation to Canvas 2D. |
| `imageFramesReady` | Exact GIF capture completes; detail includes `frameCount` and total `duration` in seconds. |
| `sequenceStart`, `sequenceResume` | Sequence playback starts or resumes. |
| `sequencePause`, `sequenceStop` | Playback pauses or stops. |
| `sequenceLoop`, `sequenceComplete` | Sequence loops or finishes. |
| `sequenceInterrupt` | Manual mode selection interrupts playback. |
| `sequenceStepStart` | A delayed or immediate step starts. |
| `sequenceStepComplete` | A step reaches its duration. |
| `sequenceStepInterrupt` | Seek, stop, reconfiguration, or manual input interrupts a step. |
| `sequenceStepError` | A step image fails to decode; detail contains `error` and playback pauses. |
| `sequenceMorphStart`, `sequenceMorphComplete` | A snapshot morph begins or finishes. |

## Callback types

| Callback | Signature | Description |
| --- | --- | --- |
| Ready | `(animation) => void` | Constructor readiness callback. |
| Image error | `(error) => void` | Image decode or load failure callback. |
| Event listener | `(detail, animation) => void` | General event subscription. |
| Sequence callback | `(detail, animation) => void` | Step or sequence lifecycle callback. |
| Custom cell | `(api) => cell \| null` | Returns a glyph cell for one grid coordinate. |

## TypeScript surface

The bundled declarations export `asciiamMode`, `asciiamEvent`, `asciiamOptions`, sequence step/options/state types, event detail, and the default `asciiam` class. Import types alongside the runtime without a separate package.

```ts
import asciiam, {
  type asciiamOptions,
  type asciiamSequenceStep
} from '@staticcanvas/asciiam';

const options: asciiamOptions = { renderer: 'auto', quality: 'balanced' };
const steps: asciiamSequenceStep[] = [
  { mode: 'ripple', duration: 5 },
  { mode: 'fadeOut', duration: 1.2 }
];

const animation = new asciiam('#target', options).setSequence(steps, {
  loop: true,
  autoplay: true
});
```
