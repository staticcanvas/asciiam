# WebGPU renderer: invalid uniform buffer size and missing texture usage flag

Two defects in the WebGPU rendering backend (`WebGPUGlyphRenderer` in `src/asciiam.js`) caused every draw call to fail GPU validation on real WebGPU hardware, silently leaving the canvas blank while the renderer still reported an active `webgpu` backend.

## Status

Fixed in commit `ce96870`. Not previously known or documented anywhere in this repository — `devtracker-pending.md` tracked the WebGPU backend as an unverified prototype ("the benchmark remains a release gate because this environment lacks ... representative WebGPU-capable desktop/mobile hardware"), but no specific defect was recorded. This repository's own test environment has no real WebGPU device, so neither bug was ever exercised until a user reported console output from an actual Chrome/Dawn session.

## Symptom

Reported via browser devtools console on the built docs site and Web Utility playground:

```
Binding size (32) of [Buffer (unlabeled)] is smaller than the minimum binding size (48).
 - While validating entries[0] against { binding: 0, visibility: ShaderStage::Fragment, buffer: {type: BufferBindingType::Uniform, minBindingSize: 48, hasDynamicOffset: 0} }.
 - While validating [BindGroupDescriptor] against [BindGroupLayout (unlabeled)]
 - While calling [Device].CreateBindGroup([BindGroupDescriptor]).

Destination texture needs to have CopyDst and RenderAttachment usage.
    at APIInjectError (.../dawn/src/dawn/native/Device.cpp:1937)

[Invalid BindGroup (unlabeled)] is invalid due to a previous error.
[Invalid CommandBuffer] is invalid due to a previous error.
WebGPU: too many warnings, no more warnings will be reported to the console for this GPUDevice.
```

Every frame produced an invalid bind group and an invalid command buffer, so `queue.submit()` never presented a real frame. Nothing rendered, but `getRendererInfo().backend` still reported `"webgpu"` since device/adapter acquisition (the only thing the async-init path checks) had succeeded.

## Root cause

### 1. Uniform buffer too small, and wrongly packed even ignoring size

The fragment/vertex shader's uniform struct:

```wgsl
struct Uniforms { viewport: vec2f, color: vec4f, useGradient: f32 };
```

WGSL's uniform-address-space alignment rules require `vec4f` fields to start at a 16-byte-aligned offset, and the struct's total size to round up to a multiple of its own alignment (16, the largest member alignment). Working through the layout:

| Member | Offset (bytes) | Size (bytes) |
| --- | --- | --- |
| `viewport` (vec2f) | 0 | 8 |
| *(padding)* | 8 | 8 |
| `color` (vec4f) | 16 | 16 |
| `useGradient` (f32) | 32 | 4 |
| *(padding)* | 36 | 12 |
| **total** | | **48** |

`minBindingSize: 48` in the error matches this exactly. The JS side allocated `uniformBuffer` at 32 bytes (`src/asciiam.js:599`, before fix) and packed `uniformValues` as a tightly-packed 8-float array with no gap between `viewport` and `color` (`_uniforms()`, `src/asciiam.js:651-657`, before fix). Even past the buffer-size validation error, the fragment shader would have read `color` and `useGradient` from the wrong byte offsets — this was not a "just make the buffer bigger" fix.

### 2. Gradient texture missing `RENDER_ATTACHMENT` usage

`copyExternalImageToTexture()` copies into a destination texture via an internal blit, which WebGPU requires the destination to support as a render target — i.e. `GPUTextureUsage.RENDER_ATTACHMENT` must be set in addition to `COPY_DST`. The atlas texture (`setAtlas()`, `src/asciiam.js:620`) already had this flag; the gradient texture (`setGradient()`, `src/asciiam.js:632`, before fix) did not.

## Fix

- `uniformBuffer`: 32 → 48 bytes (`src/asciiam.js:599`).
- `uniformValues`: `Float32Array(8)` → `Float32Array(12)`, with `_uniforms()` writing to indices `[0,1]` (viewport), `[4..7]` (color), `[8]` (useGradient) — matching the WGSL offsets above exactly; indices `[2,3]` and `[9,10,11]` are left at their default zero as padding (`src/asciiam.js:500`, `:651-659`).
- `setGradient()`'s texture usage gained `GPUTextureUsage.RENDER_ATTACHMENT` alongside `TEXTURE_BINDING | COPY_DST` (`src/asciiam.js:632`).

## Verification

- Struct layout hand-verified against the WGSL alignment/size rules (table above); the computed 48-byte total matches the reported `minBindingSize` precisely.
- Full Jest suite passes (141/141) after the fix.
- **Gap:** this environment has no real WebGPU-capable device, so the fixed code path could not be exercised end-to-end here — the existing WebGPU tests only cover the async adapter/device-acquisition fallback, not actual pipeline/bind-group creation. Confirmation that the reported console errors are gone requires a real-browser check, which is outside this environment. Consider adding a mocked `GPUDevice`/`GPUBuffer`/`GPUTexture` harness (asserting `createBuffer` size and `createTexture` usage flags) as a lightweight regression guard, since real hardware won't be available in CI either.
