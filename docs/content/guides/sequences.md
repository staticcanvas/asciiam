---
title: Animation sequences
description: Run ordered media and mesh animation nodes with controlled timing, retained-frame blends or real per-cell morph transitions, callbacks, and looping.
weight: 30
date: 2026-08-13
lastmod: 2026-08-14
tags: [sequences, timeline, images, 3D, glTF, transitions, blend, morph, repeat, events]
keywords: [animation sequence, image sequence, mesh sequence, glTF sequence, animation playlist, sequence nodes, ASCII transitions, per-cell morph, retained frame blend, snapshot transition, step repeat, callbacks]
---

A sequence controls one renderer. Each node selects a mode, duration, optional delay,
image or model-source action, mode-repeat policy, option overrides, and lifecycle callbacks. The
web utility displays nodes left to right in playback order; its image selector can
retain the current source, clear it, or load one of the included images.

`repeat` and sequence `loop` control different boundaries. A step with `repeat: true`
restarts a finite mode such as `fadeIn`, `fadeOut`, `irisIn`, `dissolveOut`, `assemble`, or
`typewriter` while that step remains active. It defaults to `false`, so a finite mode
reaches its final frame and holds it until the next step. Sequence `loop` controls
whether playback returns to the first step after the final step.

An incoming step can also declare a `blend` or `morph` transition. `blend` is a retained-frame
crossfade: asciiam captures and holds the outgoing presentation before it changes or begins
source preparation, then eases it away once the incoming image, media frame set, or mesh is
ready and live beneath it. This is a bounded retained-frame blend: it does not restart retained
GIF playback, expose decode frames, or run two render engines concurrently.

`morph` is a real per-cell transition: individual ASCII cells transition character, color, and
opacity — or position, in `'flow'` style — from the outgoing step's content to the incoming
step's, staggered across the grid rather than uniformly faded. Pick the style with
`transition.style`:

- `'dissolve'` (default) — each cell crossfades from its old character to its new one, timed by
  a per-cell wavefront so the change sweeps across the grid instead of happening everywhere at
  once.
- `'scramble'` — each transitioning cell flickers through a few characters from the active
  `charSet` before settling on its target glyph.
- `'flow'` — cells whose old and new character match attempt to slide from their old grid
  position toward their new one; everything else falls back to `'dissolve'`.

`transition.spread` (0.02–0.9, default `0.22`) widens or narrows that per-cell wavefront band.
`morph` automatically falls back to `blend` behavior for scenes it can't capture cell-by-cell: an
active `setLayers()` composite, a step whose own `options` resize the grid mid-transition, or
while a step's image/model source is still loading (there is no "after" content to morph toward
until that finishes — those steps always retain-and-blend, regardless of the requested type).

The default transition is `cut`; reduced-motion preference resolves both `blend` and `morph` to
cuts.

## Configure a sequence

The following sequence runs ripple for five seconds, fades out, fades in, and repeats.

`app.js`

```js
animation.setSequence([
  { mode: 'ripple', duration: 5 },
  {
    mode: 'fadeOut',
    duration: 5,
    repeat: false,
    transition: { type: 'morph', style: 'dissolve', duration: 0.8, easing: 'easeInOut' }
  },
  {
    mode: 'fadeIn',
    duration: 1,
    transition: { type: 'morph', style: 'scramble', duration: 0.8, easing: 'easeInOut' }
  }
], {
  loop: true,
  autoplay: true,
  onStepStart(detail) {
    console.log(detail.index, detail.step.mode);
  }
});
```

## Move between images

Set `image` to a URL to decode and sample a new source before that node starts. Omit
the field to retain the current source, or use `null` to clear image data and return to
a procedural grid. A node's delay elapses first; its duration does not begin until the
new image is ready. This prevents decode time from shortening the visible node.

```js
animation.setSequence([
  { mode: 'fadeIn', image: '/media/product-front.webp', duration: 3 },
  {
    mode: 'lumaFold',
    image: '/media/product-detail.webp',
    imageOptions: { animated: false },
    duration: 4,
    // A step that loads a new image source always retains-and-blends while it decodes,
    // regardless of the requested type — there is no "after" content to morph toward yet.
    transition: { type: 'blend', duration: 0.6, easing: 'easeInOut' }
  },
  { mode: 'wave', image: null, duration: 2 }
], { autoplay: true, loop: true });

animation.on('sequenceStepError', ({ index, error }) => {
  console.error(`Image for node ${index + 1} could not be loaded`, error);
});
```

