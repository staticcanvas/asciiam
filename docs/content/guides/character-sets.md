---
title: Character sets
description: Select the default glyph inventory, density ramps, symbolic palettes, or a custom ordered string.
weight: 25
date: 2026-08-13
lastmod: 2026-08-13
tags: [characters, charset, glyphs, density ramp, image conversion]
keywords: [ASCII character sets, default charset, custom characters, glyph palette, glyph density ramp, image to ASCII characters]
---

Character sets map a normalized mode intensity or sampled image luminance to a glyph index. The first character represents the lowest value and the last character represents the highest value.

## Default character set

The default `charSet` and `imageChars` value is `asciiam.CHARACTER_SETS.asciiExtended`. It contains 190 characters in this order:

1. The 95 printable ASCII code points from U+0020 SPACE through U+007E TILDE.
2. The 95 Latin-1 code points from U+00A1 INVERTED EXCLAMATION MARK through U+00FF LATIN SMALL LETTER Y WITH DIAERESIS.

The default favors glyph variety and broad Latin coverage. It is ordered by code point, not measured visual density. Use `density`, `extended`, `technical`, or another intentionally ordered ramp when predictable light-to-dark image conversion is more important than variation.

`app.js`

```js
const animation = new asciiam('#hero', {
  charSet: asciiam.CHARACTER_SETS.asciiExtended,
  imageChars: asciiam.CHARACTER_SETS.density
});
```

`charSet` controls procedural modes. `imageChars` controls image luminance mapping and may be configured independently.

## Included sets

| Name | Value or composition | Intended use |
| --- | --- | --- |
| `density` | ` .:-=+*#%@` | Compact, predictable luminance ramp. |
| `ascii` | U+0020–U+007E | Printable ASCII variety. |
| `asciiExtended` | printable ASCII plus U+00A1–U+00FF | Default broad Latin inventory. |
| `extended` | hand-ordered 70-character photographic ramp | Image conversion with more density steps. |
| `alphanumeric` | space, digits, upper- and lowercase Latin letters | Text-oriented fields without punctuation. |
| `uppercase` | space and A–Z | Uppercase terminal fields. |
| `lowercase` | space and a–z | Lowercase text fields. |
| `symbols` | space and printable ASCII punctuation | Symbol-only fields. |
| `boxDrawing` | lines, corners, joins, shades, and blocks | Diagram and terminal-grid textures. |
| `arrows` | cardinal, diagonal, and double arrows | Directional fields. |
| `math` | operators and set/calculus symbols | Mathematical textures. |
| `blocks` | space and `░▒▓█` | Five-level block shading. |
| `minimal` | ` .oO@` | Small portable five-level ramp. |
| `technical` | ` .·:+=*#%@` | Ten-level technical display ramp. |
| `geometric` | space plus circular, square, triangular, and diamond forms | Shape transitions and interaction zones. |
| `circuit` | ` ·-+=oO0#@` | Circuit and node-like textures. |
| `waves` | ` ~≈≋∿` | Low-cardinality flowing fields. |
| `terminal` | space, binary digits, brackets, operators, and density marks | Terminal and protocol-like textures. |
| `binary` | ` 01` | Binary rain and masks. |
| `binaryWide` | weighted `0` and `1` repetition | Binary output with biased selection. |
| `braille` | ordered Braille fill forms | Compact dot-density fields. |
| `japanese` | space, binary digits, and selected Katakana | Matrix-style fields. |
| `punctuation` | hand-ordered punctuation and letters | Photographic ASCII convention. |

Availability depends on the selected font. Missing glyphs may render as replacement boxes. Choose a font that covers non-ASCII sets and test it on target platforms.

## Custom ordered sets

Any JavaScript string is accepted. Include a leading space when zero intensity should produce no visible glyph. Use at least two distinct characters so intensity can select more than one result.

`app.js`

```js
animation.setOption('charSet', ' .·oO0@');
animation.setOption('imageChars', ' .:-=+*#%@');
```

Repeated characters are allowed and weight selection toward those glyphs. `binaryWide`, for example, intentionally repeats digits.

## API reference

| API | Type | Default | Effect |
| --- | --- | --- | --- |
| `asciiam.CHARACTER_SETS` | record of strings | included sets | Provides named character inventories and ramps. |
| `charSet` | string | `asciiExtended` | Maps procedural intensity to glyphs. |
| `imageChars` | string | `asciiExtended` | Maps sampled image luminance to glyphs. |
| `setOption('charSet', value)` | method | — | Rebuilds dependent glyph atlases and static-wave caches. |
| `setOption('imageChars', value)` | method | — | Resamples loaded image sources and rebuilds dependent atlases. |
