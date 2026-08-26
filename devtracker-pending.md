# Asciiam - Development Notes and Workflow Instructions

## **Tasklist**

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

### **Critical Path (priority-1)**

- [x] 🟡🌟✅1️⃣ **Brand identity pass: docs site and playground themed on the logo palette (2026-08-26).** `docs.css` and the Web Utility playground each had their own hand-rolled generic blue/violet color tokens, unrelated to each other and unrelated to `branding/asciiam-logo.svg`. Retired both in favor of the logo's actual gradient colors — warm orange (`#fcad26`–`#fc6f26`) and cyan (`#26fcdd`–`#36d5f6`) — computed to precise, contrast-checked OKLCH values shared by both sites.
  > **Solution Implemented:** Replaced `--clr-primary`/`--clr-accent2` in `docs/static/webutil/index.html` and `--plasma`/`--accent` (hex fallback and the `@supports (oklch)` override, both themes) in `docs/static/css/docs.css` with `oklch(0.75 0.155 198)` (dark primary/cyan), `oklch(0.70 0.185 52)` (dark accent/orange), `oklch(0.45 0.13 200)` (light primary/cyan), and `oklch(0.50 0.17 45)` (light accent/orange) — each checked against its background for ≥4.5:1 text contrast. Also re-hued three hardcoded, non-token decorative colors in `docs.css` that the earlier audit missed (`.hero-orb`'s radial gradient, `.prose blockquote`'s background tint, inline `code` text color) so nothing was left on the old palette. Verified with Playwright screenshots of both sites in dark and light theme; both derived-gradient card glows (`radial-gradient(... var(--clr-primary) ...)`) picked up the new colors automatically since the playground's gradients were already token-driven. `docs/static-sot-template.html` (an archived, Hugo-unconsumed prototype per `architecture/documentation.md`) already envisioned `--plasma: #00ffe5` / `--amber: #ffb830` — this pass is a return to that original direction, not a new one.
  > **After Thought:** Left the code-syntax-highlighter hues (`--syntax-keyword`, `--syntax-property`, etc.) and the GitHub/GitLab/success/danger/warning component colors untouched — those are semantic/third-party-brand colors independent of the primary/accent identity, and re-hueing them was out of scope for this pass. The playground's remaining configurability gaps (no `setLayers()` UI, missing `chartShowValues`/`animateImageMask` controls) are tracked separately under Distribution Readiness below and are the agreed next phase.

- [x] 🟠🌟✅1️⃣ **Epic: Toolbar Restructuring, Option Consolidation & DX Servicing**
  - [x] 🟡🌟✅1️⃣ **Serve:Example DX Pipeline** - Add `-c-1` cache-busting and build step to `npm run serve:example` in `package.json` to prevent stale browser caching during local development.
  - [x] 🟡🌟✅1️⃣ **Chart Option Consolidation** - Remove duplicate chart controls from `pop-motion` and consolidate all chart settings exclusively inside `pop-chart`.
  - [x] 🟡🌟✅1️⃣ **Toolbar Column Grouping** - Group toolbar pills into distinct visual columns (Authoring, Media Layers: Image, 3D, Chart, None, and Actions) with subtle rounded container styling.
  - [x] 🟡🌟✅1️⃣ **Option Coverage Audit** - Audit and expose all 48 `asciiam` options across the Web Utility toolbar, JSON Builder, and code exporter without duplicate handlers.
  - [x] 🟡🌟✅1️⃣ **High-Fidelity ASCII Charting** - Added chart axis guides (`chartShowAxes`), top bar caps (`chartShowValues`), line slope characters & area shading, donut center labels, and JSON builder preset entries.

