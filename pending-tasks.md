# Pending tasks

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

## CRITICAL TASKS

- [x] **About access and export guidance.** Moved About into the stage information
      area before the FPS switch, added Ctrl/Cmd+A access outside editable fields,
      and documented every package/browser export in the overlay and README.
- [x] **Code control placement and live output.** Code is the final toolbar control,
      uses logical auto-margin to stay on the right edge, and reflects live control changes.
- [x] **FPS switch.** A compact native checkbox switch is positioned at the top-right
      of the stage and controls the FPS overlay.
- [x] **Separate Preset, Quality, and Mode controls.** Each toolbar trigger now owns
      an independent popover.
- [x] **Complete character presets.** Added all 95 printable ASCII characters and a
      190-character ASCII plus extended Latin-1 set.
- [x] **Custom character sets.** The Charset popover accepts up to 512 characters,
      validates at least two distinct characters, and applies valid input live.
- [x] **Independent Backdrop control.** Backdrop enablement, opacity, solid color,
      gradient type, and gradient stops now use a dedicated toolbar popover.
- [x] **Toolbar spatial alignment.** Alignment is available in the toolbar and now
      changes current, ripple, fade-in, and radial image calculations.
- [x] **Content-sized popovers.** Popovers use intrinsic width with viewport bounds;
      vertical scrolling appears only when content exceeds the available stage height.
- [x] **Renderer performance recovery.** Static noise, spatial distance, trigonometric
      fields, and backdrop gradients are cached. A 19,224-cell mocked Canvas benchmark
      reduced current-mode JavaScript frame time from 1.94 ms to 0.92 ms (52.4%).
- [x] **Persist demo settings.** Versioned local storage restores supported animation,
      appearance, performance, and toolbar settings across sessions. Uploaded image
      object URLs are intentionally excluded because they do not survive a page load.
- [x] **Hero cards.** Added three switchable, responsive variants with shared content
      and repository actions. Variant state is exposed through native buttons and
      `aria-pressed`, while hover/focus interactions retain the live mask treatment.
  - [x] Vertical — focused single-column product card.
  - [x] Split — copy and repository actions in separate columns, collapsing on mobile.
  - [x] Terminal — compact green-screen treatment for developer-focused contexts.
- [x] **Header preview scope.** Removed Spatial Alignment from the top preview switcher;
      alignment remains available in the toolbar where it belongs.
- [x] **Hero and splash previews.** The top switcher now cleanly previews Background,
      Hero card, and Splash page surfaces.
- [x] **Fade-out mode.** Added the inverse `fadeOut` engine mode, an `outroFade`
      preset, demo control, TypeScript mode, and regression coverage.
- [x] **Directional reveal animation.** `fadeIn` and `fadeOut` now reveal left to
      right, right to left, or outward from the center. The Motion popover exposes
      this control only for reveal modes, and presets retain their intended direction.
- [x] **Code popover sizing.** Increased its usable vertical size and internal code
      padding while bounding it below the FPS region and viewport edges.
- [x] **Mobile UI.** Added narrow-screen scene spacing, horizontally scrollable toolbar
      controls, 44px touch targets, viewport-bounded popovers, stacked hero actions,
      and mobile code sizing.
- [x] **Robust character presets.** ASCII + extended Latin-1 is now the default for
      text and image rendering. Added alphanumeric, case-specific, symbol, box-drawing,
      arrow, and mathematical presets alongside the existing specialist sets.
- [x] **Animation mode inventory.** The current engine and practical next modes are
      recorded here for implementation planning.
  - [x] Supported — `wave`, `current`, `ripple`, `vortex`, `plasma`, `fadeIn`, `fadeOut`, `matrix`,
        `snow`, `sparkle`, `image`, and registered/custom cell modes.
  - [x] Vortex/swirl — a cached three-arm radial flow rotates around the selected
        spatial origin without trigonometry in the dense per-cell loop.
  - [x] Plasma/noise field — three cached low-frequency fields blend into organic
        motion with only six trigonometric calculations per frame.
  - [ ] Fire/embers — bottom-origin heat ramp plus sparse rising particles.
  - [ ] Starfield/tunnel — depth-scaled sparse particles around the selected origin.
  - [ ] Glitch/scramble — timed character displacement and scan-band corruption.
  - [ ] Typewriter/reveal — deterministic line or word sequencing.
  - [ ] Orbit/particle flow — sparse glyph paths around one or more focal points.
  - [ ] Audio spectrum/waveform — opt-in `AnalyserNode` input; requires an explicit
        media source or microphone permission and should remain outside core defaults.
  - [ ] Worker renderer — evaluate `OffscreenCanvas` only if future dense modes show
        main-thread pressure; current cached Canvas 2D modes do not require it.
