# WebGPU backend feasibility review

Status: feasibility review complete; implementation is available in `auto` when
capability detection succeeds, while promotion remains measurement-gated.

## Decision

WebGPU is a possible presentation backend for the dense ASCII glyph pipeline, but it
must not own animation, media, chart, export, diagnostics, or lifecycle state. The
existing instance remains the contract owner and supplies a backend-neutral frame:

```ts
type AsciiCell = {
  x: number; y: number; glyph: number;
  r: number; g: number; b: number; a: number;
};

type AsciiFrame = {
  width: number; height: number;
  atlas: ImageBitmap | HTMLCanvasElement;
  cells: ArrayLike<AsciiCell>;
  backdrop?: { color: [number, number, number, number] };
};
```

The backend may pack this contract into storage or vertex buffers, but it may not
read pixels back during display. Canvas 2D remains the compatibility fallback and
WebGL2 remains the default GPU path until measurements show that WebGPU improves the
complete user-visible path.

## Required backend boundary

- `init(devicePreference)` checks secure context, `navigator.gpu`, adapter limits,
  and device creation; failure returns a structured reason.
- `present(frame)` uploads only the current bounded cell buffer and submits one
  command encoder without readback.
- `resize(width, height)` recreates size-dependent targets while retaining the atlas.
- `destroy()` releases bind groups, buffers, pipelines, and device listeners.
- `device.lost` transitions the instance through `rendererFallback` and lets the
  existing `setRenderer()` lifecycle select WebGL2 or Canvas 2D.

Shader code should use an atlas texture plus instanced quads. Glyph selection and
color belong in the instance buffer; animation modes continue to resolve glyphs on
the CPU until profiling demonstrates a safe, portable compute path.

## Compatibility and security constraints

WebGPU requires a secure context and a usable adapter. Browser policy, privacy
settings, driver bugs, power mode, and device loss can all make it unavailable after
initial capability detection. No WebGPU code may be required for package import,
Canvas 2D operation, or WebGL2 builds. The backend must work under the same CSP
without dynamic shader compilation from remote content.

## Measurement gate

Before enabling auto-selection, compare WebGL2, WebGPU, and Canvas 2D on representative
Chrome, Firefox, Safari, Linux, Windows, macOS, and mobile systems. Record cold and
warm initialization, first populated frame, CPU frame work, upload cost, frame time,
GPU memory, device-loss recovery, thermal behavior, and fallback reason. WebGPU is
accepted only if it improves the end-to-end result without increasing failure or
startup cost for users who receive the fallback path.

## Implementation scope

The prototype is available through `renderer: 'webgpu'` and is selected by
`renderer: 'auto'` when secure-context capability detection succeeds. It has parity coverage at
the renderer boundary and falls back to WebGL2/Canvas 2D when initialization fails.
It must not add a WebGPU dependency; promotion remains subject to the measurement gate.
