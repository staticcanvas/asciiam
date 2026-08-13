# Project documentation audit

This audit records the 2026-08-13 review of repository documentation, Hugo documentation, navigation, public API coverage, maintainer architecture, and explanatory source comments.

## Audit scope

| Area | Reviewed sources |
| --- | --- |
| Repository entry point | `README.md`, `package.json`, `vite.config.js`, CI configuration, root reference files |
| Public runtime contract | `src/asciiam.js`, `src/asciiam.d.ts`, runtime tests |
| Documentation content | All files below `docs/content` |
| Documentation structure | `docs/hugo.toml`, layouts, partials, CSS, JavaScript, generated `public` site |
| Generation workflow | Documentation, preset-data, asset-manifest, build, and benchmark scripts |
| Maintainability | Ownership boundaries, generated files, source comments, licensing, verification paths |

The repository had pre-existing uncommitted changes when this audit began. Audit changes were applied on top of that working tree without reverting or replacing unrelated work.

## Findings and corrections

| ID | Severity | Finding | Correction |
| --- | --- | --- | --- |
| NAV-01 | Medium | The sidebar label `Start` differed from the page title and the requested standard wording. | Renamed the menu item to `Getting started`. |
| NAV-02 | High | The Guides parent exposed only the guide index; six guide pages required a second navigation step and were not visible in the sidebar. | Added all guide pages as ordered children under Guides. |
| NAV-03 | Low | Labels mixed abbreviations and ambiguous nouns (`API`, `Version`, `Source`). | Changed them to `API reference`, `Version and compatibility`, and `Source repository`. |
| NAV-04 | Medium | Sidebar markers did not communicate destination type. | Replaced dot markers with a local, current-colour Lucide SVG subset and added license notices. |
| NAV-05 | Medium | Adding guide children could exceed short desktop viewports while the fixed sidebar suppressed overflow. | Enabled vertical sidebar scrolling while retaining horizontal clipping. |
| DOC-01 | High | README and documentation homepage stated 17 built-in modes while the implementation exposed 24 including `custom`. | Added `asciiam.BUILT_IN_MODES`, generated the site count from it, and corrected README. The subsequent interaction-mode work now derives the current 26-mode count from that inventory. |
| DOC-02 | Medium | The README documentation map omitted Animation modes and did not cover integration ownership. | Added Animation modes and a new Integration and lifecycle guide to the map. |
| DOC-03 | Medium | Lifecycle ownership, single-surface behavior, teardown, accessibility, and custom-callback cost were dispersed across README and API text. | Added a focused Integration and lifecycle guide with an API table and flow diagram. |
| DOC-04 | Low | README repeated installation instructions and contained an orphaned performance claim in the image section. | Removed the duplicate installation section and the unsupported claim. |
| DOC-05 | Medium | `docs/static-sot-template.html` was named as if it were a maintained source of truth although Hugo does not consume it. | Reclassified it as visual provenance; documented Hugo layouts and CSS as implementation sources. |
| DOC-06 | High | The package declared MIT and referenced `LICENSE`, but no root license file existed and the package build did not copy one. | Added the MIT license and included it in packaged output. |
| ARC-01 | High | No maintainer architecture directory or explicit authored/generated file map existed. | Added `architecture/` with runtime, documentation, and maintenance references. |
| CODE-01 | Medium | The two runtime classes and several non-obvious lifecycle, scheduler, renderer, sequence, and animated-image functions lacked header comments. | Added concise JSDoc comments explaining ownership, invalidation, and behavior. |
| CODE-02 | Low | Asset and documentation generation helpers lacked purpose comments. | Added comments to category and thumbnail helper functions. |
| LEGAL-01 | Medium | Adding Lucide paths required preservation of upstream notices. | Added `THIRD_PARTY_NOTICES.md` with Lucide ISC and Feather MIT notices. |
| DOC-07 | High | The default 190-glyph character inventory was not defined precisely for consumers, and the built-in alternatives were scattered. | Added a Character sets guide, documented the exact default composition in README, and added focused technical, geometric, circuit, wave, terminal, and minimal sets. |
| API-01 | Medium | Pointer support modified existing modes but did not provide dedicated hover-local or press-triggered animations. | Added `hoverZone`, `clickZone`, two presets, target pointer handling, and the public `triggerInteraction()` method with tests and declarations. |
| API-02 | Medium | Spatial alignment exposed only the centre and four corners even though the shared origin model supports edge anchors. | Expanded runtime, declarations, utility controls, README, and guides to all nine positions and documented which modes consume the origin. |
| API-03 | High | Backdrop opacity accepted `1`, but backdrops always rendered behind glyphs, so full opacity could not blanket an animation. | Added explicit `behind` and `over` placement in Canvas 2D, WebGL2, declarations, utility controls, and documentation. `over` at opacity `1` fully covers output. |
| SEARCH-01 | Medium | Page search exposed only the `Ctrl+K` shortcut, searched only the current page, and did not use page metadata. | Added an on-demand Hugo JSON site index ranked across titles, descriptions, tags, keywords, and text, plus `Ctrl+K`, `Command+K`, and `/` focus behavior with keyboard result navigation and editable-control guards. |
| META-01 | Medium | Pages had descriptions but no consistent dates, tags, keywords, machine-readable modified time, or direct edit path. | Added front-matter metadata to every page, emitted head metadata, and added update/tag/Edit-on-GitLab/Edit-on-GitHub controls. |
| DOC-08 | High | Examples were static snippets or fixed preset previews; readers could not edit a progressive configuration and inspect output in place. | Added a single-instance, JSON-validated usage workbench spanning minimum, variants, image, sequence, and complete serializable configuration, with reset, copy, and web-utility transfer. |
| LEGAL-02 | High | `resources.md` was an unstructured URL list and the SVG Repo demonstration asset lacked a maintained consumer attribution. | Converted the resource list into a source inventory and documented Lucide, SVG Repo Bird Shape CC0, PAT public-domain map material, media providers, and external services in notices, docs, and README. |
| API-04 | High | Sequence-level looping and finite-mode repetition shared the runtime `loop` option, so a reveal could unintentionally cycle or inherit a prior step's policy. | Added normalized `sequence[].repeat` with a `false` default, explicit web-utility controls, compatibility for legacy `options.loop`, types, tests, and documentation. |
| API-05 | Medium | Replaying a completed non-looping sequence resumed its finished final step and could emit duplicate completion. | Added explicit completed state and restart-from-zero playback semantics while preserving pause/resume behavior. |
| PKG-01 | High | Getting Started was asked to document `.mjs`, but the build and package exports did not produce that artifact; CommonJS also resolved to a `.js` file inside a module package. | Added canonical `asciiam.mjs` and `asciiam.cjs` outputs, updated conditional exports, retained existing browser files, and documented both entry formats. |
| SEARCH-02 | Medium | The initial site-search implementation could duplicate index fetches, render stale async results, fail on missing metadata arrays, and lacked explicit combobox semantics. | Added single-flight loading, query-version suppression, defensive normalization, combobox attributes, and focused regression assertions. |
| UI-01 | Medium | The documentation landing route used the full navigation shell despite being intended as a visual entry point. | Made the root route a content-only splash with an asciiam background while preserving full documentation chrome on inner routes. |
| SEARCH-03 | Medium | Exact substring matching did not connect common reader vocabulary, expose why a tag matched, or emphasize literal query words. | Expanded authored metadata, added normalized vocabulary aliases, safe DOM-based word highlighting, selected tag chips, and JSDOM interaction coverage. |
| UI-02 | Medium | The splash used `min(760px, 100svh)` on desktop and a 620 px mobile override, exposing the following documentation section in taller initial viewports. | Set both layouts to `min-height: 100svh`; the absolutely positioned renderer stage and canvas now cover the initial viewport before content appears on scroll. |
| ARC-02 | High | The web utility kept its complete application script inline in `public/index.html`, obscuring source ownership and making focused tests difficult. | Extracted a native-module entry point plus pure sequence-data and code-formatting modules; documented their boundaries in `architecture/web-utility.md`. The docs site already had site-wide, splash, gallery, and examples modules, so its existing split was audited and made explicit instead of mechanically fragmented. |
| API-06 | High | Sequence steps could change modes and options but could not move between image sources without application callback code. | Added tri-state step images (retain, clear, load), decode-aware timing, stale-load cancellation, error callbacks/events, state reporting, declarations, tests, and consumer documentation. |
| UI-03 | Medium | The sequence editor presented a vertical form stack and could not express image-source changes. Reset required opening Advanced, while Documentation was reachable only through secondary content. | Reworked the editor as a horizontal node flow with image actions, kept Reset in the primary dock, and aligned direct Documentation, About, and FPS actions at stage level. |
| ARC-03 | High | Deployment made the web utility the root site and nested the primary documentation under `/docs/`; `public` also mixed authored utility files with generated Hugo output. | Made Hugo documentation the root site, moved the authored application to `docs/static/webutil`, published it at `/webutil/`, made links project-path-safe, and gave Hugo sole ownership of generated `public`. |

