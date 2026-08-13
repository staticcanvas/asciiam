# Asciiam - Development Notes and Workflow Instructions

---

## **REPO INSTRUCTIONS**

**TASKS:** Work through task items in the **`devtracker-pending.md`** file. If a task is not in its proper category, move it to the correct section. If a task item is incomplete, relies on a temporary workaround rather than best practices, or represents a simple implementation instead of the ideal advanced method, add an inline comment block starting with `> **After Thought:**` or `> **Note!**` detailing alternatives, potential issues, or future design considerations.

**SKILL HARNESS:** Refer to the `fluent-ui-v1` skill for all UI/UX tasks. Refer to the `phellams-aa` skill for PowerShell automation, TUI design, and C# compilation tasks. Refer to the `phellams-htpine` skill for HTMX and Alpine.js dashboard development. Refer to the `context-source/` directory for extended project knowledge and architectural lessons learned.

**VERSIONING:** Refer to the `fluent-ui-v1` versioning strategy for SemVer tags and releases. **Git Workflow:** The build version can only be incremented by `major`, `minor`, or `patch` levels; otherwise, the validation process will fail.

**CHANGELOG:** Keep an active `CHANGELOG.md` file referring to `fluent-ui-v1` standards.

**CONTEXT DIRECTORY:** Use the `context-source/` folder to store AI-related PDRs, context files, and lessons learned. Maintain `extended-knowledge-lessons-learned-building-powershell-asciiam.md` as the active log of project insights, which will be compiled into the v1 knowledge base for future runs.

