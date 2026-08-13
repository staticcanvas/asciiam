# Web utility architecture

The web utility is a static browser application. It uses the version-aligned UMD
runtime from `public/libs` and native ES modules for utility behavior. It has no
framework lifecycle or server-owned state.

## Module boundaries

| Source | Responsibility |
| --- | --- |
| `public/index.html` | Semantic structure, control markup, responsive layout, and visual tokens. |
| `public/js/webutil.js` | Renderer ownership, DOM event wiring, persistence, history, preview movement, image loading, and control synchronization. |
| `public/js/webutil-sequence.js` | Pure normalization and serialization for editable sequence nodes. |
| `public/js/webutil-code.js` | Escape-safe JavaScript presentation and syntax highlighting. |

Keep transformation logic in a focused module when it can run without the DOM. Keep
renderer and interface coordination in `webutil.js`; splitting event wiring by control
would introduce implicit initialization order without reducing state coupling.

## State ownership

One `asciiam` instance owns the active canvas. Controls update that instance, then
synchronize code output, status chips, persistence, and history. Sequence drafts are
plain serializable records until `configureSequence()` commits them to the runtime.
Uploaded object URLs are transient and are never persisted.

The included image inventory comes from `public/assets/backgrounds.json`. The build
script derives that manifest and its thumbnails from `public/assets/images`; utility
code must not scan directories or depend on a remote image service.

## Control hierarchy

Primary actions cover the repeated authoring path: preset, sequence, mode, motion,
color, Reset, image, and code. Advanced owns lower-frequency renderer-detail and
workspace controls. Reset remains direct because recovery should take one action.
Documentation, About, and FPS are stage-level information actions rather than
configuration inputs.

The toolbar uses one tab stop with roving arrow-key focus. Moving controls between
groups requires updating the structural assertions in `tests/demo-toolbar.test.js`.

## Sequence editor

The editor renders playback order from left to right. Nodes retain stable IDs while
moving. `undefined`, `null`, and string image values are deliberately distinct and
must survive normalization and serialization. Re-rendering after the image manifest
loads makes included sources available without blocking initial utility startup.

## Verification

- Run `node --check public/js/webutil*.js` for syntax.
- Run `npm test -- --runInBand tests/demo-toolbar.test.js tests/image-library.test.js`.
- Run the full test and build pipeline after runtime or generated-code changes.
- Check the dock at wide and narrow viewports in a real browser; DOM tests cannot
  verify popover placement, canvas rasterization, or horizontal overflow behavior.