## Navigation result

The primary sidebar order is:

1. Getting started
2. Guides
   1. Renderers and performance
   2. Integration and lifecycle
   3. Animation modes
   4. Character sets
   5. Animation sequences
   6. Images
   7. Web utility
3. Usage examples
4. Gallery
5. API reference
6. Changelog
7. Version and compatibility
8. Attributions

Resources remain separate from the documentation information architecture: Web utility, Source repository, and npm package.

## Documentation coverage result

| Subject | README | Hugo docs | Maintainer architecture |
| --- | --- | --- | --- |
| Installation and bundle formats | Yes | Getting started and API | Build ownership |
| Target sizing and ownership | Yes | Getting started and Integration | Runtime construction |
| Renderers and fallback | Yes | Rendering and API | Renderer boundary |
| Built-in and custom modes | Yes | Animation modes and API | Mode models |
| Character-set default and inventories | Yes | Character sets and API | Runtime and maintenance source map |
| Pointer interaction and spatial origins | Yes | Animation modes and API | Runtime mode models |
| Backdrop compositing order | Yes | Web utility and API | Renderer boundary and invariants |
| Sequences, image changes, and morphs | Yes | Sequences and API | Sequence state |
| Static and animated images | Yes | Images and API | Image pipeline |
| Web utility and persistence | Yes | Web utility | Documentation boundary |
| Live editable configurations | Yes | Usage examples | Documentation live-example ownership |
| Page metadata and source editing | Partial | Every page | Documentation metadata ownership |
| External resources and attribution | Yes | Attributions | Maintenance source map |
| Events and callbacks | Yes | API and focused guides | Runtime contract map |
| Build, docs, and release paths | Yes | Version | Documentation and maintenance |
| Generated versus authored files | Partial | Partial | Explicit map |