- [x] **Reset settings.** Added a first-class Reset toolbar action that restores the
      documented demo defaults without deleting the user's saved preset library.
- [x] **Local saved presets.** Users can name, save, overwrite, load, and delete
      browser-local presets from the Preset popover, with live status feedback.
- [x] **Expanded backdrop editor.** Supports solid, linear, radial, and cubic gradients,
      1–6 color stops, angle, base color, and independent opacity.
- [x] **Toolbar quality-of-life audit.** Implemented the immediate improvements and
      retained the larger workflow enhancements below as candidates.
  - [x] Native buttons/selects, visible focus behavior, and ARIA-synchronised state.
  - [x] Independent, content-sized, viewport-bounded popovers per control group.
  - [x] Live value chips expose each control's current state without opening it.
  - [x] Visual grouping distinguishes configuration, utilities, media, and the
        primary Code action while preserving keyboard order and mobile scrolling.
  - [x] Reworked the overflowing dock into seven primary actions. Quality, Charset,
        Align, Backdrop, Theme, history, Reset, and About now live in a grouped More
        popover; narrow screens use a two-row four-column dock instead of off-screen items.
  - [x] Mobile horizontal scrolling with full-size touch targets.
  - [x] Code remains the final control and uses logical auto-margin on wide screens.
  - [x] One-click reset plus local save/load/delete preset workflows.
  - [x] Added a 50-state undo/redo history that coalesces rapid input changes, exposes
        toolbar actions, and supports Ctrl/Cmd-Z plus Ctrl/Cmd-Shift-Z.
  - [x] Added a compact Preset status that reports the active named preset, Modified,
        or Custom state and mirrors that status in the trigger's accessible name.
  - [x] Added WAI-ARIA toolbar roving focus with one tab stop, disabled-control
        skipping, wrapping Left/Right arrows, and Home/End navigation.
  - [ ] Evaluate user-defined toolbar ordering only after real usage data exists.
- [x] **Cloudflare Workers / Unsplash integration.** A Cloudflare Pages Function keeps
      the access key server-side while the Image popover supports search, view,
      download, and apply workflows.

  - [x] Search results expose only required public metadata and retain the returned
        regular/full image URLs and exact `download_location` value.
  - [x] View and image rendering hotlink `photo.urls` directly; no image bytes are
        proxied, downloaded, cached, or re-hosted by the Function.
  - [x] Download and Apply asynchronously track the exact Unsplash
        `photo.links.download_location`, including its query parameters.
  - [x] The tracking proxy uses POST and accepts only validated HTTPS
        `api.unsplash.com/photos/:id/download` locations.
  - [x] Every result visibly attributes and links to the photographer and Unsplash.
  - [x] Expanded About with a three-step workflow, complete control/persistence
        reference, and operational notes covering sizing, lifecycle, accessibility,
        images, CORS, Unsplash, local storage, and cleanup.
  - [x] Refined the About background with layered translucent gradients that retain
        live ASCII canvas visibility in dark and light themes.
  - [x] Replaced the syntax highlighter with an escape-safe tokenizer for comments,
        properties, strings, keywords, and numbers; all code surfaces now use a
        tokenized JetBrains Mono font stack and theme-specific syntax colors.

- [x] **README Unsplash documentation.** Added deployment configuration, operation
      behavior, hotlinking/download-tracking requirements, endpoint validation, and
      the requested Markus Winkler photo attribution.

## Should do before wider distribution

- [x] **Automated lifecycle smoke coverage.** Jest/JSDOM now exercises construction,
      animation start, observer-driven resize, and teardown with a mocked Canvas 2D
      context. The suite runs through `npm test` and in the GitLab CI test stage.
- [ ] **Real-browser verification.** Run a manual visual pass in current
      Chrome/Firefox/Safari; DOM emulation verifies lifecycle behavior but cannot
      validate browser canvas rasterization or font metrics.
