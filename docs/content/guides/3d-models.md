---
title: 3D meshes and models
description: Render typed-array meshes, procedural primitives, and dependency-free glTF 2.0 or GLB v2 files as ASCII.
weight: 45
date: 2026-08-13
lastmod: 2026-08-13
tags: [3D, mesh, glTF, GLB, WebGL2, Canvas 2D, models]
keywords: [3D ASCII renderer, glTF loader, GLB loader, procedural mesh, wireframe ASCII, dependency free glTF]
---

The `mesh` mode projects geometry into a cell-resolution depth and luminance buffer. The normal asciiam glyph pipeline then presents those cells through WebGL2 or Canvas 2D. It is a bounded ASCII source, not a general scene engine: materials, textures, animation clips, skins, cameras, and lights from glTF are not rendered.

## Procedural geometry

```js
const animation = new asciiam('#target', {
  mode: 'mesh',
  meshPrimitive: 'torus',
  meshStyle: 'wireframe',
  meshAutoRotate: true
});
animation.start();
```

`cube`, `plane`, `icosphere`, and `torus` are generated at construction time without bundled model assets. For explicit control, call `asciiam.createMeshPrimitive(name, options)` and pass the result to `setMesh()`.

## Application geometry

```js
animation.setMesh({
  positions: new Float32Array([
    0, 1, 0,
    -1, -1, 0,
    1, -1, 0
  ]),
  indices: new Uint16Array([0, 1, 2]),
  primitive: 'triangles'
});
animation.setMode('mesh');
```

Positions are XYZ triples. Optional normals must be a matching `Float32Array`; optional colours contain one RGBA `Float32` tuple per vertex. Indices may be unsigned 8-, 16-, or 32-bit arrays. Invalid lengths, non-finite positions, out-of-range indices, incomplete primitives, and configured complexity-limit violations are rejected before rendering.

## glTF and GLB

```js
await animation.setModel('/models/product.glb', {
  onProgress({ loaded, total }) {
    console.log(total ? loaded / total : loaded);
  }
});
animation.setMode('mesh');
```

`setModel()` accepts a URL, `Blob`, `ArrayBuffer`, typed-array view, or parsed glTF object. It supports glTF 2.0 JSON, GLB v2, data URIs, relative external buffers, interleaved accessors, sparse accessors, node hierarchies and transforms, vertex normals and colours, scene selection, and all core point/line/triangle primitive modes. A new load cancels the previous load. `clearModel()` cancels pending work and releases the retained geometry.

The web utility restricts local file selection to `.glb`. A browser cannot infer the
relationship between a separately selected `.gltf` document and arbitrary sibling
`.bin` files through a single-file picker. For split assets, host the `.gltf` and its
buffers together and enter the `.gltf` URL in the utility, or call `setModel()` with
that URL. Relative buffer URIs resolve against the model URL. S3 and other remote
hosts must return CORS headers for both the `.gltf` and every referenced `.bin` file.

```js
// app.js
await animation.setModel('https://assets.example.com/models/object.gltf');
```

Application code that already has separately selected files can supply a resolver.
`resolveUri` receives the URI stored in the glTF JSON and returns its matching `File`,
byte buffer, or alternate URL.

```js
// app.js
const resources = new Map(selectedFiles.map((file) => [file.name, file]));
await animation.setModel(gltfFile, {
  resolveUri(uri) {
    return resources.get(uri);
  }
});
```

The utility’s scale and field-of-view controls are 3D equivalents of the image
controls, but they update `meshTransform.scale` and `meshCamera.fov`.
The same `meshTransform.rotation` and signed scale controls rotate or mirror procedural
primitives and imported models because both use the same normalized mesh pipeline.

## Combining 3D meshes and images

3D meshes and background images can be used together in a single composition. When `colorFromImage` is enabled (`true`) and an image is loaded (via `setImage()` or the web utility image picker), 3D mesh geometry (procedural primitives or glTF/GLB models) automatically samples cell colors directly from the background image grid.

```js
// app.js - Image-textured 3D mesh composition
const animation = new asciiam('#hero', {
  mode: 'mesh',
  meshPrimitive: 'torus',
  colorFromImage: true
});

await animation.setImage('/images/texture.jpg');
animation.start();
```

Required extensions are rejected with their names before scene mesh allocation. In particular, Draco and Meshopt decoders are not bundled, downloaded, or injectable. This keeps model behavior deterministic and the runtime dependency-free.

## Controls and events

| API | Default | Purpose |
| --- | --- | --- |
| `meshStyle` | `wireframe` | `points`, `wireframe`, or `solid` cell rasterization. |
| `meshProjection` | `perspective` | Perspective or orthographic projection. |
| `meshCamera` | internal camera | Position, target, up vector, field of view, clipping planes, and orthographic scale. |
| `meshTransform` | identity | Position `[x, y, z]`, manual Euler orientation `[rotX, rotY, rotZ]` in radians, and scale `[sx, sy, sz]`. |
| `meshLight` | one directional light | Direction, ambient contribution, and intensity. |
| `meshAutoRotate` | `true` | Enables continuous auto-rotation using `meshRotationSpeed` against elapsed time. |
| `meshRotationSpeed` | `[0.2, 0.45, 0.1]` | Sets 3-axis auto-rotation speed in radians per second `[speedX, speedY, speedZ]` for X (pitch), Y (yaw), and Z (roll). |
| `meshMaxVertices` | `100000` | Rejects larger normalized geometry. |
| `meshMaxPrimitives` | `100000` | Rejects larger point, line, or triangle counts. |

Model loading emits `modelLoadStart`, `modelProgress`, `modelReady`, `modelError`, and `modelClear`. Geometry changes emit `meshReady` and `meshClear`.

When extended diagnostics are enabled, the attached status output adds the current source
kind, vertex count, primitive count, topology, and raster style. `getStats().mesh` exposes
the same normalized geometry summary and `getStats().modelLoaded` distinguishes model
input from directly supplied or procedural mesh input. These values are retained metadata;
collecting them does not traverse vertex or index buffers per frame.

## Asset and delivery policy

[Poly Haven](https://polyhaven.com/models) publishes CC0 models. [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) provides format examples, but each model's license must be checked individually. glTF/GLB is the supported import format; no third-party model is bundled with the package. See [Attributions]({{< relref "/attributions" >}}) before adding a demonstration asset.

Run `npm run benchmark:mesh` after changing projection or rasterization code. The benchmark reference scene contains 960 vertices and 1,920 triangles at a 60×45 cell grid; the enforced desktop gate is 4 ms median and 8 ms p95.

## Reference

| Diagnostic | Type | Meaning |
| --- | --- | --- |
| `getStats().mesh` | mesh summary | Retained vertex, primitive, topology, style, and projection metadata. |
| `getStats().modelLoaded` | boolean | Indicates that the active geometry originated from `setModel()`. |
| Extended 3D line | attached text | Source kind, counts, topology, and raster style; updated at the statistics interval. |
