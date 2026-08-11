/*!
 * asciiam — dependency-free canvas engine for animated ASCII backgrounds.
 */

"use strict";

    // Modes rendered via their own particle/column list instead of a full
    // cols*rows scan. Cheaper for effects where most cells are empty at any
    // given moment (rain, snow, twinkling) — cost scales with active particle
    // count, not grid size.
    const SPARSE_MODES = new Set(["matrix", "snow", "sparkle"]);

    class asciiam {
        static QUALITY = {
            high: { maxDPR: 3, density: 0.9, targetFPS: null, fontLevels: 6 },
            balanced: { maxDPR: 2, density: 1.0, targetFPS: null, fontLevels: 5 },
            performance: { maxDPR: 1.5, density: 1.3, targetFPS: 30, fontLevels: 4 },
            ultra: { maxDPR: 1, density: 1.6, targetFPS: null, fontLevels: 3 },
        };

        static CHARACTER_SETS = {
            density: " .:-=+*#%@",
            extended: "  .'`,^:\";~+_(){}[]<>!?ilI|/\\\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
            blocks: " ░▒▓█",
            binary: " 01",
            binaryWide: " 001101",
            braille: "⠀⠂⠒⠲⠶⠷⠿⣿",
            japanese: " 01アイウエオカキクケコ",
            punctuation: " .,:;irsXA253hMHGS#9B&@",
        };

        static presets = {
            heroWave: { mode: "wave", color: "#4FA8FF", speed: 1, edgeFade: 0.25 },
            subtleCurrent: { mode: "current", color: "#4FA8FF", speed: 0.6, minOpacity: 0.03, maxOpacity: 0.45 },
            matrixRain: { mode: "matrix", color: "#3CF07A", speed: 1, charSet: " 01アイウエオ" },
            softRipple: { mode: "ripple", color: "#4FA8FF", speed: 0.8, edgeFade: 0.4 },
            introReveal: { mode: "fadeIn", color: "#4FA8FF", speed: 1, loop: false },
            scanline: { mode: "wave", color: "#4FA8FF", speed: 1.4, ambient: 0, bandWidth: 0.04, edgeFade: 0.2 },
            snowfall: { mode: "snow", color: "#E8EEF7", speed: 0.5, snowDensity: 0.025 },
            sparkleField: { mode: "sparkle", color: "#4FA8FF", speed: 0.8, sparkleDensity: 0.04 },
            pulseGlow: { mode: "current", color: "#4FA8FF", speed: 0.5, pulse: { amplitude: 0.4, speed: 0.6 } },
            cursorGlow: {
                mode: "current",
                color: "#4FA8FF",
                speed: 0.4,
                minOpacity: 0.03,
                maxOpacity: 0.4,
                cursor: { enabled: true, radius: 160, strength: 0.7 },
            },
            auroraCurrent: {
                mode: "current",
                color: "#72F1B8",
                speed: 0.45,
                minOpacity: 0.04,
                maxOpacity: 0.5,
                gradient: { type: "linear", angle: 25, stops: ["#72F1B8", "#4FA8FF", "#C04FFF"], steps: 3 },
            },
            terminalMatrix: {
                mode: "matrix",
                color: "#3CF07A",
                speed: 1.1,
                charSet: " 01アイウエオカキクケコ",
                maxOpacity: 0.75,
            },
            blueprintWave: {
                mode: "wave",
                color: "#78B7FF",
                speed: 0.8,
                charSet: " ░▒▓█",
                edgeFade: 0.3,
                gradient: { type: "linear", angle: 90, stops: ["#173A63", "#78B7FF"], steps: 2 },
            },
            deepRipple: {
                mode: "ripple",
                color: "#C04FFF",
                speed: 0.55,
                edgeFade: 0.5,
                gradient: { type: "radial", center: [0.5, 0.5], radius: 0.9, stops: ["#4FA8FF", "#C04FFF", "#0A0C10"], steps: 3 },
            },
            snowDrift: {
                mode: "snow",
                color: "#E8EEF7",
                speed: 0.35,
                snowDensity: 0.035,
                charSet: " ·*❄",
            },
            emberSparkle: {
                mode: "sparkle",
                color: "#FF9D5C",
                speed: 0.65,
                sparkleDensity: 0.06,
                charSet: " .·+*#",
            },
            imageReveal: {
                mode: "image",
                color: "#4FA8FF",
                imageScale: 1,
                imageFov: 1,
                fit: "cover",
                colorFromImage: true,
                animateImageMask: true,
            },
        };

        // Registry for user-defined named modes: asciiam.registerMode('name', fn)
        static _registry = {};
        static registerMode(name, fn) {
            asciiam._registry[name] = fn;
        }

        /** Feature-detect before constructing, for graceful fallback in older browsers. */
        static isSupported() {
            try {
                const c = document.createElement("canvas");
                return !!(c.getContext && c.getContext("2d"));
            } catch {
                return false;
            }
        }

        constructor(target, opts = {}) {
            const el = typeof target === "string" ? document.querySelector(target) : target;
            if (!el) throw new Error("asciiam: target not found");
            if (!asciiam.isSupported()) {
                console.warn("asciiam: canvas 2D not supported in this browser — instance is a no-op.");
                this._disabled = true;
                this.start = this.stop = this.destroy = this.setMode = this.setOption = this.setCursor = () => {};
                this.on = () => () => {};
                this.off = () => {};
                this.setImage = () => Promise.resolve(null);
                return;
            }

            if (el.tagName === "CANVAS") {
                this.canvas = el;
                this.container = el.parentElement;
            } else {
                this.container = el;
                this.canvas = document.createElement("canvas");
                this.canvas.style.cssText = "display:block;width:100%;height:100%;position:absolute;inset:0;" + "z-index:-1;pointer-events:none;";
                this.canvas.setAttribute("aria-hidden", "true");
                this.canvas.setAttribute("role", "presentation");
                if (getComputedStyle(this.container).position === "static") {
                    this.container.style.position = "relative";
                }
                // Keep the negative canvas layer above the container background.
                // Without an isolated stacking context, browsers may paint it
                // behind the parent's background, making a working animation
                // appear blank.
                this.container.style.isolation = "isolate";
                this.container.insertBefore(this.canvas, this.container.firstChild);
            }
            this.ctx = this.canvas.getContext("2d", { alpha: true });
            if (!this.ctx) {
                console.warn("asciiam: failed to acquire 2D context — instance is a no-op.");
                this._disabled = true;
                this.start = this.stop = this.destroy = this.setMode = this.setOption = this.setCursor = () => {};
                this.on = () => () => {};
                this.off = () => {};
                this.setImage = () => Promise.resolve(null);
                return;
            }

            const quality = asciiam.QUALITY[opts.quality] || asciiam.QUALITY.balanced;

            this.opts = Object.assign(
                {
                    mode: "wave",
                    charSet: asciiam.CHARACTER_SETS.density,
                    fontFamily: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
                    fontSize: 14,
                    density: quality.density,
                    color: "#4FA8FF",
                    gradient: null,
                    background: "transparent",
                    speed: 1,
                    direction: "horizontal",
                    minOpacity: 0.05,
                    maxOpacity: 0.85,
                    boldOnPeak: true,
                    loop: true,
                    image: null,
                    imageChars: asciiam.CHARACTER_SETS.density,
                    imageScale: 1,
                    imageFov: 1,
                    fit: "cover",
                    colorFromImage: false,
                    animateImageMask: true,
                    edgeFade: 0,
                    maxDPR: quality.maxDPR,
                    targetFPS: quality.targetFPS,
                    showStats: false,
                    fontLevels: quality.fontLevels || 6,
                    respectReducedMotion: true,
                    onReady: null,
                    onImageError: null,

                    // --- wave tuning (previously hardcoded) ---
                    ambient: 0.35, // 0..1, base noise level between wave passes
                    bandWidth: 0.14, // fraction of extent the bright band spans

                    // --- free / near-free additions ---
                    trail: 0, // 0..1, afterglow strength (0 = classic full clear)
                    trailColor: "#070809",
                    pulse: null, // { amplitude, speed } — global opacity breathing, ~free
                    colorAnimation: null, // { type:'hueRotate'|'breathe', speed, ... } — one calc/frame

                    // --- opt-in, small added cost ---
                    cursor: null, // { enabled, radius, strength, mode:'boost' }

                    // --- sparse mode density ---
                    snowDensity: 0.02,
                    sparkleDensity: 0.05,

                    // --- extensibility ---
                    customCell: null, // (api) => ({char,opacity,intensity,bold,color}) | null
                },
                opts,
            );

            this._time = 0;
            this._raf = null;
            this._visible = true;
            this._lastT = null;
            this._acc = 0;
            this._resizePending = false;
            this._resizeRaf = null;
            this._lastFillStyle = null;
            this._lastFont = null;
            this._gradientKey = null;
            this._gradientObj = null;
            this._edgeFadeCache = null;
            this._cell = { char: " ", opacity: 0, level: 0, bold: false, color: null };
            this._frames = 0;
            this._fpsAccum = 0;
            this._fps = 0;
            this._statsEl = null;
            this._warnedZeroSize = false;
            this._pulseFactor = 1;
            this._animatedColor = null;
            this._cursor = null;
            this._canvasRect = null;
            this._events = new Map();
            this._destroyed = false;
            this._api = {
                col: 0,
                row: 0,
                x: 0,
                y: 0,
                time: 0,
                cols: 0,
                rows: 0,
                w: 0,
                h: 0,
                charSet: "",
                seed: (c, r) => this._seed(c, r),
                set: (ch, o, i, b) => this._setCell(ch, o, i, b),
            };

            this._mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
            this._reduced = !!(this._mq && this._mq.matches && this.opts.respectReducedMotion);
            this._onMqChange = (e) => {
                this._reduced = e.matches && this.opts.respectReducedMotion;
                if (this._reduced) {
                    this.stop();
                    this._draw(16.7);
                } else this.start();
            };
            if (this._mq) this._mq.addEventListener ? this._mq.addEventListener("change", this._onMqChange) : this._mq.addListener(this._onMqChange);

            this._bindLifecycle();
            this._bindCursor();
            this._buildFontCache();
            this._resize();

            if (document.fonts && document.fonts.ready) {
                document.fonts.ready
                    .then(() => {
                        this._buildFontCache();
                        this._resize();
                    })
                    .catch(() => {});
            }

            if (this.opts.image) this.setImage(this.opts.image);
            Promise.resolve().then(() => {
                if (this._destroyed) return;
                const detail = { width: this.w, height: this.h, cols: this.cols, rows: this.rows };
                this._emit("ready", detail);
                if (typeof this.opts.onReady === "function") this.opts.onReady(this);
            });
        }

        // ---- public API ----
        start() {
            if (this._disabled || this._raf) return;
            if (this._reduced) {
                this._draw(16.7);
                return;
            }
            const loop = (t) => {
                if (document.hidden || !this._visible) {
                    this._lastT = null;
                    this._raf = requestAnimationFrame(loop);
                    return;
                }
                const dt = this._lastT === null ? 16.7 : t - this._lastT;
                this._lastT = t;

                if (this.opts.targetFPS) {
                    this._acc += dt;
                    const frameDur = 1000 / this.opts.targetFPS;
                    if (this._acc < frameDur) {
                        this._raf = requestAnimationFrame(loop);
                        return;
                    }
                    this._acc %= frameDur;
                }

                this._time += dt * 0.001 * this.opts.speed;
                this._draw(dt);
                if (this._events.get("frame")?.size) {
                    this._emit("frame", { time: this._time, delta: dt, drawn: this._lastDrawnCount });
                }
                if (this.opts.showStats) this._updateStats(dt);
                this._raf = requestAnimationFrame(loop);
            };
            this._raf = requestAnimationFrame(loop);
        }
        stop() {
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = null;
        }
        destroy() {
            this._destroyed = true;
            this.stop();
            if (this._io) this._io.disconnect();
            if (this._ro) this._ro.disconnect();
            if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
            document.removeEventListener("visibilitychange", this._onVisChange);
            if (this._onResize) window.removeEventListener("resize", this._onResize);
            if (this._mq)
                this._mq.removeEventListener ? this._mq.removeEventListener("change", this._onMqChange) : this._mq.removeListener(this._onMqChange);
            this._unbindCursor();
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
            this._events.clear();
        }
        /** Subscribe to a lifecycle event. Returns an unsubscribe function. */
        on(event, listener) {
            if (typeof listener !== "function") throw new TypeError("asciiam: event listener must be a function");
            let listeners = this._events.get(event);
            if (!listeners) {
                listeners = new Set();
                this._events.set(event, listeners);
            }
            listeners.add(listener);
            return () => this.off(event, listener);
        }
        off(event, listener) {
            const listeners = this._events.get(event);
            if (!listeners) return;
            listeners.delete(listener);
            if (!listeners.size) this._events.delete(event);
        }
        setMode(mode) {
            this.opts.mode = mode;
            if (mode === "matrix") this._initMatrix();
            if (mode === "snow") this._initSnow();
            if (mode === "sparkle") this._initSparkle();
        }
        setOption(key, value) {
            this.opts[key] = value;
            if (key === "fontSize" || key === "density") {
                this._buildFontCache();
                this._resize();
            }
            if (key === "gradient") {
                this._gradientKey = null;
            }
            if (key === "edgeFade") {
                this._buildEdgeFadeCache();
            }
            if (key === "imageScale" || key === "imageFov" || key === "fit" || key === "imageChars") {
                if (this._sourceImage) this._resampleImage();
            }
            if (key === "snowDensity") {
                this._initSnow();
            }
            if (key === "sparkleDensity") {
                this._initSparkle();
            }
        }
        /** Returns a Promise that resolves once the image is sampled into the ASCII grid. */
        setImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    this._sourceImage = img;
                    this._resampleImage();
                    resolve(img);
                };
                img.onerror = (err) => {
                    console.warn("asciiam: failed to load image:", src);
                    if (this.opts.onImageError) this.opts.onImageError(err);
                    reject(err);
                };
                img.src = src;
            });
        }
        /** Programmatically drive the cursor-reactive modifier (e.g. for touch, audio-sync, demos). Pass null to clear. */
        setCursor(x, y) {
            this._cursor = x === null || x === undefined ? null : { x, y };
        }

        _emit(event, detail) {
            const listeners = this._events.get(event);
            if (!listeners) return;
            [...listeners].forEach((listener) => listener(detail, this));
        }

        // ---- lifecycle ----
        _bindLifecycle() {
            if ("IntersectionObserver" in window) {
                this._io = new IntersectionObserver(
                    (entries) => {
                        this._visible = entries[0].isIntersecting;
                        if (this._visible) this._lastT = null;
                    },
                    { threshold: 0 },
                );
                this._io.observe(this.canvas);
            }
            this._onVisChange = () => {
                if (!document.hidden) this._lastT = null;
            };
            document.addEventListener("visibilitychange", this._onVisChange);

            const target = this.container || this.canvas.parentElement;
            if ("ResizeObserver" in window && target) {
                this._ro = new ResizeObserver(() => this._scheduleResize());
                this._ro.observe(target);
            } else {
                this._onResize = () => this._scheduleResize();
                window.addEventListener("resize", this._onResize);
            }
        }
        _scheduleResize() {
            if (this._resizePending) return;
            this._resizePending = true;
            this._resizeRaf = requestAnimationFrame(() => {
                this._resizeRaf = null;
                this._resizePending = false;
                this._resize();
            });
        }

        // Pointer tracking is always bound (mousemove only fires on real movement,
        // negligible cost) but only applied in the draw loop when opts.cursor.enabled.
        _bindCursor() {
            const target = this.container || this.canvas.parentElement;
            if (!target) return;
            this._onPointerMove = (e) => {
                if (!this._canvasRect) this._canvasRect = this.canvas.getBoundingClientRect();
                this._cursor = { x: e.clientX - this._canvasRect.left, y: e.clientY - this._canvasRect.top };
            };
            this._onPointerLeave = () => {
                this._cursor = null;
            };
            target.addEventListener("pointermove", this._onPointerMove, { passive: true });
            target.addEventListener("pointerleave", this._onPointerLeave, { passive: true });
        }
        _unbindCursor() {
            const target = this.container || this.canvas.parentElement;
            if (target && this._onPointerMove) {
                target.removeEventListener("pointermove", this._onPointerMove);
                target.removeEventListener("pointerleave", this._onPointerLeave);
            }
        }

        // ---- sizing / measurement ----
        _buildFontCache() {
            this.ctx.font = `${this.opts.fontSize}px ${this.opts.fontFamily}`;
            const m = this.ctx.measureText("M");
            this.charW = Math.max(4, m.width * this.opts.density);
            this.charH = Math.max(6, this.opts.fontSize * 1.2 * this.opts.density);

            const steps = this.opts.fontLevels;
            this._fontRegular = [];
            this._fontBold = [];
            for (let i = 0; i < steps; i++) {
                const scale = 1 + (i / (steps - 1)) * 0.5;
                const size = Math.round(this.opts.fontSize * scale * 10) / 10;
                this._fontRegular.push(`400 ${size}px ${this.opts.fontFamily}`);
                this._fontBold.push(`700 ${size}px ${this.opts.fontFamily}`);
            }
        }

        _resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDPR);
            const parent = this.canvas.parentElement || this.canvas;
            const w = parent.clientWidth,
                h = parent.clientHeight;

            if ((w < 2 || h < 2) && !this._warnedZeroSize) {
                console.warn(
                    "asciiam: container has zero (or near-zero) size — give it an explicit width/height. Nothing will render until it does.",
                );
                this._warnedZeroSize = true;
            }

            this.w = w;
            this.h = h;
            this.canvas.width = Math.max(1, Math.round(w * dpr));
            this.canvas.height = Math.max(1, Math.round(h * dpr));
            this.canvas.style.width = w + "px";
            this.canvas.style.height = h + "px";
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.cols = Math.max(1, Math.ceil(w / this.charW));
            this.rows = Math.max(1, Math.ceil(h / this.charH));
            this._buildEdgeFadeCache();
            this._gradientKey = null;
            this._canvasRect = this.canvas.getBoundingClientRect();
            if (this._sourceImage) this._resampleImage();
            if (this.opts.mode === "matrix") this._initMatrix();
            if (this.opts.mode === "snow") this._initSnow();
            if (this.opts.mode === "sparkle") this._initSparkle();
            if (this._reduced) this._draw(16.7);
            if (this._events.get("resize")?.size) {
                this._emit("resize", { width: this.w, height: this.h, cols: this.cols, rows: this.rows });
            }
        }

        _buildEdgeFadeCache() {
            if (!this.opts.edgeFade || !this.cols || !this.rows || !this.w || !this.h) {
                this._edgeFadeCache = null;
                return;
            }
            const fade = this.opts.edgeFade;
            this._edgeFadeCache = new Float32Array(this.cols * this.rows);
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const nx = ((col * this.charW) / this.w) * 2 - 1;
                    const ny = ((row * this.charH) / this.h) * 2 - 1;
                    const distance = Math.min(1.4, Math.sqrt(nx * nx + ny * ny));
                    const edge = Math.max(0, (distance - (1 - fade)) / fade);
                    this._edgeFadeCache[row * this.cols + col] = 1 - Math.min(1, edge);
                }
            }
        }

        _seed(col, row) {
            const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
            return n - Math.floor(n);
        }

        // ---- gradient (built once per frame at most, never per cell) ----
        _getGradient() {
            const g = this.opts.gradient;
            if (!g) return null;
            const key = JSON.stringify(g) + (g.animate ? Math.floor(this._time * 20) : "");
            if (!g.animate && key === this._gradientKey) return this._gradientObj;

            const stops = this._expandGradientStops(g);

            let grad;
            if (g.type === "radial") {
                const cx = this.w * (g.center ? g.center[0] : 0.5);
                const cy = this.h * (g.center ? g.center[1] : 0.5);
                const r = Math.max(this.w, this.h) * (g.radius || 0.75);
                grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            } else {
                const angle = (((g.angle || 0) + (g.animate ? this._time * 20 : 0)) * Math.PI) / 180;
                const dx = Math.cos(angle),
                    dy = Math.sin(angle);
                const cx = this.w / 2,
                    cy = this.h / 2;
                const len = (Math.abs(dx) * this.w + Math.abs(dy) * this.h) / 2;
                grad = this.ctx.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
            }
            stops.forEach((s) => grad.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color));
            this._gradientKey = key;
            this._gradientObj = grad;
            return grad;
        }

        _expandGradientStops(gradient) {
            const raw = gradient.stops || ["#4FA8FF", "#C04FFF"];
            const colors = raw.map((stop) => (typeof stop === "string" ? stop : stop.color));
            const steps = Math.max(1, Math.min(6, Math.round(gradient.steps || 2)));
            const stops = [];
            for (let i = 0; i < steps; i++) {
                const position = steps === 1 ? 0 : i / (steps - 1);
                const scaled = position * Math.max(0, colors.length - 1);
                const left = Math.min(colors.length - 1, Math.floor(scaled));
                const right = Math.min(colors.length - 1, left + 1);
                const local = scaled - left;
                const eased = gradient.type === "cubic" ? local * local * (3 - 2 * local) : local;
                stops.push({
                    offset: position,
                    color: this._lerpColor(colors[left], colors[right], eased),
                });
            }
            return stops;
        }

        // ---- animated color: one calculation per frame, never per cell ----
        _updateAnimatedColor() {
            const ca = this.opts.colorAnimation;
            if (!ca) {
                this._animatedColor = null;
                return;
            }
            if (ca.type === "hueRotate") {
                const hue = ((ca.baseHue || 200) + this._time * (ca.speed || 30)) % 360;
                const saturation = ca.saturation === null || ca.saturation === undefined ? 80 : ca.saturation;
                const lightness = ca.lightness === null || ca.lightness === undefined ? 60 : ca.lightness;
                this._animatedColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            } else if (ca.type === "breathe") {
                const t = (Math.sin(this._time * (ca.speed || 1)) + 1) / 2;
                this._animatedColor = this._lerpColor(ca.colorA || "#4FA8FF", ca.colorB || "#C04FFF", t);
            } else {
                this._animatedColor = null;
            }
        }
        _lerpColor(a, b, t) {
            const pa = this._hexToRgb(a),
                pb = this._hexToRgb(b);
            if (!pa || !pb) return a;
            const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
            const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
            const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
            return `rgb(${r},${g},${bl})`;
        }
        _hexToRgb(hex) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
        }

        // ---- image sampling ----
        _resampleImage() {
            const img = this._sourceImage;
            const cols = this.cols,
                rows = this.rows;
            const off = document.createElement("canvas");
            off.width = cols;
            off.height = rows;
            const octx = off.getContext("2d");
            const srcRatio = img.width / img.height,
                dstRatio = cols / rows;
            let sx, sy, sw, sh;
            if (this.opts.fit === "cover") {
                if (srcRatio > dstRatio) {
                    sh = img.height;
                    sw = sh * dstRatio;
                    sy = 0;
                    sx = (img.width - sw) / 2;
                } else {
                    sw = img.width;
                    sh = sw / dstRatio;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }
            } else {
                sx = 0;
                sy = 0;
                sw = img.width;
                sh = img.height;
            }
            const zoom = Math.max(0.1, this.opts.imageScale || 1) / Math.max(0.1, this.opts.imageFov || 1);
            if (zoom !== 1) {
                const zoomedW = sw / zoom;
                const zoomedH = sh / zoom;
                sx += (sw - zoomedW) / 2;
                sy += (sh - zoomedH) / 2;
                sw = zoomedW;
                sh = zoomedH;
            }
            octx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
            const data = octx.getImageData(0, 0, cols, rows).data;

            const chars = new Array(cols * rows),
                colors = new Array(cols * rows);
            const ramp = this.opts.imageChars;
            for (let i = 0; i < cols * rows; i++) {
                const r = data[i * 4],
                    gC = data[i * 4 + 1],
                    b = data[i * 4 + 2],
                    a = data[i * 4 + 3];
                const brightness = (0.299 * r + 0.587 * gC + 0.114 * b) / 255;
                const idx = a < 20 ? 0 : Math.min(ramp.length - 1, Math.floor(brightness * (ramp.length - 1)));
                chars[i] = ramp[idx];
                colors[i] = a < 20 ? null : `rgb(${r},${gC},${b})`;
            }
            this._imageGrid = { cols, rows, chars, colors };
        }

        // ---- sparse mode state ----
        _initMatrix() {
            this._matrix = [];
            for (let c = 0; c < this.cols; c++) {
                this._matrix.push({
                    y: -Math.random() * this.rows,
                    speed: 8 + Math.random() * 14,
                    length: 6 + Math.floor(Math.random() * 10),
                });
            }
        }
        _initSnow() {
            const count = Math.max(1, Math.round(this.cols * this.rows * this.opts.snowDensity));
            this._snow = [];
            for (let i = 0; i < count; i++) {
                this._snow.push({
                    col: Math.floor(Math.random() * this.cols),
                    y: Math.random() * this.rows,
                    speed: 2 + Math.random() * 5,
                    phase: Math.random() * Math.PI * 2,
                    drift: 0.3 + Math.random() * 0.6,
                });
            }
        }
        _initSparkle() {
            const count = Math.max(1, Math.round(this.cols * this.rows * this.opts.sparkleDensity));
            this._sparkle = [];
            for (let i = 0; i < count; i++) {
                this._sparkle.push({
                    col: Math.floor(Math.random() * this.cols),
                    row: Math.floor(Math.random() * this.rows),
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.6 + Math.random() * 1.4,
                });
            }
        }

        // ---- main draw loop ----
        _draw(dt) {
            const ctx = this.ctx;

            if (this.opts.trail > 0) {
                ctx.save();
                ctx.globalAlpha = this.opts.trail;
                ctx.fillStyle = this.opts.trailColor;
                ctx.fillRect(0, 0, this.w, this.h);
                ctx.restore();
            } else {
                ctx.clearRect(0, 0, this.w, this.h);
                if (this.opts.background !== "transparent") {
                    ctx.fillStyle = this.opts.background;
                    ctx.fillRect(0, 0, this.w, this.h);
                }
            }
            ctx.textBaseline = "alphabetic";
            this._lastFillStyle = null;
            this._lastFont = null;

            this._pulseFactor = this.opts.pulse
                ? Math.max(0, 1 + this.opts.pulse.amplitude * Math.sin(this._time * (this.opts.pulse.speed || 1)))
                : 1;
            this._updateAnimatedColor();

            const globalGradient = this.opts.gradient && !this.opts.colorFromImage ? this._getGradient() : null;
            this._drawFillStyle = globalGradient; // gradient takes precedence over animated color
            let drawn = 0;

            if (SPARSE_MODES.has(this.opts.mode)) {
                drawn = this._drawSparse(dt, globalGradient);
            } else {
                drawn = this._drawDense(globalGradient);
            }

            ctx.globalAlpha = 1;
            this._lastDrawnCount = drawn;
        }

        _drawDense(globalGradient) {
            let drawn = 0;
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const x = col * this.charW,
                        y = row * this.charH;
                    const cell = this._computeCell(col, row, x, y);
                    if (this._paintCell(cell, col, row, x, y, globalGradient)) drawn++;
                }
            }
            return drawn;
        }

        _drawSparse(dt, globalGradient) {
            let drawn = 0;
            const mode = this.opts.mode;
            if (mode === "matrix") {
                if (!this._matrix) this._initMatrix();
                this._advanceMatrix(dt);
                for (let c = 0; c < this._matrix.length; c++) {
                    const d = this._matrix[c];
                    const rowStart = Math.max(0, Math.floor(d.y - d.length));
                    const rowEnd = Math.min(this.rows - 1, Math.floor(d.y));
                    for (let row = rowStart; row <= rowEnd; row++) {
                        const cell = this._matrixCellAt(c, row, d);
                        const x = c * this.charW,
                            y = row * this.charH;
                        if (this._paintCell(cell, c, row, x, y, globalGradient)) drawn++;
                    }
                }
            } else if (mode === "snow") {
                if (!this._snow) this._initSnow();
                this._advanceSnow(dt);
                for (let i = 0; i < this._snow.length; i++) {
                    const p = this._snow[i];
                    const row = Math.floor(p.y);
                    if (row < 0 || row >= this.rows) continue;
                    const xOff = Math.sin(this._time * p.drift + p.phase) * this.charW * 1.5;
                    const x = p.col * this.charW + xOff,
                        y = row * this.charH;
                    const cell = this._setCell("*", this.opts.maxOpacity * 0.8, 0.15, false);
                    if (this._paintCell(cell, p.col, row, x, y, globalGradient)) drawn++;
                }
            } else if (mode === "sparkle") {
                if (!this._sparkle) this._initSparkle();
                for (let i = 0; i < this._sparkle.length; i++) {
                    const p = this._sparkle[i];
                    const n = Math.max(0, Math.sin(this._time * p.speed + p.phase));
                    if (n <= 0.02) continue;
                    const charIdx = Math.floor(n * (this.opts.charSet.length - 1));
                    const x = p.col * this.charW,
                        y = p.row * this.charH;
                    const cell = this._setCell(this.opts.charSet[charIdx] || "*", n * this.opts.maxOpacity, n, n > 0.85);
                    if (this._paintCell(cell, p.col, p.row, x, y, globalGradient)) drawn++;
                }
            }
            return drawn;
        }

        // Shared per-cell paint step: pulse, edge fade, cursor modifier, then the
        // cached fillStyle/font assignment + fillText. Used by both dense and
        // sparse draw paths so the perf-critical caching logic lives in one place.
        _paintCell(cell, col, row, x, y, globalGradient) {
            if (!cell) return false;
            const ctx = this.ctx;
            let opacity = cell.opacity * this._pulseFactor;

            if (this._edgeFadeCache) {
                opacity *= this._edgeFadeCache[row * this.cols + col];
            }

            const cur = this.opts.cursor;
            if (cur && cur.enabled && this._cursor) {
                const dx = x - this._cursor.x,
                    dy = y - this._cursor.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const radius = cur.radius || 140;
                if (dist < radius) {
                    const falloff = 1 - dist / radius;
                    opacity = Math.min(1, opacity + (cur.strength || 0.6) * falloff);
                }
            }

            if (opacity <= 0.01) return false;

            const fillStyle = cell.color || globalGradient || this._animatedColor || this.opts.color;
            if (fillStyle !== this._lastFillStyle) {
                ctx.fillStyle = fillStyle;
                this._lastFillStyle = fillStyle;
            }
            const font = (cell.bold ? this._fontBold : this._fontRegular)[cell.level];
            if (font !== this._lastFont) {
                ctx.font = font;
                this._lastFont = font;
            }

            ctx.globalAlpha = opacity;
            ctx.fillText(cell.char, x, y + this.charH * 0.78);
            return true;
        }

        _advanceMatrix(dt) {
            const dtS = Math.min(0.1, dt / 1000) * this.opts.speed;
            for (let c = 0; c < this._matrix.length; c++) {
                const d = this._matrix[c];
                d.y += d.speed * dtS;
                if (d.y - d.length > this.rows) {
                    d.y = -Math.random() * 10;
                    d.speed = 8 + Math.random() * 14;
                    d.length = 6 + Math.floor(Math.random() * 10);
                }
            }
        }
        _advanceSnow(dt) {
            const dtS = Math.min(0.1, dt / 1000) * this.opts.speed;
            for (let i = 0; i < this._snow.length; i++) {
                const p = this._snow[i];
                p.y += p.speed * dtS;
                if (p.y > this.rows + 1) {
                    p.y = -1;
                    p.col = Math.floor(Math.random() * this.cols);
                    p.speed = 2 + Math.random() * 5;
                }
            }
        }

        _computeCell(col, row, x, y) {
            const mode = this.opts.mode;
            if (mode === "custom" && typeof this.opts.customCell === "function") {
                return this._callCustom(this.opts.customCell, col, row, x, y);
            }
            if (asciiam._registry[mode]) {
                return this._callCustom(asciiam._registry[mode], col, row, x, y);
            }
            switch (mode) {
                case "wave":
                    return this._waveCell(col, row, x, y);
                case "current":
                    return this._currentCell(col, row, x, y);
                case "ripple":
                    return this._rippleCell(col, row, x, y);
                case "fadeIn":
                    return this._fadeInCell(col, row, x, y);
                case "image":
                    return this._imageCell(col, row, x, y);
                default:
                    return this._waveCell(col, row, x, y);
            }
        }

        _callCustom(fn, col, row, x, y) {
            const api = this._api;
            api.col = col;
            api.row = row;
            api.x = x;
            api.y = y;
            api.time = this._time;
            api.cols = this.cols;
            api.rows = this.rows;
            api.w = this.w;
            api.h = this.h;
            api.charSet = this.opts.charSet;
            const result = fn.call(this, api);
            if (!result) return null;
            // allow either the pooled-cell pattern (api.set(...)) or a plain object return
            if (result === this._cell) return result;
            return this._setCell(result.char, result.opacity, result.intensity || 0, !!result.bold);
        }

        _setCell(char, opacity, intensity, bold) {
            const c = this._cell;
            c.char = char;
            c.opacity = opacity;
            c.bold = bold;
            c.color = null;
            c.level = Math.max(0, Math.min(this.opts.fontLevels - 1, Math.round(intensity * (this.opts.fontLevels - 1))));
            return c;
        }

        _waveCell(col, row, x, y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak, direction, ambient, bandWidth } = this.opts;
            const period = this.w + this.h;
            let pos, coord, extent;
            if (direction === "vertical") {
                pos = ((this._time * 140) % (this.h + 300)) - 150;
                coord = y;
                extent = this.h;
            } else if (direction === "diagonal") {
                pos = ((this._time * 160) % (period + 300)) - 150;
                coord = x + y;
                extent = period;
            } else {
                pos = ((this._time * 160) % (this.w + 300)) - 150;
                coord = x;
                extent = this.w;
            }

            const dist = Math.abs(coord - pos);
            const band = extent * bandWidth;
            let intensity = Math.max(0, 1 - dist / band);
            intensity = intensity * intensity * (3 - 2 * intensity);

            const base = this._seed(col, row) * ambient;
            const combined = Math.min(1, base + intensity);
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(
                charSet[charIdx] || " ",
                minOpacity + (maxOpacity - minOpacity) * combined,
                intensity,
                boldOnPeak && intensity > 0.55,
            );
        }

        _currentCell(col, row, x, y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const t = this._time;
            const v = Math.sin(x * 0.02 + t * 1.1) * 0.5 + Math.sin(y * 0.035 - t * 0.8) * 0.3 + Math.sin((x + y) * 0.015 + t * 1.6) * 0.2;
            const n = (v + 1) / 2;
            const charIdx = Math.floor(n * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", minOpacity + (maxOpacity - minOpacity) * n, n, boldOnPeak && n > 0.72);
        }

        _rippleCell(col, row, x, y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const cx = this.w / 2,
                cy = this.h / 2;
            const d = Math.hypot(x - cx, y - cy);
            const wave = Math.sin(d * 0.06 - this._time * 2.4);
            const n = (wave + 1) / 2;
            const falloff = Math.max(0, 1 - d / (Math.max(this.w, this.h) * 0.75));
            const combined = n * falloff;
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", minOpacity + (maxOpacity - minOpacity) * combined, combined, boldOnPeak && combined > 0.6);
        }

        _fadeInCell(col, row, _x, _y) {
            const { charSet, maxOpacity } = this.opts;
            const totalDuration = 2.2;
            const cycle = this.opts.loop ? this._time % (totalDuration + 1.2) : Math.min(this._time, totalDuration);
            const delay = (col / this.cols) * totalDuration * 0.8 + this._seed(col, row) * 0.4;
            const local = Math.max(0, Math.min(1, (cycle - delay) / 0.6));
            const eased = local * local * (3 - 2 * local);
            const shimmer = 0.85 + this._seed(col, row + 1) * 0.15;
            const charIdx = Math.floor(eased * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", eased * maxOpacity * shimmer, 0, false);
        }

        _imageCell(col, row, x, y) {
            if (!this._imageGrid) return null;
            const g = this._imageGrid;
            const i = row * g.cols + col;
            const char = g.chars[i];
            if (!char || char === " ") return null;

            let opacity = this.opts.maxOpacity,
                bold = false,
                intensity = 0.5;
            if (this.opts.animateImageMask) {
                const wave = this._waveCell(col, row, x, y);
                opacity = Math.max(0.15, wave.opacity);
                bold = wave.bold;
                intensity = wave.level / (this.opts.fontLevels - 1);
            }
            const cell = this._setCell(char, opacity, intensity, bold);
            cell.color = this.opts.colorFromImage ? g.colors[i] : null;
            return cell;
        }

        // Sparse matrix cell: called only for rows within a column's active trail
        // range (see _drawSparse), never scanned across the full grid.
        _matrixCellAt(col, row, d) {
            const dist = d.y - row;
            const intensity = Math.max(0, 1 - dist / d.length);
            const { charSet, maxOpacity } = this.opts;
            const flicker = this._seed(col, row + Math.floor(this._time * 6));
            const charIdx = Math.floor(flicker * (charSet.length - 1));
            const isHead = dist < 1;
            return this._setCell(charSet[charIdx] || "0", intensity * maxOpacity, intensity, isHead);
        }

        _updateStats(dt) {
            this._frames++;
            this._fpsAccum += dt;
            if (this._fpsAccum >= 500) {
                this._fps = Math.round((this._frames * 1000) / this._fpsAccum);
                this._frames = 0;
                this._fpsAccum = 0;
                if (this._statsEl) {
                    this._statsEl.textContent = `${this._fps} fps · ${this.cols}×${this.rows} cells · ${this._lastDrawnCount} drawn`;
                }
            }
        }
        attachStats(el) {
            this._statsEl = el;
        }
    }

export default asciiam;