An image failure pauses the sequence, calls the node's optional `onError`, and emits
`sequenceStepError`. Correct the source or seek to another node before resuming.

## Move between 3D models

Set `model` to a URL or other `setModel()` source to load glTF/GLB geometry before a
mesh node starts. Omit it to retain the current mesh, or set it to `null` to clear
geometry. `modelOptions` accepts the same bounded loader options as `setModel()`.
`meshEnabled` defaults to `false`; set it (globally at construction, or per step via
`options`) for a `mesh` step's geometry to actually render.

```js
animation.setSequence([
  { mode: 'mesh', model: '/models/part-a.glb', options: { meshEnabled: true }, duration: 4 },
  {
    mode: 'mesh',
    model: '/models/part-b.glb',
    options: { meshStyle: 'wireframe', meshAutoRotate: true },
    duration: 4,
    // Same as image loads: a step that loads a new model source always retains-and-blends.
    transition: { type: 'blend', duration: 0.7, easing: 'easeInOut' }
  }
], { autoplay: true });
```

Model load or validation failure follows the same `onError` and
`sequenceStepError` path as image failure.

`delay` staggers the start of a step. During the delay, the prior frame state continues. `duration` begins after the delay completes.

## Sequence state

```mermaid
stateDiagram-v2
  [*] --> Configured: setSequence()
  Configured --> Waiting: playSequence() + delay
  Configured --> Playing: playSequence()
  Waiting --> Loading: node declares a new image or model
  Loading --> Playing: source decoded and sampled
  Loading --> Paused: source error
  Waiting --> Playing: delay elapsed, image retained or cleared
  Playing --> Waiting: next step has delay
  Playing --> Playing: next step
  Playing --> Paused: pauseSequence()
  Paused --> Playing: playSequence()
  Playing --> Complete: last step and loop=false
  Playing --> Configured: stopSequence()
  Playing --> Interrupted: manual setMode()
```

## Callbacks and events

Step callbacks receive `(detail, animation)`. The same lifecycle is available through `on()` event subscriptions when configuration should remain serializable.

## Reference

| API | Input | Result |
| --- | --- | --- |
| `setSequence(steps, options)` | step array, sequence options | Configures a sequence and returns the instance. |
| `playSequence(index?)` | optional start index | Starts or resumes playback. |
| `pauseSequence(reason?)` | optional reason | Pauses at the current step. |
| `stopSequence()` | none | Stops playback and resets sequence position. |
| `clearSequence()` | none | Removes sequence configuration. |
| `seekSequence(index)` | numeric index | Interrupts the current step and selects another. |
| `nextSequenceStep()` | none | Advances one step using loop policy. |
| `getSequenceState()` | none | Returns configured, running, completed, index, length, loop, elapsed, waiting, loading, and morph state. |
| `step.image` | string, `null`, or omitted | Loads a source, clears the current source, or retains it. |
| `step.imageOptions` | object | Passes image decode hints such as `animated` to `setImage()`. |
| `step.model` | source, `null`, or omitted | Loads a glTF/GLB source, clears geometry, or retains it. |
| `step.modelOptions` | object | Passes bounded loader options to `setModel()`. |
| `step.onError` | callback | Runs when the node's image or model cannot be decoded. |
| `step.repeat` | boolean, default `false` | Repeats a finite mode timeline while the step remains active. |
| `step.transition` | `{ type, duration, easing }` | Selects an incoming `cut` or snapshot `morph`; duration uses seconds. |
| `options.loop` | boolean, default `true` | Restarts the sequence after its final step. |
| `sequenceMorphStart` | event | Emitted after incoming state is ready and the retained outgoing frame begins easing away. |
| `sequenceMorphComplete` | event | Emitted after the outgoing snapshot reaches zero opacity. |
| `sequenceStepError` | event | Emitted when a node image or model fails; playback pauses. |
