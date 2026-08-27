# WebGPU renderer: trail and backdrop surfaces render solid white instead of their configured color

A shared GPU uniform buffer in the WebGPU rendering backend (`WebGPUGlyphRenderer` in `src/asciiam.js`) caused the trail-persistence overlay and the backdrop surface to render solid opaque white on every frame, regardless of `trail`/`trailColor`/`backdrop.color`, on any real WebGPU device. `renderer: "auto"` (the library default) uses live WebGPU whenever a browser supports it, so this affected any such visitor without their needing to opt in to anything.

## Status

Fixed in commit `0dfb8d9`. Not previously known or documented — found by direct code audit, not by reproducing the symptom, because this development/test environment has no real WebGPU adapter (`navigator.gpu.requestAdapter()` always resolves to `null` here), so `renderer: "auto"` always fell back to WebGL2 in every automated test run in this repo, including the ones run while investigating this exact report. See [`webgpu-uniform-buffer-alignment-2d26520c.md`](webgpu-uniform-buffer-alignment-2d26520c.md) for the same underlying environment gap surfacing a different WebGPU-only defect earlier.

## Symptom

Reported by a user testing the built docs site and Web Utility playground:

> trail persistance greater than 0 makes the background white
>
> trail perssistant greater then 0 seems to do nothing but make the canvas background white.

The report survived two prior, independently confirmed and verified fixes in the same investigation (an `IntersectionObserver` re-targeting bug after WebGPU→WebGL2 fallback, and a docs-site cache-busting gap) — both real defects, but neither reproduced the reported symptom under controlled testing, and the report persisted after both shipped. That mismatch (fix confirmed correct and deployed, symptom persisting) was the signal to look at a code path that couldn't be exercised by the testing done so far, rather than at the trail/backdrop logic itself again.

## Replicating the bug

Not reproducible in this environment directly (no WebGPU adapter). On a browser with real WebGPU support (Chrome/Edge with WebGPU enabled, which is increasingly the default), any instance with `renderer: "auto"` or `renderer: "webgpu"` and either of the following would show it:

```js
new asciiam(el, {
    renderer: "auto", // or "webgpu"
    trail: 0.34,
    trailColor: "#070809",
});
```

or with a backdrop enabled instead of/alongside trail:

```js
new asciiam(el, {
    renderer: "auto",
    backdrop: { enabled: true, opacity: 0.9, color: "#0a0c10" },
});
```

Both of the docs site's own hero configurations (`initHeroAnimation`/`initHeroCompactAnimation` in `docs/static/js/asciiam-animations.js`) set `trail: 0.34` together with `backdrop.enabled: true`, and use `renderer: "auto"` — so every docs page header, and the gallery's `orbitalFlow`/`risingEmbers` presets (the only two built-in presets with `trail > 0`), would show this on a WebGPU-capable browser.

Since real hardware isn't available here, the bug was instead confirmed by building a mocked WebGPU device in a Jest test (`tests/asciiam.test.js`, `"gives each WebGPU surface/glyph draw its own uniform buffer within a frame"`) that tracks which physical buffer object each recorded draw call's bind group references, and what bytes that buffer holds by the time the frame's simulated `writeBuffer` calls finish. Against the pre-fix code, that test fails: all of a frame's `setBindGroup` calls (trail's surface draw, backdrop's surface draw, the glyph flush) resolve to the *same* buffer object, holding only whichever call's data was written last. Confirmed this failure directly by temporarily stashing the fix and re-running the test — see Verification below.

## Root cause

`WebGPUGlyphRenderer.surface()` (used for both the trail overlay and the backdrop) and `.flush()` (used for the glyph instance batch) each wrote their own per-draw color into one shared `this.uniformBuffer`:

```js
// before fix
_uniforms(color, useGradient = false) {
    const values = this.uniformValues;
    values[0] = this.width || 1; values[1] = this.height || 1;
    values[4] = color[0]; values[5] = color[1]; values[6] = color[2]; values[7] = color[3];
    values[8] = useGradient ? 1 : 0;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, values);
}
```

A typical frame with trail and backdrop both active calls this three times before the frame is ever submitted:

1. `surface(trailColor)` → `writeBuffer(uniformBuffer, ..., trailColor)`, records a draw referencing `uniformBuffer`.
2. `_drawWebGLBackdrop()` → `surface(backdropColor)` → `writeBuffer(uniformBuffer, ..., backdropColor)`, records another draw referencing the *same* `uniformBuffer`.
3. `flush()` → `writeBuffer(uniformBuffer, ..., [1, 1, 1, 1])` (an inert placeholder — `glyphFragment` reads per-instance vertex color, not `uniforms.color`, so this value was never meant to matter) → records the glyph instance draw, then finally `pass.end()` + `queue.submit()`.

