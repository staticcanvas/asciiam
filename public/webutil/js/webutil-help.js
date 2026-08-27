/**
 * @file webutil-help.js
 * @description Per-control help content for the Web Utility playground. Every entry here
 * drives two independent Lume tooltips: a quick, always-on `tip` bound to the control's own
 * label (minimal tier — one fact, no hover-icon needed), and an optional `detail` bound to a
 * small persistent "i" badge injected next to the label (advanced tier — structured LIRL
 * content for anything genuinely non-obvious: units, ranges, gotchas, or interaction with
 * other options). A control with only a `tip` gets no badge; badges only appear where the
 * quick tip alone wouldn't be enough.
 * @module webutil-help
 */

/**
 * @typedef {Object} FieldHelp
 * @property {string} tip - short, single-fact tooltip bound to the control's label (minimal tier)
 * @property {string} [title] - header shown in the detailed tooltip; defaults to the label's own text
 * @property {string} [detail] - structured LIRL content for the advanced-tier badge tooltip; omit for controls where the quick tip is the whole story
 */

/** @type {Record<string, FieldHelp>} */
export const optionHelp = {
    preset: {
        tip: "Loads a complete built-in configuration in one step.",
        detail: "{p}Applies every option a preset sets, replacing your current configuration. Options a preset does {b}not{/b} mention are left untouched.{/p}{p}Picking {c}Custom{/c} does not reset anything — it just clears the dropdown's own selection so further edits stop being attributed to a preset name.{/p}",
    },
    savedPresetList: {
        tip: "Your own saved configurations, stored in this browser only.",
        detail: "{p}Saved presets live in {c}localStorage{/c} on this device and browser profile. They are {b}not{/b} synced, exported, or backed up automatically — use {c}Copy configuration{/c} or the Code panel if you need a portable copy.{/p}",
    },
    quality: {
        tip: "Coarse performance/fidelity tier — sets density, DPR cap, font levels, and atlas caching together.",
        title: "Render quality",
        detail: "{p}Each tier bundles several lower-level settings ({c}density{/c}, {c}maxDPR{/c}, {c}fontLevels{/c}, {c}alphaLevels{/c}, glyph-atlas caching) so they move together.{/p}{row}{label}Fastest{/label}{value}Ultra{/value}{/row}{row}{label}Slowest{/label}{value}High{/value}{/row}{foot}Counter-intuitively, {b}Ultra{/b} is the cheapest tier to render, not the most demanding — it trades resolution and shading levels for aggressive atlas and static-wave caching.{/foot}",
    },
    resolutionScale: {
        tip: "Scales the logical character grid independently of quality — lower values mean fewer, larger cells.",
        title: "Grid resolution",
        detail: "{p}Multiplies the computed columns/rows. {b}100%{/b} uses the size quality would pick on its own; {b}50%{/b} halves it (fewer, larger characters, cheaper to draw); {b}200%{/b} doubles it (more, smaller characters, more expensive).{/p}{foot}Clamped to {c}0.5{/c}–{c}2{/c}. This is the lever {b}Auto-adjust for 60fps{/b} steps first, before touching render quality.{/foot}",
    },
    autoQualityToggle: {
        tip: "Automatically eases grid resolution, then render quality, down under sustained frame-time pressure and back up under headroom.",
    },
    renderer: {
        tip: "Selects the presentation backend, or lets the browser pick the best one available.",
        title: "Rendering backend",
        detail: "{p}{b}Auto{/b} tries WebGPU first, falls back to WebGL2, then Canvas 2D — whichever the browser actually supports. WebGPU device creation is asynchronous; the canvas stays on its prior backend until it's ready.{/p}{foot}Forcing {c}WebGPU{/c} or {c}WebGL2{/c} explicitly skips the fallback chain entirely on a browser that can't provide it, rather than silently downgrading.{/foot}",
    },
    targetFPS: {
        tip: "Caps the animation's own frame rate independently of the display's refresh rate.",
        detail: "{p}{c}Auto{/c} (0) lets the browser's normal animation-frame cadence drive it — typically the display's refresh rate. A numeric cap throttles the internal clock even on a faster display, useful for battery life or deliberately slower motion.{/p}",
    },
    charSet: {
        tip: "The ramp of characters cells are drawn from, ordered light-to-dark or by density.",
        title: "Character set",
        detail: "{p}Most modes map a per-cell brightness or intensity value to a position along this ramp — the first character is the sparsest/dimmest, the last is the densest/brightest.{/p}{foot}An empty custom set falls back to the default ramp automatically rather than rendering blank cells.{/foot}",
    },
    customCharSet: {
        tip: "Type your own character ramp instead of picking a built-in one, ordered sparsest to densest.",
    },
    speed: {
        tip: "Playback-rate multiplier for the active mode's internal clock.",
        detail: "{p}Multiplies the per-frame time delta before it reaches the active mode. {b}1{/b} is normal speed, {b}0{/b} freezes motion entirely, and negative values reverse direction for modes that read it symmetrically.{/p}{foot}Does not change the frame rate itself — see {b}Frame-rate cap{/b} for that.{/foot}",
    },
    trail: {
        tip: "Afterglow strength: how much of the previous frame is preserved instead of cleared.",
        title: "Trail persistence",
        detail: "{p}At {b}0{/b}, every frame fully clears to the background before drawing — the classic look. Above {b}0{/b}, each frame instead composites a low-alpha layer of {b}Trail color{/b} over the last one, letting motion streak and fade rather than cut cleanly.{/p}{foot}Higher values fade out more slowly; the effect converges to a solid trail-color wash within a handful of frames regardless of the exact value.{/foot}",
    },
    trailColor: {
        tip: "The color composited over each frame when trail persistence is above 0.",
    },
    pulse: {
        tip: "Adds a slow global opacity breathing effect on top of the active mode.",
        detail: "{p}Modulates every cell's opacity together with a sine wave — independent of whatever the mode itself is already doing per-cell.{/p}{foot}{b}0{/b} disables the effect entirely rather than pulsing at zero amplitude.{/foot}",
    },
    edgeFade: {
        tip: "Vignette strength: fades cell opacity toward the canvas edges.",
        detail: "{p}{b}0{/b} disables the vignette; higher values fade a wider band from each edge toward transparent.{/p}",
    },
    backdropEnable: {
        tip: "Draws a solid or gradient surface behind (or over) the animation, independent of the active mode's own background.",
    },
    backdropColor: {
        tip: "Base color of the backdrop surface, before any gradient is applied.",
    },
    backdropOpacity: {
        tip: "Backdrop surface opacity, from fully transparent to fully opaque.",
    },
    backdropPlacement: {
        tip: "Whether the backdrop draws behind the animation or composited over it.",
        detail: "{p}{b}Behind{/b} draws first, so the animation's own transparent cells show it through. {b}Over{/b} draws last, tinting or obscuring the animation underneath — useful for a scrim/overlay look.{/p}",
    },
    backdropGradType: {
        tip: "Gradient shape for the backdrop surface: linear, radial, or cubic multi-stop blend.",
    },
    backdropAngle: {
        tip: "Rotation of a linear or cubic backdrop gradient, in degrees.",
    },
    interactionRadius: {
        tip: "How far from the pointer/click point the hover or click-zone effect reaches, in pixels.",
    },
    interactionDuration: {
        tip: "How long a triggered click-zone pulse lasts, in seconds, before fading out.",
    },
    revealDirection: {
        tip: "The direction a reveal-style mode (fade, dissolve, iris, assemble) sweeps from.",
    },
    sweepDuration: {
        tip: "How long a directional reveal sweep takes to cross the whole grid, in seconds.",
    },
    delayCurve: {
        tip: "Timing curve applied across cells during a staggered reveal sweep.",
        detail: "{p}Controls how the per-cell delay is distributed across the sweep, not the sweep's total duration ({b}Sweep duration{/b} controls that). {c}Linear{/c} spreads delay evenly; the eased curves bunch more cells toward the start or end of the sweep.{/p}",
    },
    colorMode: {
        tip: "Whether cell color comes from a solid color, a gradient, or the sampled image.",
    },
    imageInput: {
        tip: "Upload a local image or paste a URL to sample it into the ASCII grid.",
    },
    imageScale: {
        tip: "Overall zoom applied to the sampled image before it's mapped onto the grid.",
    },
    imageScaleX: {
        tip: "Independent horizontal stretch applied to the sampled image, on top of the overall scale.",
    },
    imageScaleY: {
        tip: "Independent vertical stretch applied to the sampled image, on top of the overall scale.",
    },
    imageFov: {
        tip: "Field-of-view zoom for the sampled image — higher values pull the crop in tighter.",
    },
    imageRotation: {
        tip: "Rotates the sampled image before it's mapped onto the grid, in degrees.",
    },
    imageFlipXToggle: {
        tip: "Mirrors the sampled image horizontally before mapping it onto the grid.",
    },
    imageFlipYToggle: {
        tip: "Mirrors the sampled image vertically before mapping it onto the grid.",
    },
    imageBrightness: {
        tip: "Brightness adjustment applied to sampled image colors before mapping to characters.",
    },
    imageContrast: {
        tip: "Contrast adjustment applied to sampled image colors before mapping to characters.",
    },
    imageLuminance: {
        tip: "How light/dark source pixels map to character density — normal, inverted, or auto-detected.",
        detail: "{p}{c}Auto{/c} inspects the sampled image for a mostly-transparent background with bright foreground content (typical of a silhouette/logo PNG or SVG) and inverts automatically so the subject reads as dense rather than sparse. {c}Normal{/c} and {c}Invert{/c} override that detection explicitly.{/p}",
    },
    colorFromImageToggle: {
        tip: "Colors each cell from the sampled image's own pixel color instead of the solid/gradient color.",
    },
    animateImageFramesToggle: {
        tip: "Plays through an animated GIF's captured frames instead of showing only the first one.",
    },
    imageFrameRate: {
        tip: "Playback rate for captured animated-image frames, in frames per second.",
    },
    imageColorRangeToggle: {
        tip: "Restricts image-driven animation to only the pixels within a chosen color range.",
    },
    imageColorRangeMin: {
        tip: "Lower bound color of the animation mask range.",
    },
    imageColorRangeMax: {
        tip: "Upper bound color of the animation mask range.",
    },
    animateImageMaskToggle: {
        tip: "Sweeps a reveal animation across the image mask instead of showing it statically (legacy image mode only).",
    },
    modelInput: {
        tip: "Upload a self-contained .glb file to render as a 3D ASCII mesh.",
    },
    modelUrl: {
        tip: "Load a remote .gltf or .glb model by URL instead of uploading a file.",
    },
    meshPrimitive: {
        tip: "Built-in procedural 3D shape to render, if no uploaded/remote model is set.",
    },
    meshStyle: {
        tip: "How mesh surfaces are rasterized into characters: shaded, wireframe, or point cloud.",
    },
    meshScale: {
        tip: "Overall size of the rendered mesh within the grid.",
    },
    meshScaleX: {
        tip: "Independent X-axis stretch applied to the mesh, on top of the overall scale.",
    },
    meshScaleY: {
        tip: "Independent Y-axis stretch applied to the mesh, on top of the overall scale.",
    },
    meshScaleZ: {
        tip: "Independent Z-axis stretch applied to the mesh, on top of the overall scale.",
    },
    meshFov: {
        tip: "Camera field of view used for the mesh's perspective projection.",
    },
    meshAutoRotateToggle: {
        tip: "Continuously rotates the mesh using the per-axis rotation speeds below.",
    },
    meshRotationX: {
        tip: "Static rotation offset around the X axis, in degrees.",
    },
    meshRotationY: {
        tip: "Static rotation offset around the Y axis, in degrees.",
    },
    meshRotationZ: {
        tip: "Static rotation offset around the Z axis, in degrees.",
    },
    meshRotationSpeedX: {
        tip: "Auto-rotation speed around the X axis, in degrees per second.",
    },
    meshRotationSpeedY: {
        tip: "Auto-rotation speed around the Y axis, in degrees per second.",
    },
    meshRotationSpeedZ: {
        tip: "Auto-rotation speed around the Z axis, in degrees per second.",
    },
    chartData: {
        tip: "The values chart mode plots — comma-separated numbers, or richer JSON with labels and colors.",
    },
    chartLabels: {
        tip: "Optional per-value labels shown as the chart's legend.",
    },
    chartType: {
        tip: "Chart layout: vertical/horizontal bars, line, sparkline, heatmap, or donut.",
    },
    chartTitle: {
        tip: "Optional header text rendered above the chart.",
    },
    chartScaleMin: {
        tip: "Explicit Y-axis minimum; leave blank to auto-scale from the data.",
    },
    chartScaleMax: {
        tip: "Explicit Y-axis maximum; leave blank to auto-scale from the data's highest value.",
    },
    chartColors: {
        tip: "Space-separated colors, cycled across bars/segments/series in order.",
    },
    chartShowAxesToggle: {
        tip: "Shows axis guides and scale labels in the left gutter.",
    },
    chartShowLegendToggle: {
        tip: "Shows per-series legend labels alongside the chart.",
    },
    chartShowValuesToggle: {
        tip: "Shows the explicit numeric value on top of each bar, point, or segment.",
    },
    chartAnimateItemsToggle: {
        tip: "Staggers each bar/segment/point in on entry instead of showing the chart fully formed immediately.",
    },
    chartEnabledToggle: {
        tip: "Shows the configured chart — data is kept even while this is off.",
    },
    imageEnabledToggle: {
        tip: "Shows the loaded image — the image stays loaded and ready even while this is off.",
    },
    meshEnabledToggle: {
        tip: "Shows the configured mesh — stays loaded and ready even while this is off.",
    },
    cursorToggle: {
        tip: "Boosts cell opacity near the pointer, independent of the active mode.",
    },
    statsToggle: {
        tip: "Shows a live FPS/frame-time readout over the canvas.",
    },
    extendedStatsToggle: {
        tip: "Adds display-refresh-rate sampling and per-frame CPU work timing to the stats readout.",
        detail: "{p}Costs one extra {c}performance.now(){/c} pair per frame to measure — negligible, but skipped entirely unless this or {b}Auto-adjust for 60fps{/b} is on, since both need the same measurement.{/p}",
    },
    sequenceLoopToggle: {
        tip: "Restarts the sequence from its first step after the last one completes.",
    },
    exportFormat: {
        tip: "File format for the exported picture: PNG, JPG, or WebP.",
    },
    exportScale: {
        tip: "Multiplies the canvas's native resolution for the exported image file.",
    },
    exportQuality: {
        tip: "Compression quality for JPG/WebP exports — has no effect on PNG, which is lossless.",
    },
};

