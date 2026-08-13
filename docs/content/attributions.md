---
title: Attributions and external resources
description: Source, license, and service references for icons, bundled demonstration media, registries, and delivery infrastructure.
weight: 70
date: 2026-08-13
lastmod: 2026-08-13
tags: [attribution, licenses, resources]
keywords: [Lucide license, SVG Repo attribution, asciiam image sources, third-party notices]
---

This page identifies third-party material and external services referenced by the repository; it does not change the MIT license applied to asciiam source code.

## Embedded icon paths

The documentation navigation embeds a local subset of [Lucide](https://lucide.dev/) SVG paths. Lucide is distributed under the ISC License, and some Lucide designs derive from Feather under the MIT License. The redistributed notices are preserved in [`THIRD_PARTY_NOTICES.md`](https://gitlab.com/staticcanvas/asciiam/-/blob/main/THIRD_PARTY_NOTICES.md).

Icons are embedded locally so documentation navigation does not depend on a client-side icon package or third-party request.

## Bundled SVG demonstration asset

`public/assets/images/bird-silhouette.svg` is the [Bird Shape vector from SVG Repo](https://www.svgrepo.com/svg/23736/bird-shape). SVG Repo identifies that asset as CC0. The file remains a demonstration input for silhouette-aware image-to-ASCII conversion.

## Map reference

`public/assets/images/earth-landmask-256-slow.gif` uses a globe land-mask source associated with [PAT, the free, open-source portable atlas](https://ian.macky.net/pat/map/globe.html). PAT states that its maps and generating scripts are public domain.

## Demonstration photographs

The image library contains development and rendering-test media sourced from [Pexels](https://www.pexels.com/), [Pixabay](https://pixabay.com/), and local repository contributions. Provider and creator identifiers are retained in filenames where available. Provider references are not blanket license claims: verify an individual source record before redistributing an asset outside this repository.

## External project services

GitLab and GitHub host source mirrors and page editing. npm and JSR are package registries. jsDelivr and unpkg provide package CDN delivery after publication. Shields.io supplies README badges. These services are not runtime dependencies of the asciiam library.

## API reference

| Material or service | Repository use | Source or notice |
| --- | --- | --- |
| Lucide icon subset | Documentation navigation | Lucide ISC and Feather MIT notices in `THIRD_PARTY_NOTICES.md`. |
| SVG Repo Bird Shape | Bundled SVG sampling input | SVG Repo asset 23736, CC0. |
| PAT globe map | Bundled land-mask animation input | PAT public-domain map collection. |
| Pexels and Pixabay | Demonstration photographs | Per-asset source verification required for reuse. |
| GitLab and GitHub | Source hosting and page editing | External project services. |
| npm, JSR, jsDelivr, unpkg | Package publication and delivery | External release services. |
| Shields.io | Repository badges | External documentation service. |
