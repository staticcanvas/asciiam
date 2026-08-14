---
title: JSON builder
description: Construct, edit, and run live JSON configurations with built-in presets, interactive inputs, and instant Web Utility transfer.
weight: 25
type: examples
date: 2026-08-13
lastmod: 2026-08-14
tags: [json builder, examples, playground, configuration, editor, workbench, live preview]
keywords: [asciiam json builder, json configuration, live ASCII editor, JavaScript animation playground, editable configuration, serializable configuration]
---

The playground and [Web utility workflow]({{< relref "/guides/web-utility" >}}) form a unified composition authoring environment. The playground runs one version-aligned renderer instance and replaces it after valid JSON input. The thirty included examples cover procedural fields, interactions, background images, 3D meshes, sequences, performance tiers, and hybrid compositions combining 3D meshes with sampled images.

## Editing model & web utility integration

Select an example, edit its option object, and use **Run** or pause briefly for the debounced preview update. **Reset** restores the selected example configuration. **View in web utility** transfers serializable options into the interactive Web Utility configurator via URL encoding, allowing you to fine-tune visual parameters, backdrop, images, and 3D mesh controls visually.

### Combining 3D meshes & background images

3D meshes and images can be combined into hybrid compositions. When `colorFromImage: true` is enabled alongside a loaded background image, 3D mesh geometry (primitives or glTF/GLB models) automatically samples cell colors directly from the underlying background image grid.

The editor accepts JSON because it can be validated without evaluating arbitrary JavaScript. Callbacks such as `onReady`, sequence callbacks, and `customCell` are functions and therefore belong in application source rather than the serializable editor.

## Package usage

`app.js`

```js
import asciiam from '@staticcanvas/asciiam';

const options = {
  mode: 'wave',
  color: '#72F1B8'
};

const animation = new asciiam('#preview', options);
animation.start();
```

The live editor imports the documentation build's local ESM file; application code can
import the published package directly.

## Reference

| Playground surface | Input | Behavior |
| --- | --- | --- |
| Example selector | Included example | Replaces editor text and renderer state. |
| Configuration editor | JSON object | Debounces parsing and creates one replacement renderer after valid input. |
| Run | Valid JSON object | Applies the current configuration immediately. |
| Reset | Selected example | Restores the authored option object. |
| Copy | Current editor text | Copies the configuration JSON. |
| View in web utility | Valid JSON-representable options | Encodes configuration into the utility URL without registry access. |