/**
 * Wires every recognized control's quick tip onto its label and, where a `detail` is
 * defined, injects a small persistent "i" badge carrying the richer advanced-tier
 * tooltip. Safe to call more than once — already-wired controls are skipped.
 *
 * `root` is a required argument: this module is imported both in the browser and in
 * this project's Node-environment Jest tests, so it never references the ambient
 * `document` global anywhere — every element it creates comes from `root.ownerDocument`
 * (or `root` itself, when `root` is a `Document`), keeping the module environment-agnostic
 * rather than closing over whichever realm happened to define it.
 *
 * @param {ParentNode} root - subtree to scan; pass the live `document`, or a specific
 * container after dynamically building sequence/layer editor rows so their controls get
 * wired too
 * @returns {void}
 */
export function applyOptionHelp(root) {
    const doc = root.ownerDocument || root;
    root.querySelectorAll(".cpop-label[for]").forEach((label) => {
        const help = optionHelp[label.getAttribute("for")];
        if (!help || label.dataset.helpApplied) return;
        label.dataset.helpApplied = "true";
        if (help.tip) label.setAttribute("data-lume", help.tip);
        if (help.detail) attachDetailBadge(doc, label, help, label.querySelector(".val"));
    });
    root.querySelectorAll(".ui-switch[for]").forEach((switchLabel) => {
        const help = optionHelp[switchLabel.getAttribute("for")];
        if (!help || switchLabel.dataset.helpApplied) return;
        switchLabel.dataset.helpApplied = "true";
        const textEl = switchLabel.querySelector(".ui-switch__label");
        if (help.tip && textEl) textEl.setAttribute("data-lume", help.tip);
        if (help.detail) attachDetailBadge(doc, switchLabel, help, null, true);
    });
}

