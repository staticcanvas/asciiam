# Asciiam - Development Notes and Workflow Instructions

## **Tasklist**

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

### **Critical Path (priority-1)**

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
  - [x] 🟡🌟✅1️⃣ **Code Export Coverage** - All 5 new options flow through `renderUsage()` and `getPersistableOptions()` so generated code snippets remain complete.


### **Distribution Readiness (priority-2)**

- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
  - [x] 🟠🌟✅2️⃣ **Distribution** - Automated built-site checks now run the same authoring flow in
        Chromium, Firefox, and WebKit, including non-empty Canvas 2D pixels, grid changes,
        procedural 3D configuration, generated output, responsive bounds, and browser errors.
        WebKit on Linux is not treated as Safari or physical-device verification.
### **Engineering Backlog (priority-3)**

- [ ] 🟠🌟✔️3️⃣ **Engineering Backlog** - 3D feature verification and documentation. Allocation reuse, the 8.92 KiB combined gzip delta, repeatable desktop benchmark, regression coverage, README/API/architecture guidance, a live docs example, and bounded web-utility controls are complete. Current Chrome/Firefox/Safari and representative mobile visual/performance passes remain required before release claims.
  > **Note!** - `npm run benchmark:mesh` measures the cell raster stage in Node. It does not replace browser glyph-raster, GPU-driver, font-metric, or mobile thermal verification.
  > **Note!** - Headless Chromium, Firefox, and WebKit configure a torus through the built utility and validate its generated output. Interactive current Chrome/Firefox, Safari on Apple hardware, and representative physical-mobile passes remain outstanding.
- [ ] 🟠💡⏳4️⃣ **Engineering Backlog** - Deferred mesh-compression research. After uncompressed glTF/GLB support has production measurements, benchmark Draco and Meshopt transfer size, decoder payload, initialization, decode time, peak memory, retained memory, and render-ready latency on desktop and mobile. Keep all codec code and dependencies out of released artifacts unless a later evidence-based architecture review explicitly approves a change.
  > **Note!** - `architecture/mesh-compression-evaluation.md` and `npm run benchmark:model` define the isolated corpus, baseline, measurements, and decision rule. The evaluation remains deferred until production uncompressed-model data exists.

### **Deferred Concepts (priority-4)**

- WebGPU backend. WebGL2 now provides the selectable GPU path with much broader browser
  coverage, while Canvas 2D remains the compatibility and explicitly selectable CPU
  backend. A separate WebGPU implementation would currently duplicate those paths.
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
