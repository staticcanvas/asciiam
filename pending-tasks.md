# Pending tasks

Honest gap list. Nothing here is required for the tool to work — it runs and degrades
safely — but these are the things standing between "solid prototype" and "ship to
strangers with confidence."

## Should do before wider distribution

- [ ] **No automated tests.** Everything so far has been verified by static syntax
      checking and code review, not by running in real browsers. At minimum needs:
      a headless-browser smoke test (construct, start, resize, destroy without
      throwing) and a manual pass in Chrome/Firefox/Safari.
- [x] **TypeScript definitions.** `src/asciiam.d.ts` documents the options object and
      method signatures discoverable in editors and catch misconfiguration at
      compile time for TS consumers.
- [ ] **Safari-specific canvas text rendering unverified.** Font metrics and subpixel
      text positioning have known quirks in Safari; the quantized-font-level approach
      hasn't been visually checked there.
- [x] **Bundled distribution.** Vite now produces readable and minified UMD + ESM
      builds in `dist/asciiam/dist`, and copies browser-ready bundles to
      `webutil/libs` for static deployment.

## Worth doing, lower urgency

- [x] **npm packaging.** Package metadata, exports, semver, type declarations, and
      build/publish scripts now identify `@staticcanvas/asciiam` rather than the
      copied library.
- [ ] **Object URLs from user-uploaded images aren't revoked automatically** (see the
      demo's file input handler). Not a leak in the library itself, but worth adding
      an example of proper `URL.revokeObjectURL()` cleanup in the docs, or exposing a
      hook so consumers can clean up after `setImage()` resolves.
- [ ] **No `onReady` / lifecycle events beyond `setImage()`'s promise.** Might be
      worth a small event system (`anim.on('resize', ...)`, `anim.on('frame', ...)`)
      for consumers who want to react to internal state without subclassing.
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

## How to help this list shrink

If you hit a real bug in production use (as opposed to the theoretical gaps above),
that's higher priority than anything on this list — flag it and it jumps the queue.