- [x] 🟠🌟✅1️⃣ **Epic: Chart Mode Full Enhancement**
  - [x] 🟡🌟✅1️⃣ **Backfill Fix** - Rewrote `_chartCell()` to ensure all bars and chart types backfill solid block characters from axis baseline to full data height. Corrected Y-axis gutter from 2→3 columns so plotStart aligns correctly with all data values.
  - [x] 🟡🌟✅1️⃣ **Y-Axis Scale Range** - Added `chartScaleMin` / `chartScaleMax` options for explicit Y-axis bounds. Auto-defaults to 0→data max. Scale labels (top + mid) rendered in left gutter with `showAxes`.
  - [x] 🟡🌟✅1️⃣ **Per-Series Color Palette** - Added `chartColors: string[]` option. Each bar/segment/series picks its color cyclically from the array. Exposed in Web Utility chart popover as space-separated hex/named color input.
  - [x] 🟡🌟✅1️⃣ **Legend Labels** - Added `chartShowLegend` toggle. When `chartData` is `{label, value}[]` format, labels render below bars (vertical), in gutter (horizontal bar), or inside donut center area. Web Utility exposes a "Series labels" input that merges with data values.
  - [x] 🟡🌟✅1️⃣ **Per-Item Stagger Animation** - Added `chartAnimateItems: boolean` option. Bars reveal staggered from left→right, donut sweeps clockwise, line slides in from left. Uses `this._time` clock so animation loops on each restart. Toggle exposed in Web Utility chart popover.
  - [x] 🟡🌟✅1️⃣ **API Expansion** - Updated `setChartData(data, options)` to accept all new options, extended `getChartInfo()` to return `showLegend`, `hasColors`, `scaleMin`, `scaleMax`, `animateItems`.
  - [x] 🟡🌟✅1️⃣ **WebGL & 2D Atlas Chart Glyphs** - Added `_getChartCharacters()` to include box-drawing (`┌└│─┘`), vertical block ramps (` ▂▃▄▅▆▇█`), horizontal blocks (`▏▎▍▌▋▊▉█`), slope chars (`╱╲`), shading (`░▒▓`), digits, and label text inside both WebGL and 2D canvas glyph atlases so chart mode renders under WebGL.
  - [x] 🟡🌟✅1️⃣ **Code Export Coverage** - All 5 new options flow through `renderUsage()` and `getPersistableOptions()` so generated code snippets remain complete.

- [x] 🟠🌟✅1️⃣ **Epic: Media Layer Mode Separation & Comprehensive Chart Architecture**
  - [x] 🟡🌟✅1️⃣ **Mode Menu Clean-Up** - Removed `chart` and `mesh` from the primary animation mode selector buttons (`#modeButtons` grid in `#pop-mode`), aligning them strictly with `image` as dedicated composable media layers.
  - [x] 🟡🌟✅1️⃣ **Animation Mode Access for Media Layers** - Allowed media layers (images, 3D meshes, and charts) to composite over or blend with active ASCII field background animation modes (wave, ripple, vortex, plasma, matrix, etc.) while running their own render passes.
  - [x] 🟡🌟✅1️⃣ **Complete Chart Suite: Titles & Styling** - Implemented header title rendering with bold emphasis, centering, and theme colors across all chart types.
  - [x] 🟡🌟✅1️⃣ **Complete Chart Suite: Rich Legends** - Implemented per-series legend rows with colored item labels for vertical bars, horizontal gutter labels, line point series, and donut center hubs.
  - [x] 🟡🌟✅1️⃣ **Complete Chart Suite: Individual Object Values & Markers** - Render explicit value labels on top of vertical bars, alongside horizontal bars, on line graph peak/data points (`●`), and within donut segments.
  - [x] 🟡🌟✅1️⃣ **Data Model Completeness** - Supported rich objects (`{ label, value, color }`), multi-series arrays, explicit ranges, and formatted values in both core engine and Web Utility.
  - [x] 🟡🌟✅1️⃣ **Media Layer Enable/Disable Toggles** - Added `imageEnabled`, `meshEnabled`, and `chartEnabled` options with dedicated UI switch toggles in Image, 3D, and Chart popovers; updated toolbar summaries to report active/off/none cleanly.
  - [x] 🟡🌟✅1️⃣ **Session Persistence & Reset** - Fixed state persistence across page refreshes so active animation mode, media layers (image, 3D mesh, chart), chart form inputs, and enable toggles restore reliably from `localStorage`, with "Reset" restoring clean demo defaults.