- [x] **TypeScript definitions.** `src/asciiam.d.ts` documents the options object and
      method signatures discoverable in editors and catch misconfiguration at
      compile time for TS consumers.
- [ ] **Safari-specific canvas text rendering unverified.** Font metrics and subpixel
      text positioning have known quirks in Safari; the quantized-font-level approach
      hasn't been visually checked there.
- [x] **Bundled distribution.** Vite now produces readable and minified UMD + ESM
      builds in `dist/asciiam/dist`, and copies browser-ready bundles to
      `public/libs` for static deployment.

## Worth doing, lower urgency

- [x] **npm packaging.** Package metadata, exports, semver, type declarations, and
      build/publish scripts now identify `@staticcanvas/asciiam` rather than the
      copied library.
- [x] **Object URL cleanup is documented and demonstrated.** The demo revokes each
      upload URL when `setImage()` settles, and the README shows the same `finally`
      pattern for consumers.
- [x] **Lifecycle events.** `onReady` and the `ready`, `resize`, and `frame` events
      let consumers react to internal state without subclassing. `on()` returns an
      unsubscribe function, and all subscriptions are cleared by `destroy()`.
- [ ] **`fadeIn` and `image` modes don't expose fine-grained timing controls** (sweep
      duration, per-character delay curve) — currently hardcoded constants
      (`totalDuration = 2.2`, etc.). Fine for the presets, limiting if someone wants a
      slower/faster intro without digging into source.
- [ ] **No built-in way to composite multiple modes** (e.g. `current` texture plus a
      `wave` sweep on top). Currently one mode at a time; layering would mean running
      two instances on stacked canvases, which works but isn't documented as a
      pattern.
- [ ] **Matrix mode column state doesn't survive a `setOption('density', …)` change**
      cleanly mid-run — it reinitializes via `_resize()`, so an in-progress rain
      column resets rather than continuing at the new density. Minor visual hitch,
      not a bug.

## Explicitly out of scope for now

- WebGL/WebGPU rendering path. Canvas 2D is comfortably fast enough at the densities
  this is meant for (background decoration, not full-viewport high-density art); a
  GPU path would only make sense if someone wants far higher character counts than a
  background effect realistically needs.
- Server-side rendering / static ASCII export. This is a live animation engine, not an
  ASCII-art generation tool for static output.

## UI / Demo page improvements (audit 2026-08-11)

### Visual polish

- [x] **T1 — Font loading.** Import `IBM Plex Mono` from Google Fonts so the face loads
      on systems that don't have it locally; remove system-fallback dependency.
- [x] **P1/P8 — Custom form controls.** Style `<select>` elements (chevron, focus ring)
      and range sliders (custom thumb + coloured track fill) so they match the dark
      design system instead of showing browser defaults.
- [x] **C1 — Range track fill.** Drive a CSS `--fill` custom property from `oninput` so
      the filled portion of every slider is visually distinct.
- [x] **P2/P7 — Button transitions.** Add `transition` on `mode-btn` and
      `preview-switcher button` colour/border changes; state flips were instant.
- [x] **P5 — Backdrop blur on stage overlays.** Apply `backdrop-filter: blur()` to the
      stage-label, stats, and preview-switcher so they stay legible over bright ASCII.
- [x] **P3 — Traffic-light dots.** Colour the three code-window dots red/yellow/green.
- [x] **P4 — Preview tab active indicator.** Add a sliding bottom-border indicator
      (animated via CSS `transition`) on the preview-switcher active button.

### Layout / information hierarchy

- [x] **L1 — Control panel grouping.** Wrap logically related fields (Motion, Color,
      Image) with a visible section header so the flat `flex-wrap` grid reads as
      organised groups rather than an undifferentiated list.
- [x] **L2 — Image browser max-height.** Cap `.field-wide` (image browser) at
      `max-height: 340px` with `overflow-y: auto` so Unsplash result sets don't create
      an infinitely tall slab.
- [x] **L3 — Usage code card frame.** Give `.note` a card treatment (border + slight
      panel background) matching the rest of the design system.

### Controls UX

- [x] **C3 — Custom toggle switches.** Replace bare `<input type="checkbox">` with a
      CSS-only pill toggle for the cursor-glow and FPS-stats toggles.
- [x] **F3 — Copy button checkmark.** On clipboard success flash the copy-btn green
      with a `✓` character, then fade back to default.

### Accessibility

