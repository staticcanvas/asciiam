# Draco and Meshopt evaluation protocol

Status: deferred research. No codec, decoder hook, or codec dependency is included in released artifacts.

## Entry condition

Run this study only after representative uncompressed glTF/GLB models have production transfer and render-ready measurements. A codec is not accepted because its compressed file is smaller; the complete browser cost must improve for asciiam's bounded ASCII use case.

## Corpus

Use at least four redistributable models: low-poly, medium hard-surface, high-poly organic, and a model dominated by vertex attributes. Preserve identical topology and attributes across uncompressed, Draco, and Meshopt variants. Record source URL, author, license, encoder version and flags, vertex count, primitive count, and decoded byte size. Poly Haven assets are CC0; Khronos sample-asset licenses vary and must be checked per model.

## Measurements

Measure cold and warm runs on current desktop Chrome, Firefox, and Safari plus one representative mid-range mobile device:

| Measure | Boundary |
| --- | --- |
| Transfer bytes | Model plus every decoder JavaScript/Wasm response, with Brotli or gzip recorded separately. |
| Core bundle change | Minified and gzip delta when any integration code is present. |
| Initialization | Decoder download, compilation, and first-use setup. |
| Decode | Start of decode through normalized `MeshData`. |
| Render-ready latency | Request start through first populated ASCII frame. |
| Peak memory | Highest model-load heap and Wasm memory. |
| Retained memory | Memory after model readiness and after `clearModel()`. |
| Main-thread blocking | Long tasks and worst uninterrupted task duration. |

Use `ASCIIAM_MODEL_PATH=fixture.glb npm run benchmark:model` for the dependency-free parse baseline. Codec variants must run in an isolated research branch and harness so their packages cannot enter the production lockfile or bundle accidentally.

## Decision rule

Approve a later architecture proposal only if a codec produces a material end-to-end improvement on mobile and desktop without violating startup, memory, CSP, offline, licensing, and maintainability requirements. Report regressions as well as wins. If results depend strongly on model class, keep uncompressed core loading as the predictable default and document the narrow case rather than adding a universal runtime cost.

Any implementation decision requires a separate review. This protocol does not authorize adding a dependency or extension interface.
