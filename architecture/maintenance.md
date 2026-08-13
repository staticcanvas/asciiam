# Maintenance workflow

This document maps common changes to their source files, derived outputs, and required verification.

## Source-of-truth map

| Concern | Primary source | Files that must remain aligned |
| --- | --- | --- |
| Package version | `package.json` | README release text, changelog, generated docs data, utility labels |
| Runtime behavior | `src/asciiam.js` | declarations, API reference, guides, tests, generated bundles |
| Built-in mode inventory | `asciiam.BUILT_IN_MODES` and runtime dispatch | declarations, Animations guide, README mode table, tests |
| Character-set inventory | `asciiam.CHARACTER_SETS` | declarations, Character sets guide, README, web utility, tests |
| Type contract | `src/asciiam.d.ts` | runtime implementation and API reference |
| Preset data | `asciiam.presets` | generated Hugo data and gallery output |
| Documentation navigation | `docs/hugo.toml` | Hugo layouts and generated site |
| Documentation layout | `docs/layouts` and `docs/static` | `public` generated output |
| Live example inventory | `docs/data/examples.json` | examples layout, examples script, web-utility config handoff, tests |
| Attribution inventory | `resources.md` | `THIRD_PARTY_NOTICES.md`, attribution page, README |
| Web utility | `docs/static/webutil/index.html` and `docs/static/webutil/js` | staged bundles, tests, `/webutil/` output |
| Image-library manifest | `docs/static/webutil/assets/images` | generated manifest and thumbnails |

## Change paths

### Runtime API or option

1. Change `src/asciiam.js`.
2. Update `src/asciiam.d.ts`.
3. Add or revise regression tests.
4. Update `docs/content/api/_index.md` and the focused guide.
5. Update README when installation or common-use behavior changes.
6. Run documentation data generation, tests, lint, library build, and docs build.

### Built-in mode

1. Add the dispatch and implementation.
2. Add the name to `asciiam.BUILT_IN_MODES` and the declaration union.
3. Classify it as dense or sparse and update cache/reset paths.
4. Add tests and document controls, image-backed behavior, and performance model.
5. Add a preset only when a maintained default configuration is useful.

### Character set

1. Add the ordered string to `asciiam.CHARACTER_SETS`; preserve the low-to-high convention when the set is a density ramp.
2. Expose it in the web utility when it is broadly useful rather than application-specific.
3. Update the Character sets guide and README inventory.
4. Test exact values for short ramps and representative glyphs for longer inventories.

### Documentation page

1. Add content with front matter, a unique title, description, weight, date, last modification date, tags, and keywords.
2. Add the page to the Hugo menu when it is a primary guide.
3. Add the corresponding local Lucide icon mapping if required.
4. Add the page to documentation tests and README map when it is a primary destination.
5. Rebuild `public`.

### Live usage example

1. Add or change the JSON-safe option object in `docs/data/examples.json`.
2. Confirm the configuration uses only public options and can run from the documentation-local ESM bundle.
3. Keep renderer ownership single-instance; destroy before replacement.
4. Verify reset, copy, automatic preview, invalid JSON handling, and `config` transfer to the web utility.
5. Rebuild documentation output and run the utility and documentation tests.

### External asset

1. Record the exact source page, creator when available, and asset-specific license before adding the file.
2. Update `resources.md` and, when material is distributed, `THIRD_PARTY_NOTICES.md`.
3. Update the consumer attribution page and README for embedded or prominent assets.
4. Do not infer an individual asset license from a provider homepage.

### Release

1. Align `package.json`, README version text, changelog, and utility labels.
2. Regenerate data and all distributed outputs.
3. Run the complete verification matrix.
4. Inspect the package contents before publishing.
5. Tag only when the tag version matches `package.json`.

## Verification matrix

| Command | Verifies | Required for |
| --- | --- | --- |
| `npm test` | Runtime, utility, asset, and documentation contracts | Every behavior or docs-structure change |
| `npm run lint` | Authored JavaScript diagnostics | JavaScript changes |
| `npm run build` | UMD/ESM bundles, maps, copied package and utility assets | Runtime and packaging changes |
| `npm run docs:build` | Generated data, Hugo templates, links, and output | Documentation or public API changes |
| `npm run site:build` | Combined deployable site | Release and deployment changes |
| `npm run benchmark` | JavaScript-side frame cost under mocked canvas | Performance-sensitive renderer changes |
| `npm run benchmark:stats` | Disabled, compact, and extended diagnostics frame paths | Statistics or diagnostics changes |

## Review checks

- Confirm new comments explain ownership, invalidation, asynchronous races, or performance constraints rather than restating syntax.
- Confirm no authored change was made only in `public` or `dist`.
- Confirm examples use public API and can run after replacing only documented paths or selectors.
- Confirm teardown examples call `destroy()` for removed views.
- Confirm renderer and image claims distinguish required APIs from optional accelerated paths.
- Run a real-browser pass for canvas output, WebGL context behavior, font metrics, and responsive navigation when those areas change.

## API reference

| Artifact | Commit policy | Recovery |
| --- | --- | --- |
| Authored source and docs | Review line by line | Restore through version control |
| Generated Hugo output | Commit after successful docs build | Regenerate with `npm run docs:build` |
| Generated library bundles | Commit according to repository release workflow | Regenerate with `npm run build` |
| Generated image manifest and thumbnails | Commit when source image library changes | Regenerate with `npm run prepare:bg` |