- [x] **A1 — `aria-valuetext` on range inputs.** Add humanised value strings
      (e.g. "Speed 1.0") so screen readers announce meaningful units.
- [x] **A2 — Visible colour-input labels.** Add short visible text labels ("Colour",
      "Gradient stops", etc.) next to the colour pickers.

### Popover Controls & Image Extensions (2026-08-11)

- [x] **Floating Control Bar & Button-Anchored Popovers.** Replaced static bottom panel with a floating toolbar
      docked to the canvas stage using native HTML `popover` menus expanding directly upwards from their trigger button
      with a 200ms GPU-accelerated spring transition (`translateY(12px) scale(0.96)`) so controls pop up right from the button without scrolling away.
- [x] **Exclusive Code Popover & Duplicate Cleanup.** Removed the duplicate `<div class="code-window">` from the bottom page section
      so the interactive, copyable JS snippet is exclusively accessed from the toolbar `<> Code` popover menu.
- [x] **Hero Title Cleanup.** Removed the static `Animated ASCII /// any surface` headline overlay from the hero stage per feedback.
- [x] **Full Viewport Stage Height.** Set `.stage` height to `100dvh` so the ASCII canvas animation
      spans the entire viewport on initial load while keeping the usage section & footer accessible via scrolling.
- [x] **UIverse Glassmorphic Pill Buttons.** Styled toolbar triggers (`.ctrl-pill`) with dark glassmorphic backgrounds,
      subtle inner highlights, glowing hover effects, and spring press feedback inspired by UIverse.
- [x] **Lucide Icon Integration.** Embedded clean, inline Lucide SVG icons for all toolbar pill triggers
      (Sliders, Charset, Motion, Color, Code, Image).
- [x] **Code Block Toolbar Popover.** Added a dedicated `Code` popover button and panel (`#pop-code`) to the toolbar
      allowing instant copy/paste access to the live code configuration directly over the hero preview.
- [x] **Dynamic Multi-Stop Gradient Swatches.** When selecting 1–6 gradient steps in the Color popover panel,
      the UI dynamically renders matching color picker swatches (`#gradStop_0`..`#gradStop_N`), automatically feeding all stop colors to `anim.setOption("gradient", ...)`.
- [x] **Dark Mode Color Input Styling.** Custom-styled `<input type="color">` elements with dark glassmorphic backgrounds,
      glow hover effects, and rounded swatches matching the dark mode design system.
- [x] **Light Mode Support & Theme Toggle.** Added a dedicated `Theme` toggle button to the toolbar with full `[data-theme="light"]` token overrides,
      adapting text contrast, popover surfaces, and control buttons while storing the theme preference in `localStorage`.
- [x] **Full-Screen About Overlay & Translucent Canvas Bleed-Through (`fluent-ui-v1`).** Expanded `#pop-about` into a full-screen, glassmorphic overlay (`.ctrl-popover--fullscreen`) with `0.72` background opacity and `12px` backdrop blur, allowing the active ASCII animation underneath to bleed through with a subtle shimmer effect. Includes a sticky header bar, interactive `npm install @staticcanvas/asciiam` command box, and a detailed 6-section technical feature breakdown (Rendering Math, Photographic Sampling, Multi-Stop Gradients, Motion Dynamics, Power Optimization, and ESM/UMD API). Automatically launches on first visit (`localStorage.getItem("asciiam:visited")`) and re-opens anytime via the `About` toolbar pill button.
- [x] **Main Content Cleanup.** Removed the legacy static `.note` text block below the stage so the full viewport canvas hero stage remains clean and unobstructed.
- [x] **Vertical Hero Card with Live Mask Reveal.** Redesigned `data-preview-scene="hero-card"` to a high-contrast vertical Midnight glass card with a glowing radial ASCII mask reveal on hover and official **GitHub** & **GitLab** repository buttons.
- [x] **Spatial Alignment & Focal Points Stage.** Added `align` (`center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`) spatial origin support in `src/asciiam.js` and added an interactive **Spatial Alignment** scene switcher to preview origin shifts live.

- [x] **Backdrop Layer with Color, Opacity & Gradient Control.** Added `backdrop` option in `src/asciiam.js` with synchronized range and exact numeric opacity controls (0.00–1.00 at 0.01 precision), solid color picker, and linear/radial gradient controls integrated into the Backdrop popover.

If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
