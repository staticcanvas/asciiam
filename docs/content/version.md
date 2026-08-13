---
title: Version and compatibility
description: Current package version, artifacts, runtime requirements, and compatibility policy.
weight: 60
date: 2026-08-13
lastmod: 2026-08-14
tags: [version, compatibility, artifacts, package, ESM, CommonJS]
keywords: [asciiam version, browser compatibility, package exports, ESM bundle, mjs module, CommonJS cjs, UMD bundle]
---

The current documented package version is `0.10.0`.

This version is built from the repository but is not yet published to npm or JSR. Registry
and CDN installation becomes available only after publication of `@staticcanvas/asciiam`.

## Artifacts

| Artifact | Module format | Source map |
| --- | --- | --- |
| `asciiam.mjs` | ESM package entry | Yes |
| `asciiam.esm.js` | ESM | Yes |
| `asciiam.esm.min.js` | ESM, minified | Yes |
| `asciiam.cjs` | CommonJS package entry | Yes |
| `asciiam.js` | UMD | Yes |
| `asciiam.min.js` | UMD, minified | Yes |
| `src/asciiam.d.ts` | TypeScript declarations | Not applicable |

## Runtime requirements

- JavaScript with classes, modules for ESM usage, and `requestAnimationFrame`.
- Canvas 2D for measurement, glyph rasterization, image sampling, and fallback presentation.
- WebGL2 when the GPU backend resolves successfully.
- Browser image decoding for raster images, SVGs, and animated GIF frame advancement.

The documentation build assigns one content-derived revision to the web utility's HTML,
runtime, and JavaScript module graph. This prevents a deployment from combining current
controls with cached code from an earlier build. Version-pinned third-party CDN URLs may
use immutable caching.

## Version sources

`package.json` is the version source. The documentation data generator copies that value into Hugo data, and the Hugo templates render it in the navigation and hero. README and release notes are updated at release time.

## API reference

| Source | Version role |
| --- | --- |
| `package.json` | Package and generated preset-data version. |
| `docs/data/presets.json` | Generated Hugo data used by navigation and page version labels. |
| `CHANGELOG` page | Human-readable release behavior. |
| Browser bundle banner | Distributed artifact identification. |