- [x] 🔴🪲✅1️⃣ **Critical** - **Library and playground audit: confirmed production defects, fixed.** Full audit of `src/asciiam.js`/`src/asciiam.d.ts` and the `docs/static/webutil/` playground surfaced six real, verified bugs; all are fixed and covered by the existing (now fully passing, 141/141) Jest suite.
  > **Solution Implemented:**
  > - `applyDemoOptions()` in `webutil.js:830` referenced an undefined bare `quality` identifier, throwing a `ReferenceError` on every preset load, saved-preset load, **Reset Settings**, and **Undo/Redo** click — the single shared code path behind four already-shipped toolbar features. Fixed by dropping the stray reference (`quality` was already applied via the trailing `{ quality: qualityName }`).
  > - The `"plain"` mode (devtracker previously claimed complete as an alias of `none`/`static`) did not exist anywhere in the engine — `BUILT_IN_MODES`, the `isStaticMode` check, and the `_computeCell` switch had no `"plain"` case, so selecting it in the playground's Mode popover (it is the first button) silently fell through to the `default` case and rendered `wave` instead of a static raster. Added `"plain"` to `BUILT_IN_MODES`, `isStaticMode`, and the `_computeCell` static-mode case in `src/asciiam.js`, and to the `asciiamMode` union in `src/asciiam.d.ts`.
  > - `imageEnabled` and `meshEnabled` options were declared and fully wired end-to-end in the playground UI (toggle, persistence, code export, toolbar summary) but never read anywhere in `src/asciiam.js` — toggling "Image off" or "3D off" had zero rendering effect, unlike the correctly-gated `chartEnabled`. Added `if (this.opts.imageEnabled === false) return null;` to `_imageCell()` and `if (this.opts.meshEnabled === false) return 0;` to `_drawMesh()` (the single choke point for every mesh draw call site).
  > - The WebGPU async-init fallback used `.then(onFulfilled).catch(onError)` instead of `.then(onFulfilled, onError)` in two places (constructor and `setRenderer()`), adding one extra microtask tick before `_fallbackFromWebGPU()` ran. This was the root cause of 6 failing tests in `tests/asciiam.test.js`: the mistimed fallback caused one WebGPU test's cleanup to be skipped (it sat after the now-failing assertion), which leaked mocked `navigator.gpu`/`isSecureContext` globals into the rest of the suite and cascaded into unrelated GIF/image-mask/multi-layer test failures. Fixed both `.then()` chains; also hardened the two affected tests' cleanup into `try`/`finally` so a future flaky assertion can't leak state again.
  > - A disabled instance (canvas unsupported, or 2D context acquisition failed) stubbed most public methods as no-ops but omitted `exportImage`, `downloadSnapshot`, `setChartData`, `clearChart`, `getChartInfo`, `renderFrame`, and `renderToString` — calling any of these on a disabled instance threw, contradicting the "runs and degrades safely" design goal. Added stubs to both disabled-instance branches in the constructor (`renderFrame`/`renderToString` are genuinely headless and now work correctly even without canvas support).
  > - `src/asciiam.d.ts` had drifted from the implementation: `imageEnabled`, `meshEnabled`, `chartEnabled`, `chartShowLegend`, `chartColors`, `chartScaleMin`, `chartScaleMax`, `chartAnimateItems` were implemented but undeclared; `getChartInfo()`/`setChartData()` types were missing several fields each; `"chart"`/`"plain"` were missing from the `asciiamMode` union; the `renderer` option comment described the wrong fallback order (WebGPU falls back to WebGL2 first, then Canvas 2D, not directly to Canvas 2D); `imageMaskMode` was marked `@deprecated` while remaining the only implemented behavior for `mode: 'image'`. All corrected.
  > - Also fixed in the playground: a genuinely dead `chartDataEl.oninput` assignment in `webutil.js` (unconditionally overwritten a few lines later since `chartLabelsEl` is always present in `index.html`).
  > **After Thought:** Two structural findings from the audit are logged separately below rather than fixed inline, since they're feature gaps or design cleanups rather than bugs: the missing Web Utility layer editor for `setLayers()` (priority-2), and several smaller code-quality items (priority-3).


### **Distribution Readiness (priority-2)**

- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
  - [x] 🟠🌟✅2️⃣ **Distribution** - Automated built-site checks now run the same authoring flow in
        Chromium, Firefox, and WebKit, including non-empty Canvas 2D pixels, grid changes,
        procedural 3D configuration, generated output, responsive bounds, and browser errors.
        WebKit on Linux is not treated as Safari or physical-device verification.
        Latest local run: Chromium, Firefox, and WebKit smoke checks passed after the Hugo
        compatibility build; physical current-browser and mobile passes remain outstanding.

- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Playground/library feature-parity gaps (2026-08-26 audit).** The playground exposes most of the library's public option surface, but three gaps mean either the UI or the generated code silently omits real, working library features:
  - [ ] 🟠🌟⏳2️⃣ No Web Utility UI exists for `setLayers()`/multi-layer compositing. `options.layers` only round-trips through code export and persisted-settings serialization (`webutil.js:2011, 2039`) — a user can't build a layered composite (e.g. `image` + `wave` ambient + `fire` foreground) from the playground; it requires hand-editing the generated JSON in the Code popover. `devtracker-source.md`'s "Web Utility live layer editor" line has been corrected to flag this gap — see its `> Note!`.
  - [ ] 🟡🌟⏳2️⃣ `chartShowValues` has no toggle in the Chart popover, despite being a real option and appearing in the persisted-options key list (`webutil.js:2039`) alongside its siblings (`chartShowAxes`, `chartShowLegend`, `chartAnimateItems`), which all do have toggles.
  - [ ] 🟡🌟⏳2️⃣ `animateImageMask` has no control anywhere in `index.html`, despite being declared in `demoDefaults` (`webutil.js:47`) and round-tripped through `usageSource()`/`getPersistableOptions()` (`webutil.js:1994, 2036`).

### **Engineering Backlog (priority-3)**

- [ ] 🟠🌟✔️3️⃣ **Engineering Backlog** - 3D feature verification and documentation. Allocation reuse, the 8.92 KiB combined gzip delta, repeatable desktop benchmark, regression coverage, README/API/architecture guidance, a live docs example, and bounded web-utility controls are complete. Current Chrome/Firefox/Safari and representative mobile visual/performance passes remain required before release claims.
  > **Note!** - `npm run benchmark:mesh` measures the cell raster stage in Node. It does not replace browser glyph-raster, GPU-driver, font-metric, or mobile thermal verification.
  > **Note!** - Headless Chromium, Firefox, and WebKit configure a torus through the built utility and validate its generated output. Interactive current Chrome/Firefox, Safari on Apple hardware, and representative physical-mobile passes remain outstanding.
  > **Latest benchmark (2026-08-19):** 0.245 ms median, 0.435 ms p95, 309 drawn cells over 1,200 iterations at 60×45 cells; the 4 ms/8 ms desktop gates passed.
- [ ] 🟠💡⏳4️⃣ **Engineering Backlog** - Deferred mesh-compression research. After uncompressed glTF/GLB support has production measurements, benchmark Draco and Meshopt transfer size, decoder payload, initialization, decode time, peak memory, retained memory, and render-ready latency on desktop and mobile. Keep all codec code and dependencies out of released artifacts unless a later evidence-based architecture review explicitly approves a change.
  > **Note!** - `architecture/mesh-compression-evaluation.md` and `npm run benchmark:model` define the isolated corpus, baseline, measurements, and decision rule. The evaluation remains deferred until production uncompressed-model data exists.

