---
title: Images and colour-range animation
description: Sample local or remote images into ASCII and restrict animation to an inclusive RGB range.
weight: 40
date: 2026-08-13
lastmod: 2026-08-13
tags: [images, media, GIF, SVG, sampling, colour range]
keywords: [image to ASCII, photo to ASCII, animated GIF ASCII, SVG silhouette, image sampling, RGB animation range, colour from image]
---

Image loading establishes a sampled glyph source. Static images are resampled after grid or image-option changes. Animated GIFs capture each composited frame as an ASCII grid when WebCodecs `ImageDecoder` is available. Brightness selects glyph density. Optional sampled RGB values color each glyph. The global `mode` then animates that source, so the same mode inventory applies to procedural and image-backed output.

## Load an image

`app.js`

```js
await animation.setImage('/images/subject.webp');
animation.setMode('ripple');
animation.setOption('colorFromImage', true);
```

Uploaded files can be passed through an object URL. Revoke the URL after `setImage()` resolves.

URL paths ending in `.gif` are detected automatically. Object URLs do not retain a filename, so pass `{ animated: true }` when loading an uploaded GIF. `setImage()` waits while each decoded frame is converted to the current ASCII grid, preserves the GIF's individual frame delays, and emits `imageFramesReady` with `frameCount` and total `duration`. The decoded bitmap for each frame is closed immediately; playback retains ASCII data, not full-resolution frames.

If `ImageDecoder` or fetch access is unavailable, asciiam falls back to sampling the browser-animated `<img>`. `imageFrameRate` limits only that compatibility path and does not cap renderer FPS. Changing image sampling options or target dimensions re-captures the ASCII frames after a short debounce.

`app.js`

```js
await animation.setImage(objectUrl, { animated: file.type === 'image/gif' });
animation.setOption('imageFrameRate', 12);
```

## Animate a colour range

`app.js`

```js
animation.setOption('imageAnimationRange', {
  min: '#7a0000',
  max: '#ff8a70'
});
animation.setMode('ripple');
```

Every built-in mode can operate while an image source is loaded. Dense modes animate the sampled glyph cells directly. Sparse modes such as `matrix`, `snow`, `fire`, `starfield`, and `orbit` retain their particle geometry and are clipped to sampled image cells.

Transparent SVG silhouettes often use black fills. Normal luminance mapping sends black to the first density glyph, which is commonly a space. The default `imageLuminance: 'auto'` detects dark opaque artwork surrounded by transparency and inverts its density mapping. Set `normal` or `invert` when explicit control is required. This affects glyph density only; it does not rotate or transform the source SVG.

Image fitting compares the source aspect ratio with the rendered glyph area, including the measured glyph width and line height. `imageScale` and `imageFov` change the centered source window. `imageScaleX` and `imageScaleY` then change the centered sampled output width and height. This distinction preserves the source ratio by default while allowing intentional horizontal or vertical distortion.

## ASCII text sources

JavaScript FIGlet implementations can convert text into multiline ASCII banners before rendering. The `figlet` package provides browser and ESM builds and implements the FIGfont format. Keep it as an application-level optional adapter so asciiam retains zero runtime dependencies: generate the banner, rasterize it to a canvas or SVG data URL, then pass that result to `setImage()` and select any global mode.

The engine creates a byte mask during image sampling. Per-frame image animation checks the mask rather than repeating RGB range comparisons. Cells outside the range remain static.

## Mask modes

| Value | Behavior |
| --- | --- |
| `waveSweep` | Moves a horizontal intensity band through selected cells. |
| `radialRipple` | Propagates from the configured spatial origin. |
| `scanlinePass` | Moves a narrow scanline over selected cells. |
| `thermalNoise` | Applies time-varying seeded noise. |
| `halftonePulse` | Pulses a spatial halftone pattern. |
| `fullStatic` | Displays sampled glyphs without mask animation. |

## API reference

| Property or method | Type | Default | Effect |
| --- | --- | --- | --- |
| `setImage(source, options?)` | URL string and optional `{ animated }` | — | Decodes an image and captures all GIF frames where supported. |
| `fit` | `cover \| contain` | `cover` | Crops or letterboxes the source. |
| `imageScale` | number | `1` | Applies centered source zoom. |
| `imageScaleX` | number | `1` | Scales sampled output width around the centre. |
| `imageScaleY` | number | `1` | Scales sampled output height around the centre. |
| `imageFov` | number | `1` | Controls the sampled field of view. |
| `imageLuminance` | `auto \| normal \| invert` | `auto` | Controls silhouette-aware brightness mapping. |
| `imageChars` | string | active character set | Maps brightness to glyphs. |
| `colorFromImage` | boolean | `false` | Uses sampled RGB values. |
| `animateImageMask` | boolean | `true` | Enables legacy `mode: 'image'` mask animation; global modes animate image sources independently. |
| `imageAnimationRange` | `{ min, max }` or `null` | `null` | Restricts animation to an inclusive RGB box. |
| `animateImageFrames` | boolean | `true` | Plays captured or fallback-sampled GIF frames. |
| `imageFrameRate` | number | `12` | Caps fallback GIF sampling from 1 through 60 fps. |
