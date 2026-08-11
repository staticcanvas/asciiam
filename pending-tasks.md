# Pending tasks

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

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

- [x] **Backdrop Layer with Color, Opacity & Gradient Control.** Added `backdrop` option in `src/asciiam.js` with full opacity slider (0–1.0), solid color picker, and linear/radial gradient controls integrated into the Color popover panel (`#pop-color`).

If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
