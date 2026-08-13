---
title: Usage examples
description: Edit and run configurations from minimum initialization through interaction, image, sequence, and broad serializable examples.
weight: 25
type: examples
date: 2026-08-13
lastmod: 2026-08-14
tags: [examples, playground, configuration, editor, workbench, live preview]
keywords: [asciiam examples, usage examples, live ASCII editor, JavaScript animation playground, editable configuration, serializable configuration]
---

The playground runs one version-aligned local renderer instance and replaces it only after the editor contains valid JSON. It does not depend on npm or a CDN, so a source checkout remains usable before a package release reaches a registry.

## Editing model

Select an example, edit its option object, and use **Run** or pause briefly for the
debounced preview update. **Reset** restores the selected example. **View in web utility**
transfers options representable as JSON through the URL. The web utility exposes its
supported interactive controls and preserves additional imported options in generated code.

The editor accepts JSON because it can be validated without evaluating arbitrary JavaScript. Callbacks such as `onReady`, sequence callbacks, and `customCell` are functions and therefore belong in application source rather than the serializable editor.

## Package usage after publication

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

The package example applies after publication of `@staticcanvas/asciiam`. The live editor
imports the documentation build's local ESM file and therefore works from a source checkout.

## API reference

| Playground surface | Input | Behavior |
| --- | --- | --- |
| Example selector | Included example | Replaces editor text and renderer state. |
| Configuration editor | JSON object | Debounces parsing and creates one replacement renderer after valid input. |
| Run | Valid JSON object | Applies the current configuration immediately. |
| Reset | Selected example | Restores the authored option object. |
| Copy | Current editor text | Copies the configuration JSON. |
| View in web utility | Valid JSON-representable options | Encodes configuration into the utility URL without registry access. |
