# Asciiam - Development Notes and Workflow Instructions

## **Tasklist**

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

### **Critical Path (priority-1)**

### **Distribution Readiness (priority-2)**

- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
  - [x] 🟠🌟✅2️⃣ **Distribution** - Automated built-site checks now run the same authoring flow in
        Chromium, Firefox, and WebKit, including non-empty Canvas 2D pixels, grid changes,
        procedural 3D configuration, generated output, responsive bounds, and browser errors.
        WebKit on Linux is not treated as Safari or physical-device verification.
- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Safari-specific canvas text rendering unverified.** Font metrics and subpixel
      text positioning have known quirks in Safari; the quantized-font-level approach
      hasn't been visually checked there.
### **Engineering Backlog (priority-3)**

- [ ] 🟠🌟⏳3️⃣ **Backlog** - **`fadeIn` and `image` modes don't expose fine-grained timing controls** (sweep
      duration, per-character delay curve) — currently hardcoded constants
      (`totalDuration = 2.2`, etc.). Fine for the presets, limiting if someone wants a
      slower/faster intro without digging into source.
- [ ] 🟠🌟⏳3️⃣ **Backlog** - **No built-in way to composite multiple modes** (e.g. `current` texture plus a
      `wave` sweep on top). Currently one mode at a time; layering would mean running
      two instances on stacked canvases, which works but isn't documented as a
      pattern.
- [ ] 🟠🌟⏳3️⃣ **Backlog** - **Matrix mode column state doesn't survive a `setOption('density', …)` change**
      cleanly mid-run — it reinitializes via `_resize()`, so an in-progress rain
      column resets rather than continuing at the new density. Minor visual hitch,
      not a bug.

- [ ] 🟠🌟✔️3️⃣ **Engineering Backlog** - 3D feature verification and documentation. Allocation reuse, the 8.92 KiB combined gzip delta, repeatable desktop benchmark, regression coverage, README/API/architecture guidance, a live docs example, and bounded web-utility controls are complete. Current Chrome/Firefox/Safari and representative mobile visual/performance passes remain required before release claims.
  > **Note!** - `npm run benchmark:mesh` measures the cell raster stage in Node. It does not replace browser glyph-raster, GPU-driver, font-metric, or mobile thermal verification.
  > **Note!** - Headless Chromium, Firefox, and WebKit configure a torus through the built utility and validate its generated output. Interactive current Chrome/Firefox, Safari on Apple hardware, and representative physical-mobile passes remain outstanding.
- [ ] 🟠🌟⏳3️⃣ **Rendering / Compatibility** - **Automated Font Metric Calibration & Safari Rendering Verification.** Develop an automated subpixel font metric calibration system and end-to-end visual testing harness targeting Safari/WebKit canvas quirks.
  - [ ] 🟡🌟⏳3️⃣ **Rendering / Compatibility** - Font-metric baseline measurement helper in WebGL font atlas generator and cross-browser visual snapshot regression test suite.
- [ ] 🟠🌟⏳3️⃣ **DX / SSR** - **Headless ASCII String & Frame Generator.** Create a pure JavaScript text/string rasterizer mode (`asciiam.renderToString()` / `asciiam.renderFrame()`) that operates natively in Node.js, Bun, and Deno without requiring DOM Canvas or JSDOM.
  - [ ] 🟡🌟⏳3️⃣ **DX / SSR** - Light-weight headless text renderer for CLI tools, terminal outputs, SSR frameworks (Next.js, Nuxt), and static site generation.
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
