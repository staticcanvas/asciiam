---
title: Animation modes
description: Configure dense fields, spatial effects, reveals, sparse particles, images, and custom cells.
weight: 20
---

Modes determine how each frame selects glyph, intensity, opacity, weight, and optional color.

## Built-in modes

| Mode | Processing model | Primary controls |
| --- | --- | --- |
| `wave` | dense field | `direction`, `ambient`, `bandWidth` |
| `current` | dense field | `speed`, opacity bounds |
| `ripple` | cached spatial field | `align`, `speed` |
| `vortex` | cached spatial field | `align`, `speed` |
| `plasma` | cached spatial field | `speed`, gradient |
| `fadeIn`, `fadeOut` | timed reveal | `revealDirection`, `loop` |
| `irisIn`, `irisOut` | radial transition reveal | `align`, `loop` |
| `dissolveIn`, `dissolveOut` | seeded directional dissolve | `revealDirection`, `loop` |
| `lumaFold` | coined folded-luminance ridges | `speed`, opacity bounds |
| `riftLace` | coined intersecting seam lattice | `speed`, character set |
| `echoBloom` | coined concentric echo blossoms | `align`, `speed` |
| `glitch` | dense displacement | `glitchIntensity` |
| `typewriter` | timed reveal | `typewriterDuration` |
| `matrix`, `snow`, `sparkle` | sparse particles | matching density option |
| `fire`, `starfield`, `orbit` | sparse particles | matching density option |
| `image` | sampled image grid | image and mask options |
| `custom` | callback | `customCell` |

## Change mode

`app.js`

```js
animation.setMode('vortex');
animation.setOption('align', 'top-left');
animation.setOption('speed', 0.65);
```

Manual `setMode()` interrupts an active sequence and emits `sequenceInterrupt`. Sequence step changes use the internal mode transition without treating the change as manual input.

Mode selection changes only the animation algorithm. A loaded image remains the glyph source, including for `irisIn`, `irisOut`, `dissolveIn`, `dissolveOut`, `lumaFold`, `riftLace`, and `echoBloom`. Preset selection retains the active global mode.

`revealDirection` supports `left-to-right`, `right-to-left`, `top-to-bottom`, `bottom-to-top`, `diagonal`, `center`, and `edges`. Changing the direction restarts the local reveal timeline so the result is visible immediately.

## Custom mode

`app.js`

```js
asciiam.registerMode('diagonalBands', (api) => {
  const phase = (api.col + api.row) * 0.25 - api.time * 2;
  const intensity = (Math.sin(phase) + 1) / 2;
  return api.set('#', intensity, intensity, intensity > 0.8);
});

animation.setMode('diagonalBands');
```

## API reference

| API | Type | Default | Effect |
| --- | --- | --- | --- |
| `mode` | mode name | `wave` | Selects the active animation algorithm. |
| `speed` | number | `1` | Scales the instance timeline. |
| `setMode(mode)` | method | — | Changes mode and restarts its local timeline. |
| `registerMode(name, fn)` | static method | — | Registers a named cell callback. |
| `customCell(api)` | function | `null` | Supplies cells when mode is `custom`. |
| Image-backed modes | loaded image grid | none | Applies the selected global mode to sampled glyphs. |
