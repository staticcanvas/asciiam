---
title: Attributions and external resources
description: Source, license, and service references for icons, demonstration media, mesh research, registries, and delivery infrastructure.
weight: 70
date: 2026-08-13
lastmod: 2026-08-13
tags: [attribution, licenses, resources, 3D, glTF]
keywords: [Lucide license, SVG Repo attribution, asciiam image sources, Poly Haven CC0 models, Khronos glTF sample assets, glTF GLB specification, third-party notices]
---

This page identifies third-party material and external services referenced by the repository; it does not change the MIT license applied to asciiam source code.

## Embedded icon paths

The documentation navigation embeds a local subset of [Lucide](https://lucide.dev/) SVG paths. Lucide is distributed under the ISC License, and some Lucide designs derive from Feather under the MIT License. The redistributed notices are preserved in [`THIRD_PARTY_NOTICES.md`](https://gitlab.com/staticcanvas/asciiam/-/blob/main/THIRD_PARTY_NOTICES.md).

Icons are embedded locally so documentation navigation does not depend on a client-side icon package or third-party request.

## Bundled SVG demonstration asset

`docs/static/webutil/assets/images/bird-silhouette.svg` is the [Bird Shape vector from SVG Repo](https://www.svgrepo.com/svg/23736/bird-shape). SVG Repo identifies that asset as CC0. The file remains a demonstration input for silhouette-aware image-to-ASCII conversion.

## Map reference

`docs/static/webutil/assets/images/earth-landmask-256-slow.gif` uses a globe land-mask source associated with [PAT, the free, open-source portable atlas](https://ian.macky.net/pat/map/globe.html). PAT states that its maps and generating scripts are public domain.

## Demonstration photographs

The image library contains demonstration and rendering-test media sourced from [Pexels](https://www.pexels.com/), [Pixabay](https://pixabay.com/), and local repository contributions. Provider and creator identifiers are retained in filenames where available. Provider references are not blanket license claims: verify an individual source record before redistributing an asset outside this repository.

## 3D model sources and format references

The documentation bundles Poly Haven's [Classic Laptop](https://polyhaven.com/a/classic_laptop)
GLB as the live 3D canvas on the splash page. The model is by Arrangemonk, contains
14,450 triangles, and is distributed under Poly Haven's CC0 asset license. The staged
2K GLB is `classic_laptop_2k.gltf.zip.glb`; materials and textures are not rendered by
asciiam's bounded mesh pipeline.

The dependency-free glTF/GLB loader also uses the following format and candidate sources:

- [Poly Haven models](https://polyhaven.com/models) are published under
  [Poly Haven's CC0 asset license](https://polyhaven.com/license). Record the exact model
  source and metadata before including one in a demonstration or test fixture.
- [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)
  provide format test cases and example models. Each model carries its own license and
  credit record; check the selected model directory before use or redistribution.
- The [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
  defines the core glTF/GLB input boundary. Base-format parsing ships in the main package
  without external dependencies. Assets requiring Draco, Meshopt, or another
  compression extension will be rejected. The released runtime contains no compression
  decoder or decoder hook.

These references do not grant a blanket license for assets obtained elsewhere.

## External project services

GitLab and GitHub host source mirrors and page editing. npm and JSR are package registries. jsDelivr and unpkg provide package CDN delivery. Shields.io supplies README badges. These services are not runtime dependencies of the asciiam library.

## Reference

| Material or service | Repository use | Source or notice |
| --- | --- | --- |
| Lucide icon subset | Documentation navigation | Lucide ISC and Feather MIT notices in `THIRD_PARTY_NOTICES.md`. |
| SVG Repo Bird Shape | Bundled SVG sampling input | SVG Repo asset 23736, CC0. |
| PAT globe map | Bundled land-mask animation input | PAT public-domain map collection. |
| Pexels and Pixabay | Demonstration photographs | Per-asset source verification required for reuse. |
| Poly Haven Classic Laptop | Bundled splash-page 3D canvas input | Arrangemonk; 14,450 triangles; CC0. |
| Khronos glTF Sample Assets | Candidate format fixtures and example geometry | Verify the selected model's license and credits. |
| glTF 2.0 specification | Implemented core glTF/GLB input reference | Compressed required extensions are rejected. |
| GitLab and GitHub | Source hosting and page editing | External project services. |
| npm, JSR, jsDelivr, unpkg | Package publication and delivery | External release services. |
| Shields.io | Repository badges | External documentation service. |