**DEV ENVIRONMENT AUTOMATION (`devt`):** Use the integrated `devt` utility module located at [tools/devt](file:///mnt/g/devspace/projects/web/_repo/staticcanvas/asciiam/tools/devt) to compile tasks, sync checkmarks/notes, generate changelogs, diff branches, and automate commit validation.

## **GIT WORKFLOW:**

**BRANCHES:** Create a new branch (e.g., `feat/`, `fix/`, etc.) from `develop` or spin up an agent worktree branch under `agent/`. Use descriptive names like `feat/component/icon-improve-hash`.

**MERGE REQUESTS:** Create a Draft Merge Request (MR) in GitLab targeting `develop`. Include details on the planned change, implementation strategy, and expected outcomes.

**LABELS & ASSIGNMENT:** Assign MRs and tasks to the user specified in the git configuration. Add appropriate workflow labels and delete the source branch after merging.

**BRANCH REMINDERS:** Run `git pull origin develop` before creating a new branch or worktree directory.

**OUTSTANDING COMMITS:** If a feature is complete, commit and push outstanding changes.

**_DIFFICULTY:_** 🔴 - `very-hard` | 🟠 - `moderate` | 🟡 - `easy` | 🟢 - `very-easy`
**_SCOPE:_** 💡 - `Concepts-skip-from-task-list-unless-asked` | 🌟 - `feature-appears-only-on-primary-tasks` | 🦀 - `bug-appears-only-on-primary-bug` | 🪲 - `bug-fixed-appears-only-on-primary-bugfix` | 🩹 - `fix-only-appears-on-primary-tasks`
**_COMPLETE:_** ⏳ - `pending/not-started` | 🌀 - `working-on` | ✔️ - `partially-complete` | ❓ - `working-but-with-issues` | ✅ - `complete`
**_PRIORITY:_** 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 - `priority-of-tasks`

> Tasks should follow this convention:
>
> - [ ] {{DIFFICULTY}} {{SCOPE}} {{COMPLETE}} {{PRIORITY}} **TASK CATEGORY** - Description
>   - [ ] {{DIFFICULTY}} {{SCOPE}} {{COMPLETE}} {{PRIORITY}} **_SUB-TASK CATEGORY_** - Description
>     > **_NOTE!_** - Note content

---

## **Tasklist**




Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

### **Critical Path (priority-1)**

- [x] 🟠🌟✅1️⃣ **Critical** - **Local image library simplification.** Renamed the default asset source to
      `public/assets/images`, added three selectable defaults and an explicit empty
      state, and removed the remote search API, credentials, and tracking layer.
- [x] 🟠🌟✅1️⃣ **Critical** - **About access and export guidance.** Moved About into the stage information
      area before the FPS switch, added Ctrl/Cmd+A access outside editable fields,
      and documented every package/browser export in the overlay and README.
- [x] 🟠🌟✅1️⃣ **Critical** - **Code control placement and live output.** Code is the final toolbar control,
      uses logical auto-margin to stay on the right edge, and reflects live control changes.
- [x] 🟠🌟✅1️⃣ **Critical** - **FPS switch.** A compact native checkbox switch is positioned at the top-right
      of the stage and controls the FPS overlay.
- [x] 🟠🌟✅1️⃣ **Critical** - **Separate Preset, Quality, and Mode controls.** Each toolbar trigger now owns
      an independent popover.
- [x] 🟠🌟✅1️⃣ **Critical** - **Complete character presets.** Added all 95 printable ASCII characters and a
      190-character ASCII plus extended Latin-1 set.
- [x] 🟠🌟✅1️⃣ **Critical** - **Custom character sets.** The Charset popover accepts up to 512 characters,
      validates at least two distinct characters, and applies valid input live.
- [x] 🟠🌟✅1️⃣ **Critical** - **Independent Backdrop control.** Backdrop enablement, opacity, solid color,
      gradient type, and gradient stops now use a dedicated toolbar popover.
- [x] 🟠🌟✅1️⃣ **Critical** - **Toolbar spatial alignment.** Alignment is available in the toolbar and now
      changes current, ripple, fade-in, and radial image calculations.
- [x] 🟠🌟✅1️⃣ **Critical** - **Content-sized popovers.** Popovers use intrinsic width with viewport bounds;
      vertical scrolling appears only when content exceeds the available stage height.
- [x] 🟠🪲✅1️⃣ **Critical** - **Renderer performance recovery.** Static noise, spatial distance, trigonometric
      fields, and backdrop gradients are cached. A 19,224-cell mocked Canvas benchmark
      reduced current-mode JavaScript frame time from 1.94 ms to 0.92 ms (52.4%).
- [x] 🟠🌟✅1️⃣ **Critical** - **Persist demo settings.** Versioned local storage restores supported animation,
      appearance, performance, and toolbar settings across sessions. Uploaded image
      object URLs are intentionally excluded because they do not survive a page load.
- [x] 🟠🌟✅1️⃣ **Critical** - **Hero cards.** Added three switchable, responsive variants with shared content
      and repository actions. Variant state is exposed through native buttons and
      `aria-pressed`, while hover/focus interactions retain the live mask treatment.
  - [x] 🟡🌟✅1️⃣ **Critical** - Vertical — focused single-column product card.
  - [x] 🟡🌟✅1️⃣ **Critical** - Split — copy and repository actions in separate columns, collapsing on mobile.
  - [x] 🟡🌟✅1️⃣ **Critical** - Terminal — compact green-screen treatment for developer-focused contexts.
- [x] 🟠🌟✅1️⃣ **Critical** - **Header preview scope.** Removed Spatial Alignment from the top preview switcher;
      alignment remains available in the toolbar where it belongs.
- [x] 🟠🌟✅1️⃣ **Critical** - **Hero and splash previews.** The top switcher now cleanly previews Background,
      Hero card, and Splash page surfaces.
- [x] 🟠🌟✅1️⃣ **Critical** - **Fade-out mode.** Added the inverse `fadeOut` engine mode, an `outroFade`
      preset, demo control, TypeScript mode, and regression coverage.
- [x] 🟠🌟✅1️⃣ **Critical** - **Directional reveal animation.** `fadeIn` and `fadeOut` now reveal left to
      right, right to left, or outward from the center. The Motion popover exposes
      this control only for reveal modes, and presets retain their intended direction.
- [x] 🟠🌟✅1️⃣ **Critical** - **Code popover sizing.** Increased its usable vertical size and internal code
      padding while bounding it below the FPS region and viewport edges.
- [x] 🟠🌟✅1️⃣ **Critical** - **Mobile UI.** Added narrow-screen scene spacing, horizontally scrollable toolbar
      controls, 44px touch targets, viewport-bounded popovers, stacked hero actions,
      and mobile code sizing.
- [x] 🟠🌟✅1️⃣ **Critical** - **Robust character presets.** ASCII + extended Latin-1 is now the default for
      text and image rendering. Added alphanumeric, case-specific, symbol, box-drawing,
      arrow, and mathematical presets alongside the existing specialist sets.
- [x] 🟠🌟✅1️⃣ **Critical** - **Animation mode inventory.** The current engine and practical next modes are
      recorded here for implementation planning.
  - [x] 🟡🌟✅1️⃣ **Critical** - Ordered animation sequences — a single renderer can now play, stagger, loop,
        pause, seek, skip, and interrupt timed mode steps. Per-step option overrides,
        callbacks, lifecycle events, persistence, generated code, and an accessible
        move-up/down demo editor are included without adding another per-cell pass.
- [x] 🟠💡✅1️⃣ **Critical** - **120 Hz Ultra performance audit.** Reduced the 1080p Ultra dense grid from
      6,150 to 2,700 cells, quantized opacity to eight levels, cached cell coordinates
      and baselines, skipped idle sequence dispatch, and avoided redundant Canvas alpha
      writes. The four-instance JavaScript benchmark increased from 175 to 457
      theoretical shared-frame FPS; physical output remains bounded by display refresh.
- [x] 🟠💡✅1️⃣ **Critical** - **Sustained CPU audit.** Performance and Ultra now use a shared, bounded glyph
      atlas for solid-color modes. Font shaping and rasterization occur when an atlas is
      created instead of for every glyph on every frame. Dynamic gradients, animated
      colors, and image-derived colors retain the direct text path. Solid horizontal
      waves cache their static ambient field and redraw only the moving band, reducing
      four-instance 1080p Ultra JavaScript frame time from 2.816 ms to 0.606 ms in the
      final shared-cache benchmark.
- [x] 🟠🌟✅1️⃣ **Critical** - **GPU-first rendering policy.** Display canvases request desynchronized,
      non-readback Canvas 2D contexts and compositor-layer promotion. Image sampling
      uses a separate readback-optimized canvas. `getRendererInfo()` reports the policy;
      hardware acceleration remains controlled by the browser and graphics driver.
- [x] 🟠🌟✅1️⃣ **Critical** - **Selectable WebGL2 renderer.** Added `auto`, `webgl2`, and `canvas2d` backends.
      WebGL2 uses a white glyph texture, instanced quad batching, shader gradients, GPU
      blending for trails and backdrops, explicit high-performance adapter preference,
      live backend switching, initialization fallback, and context-loss fallback.
  - [x] 🟡🌟✅1️⃣ **Critical** - Supported — `wave`, `current`, `ripple`, `vortex`, `plasma`, `fadeIn`, `fadeOut`,
        `matrix`, `snow`, `sparkle`, `fire`, `starfield`, `glitch`, `typewriter`, `orbit`,
        `image`, and registered/custom cell modes.
  - [x] 🟡🌟✅1️⃣ **Critical** - Vortex/swirl — a cached three-arm radial flow rotates around the selected
        spatial origin without trigonometry in the dense per-cell loop.
  - [x] 🟡🌟✅1️⃣ **Critical** - Plasma/noise field — three cached low-frequency fields blend into organic
        motion with only six trigonometric calculations per frame.
  - [x] 🟡🌟✅1️⃣ **Critical** - Fire/embers — a bottom-origin heat ramp emits sparse particles with asciiam and lifetime decay.
  - [x] 🟡🌟✅1️⃣ **Critical** - Starfield/tunnel — depth-projected sparse particles expand from the selected origin.
  - [x] 🟡🌟✅1️⃣ **Critical** - Glitch/scramble — deterministic timed displacement and scan-band corruption.
  - [x] 🟡🌟✅1️⃣ **Critical** - Typewriter/reveal — deterministic row-major sequencing with a visible cursor.
  - [x] 🟡🌟✅1️⃣ **Critical** - Orbit/particle flow — sparse glyphs follow elliptical paths around the selected origin.
  - [x] 🟡💡✅1️⃣ **Critical** - Audio spectrum/waveform evaluation — keep audio input outside the core renderer.
        An `AnalyserNode` requires user-owned media lifecycle, permission, and cleanup;
        consumers can drive registered modes or `setCursor()` from analyser data.
  - [x] 🟡💡✅1️⃣ **Critical** - Worker renderer evaluation — defer `OffscreenCanvas`. The current cached dense
        renderer meets its frame budget, while worker transfer would complicate text
        metrics, image decoding, lifecycle events, and DOM-owned resize handling.
- [x] 🟠🌟✅1️⃣ **Critical** - **Reset settings.** Added a first-class Reset toolbar action that restores the
      documented demo defaults without deleting the user's saved preset library.
- [x] 🟠🌟✅1️⃣ **Critical** - **Local saved presets.** Users can name, save, overwrite, load, and delete
      browser-local presets from the Preset popover, with live status feedback.
- [x] 🟠🌟✅1️⃣ **Critical** - **Expanded backdrop editor.** Supports solid, linear, radial, and cubic gradients,
      1–6 color stops, angle, base color, and independent opacity.
- [x] 🟠💡✅1️⃣ **Critical** - **Toolbar quality-of-life audit.** Implemented the immediate improvements and
      retained the larger workflow enhancements below as candidates.
  - [x] 🟡🌟✅1️⃣ **Critical** - Native buttons/selects, visible focus behavior, and ARIA-synchronised state.
  - [x] 🟡🌟✅1️⃣ **Critical** - Independent, content-sized, viewport-bounded popovers per control group.
  - [x] 🟡🌟✅1️⃣ **Critical** - Live value chips expose each control's current state without opening it.
  - [x] 🟡🌟✅1️⃣ **Critical** - Visual grouping distinguishes configuration, utilities, media, and the
        primary Code action while preserving keyboard order and mobile scrolling.
  - [x] 🟡🌟✅1️⃣ **Critical** - Reworked the overflowing dock into seven primary actions. Quality, Charset,
        Align, Backdrop, Theme, history, Reset, and About now live in a grouped Advanced
        popover; narrow screens use a two-row four-column dock instead of off-screen items.
  - [x] 🟡🌟✅1️⃣ **Critical** - Mobile horizontal scrolling with full-size touch targets.
  - [x] 🟡🌟✅1️⃣ **Critical** - Code remains the final control and uses logical auto-margin on wide screens.
  - [x] 🟡🌟✅1️⃣ **Critical** - One-click reset plus local save/load/delete preset workflows.
  - [x] 🟡🌟✅1️⃣ **Critical** - Added a 50-state undo/redo history that coalesces rapid input changes, exposes
        toolbar actions, and supports Ctrl/Cmd-Z plus Ctrl/Cmd-Shift-Z.
  - [x] 🟡🌟✅1️⃣ **Critical** - Added a compact Preset status that reports the active named preset, Modified,
        or Custom state and mirrors that status in the trigger's accessible name.
  - [x] 🟡🌟✅1️⃣ **Critical** - Added WAI-ARIA toolbar roving focus with one tab stop, disabled-control
        skipping, wrapping Left/Right arrows, and Home/End navigation.
  - [x] 🟡💡✅1️⃣ **Critical** - User-defined toolbar ordering evaluation — defer until real usage data shows
        repeated ordering friction. The current fixed order preserves roving-focus,
        responsive grouping, saved-state semantics, and documentation consistency.
- [x] 🟠🌟✅1️⃣ **Critical** - **Local image workflows.** The Image popover supports bundled defaults and
      browser-local uploads without a remote image provider or server credential.

  - [x] 🟡🌟✅1️⃣ **Critical** - Expanded About with a three-step workflow, complete control/persistence
        reference, and operational notes covering sizing, lifecycle, accessibility,
        local images, storage, and cleanup.
  - [x] 🟡🌟✅1️⃣ **Critical** - Refined the About background with layered translucent gradients that retain
        live ASCII canvas visibility in dark and light themes.
  - [x] 🟡🌟✅1️⃣ **Critical** - Replaced the syntax highlighter with an escape-safe tokenizer for comments,
        properties, strings, keywords, and numbers; all code surfaces now use a
        tokenized JetBrains Mono font stack and theme-specific syntax colors.

- [x] 🟠🌟✅1️⃣ **Critical** - **README image-library documentation.** Documented included defaults, local
      uploads, supported formats, manifest generation, and the clone workflow.
- [x] 🟠🌟✅1️⃣ **Critical** - **Separate mode repeat from sequence looping.** Sequence steps now normalize an
      explicit `repeat` flag that defaults to `false`; it controls finite mode cycles
      without changing sequence-level `loop`. The web utility creates preview steps
      with repeat enabled and exposes a per-step switch. Completed non-looping
      sequences also restart from step zero instead of duplicating final completion.
- [x] 🟠🌟✅1️⃣ **Critical** - **Publish and document canonical module artifacts.** Builds now emit
      `asciiam.mjs` and `asciiam.cjs`; package import/require exports resolve to those
      format-explicit files, and Getting started documents package and direct-browser
      ESM usage. Existing ESM and UMD browser files remain available.
- [x] 🟠💡✅1️⃣ **Critical** - **Search completeness audit.** Site search now has combobox semantics, one-flight
      index loading, stale-query suppression, malformed-field tolerance, ranked
      metadata/body matches, keyboard navigation, no-result/error states, editable
      control guards, and deploy-path-safe result URLs.
- [x] 🟠🌟✅1️⃣ **Critical** - **Chrome-free documentation splash.** The documentation root omits the header
      and sidebar, uses the existing asciiam-rendered background, and retains normal
      documentation chrome on every inner page.
- [x] 🟠💡✅1️⃣ **Critical** - **Verify sequence morph transitions.** Runtime sequence steps support incoming
      snapshot `morph` transitions with duration and `linear`, `easeIn`, `easeOut`, or
      `easeInOut` easing. Reduced motion resolves morphs to cuts; start/complete events,
      cleanup, TypeScript declarations, web-utility controls, examples, documentation,
      and regression coverage are present.
- [x] 🟠🌟✅1️⃣ **Critical** - **Improve search vocabulary and match presentation.** Expanded page tags and
      keywords with concrete user vocabulary, added normalized alias matching for
      common documentation terms, safely highlighted literal title/description words,
      and rendered matching tags as bordered selected chips. Interaction tests cover
      alias retrieval, highlighting, tag selection, and single index loading.
- [x] 🟠🌟✅1️⃣ **Critical** - **Make the splash own the initial viewport.** Removed the 760 px desktop cap and
      620 px mobile floor. The splash and its absolute asciiam canvas now occupy at
      least `100svh`, so documentation content begins below the initial viewport and
      becomes visible on scroll.

- [x] 🟠🌟✅1️⃣ **Critical** - **Structural maintainability as the library grows.** Browser application logic
      now has explicit, documented ownership boundaries.
  - [x] 🟡🌟✅1️⃣ **Critical** - Extracted the web utility's inline script into a module entry point plus focused,
        independently tested sequence-data and code-formatting modules.
  - [x] 🟡💡✅1️⃣ **Critical** - Audited the docs split: shared shell/search, splash, gallery, and examples remain
        separate page-owned modules; documented the boundary instead of fragmenting it.
- [x] 🟠🌟✅1️⃣ **Critical** - **Image-aware animation sequences.** Sequence nodes can retain, clear, or load an
      image before their timed phase. Decode waits, cancellation, failures, types,
      events, tests, and docs are covered; the utility now uses a horizontal node flow.
- [x] 🟠🌟✅1️⃣ **Critical** - **Reset placement.** Reset is a direct primary-dock action outside Advanced.
- [ ] 🟠💡⏳1️⃣ **Critical** - **Reduce repetitive web-utility navigation.** Continue the toolbar workflow audit
      using real repeated authoring sessions rather than changing control order by taste.
  - [x] 🟡🌟✅1️⃣ **Critical** - Removed Reset from the nested Advanced workflow.
  - [x] 🟡🌟✅1️⃣ **Critical** - Made Documentation, About, and FPS direct, consistently sized stage actions.
  - [ ] 🟡🌟⏳1️⃣ **Critical** - Validate whether lower-frequency controls need a persistent inspector or command
        surface; preserve mobile bounds, roving focus, and current status visibility.
- [x] 🟠🌟✅1️⃣ **Critical** - **About alignment.** About shares the same action row and control height as FPS.
- [x] 🟠🌟✅1️⃣ **Critical** - **Direct documentation access.** Added Documentation immediately before About.

### **Distribution Readiness (priority-2)**

- [x] 🟠🌟✅2️⃣ **Distribution** - **Multi-instance frame scheduling.** Active renderers share one
      `requestAnimationFrame` callback while retaining independent time, visibility,
      throttling, and lifecycle state. All quality tiers are uncapped, and blank glyphs
      are rejected before Canvas state changes.

- [x] 🟠🪲✅2️⃣ **Distribution** - **Hero and splash media-slot correction.** The preview templates now place one
      movable asciiam canvas in the card/splash image region instead of displaying a
      stage-wide canvas behind overlaid content.
- [x] 🟠💡✅2️⃣ **Distribution** - **Public parameter audit.** Live quality, font-family, font-level, DPR, image-fit,
      and mode changes now rebuild or reset the renderer state they affect. Image mask
      mode and animation-range options are included in types, generated usage, saved
      demo settings, and README reference tables.
- [x] 🟠💡✅2️⃣ **Distribution** - **Animation restart and speed audit.** Mode selection restarts local timelines,
      image mask variants have regression coverage, and sparse/image animation speed is
      applied once rather than squared.
- [x] 🟠🌟✅2️⃣ **Distribution** - **Image color-range animation.** Inclusive RGB bounds are converted to a compact
      per-cell mask during image sampling; cells outside the range remain static without
      per-frame color conversion.

- [x] 🟠🌟✅2️⃣ **Distribution** - **Automated lifecycle smoke coverage.** Jest/JSDOM now exercises construction,
      animation start, observer-driven resize, and teardown with a mocked Canvas 2D
      context. The suite runs through `npm test` and in the GitLab CI test stage.
- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
- [x] 🟠🌟✅2️⃣ **Distribution** - **TypeScript definitions.** `src/asciiam.d.ts` documents the options object and
      method signatures discoverable in editors and catch misconfiguration at
      compile time for TS consumers.
- [ ] 🟠🌟⏳2️⃣ **Distribution** - **Safari-specific canvas text rendering unverified.** Font metrics and subpixel
      text positioning have known quirks in Safari; the quantized-font-level approach
      hasn't been visually checked there.
- [x] 🟠🌟✅2️⃣ **Distribution** - **Bundled distribution.** Vite now produces readable and minified UMD + ESM
      builds in `dist/asciiam/dist`, and copies browser-ready bundles to
      `public/libs` for static deployment.

### **Engineering Backlog (priority-3)**

- [x] 🟠🌟✅3️⃣ **Backlog** - **npm packaging.** Package metadata, exports, semver, type declarations, and
      build/publish scripts now identify `@staticcanvas/asciiam` rather than the
      copied library.
- [x] 🟠🌟✅3️⃣ **Backlog** - **Object URL cleanup is documented and demonstrated.** The demo revokes each
      upload URL when `setImage()` settles, and the README shows the same `finally`
      pattern for consumers.
- [x] 🟠🌟✅3️⃣ **Backlog** - **Lifecycle events.** `onReady` and the `ready`, `resize`, and `frame` events
      let consumers react to internal state without subclassing. `on()` returns an
      unsubscribe function, and all subscriptions are cleared by `destroy()`.
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

### **Deferred Concepts (priority-4)**

- WebGPU backend. WebGL2 now provides the selectable GPU path with much broader browser
  coverage, while Canvas 2D remains the compatibility and explicitly selectable CPU
  backend. A separate WebGPU implementation would currently duplicate those paths.
- Server-side rendering / static ASCII export. This is a live animation engine, not an
  ASCII-art generation tool for static output.

### **Completed UI Audit (priority-5)**

**Visual polish**

- [x] 🟠🌟✅5️⃣ **UI/Visual** - **T1 — Font loading.** Import `IBM Plex Mono` from Google Fonts so the face loads
      on systems that don't have it locally; remove system-fallback dependency.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **P1/P8 — Custom form controls.** Style `<select>` elements (chevron, focus ring)
      and range sliders (custom thumb + coloured track fill) so they match the dark
      design system instead of showing browser defaults.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **C1 — Range track fill.** Drive a CSS `--fill` custom property from `oninput` so
      the filled portion of every slider is visually distinct.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **P2/P7 — Button transitions.** Add `transition` on `mode-btn` and
      `preview-switcher button` colour/border changes; state flips were instant.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **P5 — Backdrop blur on stage overlays.** Apply `backdrop-filter: blur()` to the
      stage-label, stats, and preview-switcher so they stay legible over bright ASCII.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **P3 — Traffic-light dots.** Colour the three code-window dots red/yellow/green.
- [x] 🟠🌟✅5️⃣ **UI/Visual** - **P4 — Preview tab active indicator.** Add a sliding bottom-border indicator
      (animated via CSS `transition`) on the preview-switcher active button.

**Layout and information hierarchy**

- [x] 🟠🌟✅5️⃣ **UI/Layout** - **L1 — Control panel grouping.** Wrap logically related fields (Motion, Color,
      Image) with a visible section header so the flat `flex-wrap` grid reads as
      organised groups rather than an undifferentiated list.
- [x] 🟠🌟✅5️⃣ **UI/Layout** - **L2 — Image browser max-height.** Cap the image browser with vertical overflow
      so a large local asset library does not create an infinitely tall slab.
- [x] 🟠🌟✅5️⃣ **UI/Layout** - **L3 — Usage code card frame.** Give `.note` a card treatment (border + slight
      panel background) matching the rest of the design system.

**Controls UX**

- [x] 🟠🌟✅5️⃣ **UI/Controls** - **C3 — Custom toggle switches.** Replace bare `<input type="checkbox">` with a
      CSS-only pill toggle for the cursor-glow and FPS-stats toggles.
- [x] 🟠🌟✅5️⃣ **UI/Controls** - **F3 — Copy button checkmark.** On clipboard success flash the copy-btn green
      with a `✓` character, then fade back to default.

**Accessibility**

- [x] 🟠🌟✅5️⃣ **Accessibility** - **A1 — `aria-valuetext` on range inputs.** Add humanised value strings
      (e.g. "Speed 1.0") so screen readers announce meaningful units.
- [x] 🟠🌟✅5️⃣ **Accessibility** - **A2 — Visible colour-input labels.** Add short visible text labels ("Colour",
      "Gradient stops", etc.) next to the colour pickers.

**Popover controls and image extensions (2026-08-11)**

- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Floating Control Bar & Button-Anchored Popovers.** Replaced static bottom panel with a floating toolbar
      docked to the canvas stage using native HTML `popover` menus expanding directly upwards from their trigger button
      with a 200ms GPU-accelerated spring transition (`translateY(12px) scale(0.96)`) so controls pop up right from the button without scrolling away.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Exclusive Code Popover & Duplicate Cleanup.** Removed the duplicate `<div class="code-window">` from the bottom page section
      so the interactive, copyable JS snippet is exclusively accessed from the toolbar `<> Code` popover menu.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Hero Title Cleanup.** Removed the static `Animated ASCII /// any surface` headline overlay from the hero stage per feedback.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Full Viewport Stage Height.** Set `.stage` height to `100dvh` so the ASCII canvas animation
      spans the entire viewport on initial load while keeping the usage section & footer accessible via scrolling.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **UIverse Glassmorphic Pill Buttons.** Styled toolbar triggers (`.ctrl-pill`) with dark glassmorphic backgrounds,
      subtle inner highlights, glowing hover effects, and spring press feedback inspired by UIverse.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Lucide Icon Integration.** Embedded clean, inline Lucide SVG icons for all toolbar pill triggers
      (Sliders, Charset, Motion, Color, Code, Image).
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Code Block Toolbar Popover.** Added a dedicated `Code` popover button and panel (`#pop-code`) to the toolbar
      allowing instant copy/paste access to the live code configuration directly over the hero preview.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Dynamic Multi-Stop Gradient Swatches.** When selecting 1–6 gradient steps in the Color popover panel,
      the UI dynamically renders matching color picker swatches (`#gradStop_0`..`#gradStop_N`), automatically feeding all stop colors to `anim.setOption("gradient", ...)`.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Dark Mode Color Input Styling.** Custom-styled `<input type="color">` elements with dark glassmorphic backgrounds,
      glow hover effects, and rounded swatches matching the dark mode design system.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Light Mode Support & Theme Toggle.** Added a dedicated `Theme` toggle button to the toolbar with full `[data-theme="light"]` token overrides,
      adapting text contrast, popover surfaces, and control buttons while storing the theme preference in `localStorage`.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Full-Screen About Overlay & Translucent Canvas Bleed-Through (`fluent-ui-v1`).** Expanded `#pop-about` into a full-screen, glassmorphic overlay (`.ctrl-popover--fullscreen`) with `0.72` background opacity and `12px` backdrop blur, allowing the active ASCII animation underneath to bleed through with a subtle shimmer effect. Includes a sticky header bar, interactive `npm install @staticcanvas/asciiam` command box, and a detailed 6-section technical feature breakdown (Rendering Math, Photographic Sampling, Multi-Stop Gradients, Motion Dynamics, Power Optimization, and ESM/UMD API). Automatically launches on first visit (`localStorage.getItem("asciiam:visited")`) and re-opens anytime via the `About` toolbar pill button.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Main Content Cleanup.** Removed the legacy static `.note` text block below the stage so the full viewport canvas hero stage remains clean and unobstructed.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Vertical Hero Card with Live Mask Reveal.** Redesigned `data-preview-scene="hero-card"` to a high-contrast vertical Midnight glass card with a glowing radial ASCII mask reveal on hover and official **GitHub** & **GitLab** repository buttons.
- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Spatial Alignment & Focal Points Stage.** Added `align` (`center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`) spatial origin support in `src/asciiam.js` and added an interactive **Spatial Alignment** scene switcher to preview origin shifts live.

- [x] 🟠🌟✅5️⃣ **UI/Popover** - **Backdrop Layer with Color, Opacity & Gradient Control.** Added `backdrop` option in `src/asciiam.js` with synchronized range and exact numeric opacity controls (0.00–1.00 at 0.01 precision), solid color picker, and linear/radial gradient controls integrated into the Backdrop popover.

If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