WebGPU command buffers don't execute on the GPU until `queue.submit()`. A `GPUBuffer` is live, shared memory — not a value snapshotted at the moment a draw call is *recorded*. Every `writeBuffer()` call made before `submit()` completes before that submission's commands run, so by the time the GPU actually executes the pass, all three recorded draws read the buffer's *final* state: whatever the *last* `writeBuffer()` call set it to. Since glyph flushing always happens last, every draw in the frame — including the trail and backdrop surface draws, recorded earlier — ended up reading `[1, 1, 1, 1]` (opaque white, straight through `surfaceFragment`'s premultiply: `vec4f(1*1, 1*1, 1*1, 1) = vec4f(1,1,1,1)`), completely independent of what `trail`/`trailColor`/`backdrop.color` were actually set to.

WebGL2's equivalent path (`WebGL2GlyphRenderer`) never had this bug: `gl.uniform4fv(location, color)` takes effect immediately, synchronously, relative to the very next `gl.drawArrays()` call — WebGL has no command-buffer/deferred-submission model to create this hazard. That is also exactly why this was invisible to every test run in this repository: with no real WebGPU adapter available, `renderer: "auto"` always resolves to WebGL2, and the buggy code path was never executed.

## Fix

Give each draw call within a frame its own uniform buffer instead of sharing one, via a small per-frame pool:

```js
// after fix
_acquireUniformSlot() {
    let slot = this._uniformSlots[this._uniformSlotIndex];
    if (!slot) {
        const bufferUsage = globalThis.GPUBufferUsage;
        slot = { buffer: this.device.createBuffer({ size: 48, usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST }) };
        this._uniformSlots[this._uniformSlotIndex] = slot;
    }
    this._uniformSlotIndex++;
    return slot;
}

_uniforms(slot, color, useGradient = false) {
    const values = this.uniformValues;
    values[0] = this.width || 1; values[1] = this.height || 1;
    values[4] = color[0]; values[5] = color[1]; values[6] = color[2]; values[7] = color[3];
    values[8] = useGradient ? 1 : 0;
    this.device.queue.writeBuffer(slot.buffer, 0, values);
}
```

- `this._uniformSlotIndex` resets to `0` in `begin()` and `_beginLoadedPass()`, so slots are reused in the same order every frame — buffers are only ever created lazily, the first time a given ordinal position in the frame needs one, and then reused across every subsequent frame (no per-frame allocation once warmed up).
- `surface()` and `flush()` each call `_acquireUniformSlot()` before building their bind group, so `surface(trail)`, `surface(backdrop)`, and `flush()`'s glyph draw each reference a distinct buffer that only their own `writeBuffer()` call ever touches.
- `_bindGroup()`'s cache key gained the draw's ordinal position in the frame (previously a fixed `"surface"` string, implicitly assuming one shared buffer for every surface draw), so a cached bind group stays correctly tied to its own slot's buffer.
- `setAtlas()`/`setGradient()`'s bind-group cache invalidation (previously a single targeted `.delete()`) was simplified to a full `bindGroups.clear()` — both are rare, off the per-frame hot path, so the coarser invalidation costs nothing meaningful and stays correct now that cache keys are position-dependent rather than content-only.
- `destroy()` now destroys every pooled buffer, not just a single one.

`src/asciiam.js`, `WebGPUGlyphRenderer`: constructor, `_buildPipelines()`, `begin()`, `_beginLoadedPass()`, `_acquireUniformSlot()` (new), `_uniforms()`, `_bindGroup()`, `surface()`, `flush()`, `setGradient()`, `destroy()`.

## Verification

- New Jest test in `tests/asciiam.test.js`: builds a mocked WebGPU device (`navigator.gpu`, adapter, device, buffers, textures, bind groups, render pass) that tracks which buffer object each `setBindGroup` call references and what bytes that buffer holds. Constructs an instance with `trail: 0.34` and a gradient backdrop enabled together — the exact `initHeroCompactAnimation` conditions — runs one frame, and asserts every draw call in the frame got a distinct buffer, and that trail's buffer still holds trail's own color/alpha (not glyph flush's `[1,1,1,1]` placeholder) after the frame completes.
- Confirmed the test is meaningful, not vacuous: temporarily stashed the fix (`git stash push -- src/asciiam.js`) and re-ran the test — it fails, with all three draws' bind groups resolving to one shared buffer, exactly the defect described above. Restored the fix (`git stash pop`) and the test passes again.
- Full Jest suite: 159/159 passing.
- `npm run test:browser` (Chromium/Firefox/WebKit smoke suite): passing — this only exercises the WebGPU-unavailable fallback wiring, not real WebGPU rendering, since none of these environments provide a WebGPU adapter either.
- **Gap:** unverified against real WebGPU hardware/drivers, same limitation noted in `webgpu-uniform-buffer-alignment-2d26520c.md`. If the reported symptom persists after this ships, the next step is the reporter's exact browser/GPU, since that is the one class of environment this repository cannot reproduce on its own.
