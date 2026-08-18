---
title: Images and colour-range animation
description: Sample local or remote images into ASCII and restrict animation to an inclusive RGB range.
weight: 40
date: 2026-08-13
lastmod: 2026-08-14
tags: [images, media, GIF, SVG, sampling, colour range]
keywords: [image to ASCII, photo to ASCII, animated GIF ASCII, SVG silhouette, image sampling, RGB animation range, colour from image]
---

Image loading establishes a sampled glyph source. Static images are resampled after grid or image-option changes. Animated GIFs capture each composited frame as an ASCII grid when WebCodecs `ImageDecoder` is available. Brightness selects glyph density. Optional sampled RGB values color each glyph. The global `mode` then animates that source, so the same mode inventory applies to procedural and image-backed output.

## Planned media asset lifecycle

Media support is planned as an explicit application-owned lifecycle:

1. Acquire a URL, `File`, or user-selected `Blob` only after the application has
   established the required permission and consent state.
2. Validate the media type and size before decoding, then create a short-lived
   object URL or stream for the loader.
3. Decode and sample frames into the active ASCII grid. Retain compact sampled
   data where possible instead of full-resolution frame buffers.
4. Revoke object URLs and release decoders, tracks, audio nodes, and frame data
   when the asset is replaced or the asciiam instance is destroyed.

Applications should treat remote media as untrusted input: use HTTPS, configure
appropriate CORS headers, and avoid copying user media to a server unless that is
an explicit product decision. A future media adapter may expose progress,
cancellation, memory limits, and disposal hooks without changing the renderer API.

## Local media and audio visualization (planned)

Local and user-selected media should remain local by default. File inputs and drag-
and-drop can provide `File` objects to an application-level adapter, while camera
and microphone sources require an explicit `getUserMedia()` permission request.
The adapter should make ownership clear: the application owns the `MediaStream`,
and stopping its tracks is part of teardown.

An audio visualizer can feed an asciiam mode through the Web Audio API without
coupling audio processing to the renderer. The planned data flow is:

```text
audio element or MediaStream
        -> AudioContext -> AnalyserNode
        -> Uint8Array frequency/time-domain samples
        -> visualizer adapter or plugin
        -> mode parameters / sampled cells
        -> asciiam renderer
```

`AnalyserNode.getByteFrequencyData()` is suitable for spectrum bars and
`getByteTimeDomainData()` for waveform-driven motion. The adapter should reuse
typed-array buffers, throttle analysis to the render cadence, suspend the audio
context when hidden, and disconnect nodes during disposal. It should not expose
raw microphone samples to a plugin unless the user has explicitly granted that
capability.

Visualizers must provide a non-audio alternative, respect `prefers-reduced-motion`,
and avoid implying that microphone access is available until permission succeeds.
The permission prompt should be initiated by a clear user action and its denied,
revoked, and unavailable states should be represented as ordinary fallback UI.

## Load an image

`app.js`

```js
await animation.setImage('/images/subject.webp');
animation.setMode('ripple');
animation.setOption('colorFromImage', true);
```

Uploaded files can be passed through an object URL. Revoke the URL after `setImage()` resolves.

URL paths ending in `.gif` and GIF data URLs are detected automatically. A blob URL does
not contain the source filename or media type in its URL string, so pass
`{ animated: true }` when loading an uploaded GIF. `setImage()` waits while each decoded
frame is converted to the current ASCII grid, preserves individual frame delays, and emits
`imageFramesReady` with `frameCount` and total `duration`. Each decoded bitmap is closed
after conversion; playback retains ASCII cell data rather than full-resolution frames.

Frame conversion is preparation, not playback. asciiam keeps the current grid visible
through the decode pass and publishes the completed frame set atomically at frame zero.
Decoded frames therefore cannot appear before scheduled playback begins.

If `ImageDecoder` or fetch access is unavailable, asciiam falls back to sampling the browser-animated `<img>`. `imageFrameRate` limits only that compatibility path; it does not alter exact GIF frame delays or cap renderer FPS. Changing image sampling options or target dimensions re-captures the ASCII frames after a short debounce.

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

Procedural, reveal, interaction, sparse-particle, and custom modes can operate while an
image source is loaded. Dense modes animate sampled glyph cells directly. Sparse modes
such as `matrix`, `snow`, `fire`, `starfield`, and `orbit` retain their particle geometry
and are clipped to sampled image cells. `mesh` renders its 3D geometry source; when `colorFromImage` is enabled alongside a loaded image, 3D mesh characters sample cell colors directly from the background image grid, allowing textured 3D ASCII compositions.

Transparent SVG silhouettes often use black fills. Normal luminance mapping sends black to the first density glyph, which is commonly a space. The default `imageLuminance: 'auto'` detects dark opaque artwork surrounded by transparency and inverts its density mapping. Set `normal` or `invert` when explicit control is required. This affects glyph density only; it does not rotate or transform the source SVG.

Image fitting compares the source aspect ratio with the rendered glyph area, including the measured glyph width and line height. `imageScale` and `imageFov` change the centered source window. `imageScaleX` and `imageScaleY` then change the centered sampled output width and height. This distinction preserves the source ratio by default while allowing intentional horizontal or vertical distortion.

`imageRotation` rotates the fitted source clockwise in degrees. `imageFlipX` and
`imageFlipY` mirror it horizontally or vertically. These transforms run only while
sampling or recapturing image grids; they do not add work to frames between sampling operations.

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

## Reference

| Property or method | Type | Default | Effect |
| --- | --- | --- | --- |
| `setImage(source, options?)` | URL string and optional `{ animated }` | — | Decodes an image and captures GIF frames when `ImageDecoder` and fetch access are available. |
| `fit` | `cover \| contain` | `cover` | Crops or letterboxes the source. |
| `imageScale` | number | `1` | Applies centered source zoom. |
| `imageScaleX` | number | `1` | Scales sampled output width around the centre. |
| `imageScaleY` | number | `1` | Scales sampled output height around the centre. |
| `imageFov` | number | `1` | Controls the sampled field of view. |
| `imageRotation` | degrees | `0` | Rotates the fitted source clockwise during sampling. |
| `imageFlipX` / `imageFlipY` | boolean | `false` | Mirrors the sampled source by axis. |
| `imageLuminance` | `auto \| normal \| invert` | `auto` | Controls silhouette-aware brightness mapping. |
| `imageChars` | string | active character set | Maps brightness to glyphs. |
| `colorFromImage` | boolean | `false` | Uses sampled RGB values. |
| `animateImageMask` | boolean | `true` | Enables legacy `mode: 'image'` mask animation; global modes animate image sources independently. |
| `imageAnimationRange` | `{ min, max }` or `null` | `null` | Restricts animation to an inclusive RGB box. |
| `animateImageFrames` | boolean | `true` | Plays captured or fallback-sampled GIF frames. |
| `imageFrameRate` | number | `12` | Caps fallback GIF sampling from 1 through 60 fps. |
