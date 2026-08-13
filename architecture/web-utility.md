# Web utility architecture

The web utility is a static browser application authored under `docs/static/webutil` and
published at `/webutil/`. It uses the version-aligned UMD runtime staged in its local
`libs` directory and native ES modules for utility behavior. It has no framework
lifecycle or server-owned state.

## Module boundaries

| Source | Responsibility |
| --- | --- |
| `docs/static/webutil/index.html` | Semantic structure, control markup, responsive layout, and visual tokens. |
| `docs/static/webutil/js/webutil.js` | Renderer ownership, DOM event wiring, persistence, history, preview movement, image loading, and control synchronization. |
| `docs/static/webutil/js/webutil-sequence.js` | Pure normalization and serialization for editable sequence nodes. |
| `docs/static/webutil/js/webutil-code.js` | Escape-safe JavaScript presentation and syntax highlighting. |

Keep transformation logic in a focused module when it can run without the DOM. Keep
renderer and interface coordination in `webutil.js`; splitting event wiring by control
would introduce implicit initialization order without reducing state coupling.

## State ownership

One `asciiam` instance owns the active canvas. Controls update that instance, then
synchronize code output, status chips, persistence, and history. Sequence drafts are
plain serializable records until `configureSequence()` commits them to the runtime.
Uploaded object URLs are transient and are never persisted.

The included image inventory comes from
`docs/static/webutil/assets/backgrounds.json`. The build script derives that manifest
and its thumbnails from `docs/static/webutil/assets/images`; utility code must not scan
directories or depend on a remote image service. Manifest URLs are relative to the
utility route so project-path deployments remain valid.

## Control hierarchy

Primary actions cover the repeated authoring path: preset, sequence, mode, motion,
color, Reset, image, and code. Advanced owns lower-frequency renderer-detail and
workspace controls. Reset remains direct because recovery should take one action.
Documentation, About, and FPS are stage-level information actions rather than
configuration inputs.

FPS preserves the compact default output. Extended diagnostics belongs to Quality because
it changes measurement detail rather than animation state. Enabling it also enables FPS;
disabling FPS hides output without creating a second sampling loop. Text sparklines are
rendered by the runtime at its existing reporting interval rather than by a chart library.

The toolbar uses one tab stop with roving arrow-key focus. Moving controls between
groups requires updating the structural assertions in `tests/demo-toolbar.test.js`.

## Sequence editor

The editor renders playback order from left to right. Nodes retain stable IDs while
moving. `undefined`, `null`, and string image values are deliberately distinct and
must survive normalization and serialization. Re-rendering after the image manifest
loads makes included sources available without blocking initial utility startup.

## Verification

- Run `node --check docs/static/webutil/js/webutil*.js` for syntax.
- Run `npm test -- --runInBand tests/demo-toolbar.test.js tests/image-library.test.js`.
- Run the full test and build pipeline after runtime or generated-code changes.
- Check the dock at wide and narrow viewports in a real browser; DOM tests cannot
  verify popover placement, canvas rasterization, or horizontal overflow behavior.