/**
 * Builds and inserts one detailed-help badge for a control's label.
 *
 * @param {Document} doc - document to create the badge element with
 * @param {HTMLElement} label - the label element to attach the badge to
 * @param {FieldHelp} help - this control's help content
 * @param {HTMLElement|null} valueSpan - a trailing `.val` span to keep on the label's opposite
 * flex edge (the `row` label layout), or `null` when the label has no such span
 * @param {boolean} [insideClickableLabel=false] - true when `label` itself toggles a checkbox
 * on click (a `.ui-switch`), so the badge needs its own click-guard to avoid flipping it
 * @returns {void}
 */
function attachDetailBadge(doc, label, help, valueSpan, insideClickableLabel = false) {
    const icon = doc.createElement("span");
    icon.className = "field-help lume-info-icon";
    icon.textContent = "i";
    icon.tabIndex = 0;
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", `More about ${label.textContent.trim()}`);
    icon.setAttribute("data-lume", help.detail);
    icon.setAttribute("data-lume-tier", "advanced");
    icon.setAttribute("data-lume-icon", "info");
    icon.setAttribute("data-lume-title", help.title || label.textContent.trim());
    if (insideClickableLabel) {
        icon.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
    }
    if (valueSpan) {
        // Flex `.row` labels rely on exactly two children for space-between spacing —
        // wrap the label's own leading text with the badge so `.val` stays the only
        // other flex item.
        const wrapper = doc.createElement("span");
        wrapper.className = "field-help-label-text";
        while (label.firstChild && label.firstChild !== valueSpan) wrapper.appendChild(label.firstChild);
        label.insertBefore(wrapper, valueSpan);
        wrapper.appendChild(icon);
    } else {
        label.appendChild(icon);
    }
}