## Commenting standard applied

Comments were added where behavior is not self-evident from a signature: resource ownership, shared scheduling, cache invalidation, renderer replacement, asynchronous GIF cancellation, and sequence state changes. Straight-line helpers and mathematical cell functions were not given comments that merely repeat their names.

Future comments should explain at least one of these concerns:

- why a lifecycle or ownership decision exists;
- what invalidates cached or asynchronous work;
- which state must survive a renderer or target change;
- why a performance shortcut is safe;
- what browser fallback changes behavior.

## Residual risks and follow-up work

| Priority | Risk | Recommended action |
| --- | --- | --- |
| P1 | README and API reference retain intentional overlapping tables, so runtime changes can still drift. | Extend tests to compare selected defaults and names against runtime exports when each new public option is added. |
| P1 | Canvas and WebGL presentation cannot be validated by JSDOM. | Run a current Chrome, Firefox, and Safari visual pass before a public release. |
| P1 | CI runs tests, lint, and the library build but does not currently build Hugo documentation. | Add a pinned Hugo CI job or a container-capable docs check that fails on stale generated `public` output. |
| P2 | `pending-tasks copy.md` duplicates a planning document and may confuse future maintainers. | Review both task files and remove or archive the copy in a separate cleanup change. |
| P2 | `docs/static-sot-template.html` is a large prototype retained for provenance. | Remove it after confirming no design comparisons still depend on it, or move it to a clearly named archive directory. |

## Verification record

| Check | Status | Result |
| --- | --- | --- |
| Documentation source inventory | Complete | All README, Hugo content, layout, static, and generated documentation paths reviewed. |
| Runtime/API inventory | Complete | Public methods, options, events, mode inventory, declarations, and focused guides compared. |
| Hugo build | Passed | Hugo 0.164.0 reported 20 pages and 67 static files; documentation is rooted at `public/` and the application is present at `public/webutil/`. |
| Automated tests | Passed | 7 suites and 98 tests passed, including route ownership, image-aware sequence timing, node editing, and live search interaction coverage. |
| ESLint | Passed | `npm run lint` completed without diagnostics. |
| Package build | Passed | Vite generated canonical `.mjs`/`.cjs` entries plus readable and minified UMD/ESM browser bundles; both entry formats load successfully. |
| Local Markdown links | Passed | 23 authored documentation and maintainer Markdown files checked; no missing local targets. |
| Real-browser visual review | Partial | Firefox headless loaded the generated root documentation and `/webutil/` application at 1440×1000, including every local script, runtime bundle, image manifest, and brand asset. Chrome and Safari remain release checks. |

## Audit reference

| Artifact | Role |
| --- | --- |
| `project_docs_audit.md` | Audit findings and correction record. |
| `architecture/README.md` | Maintainer entry point and repository boundaries. |
| `architecture/runtime.md` | Runtime ownership and invariants. |
| `architecture/documentation.md` | Documentation generation and navigation ownership. |
| `architecture/web-utility.md` | Web utility module, state, control, and sequence-editor ownership. |
| `architecture/maintenance.md` | Change and verification workflow. |
| `THIRD_PARTY_NOTICES.md` | Embedded third-party icon notices. |