- [x] 🟠💡✅3️⃣ **Engineering Backlog** - WebGPU backend feasibility and renderer architecture review. Defined the backend-neutral cell/frame contract, compatibility-mode constraints, secure-context and adapter/device-loss handling, shader boundary, and WebGL2/Canvas 2D fallback in `architecture/webgpu-feasibility.md`. The implementation and representative-platform measurement gate remain separate backlog items.
- [ ] 🟠🌟✔️3️⃣ **Engineering Backlog** - WebGPU prototype and benchmark. Implemented the WebGPU backend with asynchronous adapter/device checks, `auto` preference when capability detection succeeds, bounded atlas and instance-buffer reuse, no display-path readback, device-loss fallback, WebGL2/Canvas 2D parity boundary, TypeScript/API documentation, unit fallback coverage, built-site smoke coverage, and no WebGPU allocation on unsupported/default fallback paths. The benchmark remains a release gate because this environment lacks Node/npm and representative WebGPU-capable desktop/mobile hardware.
- [ ] 🟠🌟3️⃣ **Engineering Backlog** - Media asset pipeline extension. Expand the media layer contract for local and user-supplied image, GIF/video, and audio assets with object-URL cleanup, decode/readback budgets, format/error handling, autoplay and permission rules, accessible controls, and an explicit policy for remote assets and cross-origin isolation.
- [ ] 🟠🌟3️⃣ **Engineering Backlog** - Audio visualizer plugin evaluation and reference implementation. Keep Web Audio lifecycle outside the renderer; expose normalized analyser time-domain/frequency bands, beat/energy smoothing, pause/resume, teardown, and user-gesture handling to registered ASCII modes or media layers. Evaluate a built-in reference visualizer versus a separately shipped plugin and verify browser, accessibility, CPU, and battery behavior.
- [x] 🟠💡✅3️⃣ **Engineering Backlog** - Plugin extension architecture. Defined the versioned, capability-scoped registration contract, lifecycle/disposal, option schemas and TypeScript shape, serialization, isolation, compatibility rules, CSP/security boundaries, failure containment, documentation, and a minimal mode-plugin example in `architecture/plugin-architecture.md`. Runtime implementation remains intentionally uncommitted pending API review.

- [ ] 🟡🌟⏳3️⃣ **Engineering Backlog** - **Library/playground polish backlog (2026-08-26 audit).** Lower-severity findings from the same audit that produced the priority-1 bug fixes above — none are user-visible defects, but each is worth cleaning up:
  - [ ] 🟡🌟⏳3️⃣ `_getGlyphAtlas()` and `_getWebGLAtlas()` in `src/asciiam.js` duplicate the chart/image atlas character-set computation verbatim; extract a shared helper so the two atlases can't drift apart.
  - [ ] 🟢🌟⏳3️⃣ `_resampleImage()`'s `sampleContext.getImageData(...)` call (`src/asciiam.js`, inside `_resize()`/`setImage()`) has no try/catch — a tainted-canvas `SecurityError` from a misconfigured-CORS image would throw uncaught.
  - [ ] 🟢🌟⏳3️⃣ `WebGPUGlyphRenderer.destroy()` in `src/asciiam.js` never calls `this.device.destroy()`, relying on GC instead of explicit GPU resource release (the WebGL2 renderer's `destroy()` has the analogous gap — no `WEBGL_lose_context` call — so this is at least a consistent pattern, not a regression).
  - [ ] 🟡🌟⏳3️⃣ `webutil.js` attaches a blanket `input`/`change` listener calling `renderUsage()` to every `select, input` on the page, on top of each control's own explicit handler that already calls it — most interactions run `renderUsage()` (code re-highlight, two DOM writes, `localStorage` persist, undo-history push) twice. No visible bug, but wasted work and a footgun if a control's explicit handler and the blanket listener ever drift.
  - [ ] 🟢🌟⏳3️⃣ `usageSource()` in `webutil.js` reads `quality`/`renderer` from the DOM instead of `anim.opts` like every other option in that function — harmless today because `syncControlsFromOpts()` keeps them in sync, but it's the one inconsistent read in the function whose entire job is being the single source of truth for generated code.
  - [ ] 🟢🌟⏳3️⃣ Sequence editor "move earlier/later" buttons (`webutil.js`) use bare `←`/`→` glyphs as their only visible text; fine for screen readers via `aria-label`, but visually ambiguous against the horizontal node-flow layout — consider clarifying the visible label or icon.

### **Deferred Concepts (priority-4)**

- WebGPU backend auto-selection remains deferred pending the Engineering Backlog feasibility
  review and benchmark. WebGPU now has broader major-browser availability, but still requires
  a secure context and a usable adapter/device, can be blocked by drivers or platform policy,
  and must retain WebGL2/Canvas 2D fallback for compatibility. See the W3C WebGPU Candidate
  Standard, MDN WebGPU API guidance, and Chrome WebGPU browser-support/troubleshooting notes.
- Server-side rendering / static ASCII export. This is a live animation engine, not an
  ASCII-art generation tool for static output.

### **Completed UI Audit (priority-5)**

**Visual polish**

**Layout and information hierarchy**
**Controls UX**
**Accessibility**
**Popover controls and image extensions (2026-08-11)**
If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
