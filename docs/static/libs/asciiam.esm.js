/*!
 * asciiam — dependency-free canvas engine for animated ASCII backgrounds.
 */

import {
    createCubeMesh,
    createIcosphereMesh,
    createPlaneMesh,
    createTorusMesh,
    MeshCellRasterizer,
    normalizeMeshData,
} from "./mesh.js";
import { loadGltf, registerGltfDecoder, getGltfDecoders } from "./gltf.js";

"use strict";

    // Modes rendered via their own particle/column list instead of a full
    // cols*rows scan. Cheaper for effects where most cells are empty at any
    // given moment (rain, snow, twinkling) — cost scales with active particle
    // count, not grid size.
    const SPARSE_MODES = new Set(["matrix", "snow", "sparkle", "fire", "starfield", "orbit"]);
    const STATS_HISTORY_LENGTH = 24;
    const SPARKLINE_LEVELS = "▁▂▃▄▅▆▇█";

    /** Formats a fixed-size numeric ring without retaining DOM or chart objects. */
    function formatSparkline(values, count, cursor, ceiling) {
        if (!count || !(ceiling > 0)) return "";
        let chart = "";
        const start = count < values.length ? 0 : cursor;
        for (let offset = 0; offset < count; offset++) {
            const value = values[(start + offset) % values.length];
            const level = Math.min(SPARKLINE_LEVELS.length - 1, Math.max(0, Math.round((value / ceiling) * (SPARKLINE_LEVELS.length - 1))));
            chart += SPARKLINE_LEVELS[level];
        }
        return chart;
    }

    /**
     * Private WebGL2 presentation backend.
     * Animation state remains in asciiam; this class owns GPU resources only.
     */
    class WebGL2GlyphRenderer {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.gl = canvas.getContext("webgl2", {
                alpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                desynchronized: options.desynchronized !== false,
                powerPreference: options.powerPreference || "high-performance",
                premultipliedAlpha: true,
                preserveDrawingBuffer: true,
            });
            if (!this.gl) throw new Error("WebGL2 unavailable");
            this.capacity = 4096;
            this.count = 0;
            this.stride = 12;
            this.instances = new Float32Array(this.capacity * this.stride);
            this.atlasKey = "";
            this.gradientTextures = new Map();
            this._initialize();
        }

        _shader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader compile failed");
            return shader;
        }

        _program(vertex, fragment) {
            const gl = this.gl;
            const program = gl.createProgram();
            gl.attachShader(program, this._shader(gl.VERTEX_SHADER, vertex));
            gl.attachShader(program, this._shader(gl.FRAGMENT_SHADER, fragment));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
            return program;
        }

        _initialize() {
            const gl = this.gl;
            this.program = this._program(`#version 300 es
                in vec2 a_corner;
                in vec4 a_rect;
                in vec4 a_uv;
                in vec4 a_color;
                uniform vec2 u_viewport;
                out vec2 v_uv;
                out vec4 v_color;
                out vec2 v_position;
                void main() {
                    vec2 pixel = a_rect.xy + a_corner * a_rect.zw;
                    vec2 clip = pixel / u_viewport * 2.0 - 1.0;
                    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
                    v_uv = mix(a_uv.xy, a_uv.zw, a_corner);
                    v_color = a_color;
                    v_position = pixel / u_viewport;
                }`, `#version 300 es
                precision mediump float;
                uniform sampler2D u_atlas;
                uniform sampler2D u_gradient;
                uniform bool u_use_gradient;
                uniform int u_gradient_type;
                uniform float u_gradient_angle;
                in vec2 v_uv;
                in vec4 v_color;
                in vec2 v_position;
                out vec4 outColor;
                void main() {
                    float mask = texture(u_atlas, v_uv).a;
                    if (mask < 0.01) discard;
                    vec4 color = v_color;
                    if (u_use_gradient) {
                        vec2 p = v_position - vec2(0.5);
                        float t;
                        if (u_gradient_type == 1) t = clamp(length(p) * 1.4142, 0.0, 1.0);
                        else {
                            vec2 dir = vec2(cos(u_gradient_angle), sin(u_gradient_angle));
                            t = clamp(dot(p, dir) + 0.5, 0.0, 1.0);
                        }
                        color.rgb = texture(u_gradient, vec2(t, 0.5)).rgb;
                    }
                    outColor = vec4(color.rgb * color.a, color.a) * mask;
                }`);
            this.surfaceProgram = this._program(`#version 300 es
                in vec2 a_corner;
                out vec2 v_position;
                void main() { v_position = a_corner; gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0); }`, `#version 300 es
                precision mediump float;
                uniform sampler2D u_gradient;
                uniform vec4 u_color;
                uniform bool u_use_gradient;
                uniform int u_gradient_type;
                uniform float u_gradient_angle;
                in vec2 v_position;
                out vec4 outColor;
                void main() {
                    vec4 color = u_color;
                    if (u_use_gradient) {
                        vec2 p = v_position - vec2(0.5);
                        float t = u_gradient_type == 1 ? clamp(length(p) * 1.4142, 0.0, 1.0)
                            : clamp(dot(p, vec2(cos(u_gradient_angle), sin(u_gradient_angle))) + 0.5, 0.0, 1.0);
                        color.rgb = texture(u_gradient, vec2(t, 0.5)).rgb;
                    }
                    outColor = vec4(color.rgb * color.a, color.a);
                }`);
            this.vao = gl.createVertexArray();
            gl.bindVertexArray(this.vao);
            this.cornerBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
            const corner = gl.getAttribLocation(this.program, "a_corner");
            gl.enableVertexAttribArray(corner);
            gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
            this.instanceBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instances.byteLength, gl.DYNAMIC_DRAW);
            [["a_rect", 4, 0], ["a_uv", 4, 4], ["a_color", 4, 8]].forEach(([name, size, offset]) => {
                const location = gl.getAttribLocation(this.program, name);
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(location, size, gl.FLOAT, false, this.stride * 4, offset * 4);
                gl.vertexAttribDivisor(location, 1);
            });
            this.surfaceVao = gl.createVertexArray();
            gl.bindVertexArray(this.surfaceVao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
            const surfaceCorner = gl.getAttribLocation(this.surfaceProgram, "a_corner");
            gl.enableVertexAttribArray(surfaceCorner);
            gl.vertexAttribPointer(surfaceCorner, 2, gl.FLOAT, false, 0, 0);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }

        resize(width, height) {
            this.gl.viewport(0, 0, width, height);
        }

        setAtlas(source, key) {
            if (key === this.atlasKey) return;
            const gl = this.gl;
            if (!this.atlasTexture) this.atlasTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            this.atlasKey = key;
        }

        hasGradient(key) {
            return this.gradientTextures.has(key);
        }

        setGradient(source, key) {
            if (!source || this.gradientTextures.has(key)) return this.gradientTextures.get(key) || null;
            const gl = this.gl;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            this.gradientTextures.set(key, texture);
            if (this.gradientTextures.size > 8) {
                const oldest = this.gradientTextures.keys().next().value;
                gl.deleteTexture(this.gradientTextures.get(oldest));
                this.gradientTextures.delete(oldest);
            }
            return texture;
        }

        begin(clearColor, preserve = false) {
            const gl = this.gl;
            this.count = 0;
            if (!preserve) {
                gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
        }

        surface(color, gradient = null) {
            const gl = this.gl;
            gl.useProgram(this.surfaceProgram);
            gl.bindVertexArray(this.surfaceVao);
            gl.uniform4fv(gl.getUniformLocation(this.surfaceProgram, "u_color"), color);
            this._gradientUniforms(this.surfaceProgram, gradient);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        push(x, y, width, height, uv, uvOffset, color, opacity) {
            if (this.count >= this.capacity) {
                this.capacity *= 2;
                const grown = new Float32Array(this.capacity * this.stride);
                grown.set(this.instances);
                this.instances = grown;
            }
            const offset = this.count++ * this.stride;
            const data = this.instances;
            data[offset] = x;
            data[offset + 1] = y;
            data[offset + 2] = width;
            data[offset + 3] = height;
            data[offset + 4] = uv[uvOffset];
            data[offset + 5] = uv[uvOffset + 1];
            data[offset + 6] = uv[uvOffset + 2];
            data[offset + 7] = uv[uvOffset + 3];
            data[offset + 8] = color[0];
            data[offset + 9] = color[1];
            data[offset + 10] = color[2];
            data[offset + 11] = color[3] * opacity;
        }

        _gradientUniforms(program, gradient) {
            const gl = this.gl;
            const texture = gradient ? this.gradientTextures.get(gradient.textureKey) : null;
            const enabled = !!texture;
            gl.uniform1i(gl.getUniformLocation(program, "u_use_gradient"), enabled ? 1 : 0);
            gl.uniform1i(gl.getUniformLocation(program, "u_gradient_type"), gradient?.type === "radial" ? 1 : 0);
            gl.uniform1f(gl.getUniformLocation(program, "u_gradient_angle"), ((gradient?.angle || 0) * Math.PI) / 180);
            if (enabled) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(gl.getUniformLocation(program, "u_gradient"), 1);
            }
        }

        flush(width, height, gradient = null) {
            if (!this.count) return;
            const gl = this.gl;
            gl.useProgram(this.program);
            gl.bindVertexArray(this.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            if (this.instances.byteLength > gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE)) {
                gl.bufferData(gl.ARRAY_BUFFER, this.instances.byteLength, gl.DYNAMIC_DRAW);
            }
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instances.subarray(0, this.count * this.stride));
            gl.uniform2f(gl.getUniformLocation(this.program, "u_viewport"), width, height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
            gl.uniform1i(gl.getUniformLocation(this.program, "u_atlas"), 0);
            this._gradientUniforms(this.program, gradient);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
        }

        /** Reads adapter strings once, only for explicitly enabled diagnostics. */
        getAdapterInfo() {
            if (this._adapterInfo) return this._adapterInfo;
            const gl = this.gl;
            let vendor = "unavailable";
            let renderer = "WebGL2";
            try {
                const extension = gl.getExtension?.("WEBGL_debug_renderer_info");
                if (extension) {
                    vendor = String(gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) || vendor);
                    renderer = String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) || renderer);
                } else if (typeof gl.getParameter === "function") {
                    vendor = String(gl.getParameter(gl.VENDOR) || vendor);
                    renderer = String(gl.getParameter(gl.RENDERER) || renderer);
                }
            } catch {
                // Privacy controls and context loss may reject adapter queries.
            }
            this._adapterInfo = { vendor, renderer };
            return this._adapterInfo;
        }

        destroy() {
            const gl = this.gl;
            if (this.atlasTexture) gl.deleteTexture(this.atlasTexture);
            this.gradientTextures.forEach((texture) => gl.deleteTexture(texture));
            this.gradientTextures.clear();
            [this.cornerBuffer, this.instanceBuffer].forEach((buffer) => { if (buffer) gl.deleteBuffer(buffer); });
            [this.program, this.surfaceProgram].forEach((program) => { if (program) gl.deleteProgram(program); });
        }
    }

    /**
     * Owns one ASCII animation surface, its renderer, timing, image source, and
     * optional sequence state. Running instances share a frame scheduler.
     */
    class asciiam {
        static QUALITY = {
            high: { maxDPR: 3, density: 0.9, targetFPS: null, fontLevels: 6, alphaLevels: 64, useGlyphAtlas: false, cacheStaticWave: false },
            balanced: { maxDPR: 2, density: 1.0, targetFPS: null, fontLevels: 5, alphaLevels: 32, useGlyphAtlas: false, cacheStaticWave: false },
            performance: { maxDPR: 1.5, density: 1.4, targetFPS: null, fontLevels: 4, alphaLevels: 16, useGlyphAtlas: true, cacheStaticWave: false },
            ultra: { maxDPR: 1, density: 2.4, targetFPS: null, fontLevels: 2, alphaLevels: 8, useGlyphAtlas: true, cacheStaticWave: true },
        };

        /** Canonical inventory used by documentation and integration tooling. */
        static BUILT_IN_MODES = Object.freeze([
            "none", "wave", "current", "ripple", "vortex", "plasma", "fadeIn", "fadeOut",
            "irisIn", "irisOut", "dissolveIn", "dissolveOut", "lumaFold", "riftLace",
            "echoBloom", "matrix", "snow", "sparkle", "fire", "starfield", "glitch",
            "typewriter", "orbit", "hoverZone", "clickZone", "image", "custom",
            "mesh", "static", "chart",
        ]);

        static CHARACTER_SETS = {
            density: " .:-=+*#%@",
            ascii: Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join(""),
            asciiExtended: Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join("")
                + Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 161)).join(""),
            extended: "  .'`,^:\";~+_(){}[]<>!?ilI|/\\\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
            alphanumeric: " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            uppercase: " ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            lowercase: " abcdefghijklmnopqrstuvwxyz",
            symbols: " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
            boxDrawing: " ─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬░▒▓█",
            arrows: " ←↑→↓↖↗↘↙↔↕⇐⇑⇒⇓⇔",
            math: " ±×÷=≠≈∞√∑∏∫∆∇∂∈∉⊂⊃≤≥",
            blocks: " ░▒▓█",
            minimal: " .oO@",
            technical: " .·:+=*#%@",
            geometric: " ·•○●□■△▲◇◆",
            circuit: " ·-+=oO0#@",
            waves: " ~≈≋∿",
            terminal: " 01<>/\\|[]{}#@",
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
            vortexFlow: {
                mode: "vortex",
                color: "#C04FFF",
                speed: 0.65,
                edgeFade: 0.2,
                gradient: { type: "radial", center: [0.5, 0.5], radius: 0.9, stops: ["#4FA8FF", "#C04FFF"], steps: 2 },
            },
            plasmaField: {
                mode: "plasma",
                color: "#72F1B8",
                speed: 0.55,
                minOpacity: 0.04,
                maxOpacity: 0.68,
                gradient: { type: "linear", angle: 25, stops: ["#72F1B8", "#4FA8FF", "#C04FFF"], steps: 3 },
            },
            introReveal: { mode: "fadeIn", color: "#4FA8FF", speed: 1, loop: false, revealDirection: "left-to-right" },
            outroFade: { mode: "fadeOut", color: "#4FA8FF", speed: 1, loop: false, revealDirection: "right-to-left" },
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
            hoverField: {
                mode: "hoverZone",
                color: "#72F1B8",
                charSet: " .·:+=*#%@",
                interactionRadius: 180,
                minOpacity: 0.025,
                maxOpacity: 0.9,
            },
            clickPulse: {
                mode: "clickZone",
                color: "#C04FFF",
                charSet: " ·•○●□■△▲◇◆",
                interactionRadius: 220,
                interactionDuration: 1.1,
                minOpacity: 0.02,
                maxOpacity: 0.95,
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
            risingEmbers: {
                mode: "fire",
                color: "#FF9D5C",
                speed: 0.7,
                fireDensity: 0.035,
                trail: 0.18,
                trailColor: "#070809",
                charSet: " .·+*#",
                gradient: { type: "linear", angle: 90, stops: ["#FFDF8A", "#FF9D5C", "#C04F32"], steps: 3 },
            },
            deepSpace: {
                mode: "starfield",
                color: "#E8EEF7",
                speed: 0.65,
                starfieldDensity: 0.018,
                charSet: " ·+*",
            },
            signalGlitch: {
                mode: "glitch",
                color: "#72F1B8",
                speed: 0.8,
                charSet: " 01<>/\\|#@",
                glitchIntensity: 0.32,
            },
            terminalType: {
                mode: "typewriter",
                color: "#72F1B8",
                speed: 1,
                loop: true,
                typewriterDuration: 4.5,
                charSet: " 01ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            },
            orbitalFlow: {
                mode: "orbit",
                color: "#C04FFF",
                speed: 0.55,
                orbitDensity: 0.014,
                trail: 0.12,
                trailColor: "#070809",
                charSet: " ·+*#",
            },
            imageReveal: {
                mode: "image",
                color: "#4FA8FF",
                imageScale: 1,
                imageScaleX: 1,
                imageScaleY: 1,
                imageFov: 1,
                fit: "cover",
                colorFromImage: true,
                animateImageMask: true,
            },
            telemetryChart: {
                mode: "chart",
                color: "#4FA8FF",
                chartType: "bar",
                chartTitle: "System Telemetry",
                chartData: [12, 45, 78, 34, 90, 60, 85, 40],
            },
        };

        // Registry for user-defined named modes: asciiam.registerMode('name', fn)
        static _registry = {};
        static _glyphAtlases = new Map();
        static _glyphAtlasLimit = 2;
        static _waveBaseLayers = new Map();
        static _waveBaseLayerLimit = 2;
        static _activeInstances = new Set();
        static _schedulerRaf = null;
        /** Ensures all running instances are served by one animation-frame callback. */
        static _scheduleFrame() {
            if (asciiam._schedulerRaf !== null || !asciiam._activeInstances.size) return;
            asciiam._schedulerRaf = requestAnimationFrame(asciiam._tickFrame);
        }
        /** Advances every active instance, then schedules the next shared frame. */
        static _tickFrame(t) {
            asciiam._schedulerRaf = null;
            for (const instance of asciiam._activeInstances) instance._runFrame(t);
            asciiam._scheduleFrame();
        }
        /** Registers a process-wide named cell callback. */
        static registerMode(name, fn) {
            asciiam._registry[name] = fn;
        }

        /** Create dependency-free geometry suitable for setMesh(). */
        static createMeshPrimitive(name, options) {
            if (name === "cube") return createCubeMesh(options?.size);
            if (name === "plane") return createPlaneMesh(options);
            if (name === "icosphere") return createIcosphereMesh(options);
            if (name === "torus") return createTorusMesh(options);
            throw new TypeError(`asciiam: unknown mesh primitive "${name}"`);
        }

        /** Decode a glTF 2.0 or GLB v2 source without constructing a renderer. */
        static loadModel(source, options) {
            return loadGltf(source, options);
        }

        /** Register a custom decoder callback for a compressed glTF extension (e.g. KHR_draco_mesh_compression). */
        static registerGltfDecoder(name, decoderFn) {
            return registerGltfDecoder(name, decoderFn);
        }

        /** Returns list of registered glTF extension decoders. */
        static getGltfDecoders() {
            return getGltfDecoders();
        }

        /** Feature-detect before constructing, for graceful fallback in older browsers. */
        static isSupported() {
            try {
                const c = document.createElement("canvas");
                return !!(c.getContext && (c.getContext("webgl2") || c.getContext("2d")));
            } catch {
                return false;
            }
        }

        /** Creates an instance around a container or application-owned canvas. */
        constructor(target, opts = {}) {
            const el = typeof target === "string" ? document.querySelector(target) : target;
            if (!el) throw new Error("asciiam: target not found");
            this._gpuPreferred = opts.preferGPU !== false;
            this._desynchronized = this._gpuPreferred && opts.desynchronized !== false;
            this._rendererRequested = opts.renderer || (this._gpuPreferred ? "auto" : "canvas2d");
            if (!["auto", "webgl2", "canvas2d"].includes(this._rendererRequested)) {
                throw new TypeError('asciiam: renderer must be "auto", "webgl2", or "canvas2d"');
            }
            if (!asciiam.isSupported()) {
                console.warn("asciiam: canvas 2D not supported in this browser — instance is a no-op.");
                this._disabled = true;
                this.start = this.stop = this.destroy = this.setMode = this.setOption = this.setTarget = this.setCursor = this.triggerInteraction = this.clearImage = this.setMesh = this.clearMesh = this.clearModel =
                    this.setSequence = this.playSequence = this.pauseSequence = this.stopSequence = this.clearSequence =
                    this.seekSequence = this.nextSequenceStep = this.setRenderer = this.setLayers = () => {};
                this.getLayers = () => [];
                this.getSequenceState = () => ({ configured: false, running: false, completed: false, index: -1, length: 0, loop: false, elapsed: 0, waiting: false, loading: false, morphing: false, morphProgress: 0 });
                this.getRendererInfo = () => ({ requested: "canvas2d", backend: "canvas2d", gpuPreferred: false, acceleration: "not-requested", desynchronized: false, willReadFrequently: false });
                this.getStats = () => ({ fps: 0, estimatedRefreshRate: null, frameWorkMs: null, cells: 0, drawn: 0, occupancy: 0, renderer: this.getRendererInfo(), quality: null, dpr: 1, mesh: this.getMeshInfo() });
                this.on = () => () => {};
                this.off = () => {};
                this.setImage = () => Promise.resolve(null);
                this.setModel = () => Promise.resolve(null);
                this.getMeshInfo = () => ({ loaded: false, vertexCount: 0, primitiveCount: 0, primitive: null });
                return;
            }

            if (el.tagName === "CANVAS") {
                this.canvas = el;
                this.container = el.parentElement;
                this._ownsCanvas = false;
            } else {
                this.container = el;
                this.canvas = document.createElement("canvas");
                this._ownsCanvas = true;
                this.canvas.style.cssText = "display:block;width:100%;height:100%;position:absolute;inset:0;" + "z-index:-1;pointer-events:none;contain:strict;";
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
            if (this._gpuPreferred) {
                this.canvas.style.willChange = "transform";
                this.canvas.style.backfaceVisibility = "hidden";
                if (this._ownsCanvas) this.canvas.style.transform = "translateZ(0)";
            }
            this._webgl = null;
            let webglInitializationFailed = false;
            if (this._rendererRequested !== "canvas2d") {
                try {
                    this._webgl = new WebGL2GlyphRenderer(this.canvas, {
                        desynchronized: this._desynchronized,
                        powerPreference: opts.powerPreference,
                    });
                } catch (error) {
                    webglInitializationFailed = true;
                    if (this._rendererRequested === "webgl2") console.warn("asciiam: WebGL2 initialization failed; using Canvas 2D.", error);
                }
            }
            this._renderer = this._webgl ? "webgl2" : "canvas2d";
            if (this._webgl) this._bindWebGLFallback();
            if (!this._webgl) {
                const contextAttributes = {
                    alpha: true,
                    desynchronized: this._desynchronized,
                    willReadFrequently: false,
                };
                try {
                    this.ctx = this.canvas.getContext("2d", contextAttributes);
                } catch {
                    this.ctx = this.canvas.getContext("2d", { alpha: true });
                }
                if (!this.ctx) this.ctx = this.canvas.getContext("2d", { alpha: true });
                if (!this.ctx && webglInitializationFailed) {
                    this._replacePresentationCanvas();
                    this.ctx = this.canvas.getContext("2d", contextAttributes) || this.canvas.getContext("2d", { alpha: true });
                }
            } else {
                const measureCanvas = document.createElement("canvas");
                this.ctx = measureCanvas.getContext("2d", { alpha: true, willReadFrequently: false });
            }
            if (!this.ctx) {
                console.warn("asciiam: failed to acquire 2D context — instance is a no-op.");
                this._disabled = true;
                this.start = this.stop = this.destroy = this.setMode = this.setOption = this.setTarget = this.setCursor = this.triggerInteraction = this.setMesh = this.clearMesh = this.clearModel =
                    this.setSequence = this.playSequence = this.pauseSequence = this.stopSequence = this.clearSequence =
                    this.seekSequence = this.nextSequenceStep = this.setRenderer = this.setLayers = () => {};
                this.getLayers = () => [];
                this.getSequenceState = () => ({ configured: false, running: false, index: -1, length: 0, loop: false, elapsed: 0, waiting: false });
                this.getRendererInfo = () => ({ requested: this._rendererRequested, backend: "canvas2d", gpuPreferred: false, acceleration: "not-requested", desynchronized: false, willReadFrequently: false });
                this.getStats = () => ({ fps: 0, estimatedRefreshRate: null, frameWorkMs: null, cells: 0, drawn: 0, occupancy: 0, renderer: this.getRendererInfo(), quality: null, dpr: 1, mesh: this.getMeshInfo() });
                this.on = () => () => {};
                this.off = () => {};
                this.setImage = () => Promise.resolve(null);
                this.setModel = () => Promise.resolve(null);
                this.getMeshInfo = () => ({ loaded: false, vertexCount: 0, primitiveCount: 0, primitive: null });
                return;
            }

            const quality = asciiam.QUALITY[opts.quality] || asciiam.QUALITY.balanced;

            this.opts = Object.assign(
                {
                    quality: asciiam.QUALITY[opts.quality] ? opts.quality : "balanced",
                    mode: "wave",
                    charSet: asciiam.CHARACTER_SETS.asciiExtended,
                    fontFamily: "'IBM Plex Mono', ui-monospace, Consolas, monospace",
                    fontSize: 14,
                    density: quality.density,
                    resolutionScale: 1,
                    color: "#4FA8FF",
                    gradient: null,
                    background: "transparent",
                    backdrop: null,
                    speed: 1,
                    direction: "horizontal",
                    revealDirection: "center",
                    revealDuration: 2.2,
                    align: "center",
                    minOpacity: 0.05,
                    maxOpacity: 0.85,
                    boldOnPeak: true,
                    loop: true,
                    image: null,
                    imageChars: asciiam.CHARACTER_SETS.asciiExtended,
                    imageScale: 1,
                    imageScaleX: 1,
                    imageScaleY: 1,
                    imageFov: 1,
                    imageRotation: 0,
                    imageFlipX: false,
                    imageFlipY: false,
                    fit: "cover",
                    imageLuminance: "auto",
                    colorFromImage: false,
                    imageBrightness: 1,
                    imageContrast: 1,
                    animateImageMask: true,
                    imageMaskMode: "waveSweep",
                    imageAnimationRange: null, // { min:'#000000', max:'#ffffff' }; null animates every sampled color
                    animateImageFrames: true,
                    imageFrameRate: 12,
                    edgeFade: 0,
                    maxDPR: quality.maxDPR,
                    targetFPS: quality.targetFPS,
                    showStats: false,
                    extendedStats: false,
                    fontLevels: quality.fontLevels || 6,
                    alphaLevels: quality.alphaLevels || 32,
                    useGlyphAtlas: !!quality.useGlyphAtlas,
                    cacheStaticWave: !!quality.cacheStaticWave,
                    preferGPU: this._gpuPreferred,
                    desynchronized: this._desynchronized,
                    renderer: this._rendererRequested,
                    powerPreference: opts.powerPreference || "high-performance",
                    respectReducedMotion: true,
                    onReady: null,
                    onImageError: null,
                    onModelError: null,
                    sequence: null,
                    sequenceOptions: null,
                    layers: Array.isArray(opts.layers) ? opts.layers : null,

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
                    interactionRadius: 180,
                    interactionDuration: 1.1,

                    // --- sparse mode density ---
                    snowDensity: 0.02,
                    sparkleDensity: 0.05,
                    fireDensity: 0.035,
                    starfieldDensity: 0.018,
                    orbitDensity: 0.014,

                    // --- dense mode timing / strength ---
                    glitchIntensity: 0.32,
                    typewriterDuration: 4.5,

                    // --- dependency-free 3D-to-ASCII source ---
                    mesh: null,
                    meshPrimitive: null,
                    meshStyle: "wireframe",
                    meshProjection: "perspective",
                    meshCamera: null,
                    meshTransform: null,
                    meshLight: null,
                    meshAutoRotate: true,
                    meshRotationSpeed: [0.2, 0.45, 0.1],
                    meshMaxVertices: 100000,
                    meshMaxPrimitives: 100000,
                    model: null,

                    // --- dependency-free ASCII chart source ---
                    chartData: null, // number[] | {label, value, color}[] | number[][]
                    chartType: "bar", // bar | horizontalBar | line | sparkline | heatmap | donut
                    chartTitle: "",
                    chartShowValues: true,
                    chartShowAxes: true,

                    // --- extensibility ---
                    customCell: null, // (api) => ({char,opacity,intensity,bold,color}) | null
                },
                opts,
            );

            this._time = 0;
            this._raf = null;
            this._running = false;
            this._visible = true;
            this._lastT = null;
            this._acc = 0;
            this._resizePending = false;
            this._resizeRaf = null;
            this._lastFillStyle = null;
            this._lastFont = null;
            this._lastAlpha = -1;
            this._activeGlyphAtlas = null;
            this._waveBaseLayer = null;
            this._gradientKey = null;
            this._gradientObj = null;
            this._gradientSource = null;
            this._backdropGradientKey = null;
            this._backdropGradientObj = null;
            this._edgeFadeCache = null;
            this._cell = { char: " ", opacity: 0, level: 0, bold: false, color: null };
            this._frames = 0;
            this._fps = 0;
            this._statsEl = null;
            this._statsWindowStart = null;
            this._extendedStats = null;
            this._warnedZeroSize = false;
            this._pulseFactor = 1;
            this._animatedColor = null;
            this._cursor = null;
            this._interaction = null;
            this._canvasRect = null;
            this._sequence = null;
            this._applyingSequence = false;
            this._events = new Map();
            this._morph = null;
            this._destroyed = false;
            this._animatedImage = false;
            this._imageFrameAccumulator = 0;
            this._capturedImageFrames = null;
            this._imageFrameIndex = 0;
            this._imageLoadToken = 0;
            this._imageCaptureToken = 0;
            this._animatedImageData = null;
            this._imageRecaptureTimer = null;
            this._imageSampleCanvas = null;
            this._imageSampleContext = null;
            this._imageOrientCanvas = null;
            this._imageOrientContext = null;
            this._loadedImageSource = null;
            this._loadedImageOptionsKey = null;
            this._mesh = null;
            this._meshRasterizer = null;
            this._meshBaseRotation = new Float64Array(3);
            this._meshRotation = new Float64Array(3);
            this._meshPosition = new Float64Array(3);
            this._meshScale = new Float64Array([1, 1, 1]);
            this._meshRasterOptions = {
                style: this.opts.meshStyle,
                projection: this.opts.meshProjection,
                camera: this.opts.meshCamera,
                transform: { position: this._meshPosition, rotation: this._meshRotation, scale: this._meshScale },
                light: this.opts.meshLight,
            };
            this._modelLoadToken = 0;
            this._modelAbortController = null;
            this._loadedModelSource = null;
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
            this._layers = this._normalizeLayers(this.opts.layers);
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
            if (this.opts.mesh) this.setMesh(this.opts.mesh);
            else if (this.opts.meshPrimitive) {
                const primitiveName = this.opts.meshPrimitive;
                this.setMesh(asciiam.createMeshPrimitive(primitiveName));
                this.opts.meshPrimitive = primitiveName;
            }
            if (this.opts.model) this.setModel(this.opts.model).catch(() => {});
            if (Array.isArray(this.opts.sequence) && this.opts.sequence.length) {
                const sequenceOptions = this.opts.sequenceOptions || {};
                this.setSequence(this.opts.sequence, sequenceOptions);
                if (sequenceOptions.autoplay) this.playSequence();
            }
            Promise.resolve().then(() => {
                if (this._destroyed) return;
                const detail = { width: this.w, height: this.h, cols: this.cols, rows: this.rows };
                this._emit("ready", detail);
                if (typeof this.opts.onReady === "function") this.opts.onReady(this);
            });
        }

        // ---- public API ----
        /** Starts or resumes this instance on the shared frame scheduler. */
        start() {
            if (this._disabled || this._running) return;
            if (this._reduced) {
                this._draw(16.7);
                return;
            }
            this._running = true;
            this._raf = true;
            asciiam._activeInstances.add(this);
            asciiam._scheduleFrame();
        }
        /** Stops frame scheduling while retaining renderer and animation state. */
        stop() {
            if (!this._running) return;
            this._running = false;
            this._raf = null;
            asciiam._activeInstances.delete(this);
            if (!asciiam._activeInstances.size && asciiam._schedulerRaf !== null) {
                cancelAnimationFrame(asciiam._schedulerRaf);
                asciiam._schedulerRaf = null;
            }
        }
        /** Releases observers, listeners, renderer resources, and owned DOM. */
        destroy() {
            this._destroyed = true;
            this.stop();
            this._clearMorph();
            if (this._io) this._io.disconnect();
            if (this._ro) this._ro.disconnect();
            if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
            document.removeEventListener("visibilitychange", this._onVisChange);
            if (this._onResize) window.removeEventListener("resize", this._onResize);
            if (this._mq)
                this._mq.removeEventListener ? this._mq.removeEventListener("change", this._onMqChange) : this._mq.removeListener(this._onMqChange);
            this._unbindCursor();
            if (this._onWebGLContextLost) this.canvas.removeEventListener("webglcontextlost", this._onWebGLContextLost);
            if (this._webgl) this._webgl.destroy();
            this._sourceImage = null;
            this._imageGrid = null;
            this._capturedImageFrames = null;
            this._animatedImageData = null;
            this._imageLoadToken++;
            this._imageCaptureToken++;
            if (this._imageRecaptureTimer !== null) clearTimeout(this._imageRecaptureTimer);
            this._imageRecaptureTimer = null;
            this._imageSampleCanvas = null;
            this._imageSampleContext = null;
            this._imageOrientCanvas = null;
            this._imageOrientContext = null;
            this._mesh = null;
            this._meshRasterizer = null;
            this._modelLoadToken++;
            this._modelAbortController?.abort();
            this._modelAbortController = null;
            this._loadedModelSource = null;
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
            this._events.clear();
        }

        /** Advances time-dependent state in a fixed order before presenting a frame. */
        _runFrame(t) {
            if (!this._running) return;
            if (document.hidden || !this._visible) {
                this._lastT = null;
                this._statsWindowStart = null;
                return;
            }
            const hasPreviousFrame = this._lastT !== null;
            const dt = hasPreviousFrame ? t - this._lastT : 16.7;
            this._lastT = t;

            const measureExtendedStats = !!(this.opts.showStats && this.opts.extendedStats);
            if (measureExtendedStats && hasPreviousFrame) this._sampleDisplayRefresh(dt);

            if (this.opts.targetFPS) {
                this._acc += dt;
                const frameDur = 1000 / this.opts.targetFPS;
                if (this._acc < frameDur) return;
                this._acc %= frameDur;
            }

            const frameWorkStart = measureExtendedStats && globalThis.performance?.now
                ? globalThis.performance.now()
                : null;

            this._advanceMorph(dt);
            if (this._sequence?.running) this._advanceSequence(dt);
            this._time += dt * 0.001 * this.opts.speed;
            if (this._interaction) {
                // Interaction duration is wall-clock based; changing animation speed
                // must not make a click gesture feel shorter or longer.
                this._interaction.elapsed += dt * 0.001;
                const duration = Math.max(0.05, Number(this.opts.interactionDuration) || 1.1);
                if (this._interaction.elapsed >= duration) this._interaction = null;
            }
            this._advanceImageFrames(dt);
            this._draw(dt);
            if (this._events.get("frame")?.size) {
                this._emit("frame", { time: this._time, delta: dt, drawn: this._lastDrawnCount });
            }
            if (this.opts.showStats) {
                const frameWorkMs = frameWorkStart === null ? 0 : Math.max(0, globalThis.performance.now() - frameWorkStart);
                this._updateStats(t, frameWorkMs);
            }
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
        /** Removes a previously registered lifecycle listener. */
        off(event, listener) {
            const listeners = this._events.get(event);
            if (!listeners) return;
            listeners.delete(listener);
            if (!listeners.size) this._events.delete(event);
        }
        /** Changes the algorithm and restarts its mode-local timeline. */
        setMode(mode, fromSequence = false) {
            if (!fromSequence && this._sequence?.running) {
                if (this._sequence.stepStarted || this._sequence.stepLoading) this._interruptSequenceStep("mode-change");
                this.pauseSequence("mode-change");
                this._sequence.elapsed = 0;
                this._sequence.delayElapsed = 0;
                this._emit("sequenceInterrupt", this._sequenceDetail({ reason: "mode-change" }));
            }
            this.opts.mode = mode;
            if (mode === "clickZone") this._interaction = null;
            // Mode-local timelines are expected to begin when a mode is selected.
            // Without this reset, one-shot modes can be complete before their first
            // visible frame when selected on a long-running instance.
            this._time = 0;
            this._lastT = null;
            if (mode === "matrix") this._initMatrix();
            if (mode === "snow") this._initSnow();
            if (mode === "sparkle") this._initSparkle();
            if (mode === "fire") this._initFire();
            if (mode === "starfield") this._initStarfield();
            if (mode === "orbit") this._initOrbit();
        }
        /** Updates one option and rebuilds only its dependent state or caches. */
        setOption(key, value) {
            if (key === "layers") {
                this.setLayers(value);
                return;
            }
            if (key === "mode") {
                this.setMode(value);
                return;
            }
            if (key === "quality") {
                const quality = asciiam.QUALITY[value];
                if (!quality) return;
                this.opts.quality = value;
                Object.assign(this.opts, quality);
                this._buildFontCache();
                this._resize();
                return;
            }
            this.opts[key] = value;
            if (key === "extendedStats" && !value) this._extendedStats = null;
            if (key === "fontSize" || key === "density" || key === "resolutionScale") {
                this._buildFontCache();
                this._resize();
            }
            if (key === "fontFamily") {
                this._buildFontCache();
                this._resize();
            }
            if (key === "fontLevels") {
                this._buildFontCache();
            }
            if (key === "color" || key === "charSet" || key === "useGlyphAtlas") {
                this._activeGlyphAtlas = null;
                this._waveBaseLayer = null;
            }
            if (key === "maxDPR") {
                this._resize();
            }
            if (key === "gradient") {
                this._gradientKey = null;
                this._gradientSource = null;
            }
            if (key === "backdrop") {
                this._backdropGradientKey = null;
                this._backdropGradientObj = null;
            }
            if (key === "edgeFade") {
                this._buildEdgeFadeCache();
                this._waveBaseLayer = null;
            }
            if (key === "align") {
                this._buildSpatialCache();
                this._buildCurrentCache();
            }
            if ((key === "revealDirection" || key === "revealDuration") && ["fadeIn", "fadeOut", "irisIn", "irisOut", "dissolveIn", "dissolveOut"].includes(this.opts.mode)) {
                this._time = 0;
                this._lastT = null;
            }
            if (key === "imageScale" || key === "imageScaleX" || key === "imageScaleY" || key === "imageFov" || key === "imageRotation" || key === "imageFlipX" || key === "imageFlipY" || key === "fit" || key === "imageChars" || key === "imageLuminance" || key === "colorFromImage" || key === "imageAnimationRange" || key === "imageBrightness" || key === "imageContrast") {
                if (this._sourceImage) this._resampleImage();
                this._scheduleAnimatedFrameCapture();
            }
            if (key === "animateImageFrames") {
                this._imageFrameAccumulator = 0;
            }
            if (key === "snowDensity") {
                this._initSnow();
            }
            if (key === "sparkleDensity") {
                this._initSparkle();
            }
            if (key === "fireDensity") {
                this._initFire();
            }
            if (key === "starfieldDensity") {
                this._initStarfield();
            }
            if (key === "orbitDensity") {
                this._initOrbit();
            }
            if (key === "mesh") {
                if (value) this.setMesh(value);
                else this.clearMesh();
            }
            if (key === "meshPrimitive") {
                if (value) {
                    this.setMesh(asciiam.createMeshPrimitive(value));
                    this.opts.meshPrimitive = value;
                }
                else if (!this.opts.model) this.clearMesh();
            }
            if (key === "model") {
                if (value) this.setModel(value).catch(() => {});
                else this.clearModel();
            }
            if (key === "meshStyle" || key === "meshProjection" || key === "meshCamera" || key === "meshLight") {
                this._syncMeshOptions();
            }
            if (key === "meshTransform" || key === "meshRotationSpeed") {
                this._syncMeshOptions();
            }
            if (key === "respectReducedMotion") {
                this._reduced = !!(this._mq && this._mq.matches && value);
                if (this._reduced) {
                    this.stop();
                    this._draw(16.7);
                }
            }
        }

        /** Sets an array of layer configurations to composite in order during frame rendering. */
        setLayers(layers) {
            this._layers = this._normalizeLayers(layers);
            this.opts.layers = this._layers;
            return this;
        }

        /** Returns the current list of active composition layers. */
        getLayers() {
            return this._layers ? this._layers.map((l) => ({
                mode: l.mode,
                options: l.options ? Object.assign({}, l.options) : null,
                opacity: l.opacity,
                blendMode: l.blendMode,
            })) : [];
        }

        _normalizeLayers(layers) {
            if (!Array.isArray(layers) || layers.length === 0) return null;
            return layers.map((layer) => ({
                mode: typeof layer.mode === "string" ? layer.mode : "wave",
                options: layer.options && typeof layer.options === "object" ? Object.assign({}, layer.options) : null,
                opacity: typeof layer.opacity === "number" ? Math.max(0, Math.min(1, layer.opacity)) : 1.0,
                blendMode: typeof layer.blendMode === "string" ? layer.blendMode : "source-over",
            }));
        }

        /** Validate and retain typed-array geometry for the mesh animation mode. */
        setMesh(mesh) {
            this._mesh = normalizeMeshData(mesh, {
                maxVertices: this.opts.meshMaxVertices,
                maxPrimitives: this.opts.meshMaxPrimitives,
            });
            this.opts.mesh = mesh;
            this.opts.meshPrimitive = null;
            if (!this._meshRasterizer) this._meshRasterizer = new MeshCellRasterizer(this.cols || 1, this.rows || 1);
            else this._meshRasterizer.resize(this.cols || 1, this.rows || 1);
            this._syncMeshOptions();
            this._emit("meshReady", this.getMeshInfo());
            return this;
        }

        /** Release retained geometry and raster buffers. */
        clearMesh() {
            this._mesh = null;
            this.opts.mesh = null;
            this.opts.meshPrimitive = null;
            this._meshRasterizer = null;
            this._emit("meshClear", this.getMeshInfo());
            return this;
        }

        /** Report normalized topology without exposing mutable internal buffers. */
        getMeshInfo() {
            return {
                loaded: !!this._mesh,
                vertexCount: this._mesh?.vertexCount || 0,
                primitiveCount: this._mesh?.primitiveCount || 0,
                primitive: this._mesh?.primitive || null,
                style: this.opts.meshStyle,
                projection: this.opts.meshProjection,
            };
        }

        /** Decode and retain a glTF 2.0 or GLB v2 model with cancellation and progress events. */
        async setModel(source, options = {}) {
            if (source === null || source === undefined || source === "") {
                this.clearModel();
                return null;
            }
            const token = ++this._modelLoadToken;
            this._modelAbortController?.abort();
            const controller = new AbortController();
            this._modelAbortController = controller;
            const abortFromCaller = () => controller.abort();
            options.signal?.addEventListener("abort", abortFromCaller, { once: true });
            this.opts.model = source;
            this._emit("modelLoadStart", { source });
            try {
                const mesh = await loadGltf(source, {
                    ...options,
                    signal: controller.signal,
                    limits: {
                        maxVertices: this.opts.meshMaxVertices,
                        maxPrimitives: this.opts.meshMaxPrimitives,
                        ...options.limits,
                    },
                    onProgress: (progress) => {
                        options.onProgress?.(progress);
                        if (token === this._modelLoadToken) this._emit("modelProgress", progress);
                    },
                });
                if (token !== this._modelLoadToken || this._destroyed) return null;
                this._loadedModelSource = source;
                this.setMesh(mesh);
                this.opts.model = source;
                this._emit("modelReady", { source, ...this.getMeshInfo() });
                return mesh;
            } catch (error) {
                if (token !== this._modelLoadToken || error?.name === "AbortError") return null;
                this._emit("modelError", { source, error });
                if (typeof this.opts.onModelError === "function") this.opts.onModelError(error);
                throw error;
            } finally {
                options.signal?.removeEventListener("abort", abortFromCaller);
                if (token === this._modelLoadToken) this._modelAbortController = null;
            }
        }

        /** Cancel model loading and release its retained geometry. */
        clearModel() {
            this._modelLoadToken++;
            this._modelAbortController?.abort();
            this._modelAbortController = null;
            this._loadedModelSource = null;
            this.opts.model = null;
            this.clearMesh();
            this._emit("modelClear", {});
            return this;
        }

        /** Copy public mesh options into stable arrays consumed by the hot raster loop. */
        _syncMeshOptions() {
            const copyVector = (value, output, fallback) => {
                for (let index = 0; index < 3; index++) {
                    const candidate = Number(value?.[index]);
                    output[index] = Number.isFinite(candidate) ? candidate : fallback[index];
                }
            };
            const transform = this.opts.meshTransform;
            copyVector(transform?.position, this._meshPosition, [0, 0, 0]);
            copyVector(transform?.rotation, this._meshBaseRotation, [0, 0, 0]);
            copyVector(transform?.scale, this._meshScale, [1, 1, 1]);
            this._meshRotation.set(this._meshBaseRotation);
            this._meshRasterOptions.style = this.opts.meshStyle;
            this._meshRasterOptions.projection = this.opts.meshProjection;
            this._meshRasterOptions.camera = this.opts.meshCamera;
            this._meshRasterOptions.light = this.opts.meshLight;
        }

        /** Move the existing renderer to another container without creating a second animation loop. */
        setTarget(target) {
            const next = typeof target === "string" ? document.querySelector(target) : target;
            if (!next) throw new Error("asciiam: target not found");
            if (next === this.container) {
                this._scheduleResize();
                return;
            }

            this._unbindCursor();
            if (this._ro) this._ro.disconnect();
            if (getComputedStyle(next).position === "static") next.style.position = "relative";
            next.style.isolation = "isolate";
            next.insertBefore(this.canvas, next.firstChild);
            this.container = next;
            this._bindCursor();

            if (this._ro && "ResizeObserver" in window) {
                this._ro = new ResizeObserver(() => this._scheduleResize());
                this._ro.observe(next);
            }
            this._resize();
        }

        /** Configure an ordered set of mode steps without starting it. */
        setSequence(steps, options = {}) {
            if (!Array.isArray(steps)) throw new TypeError("asciiam: sequence steps must be an array");
            if (this._sequence?.running) {
                if (this._sequence.stepStarted || this._sequence.stepLoading) this._interruptSequenceStep("reconfigure");
                this.pauseSequence("reconfigure");
            }
            const normalized = steps.map((step, index) => {
                if (!step || typeof step !== "object") throw new TypeError(`asciiam: sequence step ${index} must be an object`);
                if (typeof step.mode !== "string" || !step.mode) throw new TypeError(`asciiam: sequence step ${index} requires a mode`);
                const duration = Number(step.duration);
                const delay = Number(step.delay);
                const transitionDuration = Number(step.transition?.duration);
                const transition = step.transition?.type === "morph" ? {
                    type: "morph",
                    duration: Number.isFinite(transitionDuration) && transitionDuration > 0 ? transitionDuration : 0.8,
                    easing: ["linear", "easeIn", "easeOut", "easeInOut"].includes(step.transition.easing)
                        ? step.transition.easing
                        : "easeInOut",
                } : { type: "cut", duration: 0, easing: "linear" };
                return {
                    id: step.id || `step-${index + 1}`,
                    label: step.label || step.mode,
                    mode: step.mode,
                    duration: Number.isFinite(duration) && duration > 0 ? duration : 5,
                    delay: Number.isFinite(delay) && delay > 0 ? delay : 0,
                    // `repeat` controls a mode's finite timeline within this step.
                    // Preserve configurations that previously used options.loop,
                    // while keeping one-shot sequence steps as the default.
                    repeat: step.repeat === true || (step.repeat === undefined && step.options?.loop === true),
                    // `undefined` retains the current image, `null` clears it, and a
                    // string loads a new source before this step's duration begins.
                    image: Object.prototype.hasOwnProperty.call(step, "image")
                        ? (step.image === null ? null : String(step.image))
                        : undefined,
                    imageOptions: step.imageOptions && typeof step.imageOptions === "object" ? { ...step.imageOptions } : {},
                    // Models follow the same retained-source contract as images:
                    // omitted retains, null clears, and a source waits for decode.
                    model: Object.prototype.hasOwnProperty.call(step, "model") ? step.model : undefined,
                    modelOptions: step.modelOptions && typeof step.modelOptions === "object" ? { ...step.modelOptions } : {},
                    options: step.options && typeof step.options === "object" ? { ...step.options } : {},
                    transition,
                    onStart: typeof step.onStart === "function" ? step.onStart : null,
                    onComplete: typeof step.onComplete === "function" ? step.onComplete : null,
                    onInterrupt: typeof step.onInterrupt === "function" ? step.onInterrupt : null,
                    onError: typeof step.onError === "function" ? step.onError : null,
                };
            });
            this._sequence = {
                steps: normalized,
                index: -1,
                elapsed: 0,
                delayElapsed: 0,
                stepStarted: false,
                stepLoading: false,
                activationToken: 0,
                startedOnce: false,
                completed: false,
                running: false,
                loop: options.loop !== false,
                onStepStart: typeof options.onStepStart === "function" ? options.onStepStart : null,
                onStepComplete: typeof options.onStepComplete === "function" ? options.onStepComplete : null,
                onStepInterrupt: typeof options.onStepInterrupt === "function" ? options.onStepInterrupt : null,
                onComplete: typeof options.onComplete === "function" ? options.onComplete : null,
            };
            this.opts.sequence = normalized;
            this.opts.sequenceOptions = { ...options, loop: options.loop !== false, autoplay: !!options.autoplay };
            return this;
        }

        /** Start or resume the configured sequence. Also starts the renderer if needed. */
        playSequence(startIndex) {
            const sequence = this._sequence;
            if (!sequence || !sequence.steps.length) return this;
            const shouldRestart = sequence.index < 0 || sequence.completed;
            sequence.running = true;
            if (startIndex !== undefined || shouldRestart) {
                const index = startIndex === undefined ? 0 : this._normalizeSequenceIndex(startIndex);
                this._activateSequenceStep(index);
            }
            this._emit(shouldRestart ? "sequenceStart" : "sequenceResume", this._sequenceDetail());
            this.start();
            return this;
        }

        /** Pauses sequence time without stopping the renderer. */
        pauseSequence(reason = "pause") {
            if (!this._sequence?.running) return this;
            this._sequence.running = false;
            this._emit("sequencePause", this._sequenceDetail({ reason }));
            return this;
        }

        /** Stops sequence playback and resets its position. */
        stopSequence() {
            if (!this._sequence) return this;
            if (this._sequence.stepStarted || this._sequence.stepLoading) this._interruptSequenceStep("stop");
            this._sequence.running = false;
            this._sequence.index = -1;
            this._sequence.elapsed = 0;
            this._sequence.delayElapsed = 0;
            this._sequence.stepStarted = false;
            this._sequence.stepLoading = false;
            this._sequence.activationToken++;
            this._sequence.startedOnce = false;
            this._sequence.completed = false;
            this._clearMorph();
            this._emit("sequenceStop", this._sequenceDetail({ reason: "stop" }));
            return this;
        }

        /** Removes the configured sequence and transient morph state. */
        clearSequence() {
            this.stopSequence();
            this._sequence = null;
            this.opts.sequence = null;
            this.opts.sequenceOptions = null;
            return this;
        }

        /** Selects a step using normalized wraparound indexing. */
        seekSequence(index) {
            if (!this._sequence?.steps.length) return this;
            if (this._sequence.stepStarted || this._sequence.stepLoading) this._interruptSequenceStep("seek");
            this._activateSequenceStep(this._normalizeSequenceIndex(index));
            return this;
        }

        /** Interrupts the active step and advances according to loop policy. */
        nextSequenceStep() {
            const sequence = this._sequence;
            if (!sequence?.steps.length) return this;
            if (sequence.stepStarted || sequence.stepLoading) this._interruptSequenceStep("skip");
            const next = sequence.index + 1;
            if (next < sequence.steps.length) this._activateSequenceStep(next);
            else if (sequence.loop) {
                this._emit("sequenceLoop", this._sequenceDetail());
                this._activateSequenceStep(0);
            } else this._completeSequence();
            return this;
        }

        /** Returns a serializable snapshot of sequence playback state. */
        getSequenceState() {
            const sequence = this._sequence;
            return {
                configured: !!sequence?.steps.length,
                running: !!sequence?.running,
                completed: !!sequence?.completed,
                index: sequence?.index ?? -1,
                length: sequence?.steps.length ?? 0,
                loop: sequence?.loop ?? false,
                elapsed: sequence?.elapsed ?? 0,
                waiting: !!sequence && sequence.index >= 0 && !sequence.stepStarted,
                loading: !!sequence?.stepLoading,
                morphing: !!this._morph?.started,
                morphProgress: this._morph ? Math.min(1, this._morph.elapsed / this._morph.duration) : 0,
            };
        }

        /** Reports requested policy and the resolved presentation backend. */
        getRendererInfo() {
            const context = this._webgl?.gl || this.ctx;
            const attributes = typeof context?.getContextAttributes === "function" ? context.getContextAttributes() : null;
            return {
                requested: this._rendererRequested,
                backend: this._renderer,
                gpuPreferred: this._gpuPreferred,
                acceleration: this._renderer === "webgl2" ? "gpu-api-preferred" : this._gpuPreferred ? "browser-managed" : "not-requested",
                desynchronized: attributes?.desynchronized ?? this._desynchronized,
                willReadFrequently: attributes?.willReadFrequently ?? false,
            };
        }

        /** Replaces presentation resources while retaining instance-level state. */
        setRenderer(renderer, requestedRenderer = renderer) {
            if (!["auto", "webgl2", "canvas2d"].includes(renderer)) {
                throw new TypeError('asciiam: renderer must be "auto", "webgl2", or "canvas2d"');
            }
            const wantsWebGL = renderer !== "canvas2d";
            if ((wantsWebGL && this._renderer === "webgl2") || (!wantsWebGL && this._renderer === "canvas2d")) {
                const requestChanged = this._rendererRequested !== requestedRenderer;
                this._rendererRequested = requestedRenderer;
                this.opts.renderer = requestedRenderer;
                if (requestChanged) this._emit("rendererChange", this.getRendererInfo());
                return this._renderer;
            }

            const oldCanvas = this.canvas;
            const nextCanvas = document.createElement("canvas");
            nextCanvas.style.cssText = oldCanvas.style.cssText;
            nextCanvas.setAttribute("aria-hidden", "true");
            nextCanvas.setAttribute("role", "presentation");
            oldCanvas.replaceWith(nextCanvas);
            if (this._io) {
                this._io.disconnect();
                this._io.observe(nextCanvas);
            }
            if (this._webgl) this._webgl.destroy();
            if (this._onWebGLContextLost) oldCanvas.removeEventListener("webglcontextlost", this._onWebGLContextLost);
            this.canvas = nextCanvas;
            this._ownsCanvas = true;
            this._webgl = null;
            if (wantsWebGL) {
                try {
                    this._webgl = new WebGL2GlyphRenderer(nextCanvas, {
                        desynchronized: this._desynchronized,
                        powerPreference: this.opts.powerPreference,
                    });
                } catch (error) {
                    if (renderer === "webgl2") console.warn("asciiam: WebGL2 initialization failed; using Canvas 2D.", error);
                }
            }
            this._renderer = this._webgl ? "webgl2" : "canvas2d";
            if (this._webgl) this._bindWebGLFallback();
            if (this._webgl) {
                const measureCanvas = document.createElement("canvas");
                this.ctx = measureCanvas.getContext("2d", { alpha: true, willReadFrequently: false });
            } else {
                this.ctx = nextCanvas.getContext("2d", {
                    alpha: true,
                    desynchronized: this._desynchronized,
                    willReadFrequently: false,
                });
                if (!this.ctx && wantsWebGL) {
                    this._replacePresentationCanvas();
                    if (this._io) {
                        this._io.disconnect();
                        this._io.observe(this.canvas);
                    }
                    this.ctx = this.canvas.getContext("2d", {
                        alpha: true,
                        desynchronized: this._desynchronized,
                        willReadFrequently: false,
                    }) || this.canvas.getContext("2d", { alpha: true });
                }
            }
            if (!this.ctx) throw new Error("asciiam: failed to initialize renderer fallback");
            this._rendererRequested = requestedRenderer;
            this.opts.renderer = requestedRenderer;
            this._webglAtlas = null;
            this._activeGlyphAtlas = null;
            this._waveBaseLayer = null;
            this._buildFontCache();
            this._resize();
            this._emit("rendererChange", this.getRendererInfo());
            return this._renderer;
        }

        _replacePresentationCanvas() {
            const oldCanvas = this.canvas;
            const replacement = document.createElement("canvas");
            replacement.style.cssText = oldCanvas.style.cssText;
            replacement.setAttribute("aria-hidden", oldCanvas.getAttribute("aria-hidden") || "true");
            replacement.setAttribute("role", oldCanvas.getAttribute("role") || "presentation");
            if (oldCanvas.parentNode) oldCanvas.replaceWith(replacement);
            this.canvas = replacement;
            this._ownsCanvas = true;
            return replacement;
        }

        _bindWebGLFallback() {
            this._onWebGLContextLost = (event) => {
                event.preventDefault();
                const requestedRenderer = this._rendererRequested;
                this.setRenderer("canvas2d", requestedRenderer);
                this._emit("rendererFallback", { reason: "context-lost", ...this.getRendererInfo() });
            };
            this.canvas.addEventListener("webglcontextlost", this._onWebGLContextLost, false);
        }

        _normalizeSequenceIndex(index) {
            const last = Math.max(0, this._sequence.steps.length - 1);
            return Math.max(0, Math.min(last, Math.round(Number(index) || 0)));
        }

        _activateSequenceStep(index) {
            const sequence = this._sequence;
            if (sequence.stepLoading) this._cancelSequenceLoads();
            sequence.index = index;
            sequence.elapsed = 0;
            sequence.delayElapsed = 0;
            sequence.stepStarted = false;
            sequence.stepLoading = false;
            sequence.activationToken++;
            sequence.completed = false;
            if (sequence.steps[index].delay === 0) this._startSequenceStep();
        }

        _startSequenceStep() {
            const sequence = this._sequence;
            const step = sequence.steps[sequence.index];
            if (sequence.stepStarted || sequence.stepLoading) return;
            const activationToken = sequence.activationToken;

            const imageOptionsKey = step.imageOptions.animated === undefined ? "" : String(!!step.imageOptions.animated);
            const needsImageLoad = typeof step.image === "string" &&
                (step.image !== this._loadedImageSource || imageOptionsKey !== this._loadedImageOptionsKey);
            const needsModelLoad = step.model !== undefined && step.model !== null && step.model !== this._loadedModelSource;

            // Retain the outgoing presentation before an asynchronous source can
            // replace live image or mesh state. Morphs ease this layer away; cuts
            // remove it atomically once every requested source is ready.
            if (sequence.startedOnce) this._prepareMorph(step.transition, needsImageLoad || needsModelLoad);
            if (step.image === null) this.clearImage();
            if (step.model === null) this.clearModel();
            const imageLoad = needsImageLoad
                ? this.setImage(step.image, step.imageOptions)
                : null;
            const modelLoad = needsModelLoad
                ? this.setModel(step.model, step.modelOptions)
                : null;
            if (imageLoad || modelLoad) {
                sequence.stepLoading = true;
                Promise.all([imageLoad, modelLoad].filter(Boolean)).then((resources) => {
                    if (resources.some((resource) => !resource) || sequence.activationToken !== activationToken) return;
                    sequence.stepLoading = false;
                    if (sequence.running) this._commitSequenceStep(step);
                }).catch((error) => {
                    if (sequence.activationToken !== activationToken) return;
                    sequence.stepLoading = false;
                    sequence.running = false;
                    this._clearMorph();
                    const detail = this._sequenceDetail({ step, reason: "source-error", error });
                    this._callSequenceCallback(step.onError, detail);
                    this._emit("sequenceStepError", detail);
                });
                return;
            }
            this._commitSequenceStep(step);
        }

        /** Applies a decoded sequence step and starts its timed lifecycle. */
        _commitSequenceStep(step) {
            const sequence = this._sequence;
            this._applyingSequence = true;
            try {
                for (const [key, value] of Object.entries(step.options)) {
                    if (key !== "mode" && key !== "image" && key !== "model" && key !== "loop" && key !== "sequence" && key !== "sequenceOptions") this.setOption(key, value);
                }
                // Sequence repetition and mode repetition are separate controls.
                // Apply this for every step so a prior step cannot leak its mode
                // cycle policy into the next one.
                this.setOption("loop", step.repeat);
                this.setMode(step.mode, true);
            } finally {
                this._applyingSequence = false;
            }
            if (sequence.startedOnce) this._startPreparedMorph(step.transition);
            sequence.stepStarted = true;
            sequence.startedOnce = true;
            const detail = this._sequenceDetail({ step });
            this._callSequenceCallback(step.onStart, detail);
            this._callSequenceCallback(sequence.onStepStart, detail);
            this._emit("sequenceStepStart", detail);
        }

        _completeSequenceStep() {
            const sequence = this._sequence;
            const step = sequence.steps[sequence.index];
            const detail = this._sequenceDetail({ step, reason: "complete" });
            this._callSequenceCallback(step.onComplete, detail);
            this._callSequenceCallback(sequence.onStepComplete, detail);
            this._emit("sequenceStepComplete", detail);
            sequence.stepStarted = false;
        }

        _interruptSequenceStep(reason) {
            const sequence = this._sequence;
            const step = sequence.steps[sequence.index];
            if (sequence.stepLoading) this._cancelSequenceLoads();
            this._clearMorph();
            const detail = this._sequenceDetail({ step, reason });
            this._callSequenceCallback(step?.onInterrupt, detail);
            this._callSequenceCallback(sequence.onStepInterrupt, detail);
            this._emit("sequenceStepInterrupt", detail);
            sequence.stepStarted = false;
            sequence.stepLoading = false;
            sequence.activationToken++;
        }

        _completeSequence() {
            const sequence = this._sequence;
            sequence.running = false;
            sequence.completed = true;
            const detail = this._sequenceDetail({ reason: "complete" });
            this._callSequenceCallback(sequence.onComplete, detail);
            this._emit("sequenceComplete", detail);
        }

        _sequenceDetail(extra = {}) {
            const sequence = this._sequence;
            return {
                index: sequence?.index ?? -1,
                length: sequence?.steps.length ?? 0,
                loop: sequence?.loop ?? false,
                elapsed: sequence?.elapsed ?? 0,
                step: sequence && sequence.index >= 0 ? sequence.steps[sequence.index] : null,
                ...extra,
            };
        }

        _callSequenceCallback(callback, detail) {
            if (!callback) return;
            try {
                callback(detail, this);
            } catch (error) {
                console.error("asciiam: sequence callback failed", error);
            }
        }

        /** Capture the outgoing presentation before incoming source preparation begins. */
        _prepareMorph(transition, retainDuringLoad = false) {
            this._clearMorph();
            const isMorph = !this._reduced && transition?.type === "morph";
            if ((!isMorph && !retainDuringLoad) || !this.canvas.parentElement) return;
            const duration = Math.max(0.05, Number(transition?.duration) || 0.8) * 1000;
            const snapshot = document.createElement("canvas");
            snapshot.width = this.canvas.width;
            snapshot.height = this.canvas.height;
            snapshot.className = "asciiam-morph-layer";
            snapshot.setAttribute("aria-hidden", "true");
            snapshot.style.cssText = this.canvas.style.cssText;
            snapshot.style.pointerEvents = "none";
            snapshot.style.opacity = "1";
            snapshot.style.willChange = "opacity";
            try {
                const context = snapshot.getContext("2d", { alpha: true });
                if (!context) return;
                context.drawImage(this.canvas, 0, 0);
            } catch {
                return;
            }
            this.canvas.after(snapshot);
            this._morph = { canvas: snapshot, elapsed: 0, duration, easing: transition?.easing || "easeInOut", isMorph, started: false };
        }

        /** Reveal the live incoming state beneath the retained outgoing frame. */
        _startPreparedMorph(transition) {
            if (this._morph && !this._morph.isMorph) {
                this._clearMorph();
                return;
            }
            if (!this._morph) {
                this._prepareMorph(transition);
                if (!this._morph) return;
            }
            this._morph.started = true;
            this._emit("sequenceMorphStart", this._sequenceDetail({ transition }));
        }

        _advanceMorph(dt) {
            const morph = this._morph;
            if (!morph?.started) return;
            morph.elapsed = Math.min(morph.duration, morph.elapsed + Math.max(0, dt));
            const progress = morph.elapsed / morph.duration;
            let eased = progress;
            if (morph.easing === "easeIn") eased = progress * progress;
            else if (morph.easing === "easeOut") eased = 1 - (1 - progress) * (1 - progress);
            else if (morph.easing === "easeInOut") eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            morph.canvas.style.opacity = String(1 - eased);
            if (progress >= 1) {
                const detail = this._sequenceDetail({ transition: { type: "morph", duration: morph.duration / 1000, easing: morph.easing } });
                this._clearMorph();
                this._emit("sequenceMorphComplete", detail);
            }
        }

        _clearMorph() {
            if (this._morph?.canvas.parentElement) this._morph.canvas.remove();
            this._morph = null;
        }

        /** Cancel every source preparation owned by an interrupted sequence step. */
        _cancelSequenceLoads() {
            this._imageLoadToken++;
            this._imageCaptureToken++;
            this._modelLoadToken++;
            this._modelAbortController?.abort();
        }

        _advanceSequence(dt) {
            const sequence = this._sequence;
            if (!sequence?.running || !sequence.steps.length) return;
            let remaining = Math.max(0, dt) / 1000;
            while (remaining > 0 && sequence.running) {
                const step = sequence.steps[sequence.index];
                if (!sequence.stepStarted) {
                    const delayLeft = Math.max(0, step.delay - sequence.delayElapsed);
                    const consumed = Math.min(remaining, delayLeft);
                    sequence.delayElapsed += consumed;
                    remaining -= consumed;
                    if (sequence.delayElapsed + Number.EPSILON < step.delay) return;
                    this._startSequenceStep();
                    if (!sequence.stepStarted) return;
                    if (remaining <= 0) return;
                }

                const durationLeft = Math.max(0, step.duration - sequence.elapsed);
                const consumed = Math.min(remaining, durationLeft);
                sequence.elapsed += consumed;
                remaining -= consumed;
                if (sequence.elapsed + Number.EPSILON < step.duration) return;

                this._completeSequenceStep();
                const next = sequence.index + 1;
                if (next < sequence.steps.length) this._activateSequenceStep(next);
                else if (sequence.loop) {
                    this._emit("sequenceLoop", this._sequenceDetail());
                    this._activateSequenceStep(0);
                } else this._completeSequence();
            }
        }
        /** Returns a Promise that resolves once the image is sampled into the ASCII grid. */
        setImage(src, options = {}) {
            if (src === null || src === undefined || src === "") {
                this.clearImage();
                return Promise.resolve(null);
            }
            this.opts.image = String(src);
            const token = ++this._imageLoadToken;
            const captureToken = ++this._imageCaptureToken;
            if (this._imageRecaptureTimer !== null) clearTimeout(this._imageRecaptureTimer);
            this._imageRecaptureTimer = null;
            this._capturedImageFrames = null;
            this._animatedImageData = null;
            this._imageFrameIndex = 0;
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = async () => {
                    if (token !== this._imageLoadToken || this._destroyed) {
                        resolve(null);
                        return;
                    }
                    this._sourceImage = img;
                    this._loadedImageSource = String(src);
                    this._loadedImageOptionsKey = options.animated === undefined ? "" : String(!!options.animated);
                    this._animatedImage = options.animated ?? /^(?:data:image\/gif)|\.gif(?:$|[?#])/i.test(String(src));
                    this._imageFrameAccumulator = 0;
                    this._resampleImage();
                    if (this._animatedImage) {
                        try {
                            await this._captureAnimatedImageFrames(src, token, captureToken);
                        } catch (error) {
                            // Browser-timed <img> sampling remains the compatibility
                            // path when WebCodecs or a fetchable response is unavailable.
                            console.warn("asciiam: exact GIF frame capture unavailable; using browser frame sampling.", error);
                        }
                    }
                    if (token !== this._imageLoadToken || this._destroyed) {
                        resolve(null);
                        return;
                    }
                    resolve(img);
                };
                img.onerror = (err) => {
                    if (token !== this._imageLoadToken || this._destroyed) {
                        resolve(null);
                        return;
                    }
                    console.warn("asciiam: failed to load image:", src);
                    if (this.opts.onImageError) this.opts.onImageError(err);
                    reject(err);
                };
                img.src = src;
            });
        }

        /** Clears the sampled image while retaining the active procedural mode. */
        clearImage() {
            this._imageLoadToken++;
            this._imageCaptureToken++;
            if (this._imageRecaptureTimer !== null) clearTimeout(this._imageRecaptureTimer);
            this._imageRecaptureTimer = null;
            this._sourceImage = null;
            this._loadedImageSource = null;
            this._loadedImageOptionsKey = null;
            this._imageGrid = null;
            this._capturedImageFrames = null;
            this._animatedImageData = null;
            this._animatedImage = false;
            this._imageFrameIndex = 0;
            this._imageFrameAccumulator = 0;
            this._activeGlyphAtlas = null;
            this.opts.image = null;
            return this;
        }

        /** Decodes a GIF once and stores per-frame ASCII grids instead of bitmaps. */
        async _captureAnimatedImageFrames(src, token = this._imageLoadToken, captureToken = this._imageCaptureToken) {
            const Decoder = globalThis.ImageDecoder;
            if (typeof Decoder !== "function") return false;
            if (typeof Decoder.isTypeSupported === "function" && !await Decoder.isTypeSupported("image/gif")) return false;
            let data = this._animatedImageData;
            if (!data) {
                const response = await fetch(src);
                if (!response.ok) throw new Error(`GIF fetch failed with ${response.status}`);
                data = await response.arrayBuffer();
                if (token !== this._imageLoadToken || captureToken !== this._imageCaptureToken || this._destroyed) return false;
                this._animatedImageData = data;
            }
            const decoder = new Decoder({ data, type: "image/gif", preferAnimation: true });
            try {
                await decoder.tracks.ready;
                const track = decoder.tracks.selectedTrack;
                const frameCount = track?.frameCount || 0;
                if (frameCount < 2) return false;
                const originalSource = this._sourceImage;
                const visibleGrid = this._imageGrid;
                const frames = new Array(frameCount);
                let totalDuration = 0;
                for (let index = 0; index < frameCount; index++) {
                    if (token !== this._imageLoadToken || captureToken !== this._imageCaptureToken || this._destroyed) return false;
                    const result = await decoder.decode({ frameIndex: index, completeFramesOnly: true });
                    const image = result.image;
                    try {
                        this._sourceImage = image;
                        this._resampleImage();
                        const decodedGrid = this._imageGrid;
                        const duration = Math.max(10, Number(image.duration) > 0 ? Number(image.duration) / 1000 : 100);
                        totalDuration += duration;
                        // _resampleImage creates a fresh grid, so retaining it avoids
                        // a second full-grid allocation for every decoded frame.
                        frames[index] = { grid: decodedGrid, duration };
                    } finally {
                        if (this._sourceImage === image) this._sourceImage = originalSource;
                        // Decoding is preparation, not playback. Keep the previously
                        // presented grid stable until the complete frame set is ready.
                        this._imageGrid = visibleGrid;
                        if (typeof image.close === "function") image.close();
                    }
                    // Long GIFs should not monopolize the main thread while their
                    // frames are converted to the current ASCII grid.
                    if (index % 8 === 7) await new Promise((resume) => setTimeout(resume, 0));
                }
                if (token !== this._imageLoadToken || captureToken !== this._imageCaptureToken || this._destroyed) return false;
                this._capturedImageFrames = frames;
                this._imageFrameIndex = 0;
                this._imageFrameAccumulator = 0;
                this._imageGrid = frames[0].grid;
                this._emit("imageFramesReady", { frameCount, duration: totalDuration / 1000 });
                return true;
            } finally {
                if (typeof decoder.close === "function") decoder.close();
            }
        }

        /** Debounces GIF recapture after geometry or sampling options change. */
        _scheduleAnimatedFrameCapture() {
            if (!this._animatedImage || !this._animatedImageData || this._destroyed) return;
            this._capturedImageFrames = null;
            this._imageFrameIndex = 0;
            this._imageFrameAccumulator = 0;
            const token = this._imageLoadToken;
            const captureToken = ++this._imageCaptureToken;
            if (this._imageRecaptureTimer !== null) clearTimeout(this._imageRecaptureTimer);
            this._imageRecaptureTimer = setTimeout(() => {
                this._imageRecaptureTimer = null;
                this._captureAnimatedImageFrames(null, token, captureToken).catch((error) => {
                    console.warn("asciiam: GIF frame recapture unavailable; using browser frame sampling.", error);
                });
            }, 180);
        }

        /** Advances captured frames or the browser-timed compatibility sampler. */
        _advanceImageFrames(dt) {
            if (!this._animatedImage || !this.opts.animateImageFrames || !this._sourceImage) return;
            if (this._capturedImageFrames?.length) {
                this._imageFrameAccumulator += Math.max(0, dt);
                let frame = this._capturedImageFrames[this._imageFrameIndex];
                let advanced = false;
                while (this._imageFrameAccumulator >= frame.duration) {
                    this._imageFrameAccumulator -= frame.duration;
                    this._imageFrameIndex = (this._imageFrameIndex + 1) % this._capturedImageFrames.length;
                    frame = this._capturedImageFrames[this._imageFrameIndex];
                    advanced = true;
                }
                if (advanced) {
                    this._imageGrid = frame.grid;
                    this._activeGlyphAtlas = null;
                }
                return;
            }
            const frameRate = Math.max(1, Math.min(60, Number(this.opts.imageFrameRate) || 12));
            const interval = 1000 / frameRate;
            this._imageFrameAccumulator += Math.max(0, dt);
            if (this._imageFrameAccumulator < interval) return;
            this._imageFrameAccumulator %= interval;
            this._resampleImage();
        }
        /** Programmatically drive the cursor-reactive modifier (e.g. for touch, audio-sync, demos). Pass null to clear. */
        setCursor(x, y) {
            this._cursor = x === null || x === undefined ? null : { x, y };
        }

        /** Starts a click-zone pulse at supplied coordinates or the configured alignment origin. */
        triggerInteraction(x = this._originX, y = this._originY) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            this._interaction = { x, y, elapsed: 0 };
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

        // Pointer tracking supplies cursor modifiers and interactive modes. The
        // presentation canvas remains pointer-transparent; listeners belong to target.
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
            this._onPointerDown = (e) => {
                if (!this._canvasRect) this._canvasRect = this.canvas.getBoundingClientRect();
                this.triggerInteraction(e.clientX - this._canvasRect.left, e.clientY - this._canvasRect.top);
            };
            target.addEventListener("pointermove", this._onPointerMove, { passive: true });
            target.addEventListener("pointerleave", this._onPointerLeave, { passive: true });
            target.addEventListener("pointerdown", this._onPointerDown, { passive: true });
        }
        _unbindCursor() {
            const target = this.container || this.canvas.parentElement;
            if (target && this._onPointerMove) {
                target.removeEventListener("pointermove", this._onPointerMove);
                target.removeEventListener("pointerleave", this._onPointerLeave);
                target.removeEventListener("pointerdown", this._onPointerDown);
            }
        }

        // ---- sizing / measurement ----
        _buildFontCache() {
            // resolutionScale changes logical grid detail independently of the
            // canvas backing-store DPR. Bound it because cell work grows roughly
            // with the square of this value on a fixed-size surface.
            const resolutionScale = Math.max(0.5, Math.min(2, Number(this.opts.resolutionScale) || 1));
            this.opts.resolutionScale = resolutionScale;
            const effectiveFontSize = this.opts.fontSize / resolutionScale;
            this._effectiveFontSize = effectiveFontSize;
            this.ctx.font = `${effectiveFontSize}px ${this.opts.fontFamily}`;
            const m = this.ctx.measureText("M");
            this.charW = Math.max(4, m.width * this.opts.density);
            this.charH = Math.max(6, effectiveFontSize * 1.2 * this.opts.density);

            const steps = Math.max(2, Math.round(this.opts.fontLevels || 2));
            this.opts.fontLevels = steps;
            this._fontRegular = [];
            this._fontBold = [];
            for (let i = 0; i < steps; i++) {
                const scale = 1 + (i / (steps - 1)) * 0.5;
                const size = Math.round(effectiveFontSize * scale * 10) / 10;
                this._fontRegular.push(`400 ${size}px ${this.opts.fontFamily}`);
                this._fontBold.push(`700 ${size}px ${this.opts.fontFamily}`);
            }
            this._activeGlyphAtlas = null;
            this._waveBaseLayer = null;
        }

        _getGlyphAtlas() {
            if (!this.opts.useGlyphAtlas || this.opts.gradient || this.opts.colorAnimation || this.opts.colorFromImage) return null;
            const imageCharacters = this._imageGrid ? (this.opts.imageChars || "") : "";
            const atlasCharacterSet = [...new Set(this.opts.charSet + imageCharacters)].join("");
            if (
                this._glyphAtlas
                && this._glyphAtlasCharSet === atlasCharacterSet
                && this._glyphAtlasColor === this.opts.color
                && this._glyphAtlasRegular === this._fontRegular
                && this._glyphAtlasBold === this._fontBold
                && this._glyphAtlasCharHeight === this.charH
            ) return this._glyphAtlas;
            const characters = [...atlasCharacterSet];
            const key = JSON.stringify([characters.join(""), this._fontRegular, this._fontBold, this.opts.color, this.charH]);
            const cached = asciiam._glyphAtlases.get(key);
            if (cached) {
                asciiam._glyphAtlases.delete(key);
                asciiam._glyphAtlases.set(key, cached);
                this._cacheGlyphAtlas(cached, atlasCharacterSet);
                return cached;
            }

            const padding = 2;
            const maxFontSize = this._effectiveFontSize * 1.5;
            const tileWidth = Math.max(4, Math.ceil(maxFontSize + padding * 2));
            const tileHeight = Math.max(6, Math.ceil(this.charH + padding * 2));
            const columns = Math.max(1, Math.floor(2048 / tileWidth));
            const variants = this._fontRegular.length * 2;
            const tileCount = characters.length * variants;
            const rows = Math.ceil(tileCount / columns);
            const canvas = document.createElement("canvas");
            canvas.width = columns * tileWidth;
            canvas.height = rows * tileHeight;
            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
            if (!context) return null;
            context.textBaseline = "alphabetic";
            context.fillStyle = this.opts.color;
            const baseline = tileHeight - padding;
            const characterIndex = new Map(characters.map((character, index) => [character, index]));
            const sourceX = new Uint16Array(tileCount);
            const sourceY = new Uint16Array(tileCount);

            for (let bold = 0; bold < 2; bold++) {
                const fonts = bold ? this._fontBold : this._fontRegular;
                for (let level = 0; level < fonts.length; level++) {
                    context.font = fonts[level];
                    const variant = bold * fonts.length + level;
                    for (let index = 0; index < characters.length; index++) {
                        const tile = variant * characters.length + index;
                        const tileX = (tile % columns) * tileWidth;
                        const tileY = Math.floor(tile / columns) * tileHeight;
                        sourceX[tile] = tileX;
                        sourceY[tile] = tileY;
                        context.fillText(characters[index], tileX + padding, tileY + baseline);
                    }
                }
            }

            const atlas = { canvas, characterIndex, characters: characters.length, sourceX, sourceY, tileWidth, tileHeight, baseline, padding };
            asciiam._glyphAtlases.set(key, atlas);
            if (asciiam._glyphAtlases.size > asciiam._glyphAtlasLimit) {
                asciiam._glyphAtlases.delete(asciiam._glyphAtlases.keys().next().value);
            }
            this._cacheGlyphAtlas(atlas, atlasCharacterSet);
            return atlas;
        }

        _cacheGlyphAtlas(atlas, characterSet = this.opts.charSet) {
            this._glyphAtlas = atlas;
            this._glyphAtlasCharSet = characterSet;
            this._glyphAtlasColor = this.opts.color;
            this._glyphAtlasRegular = this._fontRegular;
            this._glyphAtlasBold = this._fontBold;
            this._glyphAtlasCharHeight = this.charH;
        }

        /** Re-measures the grid and invalidates geometry-dependent state and caches. */
        _resize() {
            const oldCols = this.cols || 0;
            const oldRows = this.rows || 0;
            const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDPR);
            this._dpr = dpr;
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
            if (this._webgl) this._webgl.resize(this.canvas.width, this.canvas.height);
            else this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.cols = Math.max(1, Math.ceil(w / this.charW));
            this.rows = Math.max(1, Math.ceil(h / this.charH));
            if (this._meshRasterizer) this._meshRasterizer.resize(this.cols, this.rows);
            this._columnX = new Float32Array(this.cols);
            this._rowY = new Float32Array(this.rows);
            this._rowBaseline = new Float32Array(this.rows);
            const baselineOffset = this.charH * 0.78;
            for (let col = 0; col < this.cols; col++) this._columnX[col] = col * this.charW;
            for (let row = 0; row < this.rows; row++) {
                const y = row * this.charH;
                this._rowY[row] = y;
                this._rowBaseline[row] = y + baselineOffset;
            }
            this._buildSeedCache();
            this._buildSpatialCache();
            this._buildCurrentCache();
            this._buildEdgeFadeCache();
            this._gradientKey = null;
            this._gradientSource = null;
            this._backdropGradientKey = null;
            this._backdropGradientObj = null;
            this._waveBaseLayer = null;
            this._canvasRect = this.canvas.getBoundingClientRect();
            if (this._sourceImage) this._resampleImage();
            this._scheduleAnimatedFrameCapture();

            if (oldCols > 0 && oldRows > 0) {
                this._adaptStateOnResize(oldCols, oldRows, this.cols, this.rows);
            } else {
                if (this.opts.mode === "matrix") this._initMatrix();
                if (this.opts.mode === "snow") this._initSnow();
                if (this.opts.mode === "sparkle") this._initSparkle();
                if (this.opts.mode === "fire") this._initFire();
                if (this.opts.mode === "starfield") this._initStarfield();
                if (this.opts.mode === "orbit") this._initOrbit();
            }

            if (this._reduced) this._draw(16.7);
            if (this._events.get("resize")?.size) {
                this._emit("resize", { width: this.w, height: this.h, cols: this.cols, rows: this.rows });
            }
        }

        _adaptStateOnResize(oldCols, oldRows, newCols, newRows) {
            const colScale = newCols / oldCols;
            const rowScale = newRows / oldRows;

            if (this._matrix) {
                if (newCols > oldCols) {
                    for (let c = oldCols; c < newCols; c++) {
                        this._matrix[c] = {
                            y: -Math.random() * newRows,
                            speed: 8 + Math.random() * 14,
                            length: 6 + Math.floor(Math.random() * 10),
                        };
                    }
                } else if (newCols < oldCols) {
                    this._matrix.length = newCols;
                }
                for (let c = 0; c < this._matrix.length; c++) {
                    if (this._matrix[c]) this._matrix[c].y *= rowScale;
                }
            } else if (this.opts.mode === "matrix") {
                this._initMatrix();
            }

            if (this._snow) {
                const targetCount = Math.max(1, Math.round(newCols * newRows * this.opts.snowDensity));
                for (let i = 0; i < this._snow.length; i++) {
                    const p = this._snow[i];
                    p.col = Math.min(newCols - 1, Math.max(0, Math.floor(p.col * colScale)));
                    p.y *= rowScale;
                }
                while (this._snow.length < targetCount) {
                    this._snow.push({
                        col: Math.floor(Math.random() * newCols),
                        y: Math.random() * newRows,
                        speed: 2 + Math.random() * 5,
                        phase: Math.random() * Math.PI * 2,
                        drift: 0.3 + Math.random() * 0.6,
                    });
                }
                if (this._snow.length > targetCount) this._snow.length = targetCount;
            } else if (this.opts.mode === "snow") {
                this._initSnow();
            }

            if (this._sparkle) {
                const targetCount = Math.max(1, Math.round(newCols * newRows * this.opts.sparkleDensity));
                for (let i = 0; i < this._sparkle.length; i++) {
                    const p = this._sparkle[i];
                    p.col = Math.min(newCols - 1, Math.max(0, Math.floor(p.col * colScale)));
                    p.row = Math.min(newRows - 1, Math.max(0, Math.floor(p.row * rowScale)));
                }
                while (this._sparkle.length < targetCount) {
                    this._sparkle.push({
                        col: Math.floor(Math.random() * newCols),
                        row: Math.floor(Math.random() * newRows),
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.6 + Math.random() * 1.4,
                    });
                }
                if (this._sparkle.length > targetCount) this._sparkle.length = targetCount;
            } else if (this.opts.mode === "sparkle") {
                this._initSparkle();
            }

            if (this._fire) {
                const targetCount = Math.max(1, Math.round(newCols * newRows * this.opts.fireDensity));
                for (let i = 0; i < this._fire.length; i++) {
                    const p = this._fire[i];
                    p.col *= colScale;
                    p.y *= rowScale;
                }
                while (this._fire.length < targetCount) {
                    this._resetFireParticle({}, true);
                }
                if (this._fire.length > targetCount) this._fire.length = targetCount;
            } else if (this.opts.mode === "fire") {
                this._initFire();
            }

            if (this._starfield) {
                const targetCount = Math.max(1, Math.round(newCols * newRows * this.opts.starfieldDensity));
                while (this._starfield.length < targetCount) {
                    this._resetStar({}, true);
                }
                if (this._starfield.length > targetCount) this._starfield.length = targetCount;
            } else if (this.opts.mode === "starfield") {
                this._initStarfield();
            }

            if (this._orbit) {
                const targetCount = Math.max(1, Math.round(newCols * newRows * this.opts.orbitDensity));
                const radiusLimit = Math.min(newCols, newRows) * 0.45;
                while (this._orbit.length < targetCount) {
                    this._orbit.push({
                        angle: Math.random() * Math.PI * 2,
                        radius: radiusLimit * (0.12 + Math.random() * 0.82),
                        speed: (0.28 + Math.random() * 0.7) * (Math.random() > 0.2 ? 1 : -1),
                        phase: Math.random() * Math.PI * 2,
                    });
                }
                if (this._orbit.length > targetCount) this._orbit.length = targetCount;
            } else if (this.opts.mode === "orbit") {
                this._initOrbit();
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

        _buildSeedCache() {
            const count = this.cols * this.rows;
            this._seedCache = new Float32Array(count);
            this._seedNextRowCache = new Float32Array(count);
            for (let row = 0; row < this.rows; row++) {
                const offset = row * this.cols;
                for (let col = 0; col < this.cols; col++) {
                    this._seedCache[offset + col] = this._seed(col, row);
                    this._seedNextRowCache[offset + col] = this._seed(col, row + 1);
                }
            }
        }

        _buildCurrentCache() {
            const count = this.cols * this.rows;
            this._currentSinX = new Float32Array(count);
            this._currentCosX = new Float32Array(count);
            this._currentSinY = new Float32Array(count);
            this._currentCosY = new Float32Array(count);
            this._currentSinXY = new Float32Array(count);
            this._currentCosXY = new Float32Array(count);
            for (let row = 0; row < this.rows; row++) {
                const y = row * this.charH;
                const offset = row * this.cols;
                for (let col = 0; col < this.cols; col++) {
                    const index = offset + col;
                    const x = col * this.charW;
                    const rx = x - this._originX;
                    const ry = y - this._originY;
                    const phaseX = rx * 0.02;
                    const phaseY = ry * 0.035;
                    const phaseXY = (rx + ry) * 0.015;
                    this._currentSinX[index] = Math.sin(phaseX);
                    this._currentCosX[index] = Math.cos(phaseX);
                    this._currentSinY[index] = Math.sin(phaseY);
                    this._currentCosY[index] = Math.cos(phaseY);
                    this._currentSinXY[index] = Math.sin(phaseXY);
                    this._currentCosXY[index] = Math.cos(phaseXY);
                }
            }
        }

        _buildSpatialCache() {
            if (!this.cols || !this.rows) return;
            switch (this.opts.align) {
                case "top-left": this._originX = 0; this._originY = 0; break;
                case "top": this._originX = this.w * 0.5; this._originY = 0; break;
                case "top-right": this._originX = this.w; this._originY = 0; break;
                case "left": this._originX = 0; this._originY = this.h * 0.5; break;
                case "right": this._originX = this.w; this._originY = this.h * 0.5; break;
                case "bottom-left": this._originX = 0; this._originY = this.h; break;
                case "bottom": this._originX = this.w * 0.5; this._originY = this.h; break;
                case "bottom-right": this._originX = this.w; this._originY = this.h; break;
                default: this._originX = this.w * 0.5; this._originY = this.h * 0.5;
            }

            const count = this.cols * this.rows;
            this._rippleSin = new Float32Array(count);
            this._rippleCos = new Float32Array(count);
            this._imageRippleSin = new Float32Array(count);
            this._imageRippleCos = new Float32Array(count);
            this._rippleFalloff = new Float32Array(count);
            this._vortexSin = new Float32Array(count);
            this._vortexCos = new Float32Array(count);
            this._plasmaSinA = new Float32Array(count);
            this._plasmaCosA = new Float32Array(count);
            this._plasmaSinB = new Float32Array(count);
            this._plasmaCosB = new Float32Array(count);
            this._plasmaSinC = new Float32Array(count);
            this._plasmaCosC = new Float32Array(count);
            for (let row = 0; row < this.rows; row++) {
                const y = row * this.charH;
                const offset = row * this.cols;
                for (let col = 0; col < this.cols; col++) {
                    const index = offset + col;
                    const x = col * this.charW;
                    const dx = x - this._originX;
                    const dy = y - this._originY;
                    const distance = Math.hypot(dx, dy);
                    const vortexPhase = Math.atan2(dy, dx) * 3 + distance * 0.045;
                    const plasmaPhaseA = x * 0.018 + y * 0.011;
                    const plasmaPhaseB = distance * 0.028;
                    const plasmaPhaseC = x * 0.009 - y * 0.021;
                    this._rippleSin[index] = Math.sin(distance * 0.06);
                    this._rippleCos[index] = Math.cos(distance * 0.06);
                    this._imageRippleSin[index] = Math.sin(distance * 0.05);
                    this._imageRippleCos[index] = Math.cos(distance * 0.05);
                    this._rippleFalloff[index] = Math.max(0, 1 - distance / (Math.max(this.w, this.h) * 0.85));
                    this._vortexSin[index] = Math.sin(vortexPhase);
                    this._vortexCos[index] = Math.cos(vortexPhase);
                    this._plasmaSinA[index] = Math.sin(plasmaPhaseA);
                    this._plasmaCosA[index] = Math.cos(plasmaPhaseA);
                    this._plasmaSinB[index] = Math.sin(plasmaPhaseB);
                    this._plasmaCosB[index] = Math.cos(plasmaPhaseB);
                    this._plasmaSinC[index] = Math.sin(plasmaPhaseC);
                    this._plasmaCosC[index] = Math.cos(plasmaPhaseC);
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
            if (!g.animate && g === this._gradientSource && this._gradientObj) return this._gradientObj;
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
            this._gradientSource = g;
            return grad;
        }

        _getBackdropGradient(g) {
            if (!g || !g.stops) return null;
            const key = JSON.stringify(g) + `:${this.w}x${this.h}` + (g.animate ? `:${Math.floor(this._time * 20)}` : "");
            if (key === this._backdropGradientKey) return this._backdropGradientObj;
            const stops = this._expandGradientStops(g);
            let grad;
            if (g.type === "radial") {
                const cx = this.w * (g.center ? g.center[0] : 0.5);
                const cy = this.h * (g.center ? g.center[1] : 0.5);
                const r = Math.max(this.w, this.h) * (g.radius || 0.75);
                grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            } else {
                const angle = (((g.angle || 0) + (g.animate ? this._time * 20 : 0)) * Math.PI) / 180;
                const dx = Math.cos(angle), dy = Math.sin(angle);
                const cx = this.w / 2, cy = this.h / 2;
                const len = (Math.abs(dx) * this.w + Math.abs(dy) * this.h) / 2;
                grad = this.ctx.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
            }
            stops.forEach((s) => grad.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color));
            this._backdropGradientKey = key;
            this._backdropGradientObj = grad;
            return grad;
        }

        _expandGradientStops(gradient) {
            const raw = gradient.stops || ["#4FA8FF", "#C04FFF"];
            if (raw.some((stop) => typeof stop === "object" && stop !== null)) {
                const last = Math.max(1, raw.length - 1);
                return raw
                    .map((stop, index) => ({
                        offset: Math.min(1, Math.max(0, typeof stop === "object" && stop.offset !== undefined ? stop.offset : index / last)),
                        color: typeof stop === "string" ? stop : stop.color,
                    }))
                    .sort((a, b) => a.offset - b.offset);
            }
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
                const hue = ((ca.baseHue ?? 200) + this._time * (ca.speed ?? 30)) % 360;
                const saturation = ca.saturation === null || ca.saturation === undefined ? 80 : ca.saturation;
                const lightness = ca.lightness === null || ca.lightness === undefined ? 60 : ca.lightness;
                this._animatedColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            } else if (ca.type === "breathe") {
                const t = (Math.sin(this._time * (ca.speed ?? 1)) + 1) / 2;
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
        /** Converts the current image source into glyph, color, and range-mask arrays. */
        _resampleImage() {
            const img = this._sourceImage;
            if (!img || !this.cols || !this.rows) return;
            const cols = this.cols,
                rows = this.rows;
            if (!this._imageSampleCanvas) {
                this._imageSampleCanvas = document.createElement("canvas");
                this._imageSampleContext = this._imageSampleCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
            }
            const off = this._imageSampleCanvas;
            if (off.width !== cols) off.width = cols;
            if (off.height !== rows) off.height = rows;
            const octx = this._imageSampleContext;
            if (!octx) return;
            octx.clearRect(0, 0, cols, rows);
            const sourceWidth = img.naturalWidth || img.videoWidth || img.displayWidth || img.codedWidth || img.width;
            const sourceHeight = img.naturalHeight || img.videoHeight || img.displayHeight || img.codedHeight || img.height;
            if (!sourceWidth || !sourceHeight) return;
            const srcRatio = sourceWidth / sourceHeight;
            // A sampled pixel becomes a rectangular glyph cell. Use the final
            // display geometry for fitting or the source appears compressed.
            const cellWidth = this.charW || (this.w / cols) || 1;
            const cellHeight = this.charH || (this.h / rows) || 1;
            const dstRatio = (cols * cellWidth) / (rows * cellHeight);
            let sx, sy, sw, sh;
            let dx = 0,
                dy = 0,
                dw = cols,
                dh = rows;
            if (this.opts.fit === "cover") {
                if (srcRatio > dstRatio) {
                    sh = sourceHeight;
                    sw = sh * dstRatio;
                    sy = 0;
                    sx = (sourceWidth - sw) / 2;
                } else {
                    sw = sourceWidth;
                    sh = sw / dstRatio;
                    sx = 0;
                    sy = (sourceHeight - sh) / 2;
                }
            } else {
                sx = 0;
                sy = 0;
                sw = sourceWidth;
                sh = sourceHeight;
                if (srcRatio > dstRatio) {
                    dh = (cols * cellWidth) / (srcRatio * cellHeight);
                    dy = (rows - dh) / 2;
                } else {
                    dw = (rows * cellHeight * srcRatio) / cellWidth;
                    dx = (cols - dw) / 2;
                }
            }
            const baseZoom = Math.max(0.1, this.opts.imageScale || 1) / Math.max(0.1, this.opts.imageFov || 1);
            if (baseZoom !== 1) {
                const zoomedW = sw / baseZoom;
                const zoomedH = sh / baseZoom;
                sx += (sw - zoomedW) / 2;
                sy += (sh - zoomedH) / 2;
                sw = zoomedW;
                sh = zoomedH;
            }
            const scaleX = Math.max(0.1, Number(this.opts.imageScaleX) || 1);
            const scaleY = Math.max(0.1, Number(this.opts.imageScaleY) || 1);
            if (scaleX !== 1 || scaleY !== 1) {
                const scaledW = dw * scaleX;
                const scaledH = dh * scaleY;
                dx += (dw - scaledW) / 2;
                dy += (dh - scaledH) / 2;
                dw = scaledW;
                dh = scaledH;
            }
            octx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
            const rotation = ((Number(this.opts.imageRotation) || 0) % 360) * Math.PI / 180;
            const flipX = this.opts.imageFlipX ? -1 : 1;
            const flipY = this.opts.imageFlipY ? -1 : 1;
            let sampleContext = octx;
            if (rotation || flipX < 0 || flipY < 0) {
                if (!this._imageOrientCanvas) {
                    this._imageOrientCanvas = document.createElement("canvas");
                    this._imageOrientContext = this._imageOrientCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
                }
                const oriented = this._imageOrientCanvas;
                if (oriented.width !== cols) oriented.width = cols;
                if (oriented.height !== rows) oriented.height = rows;
                const orientedContext = this._imageOrientContext;
                if (orientedContext) {
                    const cosine = Math.abs(Math.cos(rotation));
                    const sine = Math.abs(Math.sin(rotation));
                    const rotatedWidth = cosine * cols + sine * rows;
                    const rotatedHeight = sine * cols + cosine * rows;
                    const fitRotation = Math.min(cols / rotatedWidth, rows / rotatedHeight);
                    orientedContext.clearRect(0, 0, cols, rows);
                    orientedContext.save();
                    orientedContext.translate(cols * 0.5, rows * 0.5);
                    orientedContext.scale(flipX * fitRotation, flipY * fitRotation);
                    orientedContext.rotate(rotation);
                    orientedContext.drawImage(off, -cols * 0.5, -rows * 0.5, cols, rows);
                    orientedContext.restore();
                    sampleContext = orientedContext;
                }
            }
            const data = sampleContext.getImageData(0, 0, cols, rows).data;

            const chars = new Array(cols * rows),
                colors = new Array(cols * rows);
            const ramp = this.opts.imageChars || this.opts.charSet || asciiam.CHARACTER_SETS.density;
            const range = this.opts.imageAnimationRange;
            const rangeMin = range && this._hexToRgb(range.min);
            const rangeMax = range && this._hexToRgb(range.max);
            const animationMask = rangeMin && rangeMax ? new Uint8Array(cols * rows) : null;
            const minR = animationMask ? Math.min(rangeMin[0], rangeMax[0]) : 0;
            const maxR = animationMask ? Math.max(rangeMin[0], rangeMax[0]) : 255;
            const minG = animationMask ? Math.min(rangeMin[1], rangeMax[1]) : 0;
            const maxG = animationMask ? Math.max(rangeMin[1], rangeMax[1]) : 255;
            const minB = animationMask ? Math.min(rangeMin[2], rangeMax[2]) : 0;
            const maxB = animationMask ? Math.max(rangeMin[2], rangeMax[2]) : 255;
            let opaqueCount = 0;
            let transparentCount = 0;
            let opaqueBrightness = 0;
            for (let i = 0; i < cols * rows; i++) {
                const alpha = data[i * 4 + 3];
                if (alpha < 20) {
                    transparentCount++;
                    continue;
                }
                opaqueCount++;
                opaqueBrightness += (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
            }
            const luminanceMode = this.opts.imageLuminance || "auto";
            const invertLuminance = luminanceMode === "invert"
                || (luminanceMode === "auto" && transparentCount > 0 && opaqueCount > 0 && opaqueBrightness / opaqueCount < 0.45);
            const userBrightness = Math.max(0, Number(this.opts.imageBrightness) ?? 1);
            const userContrast = Math.max(0, Number(this.opts.imageContrast) ?? 1);
            const applyTone = userBrightness !== 1 || userContrast !== 1;

            for (let i = 0; i < cols * rows; i++) {
                let r = data[i * 4],
                    gC = data[i * 4 + 1],
                    b = data[i * 4 + 2];
                const a = data[i * 4 + 3];

                if (applyTone && a >= 20) {
                    r = Math.min(255, Math.max(0, Math.round(((r - 128) * userContrast + 128) * userBrightness)));
                    gC = Math.min(255, Math.max(0, Math.round(((gC - 128) * userContrast + 128) * userBrightness)));
                    b = Math.min(255, Math.max(0, Math.round(((b - 128) * userContrast + 128) * userBrightness)));
                }

                const sampledBrightness = (0.299 * r + 0.587 * gC + 0.114 * b) / 255;
                const brightness = invertLuminance ? 1 - sampledBrightness : sampledBrightness;
                const idx = a < 20 ? 0 : Math.min(ramp.length - 1, Math.floor(brightness * (ramp.length - 1)));
                chars[i] = ramp[idx];
                colors[i] = a < 20 || invertLuminance ? null : `rgb(${r},${gC},${b})`;
                if (animationMask) {
                    animationMask[i] = a >= 20 && r >= minR && r <= maxR && gC >= minG && gC <= maxG && b >= minB && b <= maxB ? 1 : 0;
                }
            }
            const atlasRampChanged = this._imageAtlasRamp !== ramp;
            this._imageAtlasRamp = ramp;
            this._imageGrid = { cols, rows, chars, colors, animationMask, invertedLuminance: invertLuminance };
            this._activeGlyphAtlas = null;
            if (atlasRampChanged) {
                this._glyphAtlas = null;
                this._webglAtlas = null;
            }
            this._waveBaseLayer = null;
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
        _initFire() {
            const count = Math.max(1, Math.round(this.cols * this.rows * this.opts.fireDensity));
            this._fire = [];
            for (let i = 0; i < count; i++) this._resetFireParticle({}, true);
        }
        _resetFireParticle(particle, distribute = false) {
            particle.col = Math.random() * this.cols;
            particle.y = distribute ? this.rows * (0.58 + Math.random() * 0.48) : this.rows + Math.random() * 2;
            particle.speed = 5 + Math.random() * 9;
            particle.phase = Math.random() * Math.PI * 2;
            particle.drift = 0.7 + Math.random() * 1.4;
            particle.life = 0.45 + Math.random() * 0.55;
            if (!this._fire.includes(particle)) this._fire.push(particle);
        }
        _initStarfield() {
            const count = Math.max(1, Math.round(this.cols * this.rows * this.opts.starfieldDensity));
            this._starfield = [];
            for (let i = 0; i < count; i++) this._resetStar({}, true);
        }
        _resetStar(star, distribute = false) {
            star.x = Math.random() * 2 - 1;
            star.y = Math.random() * 2 - 1;
            star.z = distribute ? 0.08 + Math.random() * 0.92 : 1;
            star.speed = 0.22 + Math.random() * 0.42;
            if (!this._starfield.includes(star)) this._starfield.push(star);
        }
        _initOrbit() {
            const count = Math.max(1, Math.round(this.cols * this.rows * this.opts.orbitDensity));
            const radiusLimit = Math.max(this.charW, Math.min(this.w, this.h) * 0.5);
            this._orbit = [];
            for (let i = 0; i < count; i++) {
                this._orbit.push({
                    angle: Math.random() * Math.PI * 2,
                    radius: radiusLimit * (0.12 + Math.random() * 0.82),
                    speed: (0.28 + Math.random() * 0.7) * (Math.random() > 0.2 ? 1 : -1),
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        // ---- main draw loop ----
        /** Selects dense, sparse, cached, or image-backed drawing for one frame. */
        // ---- main draw loop ----
        /** Selects dense, sparse, cached, or image-backed drawing for one frame. */
        _draw(dt) {
            if (this._webgl) {
                this._drawWebGL(dt);
                return;
            }
            const ctx = this.ctx;

            if (this.opts.trail > 0) {
                ctx.save();
                ctx.globalAlpha = this.opts.trail;
                ctx.fillStyle = this.opts.trailColor;
                ctx.fillRect(0, 0, this.w, this.h);
                ctx.restore();
            } else {
                ctx.clearRect(0, 0, this.w, this.h);
                if (this.opts.background && this.opts.background !== "transparent") {
                    ctx.fillStyle = this.opts.background;
                    ctx.fillRect(0, 0, this.w, this.h);
                }
            }

            if (this.opts.backdrop?.enabled && this.opts.backdrop.placement !== "over") this._drawCanvasBackdrop();

            if (this._layers && this._layers.length > 0) {
                const origMode = this.opts.mode;
                let totalDrawn = 0;
                for (let i = 0; i < this._layers.length; i++) {
                    const layer = this._layers[i];
                    ctx.save();
                    ctx.globalAlpha = layer.opacity ?? 1;
                    if (layer.blendMode) ctx.globalCompositeOperation = layer.blendMode;

                    this.opts.mode = layer.mode;
                    this._prepareModeFrame();
                    ctx.textBaseline = "alphabetic";
                    this._lastFillStyle = null;
                    this._lastFont = null;
                    this._lastAlpha = -1;

                    this._pulseFactor = this.opts.pulse
                        ? Math.max(0, 1 + this.opts.pulse.amplitude * Math.sin(this._time * (this.opts.pulse.speed ?? 1)))
                        : 1;
                    this._updateAnimatedColor();

                    const globalGradient = (layer.options?.gradient || this.opts.gradient) && !this.opts.colorFromImage ? this._getGradient() : null;
                    this._activeGlyphAtlas = this._getGlyphAtlas();
                    const waveBase = layer.mode === "wave" ? this._getWaveBaseLayer() : null;
                    if (waveBase) {
                        ctx.drawImage(waveBase.canvas, 0, 0, waveBase.canvas.width, waveBase.canvas.height, 0, 0, this.w, this.h);
                    }
                    this._drawFillStyle = globalGradient;
                    let drawn = 0;

                    if (layer.mode === "mesh") {
                        drawn = this._drawMesh(globalGradient);
                    } else if (waveBase) {
                        drawn = this._drawCachedHorizontalWave(waveBase, globalGradient);
                    } else if (SPARSE_MODES.has(layer.mode)) {
                        if (this._imageGrid) drawn += this._drawImageSourceBase(globalGradient);
                        drawn += this._drawSparse(dt, globalGradient);
                    } else {
                        drawn = this._drawDense(globalGradient);
                    }
                    totalDrawn += drawn;
                    ctx.restore();
                }
                if (this.opts.backdrop?.enabled && this.opts.backdrop.placement === "over") this._drawCanvasBackdrop();
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = "source-over";
                this.opts.mode = origMode;
                this._lastDrawnCount = totalDrawn;
                return;
            }

            this._prepareModeFrame();
            ctx.textBaseline = "alphabetic";
            this._lastFillStyle = null;
            this._lastFont = null;
            this._lastAlpha = -1;

            this._pulseFactor = this.opts.pulse
                ? Math.max(0, 1 + this.opts.pulse.amplitude * Math.sin(this._time * (this.opts.pulse.speed ?? 1)))
                : 1;
            this._updateAnimatedColor();

            const globalGradient = this.opts.gradient && !this.opts.colorFromImage ? this._getGradient() : null;
            this._activeGlyphAtlas = this._getGlyphAtlas();
            const waveBase = this.opts.mode === "wave" ? this._getWaveBaseLayer() : null;
            if (waveBase) {
                ctx.drawImage(waveBase.canvas, 0, 0, waveBase.canvas.width, waveBase.canvas.height, 0, 0, this.w, this.h);
            }
            this._drawFillStyle = globalGradient; // gradient takes precedence over animated color
            let drawn = 0;

            if (this.opts.mode === "mesh") {
                drawn = this._drawMesh(globalGradient);
            } else if (waveBase) {
                drawn = this._drawCachedHorizontalWave(waveBase, globalGradient);
            } else if (SPARSE_MODES.has(this.opts.mode)) {
                if (this._imageGrid) drawn += this._drawImageSourceBase(globalGradient);
                drawn += this._drawSparse(dt, globalGradient);
            } else {
                drawn = this._drawDense(globalGradient);
            }

            if (this.opts.backdrop?.enabled && this.opts.backdrop.placement === "over") this._drawCanvasBackdrop();
            ctx.globalAlpha = 1;
            this._lastDrawnCount = drawn;
        }

        /** Draws the configured Canvas backdrop at its exact clamped alpha. */
        _drawCanvasBackdrop() {
            const backdrop = this.opts.backdrop;
            const ctx = this.ctx;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, backdrop.opacity ?? 0.5));
            if (backdrop.gradient?.stops?.length) {
                ctx.fillStyle = this._getBackdropGradient(backdrop.gradient) || backdrop.color || "#0a0c10";
            } else {
                ctx.fillStyle = backdrop.color || "#0a0c10";
            }
            ctx.fillRect(0, 0, this.w, this.h);
            ctx.restore();
        }

        _prepareModeFrame() {
            if (this.opts.mode === "wave") {
                const extent = this.opts.direction === "diagonal" ? this.w + this.h : this.opts.direction === "vertical" ? this.h : this.w;
                const travel = this.opts.direction === "diagonal" ? 160 : 140;
                this._wavePosition = ((this._time * travel) % (extent + 300)) - 150;
                this._waveBand = extent * this.opts.bandWidth;
            } else if (this.opts.mode === "current") {
                this._currentTimeSinX = Math.sin(this._time * 1.1);
                this._currentTimeCosX = Math.cos(this._time * 1.1);
                this._currentTimeSinY = Math.sin(-this._time * 0.8);
                this._currentTimeCosY = Math.cos(-this._time * 0.8);
                this._currentTimeSinXY = Math.sin(this._time * 1.6);
                this._currentTimeCosXY = Math.cos(this._time * 1.6);
            } else if (this.opts.mode === "ripple") {
                this._rippleTimeSin = Math.sin(-this._time * 2.4);
                this._rippleTimeCos = Math.cos(-this._time * 2.4);
            } else if (this.opts.mode === "vortex") {
                this._vortexTimeSin = Math.sin(-this._time * 2);
                this._vortexTimeCos = Math.cos(-this._time * 2);
            } else if (this.opts.mode === "plasma") {
                this._plasmaTimeSinA = Math.sin(this._time * 0.9);
                this._plasmaTimeCosA = Math.cos(this._time * 0.9);
                this._plasmaTimeSinB = Math.sin(-this._time * 1.3);
                this._plasmaTimeCosB = Math.cos(-this._time * 1.3);
                this._plasmaTimeSinC = Math.sin(this._time * 0.55);
                this._plasmaTimeCosC = Math.cos(this._time * 0.55);
            } else if (this.opts.mode === "image") {
                const imageRippleTime = -this._time * 2.2;
                this._imageRippleTimeSin = Math.sin(imageRippleTime);
                this._imageRippleTimeCos = Math.cos(imageRippleTime);
            }
        }

        _drawWebGL(dt) {
            const background = this._colorToRgba(this.opts.background === "transparent" ? "transparent" : this.opts.background);
            const preserve = this.opts.trail > 0;
            this._webgl.begin(background, preserve);
            if (preserve) {
                const base = this._colorToRgba(this.opts.trailColor);
                const trail = [base[0], base[1], base[2], this.opts.trail];
                this._webgl.surface(trail);
            }
            if (this.opts.backdrop?.enabled && this.opts.backdrop.placement !== "over") this._drawWebGLBackdrop();

            if (this._layers && this._layers.length > 0) {
                const origMode = this.opts.mode;
                let totalDrawn = 0;
                for (let i = 0; i < this._layers.length; i++) {
                    const layer = this._layers[i];
                    this.opts.mode = layer.mode;
                    this._prepareModeFrame();
                    this._pulseFactor = this.opts.pulse
                        ? Math.max(0, 1 + this.opts.pulse.amplitude * Math.sin(this._time * (this.opts.pulse.speed ?? 1)))
                        : 1;
                    this._updateAnimatedColor();
                    const atlas = this._getWebGLAtlas();
                    this._webgl.setAtlas(atlas.canvas, atlas.key);
                    this._activeWebGLAtlas = atlas;

                    this._webglGradient = (layer.options?.gradient || this.opts.gradient) && !this.opts.colorFromImage ? this._prepareWebGLGradient(layer.options?.gradient || this.opts.gradient) : null;
                    let drawn = 0;
                    if (layer.mode === "mesh") {
                        drawn = this._drawMesh(null);
                    } else if (SPARSE_MODES.has(layer.mode)) {
                        if (this._imageGrid) drawn += this._drawImageSourceBase(null);
                        drawn += this._drawSparse(dt, null);
                    } else {
                        drawn = this._drawDense(null);
                    }
                    totalDrawn += drawn;
                }
                this._webgl.flush(this.w, this.h, this._webglGradient);
                if (this.opts.backdrop?.enabled && this.opts.backdrop.placement === "over") this._drawWebGLBackdrop();
                this.opts.mode = origMode;
                this._lastDrawnCount = totalDrawn;
                this._activeWebGLAtlas = null;
                this._webglGradient = null;
                return;
            }

            this._prepareModeFrame();
            this._pulseFactor = this.opts.pulse
                ? Math.max(0, 1 + this.opts.pulse.amplitude * Math.sin(this._time * (this.opts.pulse.speed ?? 1)))
                : 1;
            this._updateAnimatedColor();
            const atlas = this._getWebGLAtlas();
            this._webgl.setAtlas(atlas.canvas, atlas.key);
            this._activeWebGLAtlas = atlas;

            this._webglGradient = this.opts.gradient && !this.opts.colorFromImage ? this._prepareWebGLGradient(this.opts.gradient) : null;
            let drawn = 0;
            if (this.opts.mode === "mesh") {
                drawn = this._drawMesh(null);
            } else if (SPARSE_MODES.has(this.opts.mode)) {
                if (this._imageGrid) drawn += this._drawImageSourceBase(null);
                drawn += this._drawSparse(dt, null);
            } else {
                drawn = this._drawDense(null);
            }
            this._webgl.flush(this.w, this.h, this._webglGradient);
            if (this.opts.backdrop?.enabled && this.opts.backdrop.placement === "over") this._drawWebGLBackdrop();
            this._lastDrawnCount = drawn;
            this._activeWebGLAtlas = null;
            this._webglGradient = null;
        }

        /** Draws the configured WebGL backdrop before or after glyph instances. */
        _drawWebGLBackdrop() {
            const backdrop = this.opts.backdrop;
            const base = this._colorToRgba(backdrop.color || "#0a0c10");
            const alpha = Math.max(0, Math.min(1, backdrop.opacity ?? 0.5));
            const color = [base[0], base[1], base[2], alpha];
            const gradient = backdrop.gradient ? this._prepareWebGLGradient(backdrop.gradient) : null;
            this._webgl.surface(color, gradient);
        }

        _getWebGLAtlas() {
            const imageCharacters = this._imageGrid ? (this.opts.imageChars || "") : "";
            const characters = [...new Set(this.opts.charSet + imageCharacters)];
            const key = JSON.stringify([characters.join(""), this._fontRegular, this._fontBold, this.charH]);
            if (this._webglAtlas?.key === key) return this._webglAtlas;
            const padding = 2;
            const tileWidth = Math.max(4, Math.ceil(this._effectiveFontSize * 1.5 + padding * 2));
            const tileHeight = Math.max(6, Math.ceil(this.charH + padding * 2));
            const columns = Math.max(1, Math.floor(2048 / tileWidth));
            const tileCount = characters.length * this._fontRegular.length * 2;
            const canvas = document.createElement("canvas");
            canvas.width = columns * tileWidth;
            canvas.height = Math.ceil(tileCount / columns) * tileHeight;
            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
            context.textBaseline = "alphabetic";
            context.fillStyle = "#ffffff";
            const baseline = tileHeight - padding;
            const characterIndex = new Map(characters.map((character, index) => [character, index]));
            const uv = new Float32Array(tileCount * 4);
            for (let bold = 0; bold < 2; bold++) {
                const fonts = bold ? this._fontBold : this._fontRegular;
                for (let level = 0; level < fonts.length; level++) {
                    context.font = fonts[level];
                    const variant = bold * fonts.length + level;
                    for (let index = 0; index < characters.length; index++) {
                        const tile = variant * characters.length + index;
                        const x = (tile % columns) * tileWidth;
                        const y = Math.floor(tile / columns) * tileHeight;
                        context.fillText(characters[index], x + padding, y + baseline);
                        uv.set([x / canvas.width, y / canvas.height, (x + tileWidth) / canvas.width, (y + tileHeight) / canvas.height], tile * 4);
                    }
                }
            }
            this._webglAtlas = { canvas, key, characterIndex, characters: characters.length, uv, tileWidth, tileHeight, padding, baseline };
            return this._webglAtlas;
        }

        _prepareWebGLGradient(gradient) {
            const stops = this._expandGradientStops(gradient);
            const key = JSON.stringify(stops) + (gradient.animate ? Math.floor(this._time * 20) : "");
            if (!this._webgl.hasGradient(key)) {
                const canvas = document.createElement("canvas");
                canvas.width = 256;
                canvas.height = 1;
                const context = canvas.getContext("2d");
                const line = context.createLinearGradient(0, 0, 256, 0);
                stops.forEach((stop) => line.addColorStop(Math.min(1, Math.max(0, stop.offset)), stop.color));
                context.fillStyle = line;
                context.fillRect(0, 0, 256, 1);
                this._webgl.setGradient(canvas, key);
            }
            return { ...gradient, textureKey: key, angle: (gradient.angle || 0) + (gradient.animate ? this._time * 20 : 0) };
        }

        _colorToRgba(color) {
            if (!this._rgbaCache) this._rgbaCache = new Map();
            const cached = this._rgbaCache.get(color);
            if (cached) return cached;
            let result;
            if (!color || color === "transparent") result = [0, 0, 0, 0];
            const hex = this._hexToRgb(color);
            if (!result && hex) result = [hex[0] / 255, hex[1] / 255, hex[2] / 255, 1];
            const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(color);
            if (!result && rgb) result = [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, rgb[4] === undefined ? 1 : Number(rgb[4])];
            if (!result && !this._colorParser) this._colorParser = document.createElement("canvas").getContext("2d");
            if (!result && this._colorParser) {
                this._colorParser.fillStyle = "#000000";
                this._colorParser.fillStyle = color;
                const parsed = this._colorParser.fillStyle;
                const parsedHex = this._hexToRgb(parsed);
                if (parsedHex) result = [parsedHex[0] / 255, parsedHex[1] / 255, parsedHex[2] / 255, 1];
            }
            if (!result) result = [0.31, 0.66, 1, 1];
            if (this._rgbaCache.size > 512) this._rgbaCache.clear();
            this._rgbaCache.set(color, result);
            return result;
        }

        _getWaveBaseLayer() {
            if (
                this.opts.mode !== "wave"
                || this._imageGrid
                || !this.opts.cacheStaticWave
                || this.opts.direction !== "horizontal"
                || this.opts.trail > 0
                || (this.opts.background && this.opts.background !== "transparent")
                || this.opts.backdrop
                || this.opts.gradient
                || this.opts.colorAnimation
                || this.opts.pulse
                || (this.opts.cursor?.enabled && this._cursor)
            ) return null;
            if (
                this._waveBaseLayer
                && this._waveBaseCharSet === this.opts.charSet
                && this._waveBaseColor === this.opts.color
                && this._waveBaseAmbient === this.opts.ambient
                && this._waveBaseMinOpacity === this.opts.minOpacity
                && this._waveBaseMaxOpacity === this.opts.maxOpacity
                && this._waveBaseBold === this.opts.boldOnPeak
                && this._waveBaseAlphaLevels === this.opts.alphaLevels
                && this._waveBaseSeedCache === this._seedCache
                && this._waveBaseEdgeCache === this._edgeFadeCache
                && this._waveBaseAtlas === this._activeGlyphAtlas
            ) return this._waveBaseLayer;

            const sharedKey = JSON.stringify([
                this.canvas.width,
                this.canvas.height,
                this.opts.charSet,
                this.opts.color,
                this.opts.ambient,
                this.opts.minOpacity,
                this.opts.maxOpacity,
                this.opts.boldOnPeak,
                this.opts.alphaLevels,
                this.opts.edgeFade,
                this._fontRegular,
                this._fontBold,
            ]);
            const shared = asciiam._waveBaseLayers.get(sharedKey);
            if (shared) {
                asciiam._waveBaseLayers.delete(sharedKey);
                asciiam._waveBaseLayers.set(sharedKey, shared);
                this._setWaveBaseLayer(shared);
                return shared;
            }

            const canvas = document.createElement("canvas");
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
            if (!context) return null;
            context.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
            context.textBaseline = "alphabetic";
            context.fillStyle = this.opts.color;
            let lastAlpha = -1;
            let lastFont = null;
            let drawn = 0;
            const atlas = this._activeGlyphAtlas;
            const fontLevels = this.opts.fontLevels - 1;
            const charSet = this.opts.charSet;

            for (let row = 0; row < this.rows; row++) {
                const baseline = this._rowBaseline[row];
                const offset = row * this.cols;
                for (let col = 0; col < this.cols; col++) {
                    const index = offset + col;
                    const intensity = Math.min(1, this._seedCache[index] * this.opts.ambient);
                    const character = charSet[Math.floor(intensity * (charSet.length - 1))] || " ";
                    if (character === " ") continue;
                    let opacity = this.opts.minOpacity + (this.opts.maxOpacity - this.opts.minOpacity) * intensity;
                    if (this._edgeFadeCache) opacity *= this._edgeFadeCache[index];
                    opacity = Math.round(opacity * this.opts.alphaLevels) / this.opts.alphaLevels;
                    if (opacity <= 0) continue;
                    if (opacity !== lastAlpha) {
                        context.globalAlpha = opacity;
                        lastAlpha = opacity;
                    }
                    const level = Math.max(0, Math.min(fontLevels, Math.round(intensity * fontLevels)));
                    const bold = this.opts.boldOnPeak && intensity > 0.55;
                    const atlasCharacter = atlas?.characterIndex.get(character);
                    if (atlasCharacter !== undefined) {
                        const variant = (bold ? this._fontRegular.length : 0) + level;
                        const tile = variant * atlas.characters + atlasCharacter;
                        context.drawImage(
                            atlas.canvas,
                            atlas.sourceX[tile],
                            atlas.sourceY[tile],
                            atlas.tileWidth,
                            atlas.tileHeight,
                            this._columnX[col] - atlas.padding,
                            baseline - atlas.baseline,
                            atlas.tileWidth,
                            atlas.tileHeight,
                        );
                    } else {
                        const font = (bold ? this._fontBold : this._fontRegular)[level];
                        if (font !== lastFont) {
                            context.font = font;
                            lastFont = font;
                        }
                        context.fillText(character, this._columnX[col], baseline);
                    }
                    drawn++;
                }
            }

            this._waveBaseLayer = { canvas, drawn };
            asciiam._waveBaseLayers.set(sharedKey, this._waveBaseLayer);
            if (asciiam._waveBaseLayers.size > asciiam._waveBaseLayerLimit) {
                asciiam._waveBaseLayers.delete(asciiam._waveBaseLayers.keys().next().value);
            }
            this._setWaveBaseLayer(this._waveBaseLayer);
            return this._waveBaseLayer;
        }

        _setWaveBaseLayer(layer) {
            this._waveBaseLayer = layer;
            this._waveBaseCharSet = this.opts.charSet;
            this._waveBaseColor = this.opts.color;
            this._waveBaseAmbient = this.opts.ambient;
            this._waveBaseMinOpacity = this.opts.minOpacity;
            this._waveBaseMaxOpacity = this.opts.maxOpacity;
            this._waveBaseBold = this.opts.boldOnPeak;
            this._waveBaseAlphaLevels = this.opts.alphaLevels;
            this._waveBaseSeedCache = this._seedCache;
            this._waveBaseEdgeCache = this._edgeFadeCache;
            this._waveBaseAtlas = this._activeGlyphAtlas;
        }

        _drawCachedHorizontalWave(base, globalGradient) {
            const margin = this.charW * 2;
            const start = Math.max(0, this._wavePosition - this._waveBand - margin);
            const end = Math.min(this.w, this._wavePosition + this._waveBand + margin);
            if (end <= start) return base.drawn;
            this.ctx.clearRect(start, 0, end - start, this.h);
            const firstColumn = Math.max(0, Math.floor(start / this.charW));
            const lastColumn = Math.min(this.cols - 1, Math.ceil(end / this.charW));
            let dynamicDrawn = 0;
            for (let row = 0; row < this.rows; row++) {
                const y = this._rowY[row];
                for (let col = firstColumn; col <= lastColumn; col++) {
                    const x = this._columnX[col];
                    const cell = this._waveCell(col, row, x, y);
                    if (this._paintCell(cell, col, row, x, y, globalGradient, this._rowBaseline[row])) dynamicDrawn++;
                }
            }
            return dynamicDrawn + 1;
        }

        _drawDense(globalGradient) {
            let drawn = 0;
            const columnX = this._columnX;
            const rowY = this._rowY;
            for (let row = 0; row < this.rows; row++) {
                const y = rowY[row];
                for (let col = 0; col < this.cols; col++) {
                    const x = columnX[col];
                    const cell = this._computeCell(col, row, x, y);
                    if (this._paintCell(cell, col, row, x, y, globalGradient, this._rowBaseline[row])) drawn++;
                }
            }
            return drawn;
        }

        /** Rasterize the retained mesh once, then paint only occupied ASCII cells. */
        _drawMesh(globalGradient) {
            if (!this._mesh || !this._meshRasterizer) return 0;
            this._meshRasterOptions.style = this.opts.meshStyle;
            this._meshRasterOptions.projection = this.opts.meshProjection;
            this._meshRasterOptions.camera = this.opts.meshCamera;
            this._meshRasterOptions.light = this.opts.meshLight;
            const isStaticMode = this.opts.mode === "none" || this.opts.mode === "static";
            for (let axis = 0; axis < 3; axis++) {
                const speed = Number(this.opts.meshRotationSpeed?.[axis]);
                this._meshRotation[axis] = this._meshBaseRotation[axis]
                    + (this.opts.meshAutoRotate && !isStaticMode && Number.isFinite(speed) ? this._time * speed : 0);
            }
            const grid = this._meshRasterizer.rasterize(this._mesh, this._meshRasterOptions);
            const charSet = this.opts.charSet;
            const maxCharacter = Math.max(0, charSet.length - 1);
            let drawn = 0;
            for (let row = 0; row < this.rows; row++) {
                const offset = row * this.cols;
                for (let col = 0; col < this.cols; col++) {
                    const index = offset + col;
                    if (!grid.occupied[index]) continue;
                    const intensity = grid.intensity[index];
                    const character = charSet[Math.round(intensity * maxCharacter)] || charSet[maxCharacter] || "#";
                    const opacity = this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity);
                    const cell = this._setCell(character, opacity, intensity, this.opts.boldOnPeak && intensity > 0.72);
                    if (this._paintCell(
                        cell,
                        col,
                        row,
                        this._columnX[col],
                        this._rowY[row],
                        globalGradient,
                        this._rowBaseline[row],
                        false,
                    )) drawn++;
                }
            }
            return drawn;
        }

        _drawImageSourceBase(globalGradient) {
            const grid = this._imageGrid;
            let drawn = 0;
            for (let row = 0; row < this.rows; row++) {
                const y = this._rowY[row];
                for (let col = 0; col < this.cols; col++) {
                    const index = row * grid.cols + col;
                    const character = grid.chars[index];
                    if (!character || character === " ") continue;
                    const animateCell = !grid.animationMask || grid.animationMask[index] === 1;
                    const opacity = animateCell && this.opts.animateImageMask ? this.opts.minOpacity : this.opts.maxOpacity;
                    const cell = this._setCell(character, opacity, 0.5, false);
                    cell.color = this.opts.colorFromImage ? grid.colors[index] : null;
                    if (this._paintCell(cell, col, row, this._columnX[col], y, globalGradient, this._rowBaseline[row], false)) drawn++;
                }
            }
            return drawn;
        }

        /** Advances and paints sparse particles without scanning the complete grid. */
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
            } else if (mode === "fire") {
                if (!this._fire) this._initFire();
                this._advanceFire(dt);
                const bedRows = Math.max(1, Math.ceil(this.rows * 0.26));
                const bedStart = this.rows - bedRows;
                const fireFrame = Math.floor(this._time * 9);
                for (let row = bedStart; row < this.rows; row++) {
                    const heat = (row - bedStart + 1) / bedRows;
                    for (let col = 0; col < this.cols; col++) {
                        const flicker = this._seed(col + fireFrame, row - fireFrame);
                        const intensity = heat * (0.34 + flicker * 0.66);
                        if (intensity < 0.24) continue;
                        const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
                        const cell = this._setCell(
                            this.opts.charSet[charIdx] || "·",
                            intensity * this.opts.maxOpacity,
                            intensity,
                            intensity > 0.76,
                        );
                        if (this._paintCell(cell, col, row, col * this.charW, row * this.charH, globalGradient)) drawn++;
                    }
                }
                for (let i = 0; i < this._fire.length; i++) {
                    const p = this._fire[i];
                    const row = Math.floor(p.y);
                    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(p.col)));
                    if (row < 0 || row >= this.rows) continue;
                    const rise = 1 - row / Math.max(1, this.rows - 1);
                    const intensity = Math.max(0.08, p.life * (1 - rise * 0.72));
                    const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
                    const x = p.col * this.charW + Math.sin(this._time * p.drift + p.phase) * this.charW * 1.4;
                    const cell = this._setCell(this.opts.charSet[charIdx] || "·", intensity * this.opts.maxOpacity, intensity, intensity > 0.72);
                    if (this._paintCell(cell, col, row, x, row * this.charH, globalGradient)) drawn++;
                }
            } else if (mode === "starfield") {
                if (!this._starfield) this._initStarfield();
                this._advanceStarfield(dt);
                for (let i = 0; i < this._starfield.length; i++) {
                    const p = this._starfield[i];
                    const x = this._originX + (p.x / p.z) * this.w * 0.42;
                    const y = this._originY + (p.y / p.z) * this.h * 0.42;
                    if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;
                    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.charW)));
                    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.charH)));
                    const intensity = Math.max(0.12, Math.min(1, 1 - p.z));
                    const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
                    const cell = this._setCell(this.opts.charSet[charIdx] || "·", intensity * this.opts.maxOpacity, intensity, intensity > 0.78);
                    if (this._paintCell(cell, col, row, x, y, globalGradient)) drawn++;
                }
            } else if (mode === "orbit") {
                if (!this._orbit) this._initOrbit();
                this._advanceOrbit(dt);
                for (let i = 0; i < this._orbit.length; i++) {
                    const p = this._orbit[i];
                    const x = this._originX + Math.cos(p.angle) * p.radius;
                    const y = this._originY + Math.sin(p.angle) * p.radius * 0.58;
                    if (x < 0 || x >= this.w || y < 0 || y >= this.h) continue;
                    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.charW)));
                    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.charH)));
                    const intensity = 0.45 + Math.sin(p.angle + p.phase) * 0.35;
                    const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
                    const cell = this._setCell(this.opts.charSet[charIdx] || "·", intensity * this.opts.maxOpacity, intensity, intensity > 0.68);
                    if (this._paintCell(cell, col, row, x, y, globalGradient)) drawn++;
                }
            }
            return drawn;
        }

        /**
         * Applies shared opacity and cursor modifiers, then emits one glyph through
         * the active backend while minimizing repeated Canvas state changes.
         */
        _paintCell(cell, col, row, x, y, globalGradient, baselineY, applyImageSource = true) {
            if (applyImageSource && this._imageGrid && this.opts.mode !== "image") {
                cell = this._applyImageSource(cell, col, row);
            }
            if (!cell || cell.char === " ") return false;
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

            const alphaLevels = this.opts.alphaLevels;
            if (alphaLevels > 1) opacity = Math.round(opacity * alphaLevels) / alphaLevels;
            if (opacity <= 0) return false;

            if (this._webgl && this._activeWebGLAtlas) {
                const atlas = this._activeWebGLAtlas;
                const character = atlas.characterIndex.get(cell.char);
                if (character === undefined) return false;
                const variant = (cell.bold ? this._fontRegular.length : 0) + cell.level;
                const tile = variant * atlas.characters + character;
                let color = cell.color;
                if (!color && this.opts.colorFromImage && this._imageGrid) color = this._imageGrid.colors[row * this.cols + col];
                if (!color) color = this._animatedColor || this.opts.color;
                const rgba = this._colorToRgba(color);
                const uvOffset = tile * 4;
                this._webgl.push(
                    x - atlas.padding,
                    (baselineY ?? y + this.charH * 0.78) - atlas.baseline,
                    atlas.tileWidth,
                    atlas.tileHeight,
                    atlas.uv,
                    uvOffset,
                    rgba,
                    opacity,
                );
                return true;
            }

            const atlas = this._activeGlyphAtlas;
            const character = atlas?.characterIndex.get(cell.char);
            if (character !== undefined) {
                if (opacity !== this._lastAlpha) {
                    ctx.globalAlpha = opacity;
                    this._lastAlpha = opacity;
                }
                const variant = (cell.bold ? this._fontRegular.length : 0) + cell.level;
                const tile = variant * atlas.characters + character;
                const destinationY = (baselineY ?? y + this.charH * 0.78) - atlas.baseline;
                ctx.drawImage(
                    atlas.canvas,
                    atlas.sourceX[tile],
                    atlas.sourceY[tile],
                    atlas.tileWidth,
                    atlas.tileHeight,
                    x - atlas.padding,
                    destinationY,
                    atlas.tileWidth,
                    atlas.tileHeight,
                );
                return true;
            }

            let fillStyle = cell.color;
            if (!fillStyle && this.opts.colorFromImage && this._imageGrid) {
                const imgColor = this._imageGrid.colors[row * this.cols + col];
                if (imgColor) fillStyle = imgColor;
            }
            if (!fillStyle) fillStyle = globalGradient || this._animatedColor || this.opts.color;

            if (fillStyle !== this._lastFillStyle) {
                ctx.fillStyle = fillStyle;
                this._lastFillStyle = fillStyle;
            }

            if (opacity !== this._lastAlpha) {
                ctx.globalAlpha = opacity;
                this._lastAlpha = opacity;
            }
            const font = (cell.bold ? this._fontBold : this._fontRegular)[cell.level];
            if (font !== this._lastFont) {
                ctx.font = font;
                this._lastFont = font;
            }
            ctx.fillText(cell.char, x, baselineY ?? y + this.charH * 0.78);
            return true;
        }

        _advanceMatrix(dt) {
            const dtS = Math.min(0.1, dt / 1000);
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
            const dtS = Math.min(0.1, dt / 1000);
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
        _advanceFire(dt) {
            const dtS = Math.min(0.1, dt / 1000);
            for (let i = 0; i < this._fire.length; i++) {
                const p = this._fire[i];
                p.y -= p.speed * dtS;
                p.life -= dtS * 0.22;
                if (p.y < -1 || p.life <= 0) this._resetFireParticle(p);
            }
        }
        _advanceStarfield(dt) {
            const dtS = Math.min(0.1, dt / 1000);
            for (let i = 0; i < this._starfield.length; i++) {
                const p = this._starfield[i];
                p.z -= p.speed * dtS;
                if (p.z <= 0.035) this._resetStar(p);
            }
        }
        _advanceOrbit(dt) {
            const dtS = Math.min(0.1, dt / 1000);
            for (let i = 0; i < this._orbit.length; i++) this._orbit[i].angle += this._orbit[i].speed * dtS;
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
                case "none":
                case "static":
                    if (this._imageGrid) return this._imageCell(col, row, x, y);
                    return this._setCell(this.opts.charSet[0] || " ", this.opts.maxOpacity, 0.5, false);
                case "wave":
                    return this._waveCell(col, row, x, y);
                case "current":
                    return this._currentCell(col, row, x, y);
                case "ripple":
                    return this._rippleCell(col, row, x, y);
                case "vortex":
                    return this._vortexCell(col, row, x, y);
                case "plasma":
                    return this._plasmaCell(col, row, x, y);
                case "glitch":
                    return this._glitchCell(col, row, x, y);
                case "typewriter":
                    return this._typewriterCell(col, row, x, y);
                case "fadeIn":
                    return this._fadeInCell(col, row, x, y);
                case "fadeOut":
                    return this._fadeOutCell(col, row, x, y);
                case "irisIn":
                    return this._irisCell(col, row, x, y, false);
                case "irisOut":
                    return this._irisCell(col, row, x, y, true);
                case "dissolveIn":
                    return this._dissolveCell(col, row, false);
                case "dissolveOut":
                    return this._dissolveCell(col, row, true);
                case "lumaFold":
                    return this._lumaFoldCell(col, row, x, y);
                case "riftLace":
                    return this._riftLaceCell(col, row, x, y);
                case "echoBloom":
                    return this._echoBloomCell(col, row, x, y);
                case "hoverZone":
                    return this._hoverZoneCell(col, row, x, y);
                case "clickZone":
                    return this._clickZoneCell(col, row, x, y);
                case "image":
                    return this._imageCell(col, row, x, y);
                case "chart":
                    return this._chartCell(col, row, x, y);
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
            let coord, extent;
            if (direction === "vertical") {
                coord = y;
                extent = this.h;
            } else if (direction === "diagonal") {
                coord = x + y;
                extent = this.w + this.h;
            } else {
                coord = x;
                extent = this.w;
            }

            const dist = Math.abs(coord - this._wavePosition);
            const band = this._waveBand || extent * bandWidth;
            let intensity = Math.max(0, 1 - dist / band);
            intensity = intensity * intensity * (3 - 2 * intensity);

            const base = this._seedCache[row * this.cols + col] * ambient;
            const combined = Math.min(1, base + intensity);
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(
                charSet[charIdx] || " ",
                minOpacity + (maxOpacity - minOpacity) * combined,
                intensity,
                boldOnPeak && intensity > 0.55,
            );
        }

        _currentCell(col, row, _x, _y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const index = row * this.cols + col;
            const v = (this._currentSinX[index] * this._currentTimeCosX + this._currentCosX[index] * this._currentTimeSinX) * 0.5
                + (this._currentSinY[index] * this._currentTimeCosY + this._currentCosY[index] * this._currentTimeSinY) * 0.3
                + (this._currentSinXY[index] * this._currentTimeCosXY + this._currentCosXY[index] * this._currentTimeSinXY) * 0.2;
            const n = (v + 1) / 2;
            const charIdx = Math.floor(n * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", minOpacity + (maxOpacity - minOpacity) * n, n, boldOnPeak && n > 0.72);
        }

        _rippleCell(col, row, _x, _y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const index = row * this.cols + col;
            const wave = this._rippleSin[index] * this._rippleTimeCos + this._rippleCos[index] * this._rippleTimeSin;
            const n = (wave + 1) / 2;
            const combined = n * this._rippleFalloff[index];
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", minOpacity + (maxOpacity - minOpacity) * combined, combined, boldOnPeak && combined > 0.6);
        }

        _vortexCell(col, row, _x, _y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const index = row * this.cols + col;
            const wave = this._vortexSin[index] * this._vortexTimeCos + this._vortexCos[index] * this._vortexTimeSin;
            const arm = (wave + 1) * 0.5;
            const falloff = 0.25 + this._rippleFalloff[index] * 0.75;
            const combined = Math.min(1, arm * falloff + this._seedCache[index] * 0.08);
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(
                charSet[charIdx] || " ",
                minOpacity + (maxOpacity - minOpacity) * combined,
                combined,
                boldOnPeak && combined > 0.7,
            );
        }

        _plasmaCell(col, row, _x, _y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const index = row * this.cols + col;
            const layerA = this._plasmaSinA[index] * this._plasmaTimeCosA + this._plasmaCosA[index] * this._plasmaTimeSinA;
            const layerB = this._plasmaSinB[index] * this._plasmaTimeCosB + this._plasmaCosB[index] * this._plasmaTimeSinB;
            const layerC = this._plasmaSinC[index] * this._plasmaTimeCosC + this._plasmaCosC[index] * this._plasmaTimeSinC;
            const combined = Math.max(0, Math.min(1, (layerA + layerB + layerC + 3) / 6));
            const charIdx = Math.floor(combined * (charSet.length - 1));
            return this._setCell(
                charSet[charIdx] || " ",
                minOpacity + (maxOpacity - minOpacity) * combined,
                combined,
                boldOnPeak && combined > 0.72,
            );
        }

        _glitchCell(col, row, _x, _y) {
            const { charSet, minOpacity, maxOpacity, boldOnPeak } = this.opts;
            const frame = Math.floor(this._time * 12);
            const rowSeed = this._seed(row, frame);
            const scanRow = frame % Math.max(1, this.rows);
            const scanDistance = Math.abs(row - scanRow);
            const activeBand = scanDistance <= 1 || rowSeed > 1 - this.opts.glitchIntensity;
            const displacement = activeBand ? Math.floor((rowSeed - 0.5) * this.cols * 0.18) : 0;
            const sourceCol = (col + displacement + this.cols) % this.cols;
            const index = row * this.cols + sourceCol;
            const noise = this._seedCache[index];
            const pulse = activeBand ? Math.max(0.35, this._seed(col + frame, row)) : noise * 0.42;
            const charIdx = Math.floor(pulse * (charSet.length - 1));
            return this._setCell(
                charSet[charIdx] || " ",
                minOpacity + (maxOpacity - minOpacity) * pulse,
                pulse,
                boldOnPeak && activeBand && pulse > 0.7,
            );
        }

        _typewriterCell(col, row, _x, _y) {
            const { charSet, maxOpacity } = this.opts;
            const count = Math.max(1, this.cols * this.rows);
            const duration = Math.max(0.1, this.opts.typewriterDuration);
            const cycle = this.opts.loop ? this._time % (duration + 1.2) : Math.min(this._time, duration);
            const progress = Math.min(1, cycle / duration);
            const index = row * this.cols + col;
            const cursorIndex = Math.min(count - 1, Math.floor(progress * count));
            if (index > cursorIndex) return null;
            const seed = this._seedCache[index];
            const charIdx = 1 + Math.floor(seed * Math.max(1, charSet.length - 1));
            const isCursor = index === cursorIndex && progress < 1;
            return this._setCell(isCursor ? "_" : charSet[charIdx] || "0", isCursor ? 1 : maxOpacity, isCursor ? 1 : seed, isCursor);
        }

        _fadeInCell(col, row, _x, _y) {
            const { charSet, maxOpacity } = this.opts;
            const totalDuration = Math.max(0.1, Number(this.opts.revealDuration) || 2.2);
            const cycle = this.opts.loop ? this._time % (totalDuration + 1.2) : Math.min(this._time, totalDuration + 0.6);
            const index = row * this.cols + col;
            const delay = this._revealProgress(col, row) * totalDuration * 0.8 + this._seedCache[index] * 0.4;
            const local = Math.max(0, Math.min(1, (cycle - delay) / 0.6));
            const eased = local * local * (3 - 2 * local);
            const shimmer = 0.85 + this._seedNextRowCache[index] * 0.15;
            const charIdx = Math.floor(eased * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", eased * maxOpacity * shimmer, 0, false);
        }

        _fadeOutCell(col, row, _x, _y) {
            const { charSet, maxOpacity } = this.opts;
            const totalDuration = Math.max(0.1, Number(this.opts.revealDuration) || 2.2);
            const cycle = this.opts.loop ? this._time % (totalDuration + 1.2) : Math.min(this._time, totalDuration + 0.6);
            const index = row * this.cols + col;
            const delay = this._revealProgress(col, row) * totalDuration * 0.8 + this._seedCache[index] * 0.4;
            const local = Math.max(0, Math.min(1, (cycle - delay) / 0.6));
            const eased = local * local * (3 - 2 * local);
            const remaining = 1 - eased;
            const shimmer = 0.85 + this._seedNextRowCache[index] * 0.15;
            const charIdx = Math.floor(remaining * (charSet.length - 1));
            return this._setCell(charSet[charIdx] || " ", remaining * maxOpacity * shimmer, 0, false);
        }

        _revealProgress(col, row = 0) {
            const position = col / Math.max(1, this.cols - 1);
            const vertical = row / Math.max(1, this.rows - 1);
            if (this.opts.revealDirection === "left-to-right") return position;
            if (this.opts.revealDirection === "right-to-left") return 1 - position;
            if (this.opts.revealDirection === "top-to-bottom") return vertical;
            if (this.opts.revealDirection === "bottom-to-top") return 1 - vertical;
            if (this.opts.revealDirection === "diagonal") return (position + vertical) * 0.5;
            if (this.opts.revealDirection === "edges") return 1 - Math.min(1, Math.abs(position - 0.5) * 2);
            return Math.min(1, Math.abs(position - 0.5) * 2);
        }

        _irisCell(col, row, x, y, reverse) {
            const duration = Math.max(0.1, Number(this.opts.revealDuration) || 2.2);
            const cycle = this.opts.loop ? this._time % (duration + 1.1) : Math.min(this._time, duration);
            const progress = Math.min(1, cycle / duration);
            const maxDistance = Math.max(1, Math.hypot(this.w, this.h));
            const distance = Math.hypot(x - this._originX, y - this._originY) / maxDistance;
            const feather = 0.14;
            let visible = Math.max(0, Math.min(1, (progress - distance + feather) / feather));
            if (reverse) visible = 1 - visible;
            const index = row * this.cols + col;
            const intensity = visible * (0.82 + this._seedCache[index] * 0.18);
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            return this._setCell(this.opts.charSet[charIdx] || " ", intensity * this.opts.maxOpacity, intensity, intensity > 0.74);
        }

        _dissolveCell(col, row, reverse) {
            const duration = Math.max(0.1, Number(this.opts.revealDuration) || 2.2);
            const cycle = this.opts.loop ? this._time % (duration + 1.1) : Math.min(this._time, duration);
            const progress = Math.min(1, cycle / duration);
            const index = row * this.cols + col;
            const threshold = this._seedCache[index] * 0.72 + this._revealProgress(col, row) * 0.28;
            let visible = Math.max(0, Math.min(1, (progress - threshold + 0.12) / 0.12));
            if (reverse) visible = 1 - visible;
            const charIdx = Math.floor((0.25 + this._seedNextRowCache[index] * 0.75) * (this.opts.charSet.length - 1));
            return this._setCell(this.opts.charSet[charIdx] || " ", visible * this.opts.maxOpacity, visible, visible > 0.82);
        }

        _lumaFoldCell(col, row, x, y) {
            const nx = x / Math.max(1, this.w);
            const ny = y / Math.max(1, this.h);
            const fold = Math.abs(Math.sin((nx * 3.2 + ny * 1.4) * Math.PI + this._time * 1.7));
            const ridge = Math.pow(1 - fold, 2.4);
            const intensity = Math.min(1, 0.12 + fold * 0.42 + ridge * 0.78);
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            return this._setCell(this.opts.charSet[charIdx] || " ", this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity), intensity, ridge > 0.58);
        }

        _riftLaceCell(col, row, x, y) {
            const a = Math.sin(x * 0.037 + y * 0.018 + this._time * 2.1);
            const b = Math.sin(y * 0.052 - x * 0.013 - this._time * 1.45);
            const seam = Math.pow(Math.max(0, 1 - Math.abs(a - b)), 3);
            const index = row * this.cols + col;
            const intensity = Math.min(1, seam * 0.9 + this._seedCache[index] * 0.16);
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            return this._setCell(this.opts.charSet[charIdx] || " ", this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity), intensity, seam > 0.72);
        }

        _echoBloomCell(col, row, x, y) {
            const distance = Math.hypot(x - this._originX, y - this._originY) * 0.055;
            const phase = distance - this._time * 3.1;
            const echoA = Math.max(0, Math.cos(phase));
            const echoB = Math.max(0, Math.cos(phase * 0.67 - 2.1)) * 0.62;
            const echoC = Math.max(0, Math.cos(phase * 0.43 - 4.2)) * 0.38;
            const intensity = Math.min(1, Math.pow(Math.max(echoA, echoB, echoC), 3));
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            return this._setCell(this.opts.charSet[charIdx] || " ", this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity), intensity, intensity > 0.76);
        }

        _hoverZoneCell(col, row, x, y) {
            const index = row * this.cols + col;
            const origin = this._cursor;
            if (!origin) {
                const ambient = this._seedCache[index] * 0.18;
                const charIdx = Math.floor(ambient * (this.opts.charSet.length - 1));
                return this._setCell(this.opts.charSet[charIdx] || " ", this.opts.minOpacity, ambient, false);
            }
            const radius = Math.max(1, Number(this.opts.interactionRadius) || 180);
            const distance = Math.hypot(x - origin.x, y - origin.y);
            const falloff = Math.max(0, 1 - distance / radius);
            const eased = falloff * falloff * (3 - 2 * falloff);
            const ripple = 0.72 + Math.sin(distance * 0.085 - this._time * 4.2) * 0.28;
            const intensity = Math.max(0, Math.min(1, eased * ripple));
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            const opacity = this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity);
            return this._setCell(this.opts.charSet[charIdx] || " ", opacity, intensity, intensity > 0.72);
        }

        _clickZoneCell(col, row, x, y) {
            const index = row * this.cols + col;
            const interaction = this._interaction;
            if (!interaction) {
                const ambient = this._seedCache[index] * 0.16;
                const charIdx = Math.floor(ambient * (this.opts.charSet.length - 1));
                return this._setCell(this.opts.charSet[charIdx] || " ", this.opts.minOpacity, ambient, false);
            }
            const duration = Math.max(0.05, Number(this.opts.interactionDuration) || 1.1);
            const progress = Math.max(0, Math.min(1, interaction.elapsed / duration));
            const radius = Math.max(1, Number(this.opts.interactionRadius) || 180);
            const distance = Math.hypot(x - interaction.x, y - interaction.y);
            const ringPosition = progress * radius;
            const ringWidth = Math.max(this.charW * 2, radius * 0.16);
            const ring = Math.max(0, 1 - Math.abs(distance - ringPosition) / ringWidth);
            const centre = Math.max(0, 1 - distance / radius) * (1 - progress);
            const intensity = Math.max(0, Math.min(1, Math.max(ring, centre) * (1 - progress * 0.25)));
            const charIdx = Math.floor(intensity * (this.opts.charSet.length - 1));
            const opacity = this.opts.minOpacity + intensity * (this.opts.maxOpacity - this.opts.minOpacity);
            return this._setCell(this.opts.charSet[charIdx] || " ", opacity, intensity, intensity > 0.72);
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

            const animateCell = !g.animationMask || g.animationMask[i] === 1;
            if (this.opts.animateImageMask && animateCell) {
                const maskMode = this.opts.imageMaskMode || "waveSweep";
                const t = this._time;

                if (maskMode === "fullStatic" || maskMode === "static") {
                    opacity = this.opts.maxOpacity;
                    bold = false;
                    intensity = 0.5;
                } else if (maskMode === "scanlinePass" || maskMode === "scanline") {
                    const scanY = ((t * 180) % (this.h + 200)) - 100;
                    const dist = Math.abs(y - scanY);
                    const line = Math.max(0, 1 - dist / (this.h * 0.12));
                    const shimmer = 0.35 + 0.65 * (line * line);
                    opacity = this.opts.minOpacity + (this.opts.maxOpacity - this.opts.minOpacity) * shimmer;
                    bold = line > 0.6;
                    intensity = line;
                } else if (maskMode === "radialRipple" || maskMode === "ripple") {
                    const wave = this._imageRippleSin[i] * this._imageRippleTimeCos + this._imageRippleCos[i] * this._imageRippleTimeSin;
                    const n = (wave + 1) / 2;
                    opacity = Math.max(this.opts.minOpacity, n * this.opts.maxOpacity);
                    intensity = n;
                    bold = n > 0.7;
                } else if (maskMode === "thermalNoise" || maskMode === "noise") {
                    const seed = this._seed(col, row + Math.floor(t * 8));
                    const noise = 0.55 + seed * 0.45;
                    opacity = this.opts.maxOpacity * noise;
                    intensity = seed;
                } else if (maskMode === "halftonePulse" || maskMode === "halftone") {
                    const pulse = 0.65 + 0.35 * Math.sin(t * 1.6 + (x + y) * 0.02);
                    opacity = this.opts.maxOpacity * pulse;
                    intensity = pulse;
                    bold = pulse > 0.85;
                } else {
                    // Default "waveSweep"
                    const wave = this._waveCell(col, row, x, y);
                    opacity = Math.max(0.18, wave.opacity);
                    bold = wave.bold;
                    intensity = wave.level / (this.opts.fontLevels - 1);
                }
            }

            const cell = this._setCell(char, opacity, intensity, bold);
            cell.color = this.opts.colorFromImage ? g.colors[i] : null;
            return cell;
        }

        /**
         * Overlays sampled glyph and color data without replacing the selected
         * mode's opacity, timing, or particle geometry.
         */
        _applyImageSource(effectCell, col, row) {
            const grid = this._imageGrid;
            if (!grid || col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return null;
            const index = row * grid.cols + col;
            const character = grid.chars[index];
            if (!character || character === " ") return null;

            const animateCell = !grid.animationMask || grid.animationMask[index] === 1;
            // Global modes always animate the image source. animateImageMask is
            // retained only for legacy `mode: "image"` mask behavior.
            const cell = !animateCell
                ? this._setCell(character, this.opts.maxOpacity, 0.5, false)
                : effectCell;
            if (!cell) return null;
            cell.char = character;
            cell.color = this.opts.colorFromImage ? grid.colors[index] : null;
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

        _chartCell(col, row, _x, _y) {
            const data = this.opts.chartData;
            if (!data || (Array.isArray(data) && data.length === 0)) {
                return this._setCell(" ", 0, 0, false);
            }
            const type = this.opts.chartType || "bar";
            const { cols, rows } = this;
            let values = [];

            if (Array.isArray(data)) {
                if (typeof data[0] === "number") {
                    values = data;
                } else if (typeof data[0] === "object" && data[0] !== null) {
                    values = data.map((item) => Number(item.value ?? item.val) || 0);
                }
            }

            if (values.length === 0) values = [10, 25, 45, 80, 60, 30];

            const title = this.opts.chartTitle;
            if (title && row === 0) {
                const startCol = Math.max(0, Math.floor((cols - title.length) / 2));
                const charIdx = col - startCol;
                if (charIdx >= 0 && charIdx < title.length) {
                    return this._setCell(title[charIdx], this.opts.maxOpacity, 1, true, this.opts.color);
                }
            }

            const marginRowTop = title ? 2 : 1;
            const marginRowBottom = this.opts.chartShowAxes ? 2 : 1;
            const usableRows = Math.max(1, rows - marginRowTop - marginRowBottom);
            const usableCols = Math.max(1, cols - 4);

            const maxVal = Math.max(1, ...values);
            const minVal = 0;

            if (type === "bar") {
                const barWidth = Math.max(1, Math.floor(usableCols / values.length));
                const barIdx = Math.floor((col - 2) / barWidth);

                if (barIdx >= 0 && barIdx < values.length) {
                    const val = values[barIdx];
                    const normVal = (val - minVal) / (maxVal - minVal);
                    const targetRowHeight = normVal * usableRows;
                    const currentRowFromBottom = (rows - marginRowBottom) - row;

                    if (currentRowFromBottom > 0 && currentRowFromBottom <= Math.ceil(targetRowHeight)) {
                        const subFraction = Math.max(0, Math.min(1, targetRowHeight - (currentRowFromBottom - 1)));
                        const ramp = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
                        const rampIdx = Math.min(7, Math.floor(subFraction * 8));
                        return this._setCell(ramp[rampIdx], this.opts.maxOpacity, normVal, subFraction > 0.8, this.opts.color);
                    }
                }
            } else if (type === "horizontalBar") {
                const barHeight = Math.max(1, Math.floor(usableRows / values.length));
                const barIdx = Math.floor((row - marginRowTop) / barHeight);

                if (barIdx >= 0 && barIdx < values.length) {
                    const val = values[barIdx];
                    const normVal = (val - minVal) / (maxVal - minVal);
                    const targetColWidth = normVal * usableCols;
                    const currentColFromLeft = col - 2;

                    if (currentColFromLeft >= 0 && currentColFromLeft <= Math.ceil(targetColWidth)) {
                        const subFraction = Math.max(0, Math.min(1, targetColWidth - currentColFromLeft));
                        const ramp = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
                        const rampIdx = Math.min(8, Math.floor(subFraction * 9));
                        return this._setCell(ramp[rampIdx], this.opts.maxOpacity, normVal, subFraction > 0.8, this.opts.color);
                    }
                }
            } else if (type === "line" || type === "sparkline") {
                const colFraction = col / Math.max(1, cols - 1);
                const dataIdx = colFraction * (values.length - 1);
                const i0 = Math.floor(dataIdx);
                const i1 = Math.min(values.length - 1, i0 + 1);
                const frac = dataIdx - i0;
                const val = values[i0] * (1 - frac) + values[i1] * frac;
                const normVal = (val - minVal) / (maxVal - minVal);
                const targetRow = Math.round((rows - marginRowBottom - 1) - normVal * (usableRows - 1));

                if (row === targetRow) {
                    const charRamp = ["_", ".", "-", "‾", "/", "█"];
                    return this._setCell(charRamp[Math.floor(normVal * 5)] || "*", this.opts.maxOpacity, normVal, true, this.opts.color);
                }
            } else if (type === "heatmap") {
                const nx = col / Math.max(1, cols - 1);
                const dataIdx = Math.floor(nx * values.length);
                const val = values[dataIdx % values.length] || 0;
                const normVal = (val - minVal) / (maxVal - minVal);
                const charSet = this.opts.charSet;
                const charIdx = Math.floor(normVal * (charSet.length - 1));
                return this._setCell(charSet[charIdx] || " ", normVal * this.opts.maxOpacity, normVal, normVal > 0.8, this.opts.color);
            } else if (type === "donut") {
                const cx = cols / 2;
                const cy = rows / 2;
                const dx = (col - cx) * 1.6;
                const dy = row - cy;
                const dist = Math.hypot(dx, dy);
                const maxR = Math.min(cols, rows) * 0.4;
                if (dist >= maxR * 0.4 && dist <= maxR) {
                    const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
                    const dataIdx = Math.floor(angle * values.length);
                    const val = values[dataIdx % values.length] || 0;
                    const normVal = (val - minVal) / (maxVal - minVal);
                    const ramp = ["░", "▒", "▓", "█"];
                    const rampIdx = Math.min(3, Math.floor(normVal * 4));
                    return this._setCell(ramp[rampIdx], this.opts.maxOpacity, normVal, normVal > 0.7, this.opts.color);
                }
            }

            return this._setCell(" ", 0, 0, false);
        }

        /** Lazily allocates diagnostic history only while extended output is enabled. */
        _ensureExtendedStats() {
            if (!this._extendedStats) {
                this._extendedStats = {
                    refreshInterval: 0,
                    frameWorkAccum: 0,
                    frameWorkSamples: 0,
                    frameWorkMs: 0,
                    frameHistory: new Float32Array(STATS_HISTORY_LENGTH),
                    occupancyHistory: new Float32Array(STATS_HISTORY_LENGTH),
                    historyCount: 0,
                    historyCursor: 0,
                };
            }
            return this._extendedStats;
        }

        /** Estimates active display cadence from raw animation-frame intervals. */
        _sampleDisplayRefresh(dt) {
            if (!(dt >= 4 && dt <= 50)) return;
            const stats = this._ensureExtendedStats();
            stats.refreshInterval = stats.refreshInterval
                ? stats.refreshInterval * 0.9 + dt * 0.1
                : dt;
        }

        _pushExtendedStats(occupancy) {
            const stats = this._ensureExtendedStats();
            stats.frameWorkMs = stats.frameWorkAccum / stats.frameWorkSamples;
            stats.frameWorkAccum = 0;
            stats.frameWorkSamples = 0;
            stats.frameHistory[stats.historyCursor] = stats.frameWorkMs;
            stats.occupancyHistory[stats.historyCursor] = occupancy;
            stats.historyCursor = (stats.historyCursor + 1) % STATS_HISTORY_LENGTH;
            stats.historyCount = Math.min(STATS_HISTORY_LENGTH, stats.historyCount + 1);
        }

        /** Returns a read-only diagnostic snapshot without starting any observers. */
        getStats() {
            const cells = this.cols * this.rows;
            const occupancy = cells ? Math.min(1, this._lastDrawnCount / cells) : 0;
            const stats = this._extendedStats;
            const renderer = this.getRendererInfo();
            const adapter = renderer.backend === "webgl2" ? this._webgl?.getAdapterInfo() || null : null;
            return {
                fps: this._fps,
                estimatedRefreshRate: stats?.refreshInterval ? 1000 / stats.refreshInterval : null,
                frameWorkMs: stats?.frameWorkMs ?? null,
                cells,
                drawn: this._lastDrawnCount,
                occupancy,
                renderer: { ...renderer, adapter },
                quality: this.opts.quality,
                dpr: this._dpr || 1,
                targetFPS: this.opts.targetFPS,
                reducedMotion: this._reduced,
                mesh: this.getMeshInfo(),
                modelLoaded: !!this.opts.model,
            };
        }

        _formatExtendedStats(snapshot) {
            const stats = this._extendedStats;
            const refresh = snapshot.estimatedRefreshRate ? `~${Math.round(snapshot.estimatedRefreshRate)} Hz` : "measuring";
            const frameWork = snapshot.frameWorkMs === null ? "measuring" : `${snapshot.frameWorkMs.toFixed(2)} ms`;
            const frameCeiling = Math.max(1, 1000 / (snapshot.estimatedRefreshRate || snapshot.targetFPS || 60));
            const frameChart = formatSparkline(stats.frameHistory, stats.historyCount, stats.historyCursor, frameCeiling);
            const occupancyChart = formatSparkline(stats.occupancyHistory, stats.historyCount, stats.historyCursor, 1);
            const backendLabel = snapshot.renderer.backend === "webgl2" ? "WebGL2" : "Canvas 2D";
            const fillLabel = snapshot.renderer.backend === "webgl2" ? "GPU batch fill" : "Canvas fill";
            const lines = [
                `${snapshot.fps} fps · ${this.cols}×${this.rows} cells · ${snapshot.drawn} drawn`,
                `display ${refresh} · ${backendLabel} · ${snapshot.quality} · DPR ${snapshot.dpr.toFixed(2)}`,
                `CPU frame ${frameWork}${frameChart ? `  ${frameChart}` : ""}`,
                `${fillLabel} ${(snapshot.occupancy * 100).toFixed(1)}%${occupancyChart ? `  ${occupancyChart}` : ""}`,
            ];
            if (snapshot.renderer.adapter) {
                const adapter = snapshot.renderer.adapter.renderer.replace(/\s+/g, " ").slice(0, 80);
                lines.push(`GPU ${adapter}`);
            }
            if (snapshot.mesh.loaded) {
                const source = snapshot.modelLoaded ? "model" : this.opts.meshPrimitive || "mesh";
                lines.push(`3D ${source} · ${snapshot.mesh.vertexCount} vertices · ${snapshot.mesh.primitiveCount} ${snapshot.mesh.primitive} · ${snapshot.mesh.style}`);
            }
            return lines.join("\n");
        }

        _updateStats(timestamp, frameWorkMs) {
            this._frames++;
            if (this.opts.extendedStats) {
                const stats = this._ensureExtendedStats();
                stats.frameWorkAccum += frameWorkMs;
                stats.frameWorkSamples++;
            }
            if (this._statsWindowStart === null) this._statsWindowStart = timestamp;
            const elapsed = timestamp - this._statsWindowStart;
            if (elapsed >= 500) {
                this._fps = Math.round((this._frames * 1000) / elapsed);
                this._frames = 0;
                this._statsWindowStart = timestamp;
                if (this._statsEl) {
                    const cells = this.cols * this.rows;
                    const occupancy = cells ? Math.min(1, this._lastDrawnCount / cells) : 0;
                    if (this.opts.extendedStats) {
                        this._pushExtendedStats(occupancy);
                        this._statsEl.textContent = this._formatExtendedStats(this.getStats());
                    } else {
                        this._statsEl.textContent = `${this._fps} fps · ${this.cols}×${this.rows} cells · ${this._lastDrawnCount} drawn`;
                    }
                }
            }
        }
        /** Selects the text element updated by the optional diagnostics counter. */
        attachStats(el) {
            this._statsEl = el;
        }

        /**
         * Captures and exports the rendered ASCII art frame as a PNG, JPG, or WebP image.
         * Accepts format, quality, multiplier scale (e.g. 1x, 2x, 4x for high-res prints), and optional auto-download.
         */
        async exportImage(options = {}) {
            const format = (options.format || "png").toLowerCase().replace("jpeg", "jpg");
            const quality = Math.min(1, Math.max(0.1, Number(options.quality) || 0.92));
            const scale = Math.min(8, Math.max(1, Number(options.scale) || 1));
            const filename = (options.filename || "ascii-art").replace(/\.[^/.]+$/, "");
            const mimeType = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

            if (this._running && this._lastT) {
                this._draw(16.7);
            }

            const srcCanvas = this.canvas;
            let exportCanvas = srcCanvas;

            if (scale !== 1) {
                const scaledCanvas = document.createElement("canvas");
                scaledCanvas.width = srcCanvas.width * scale;
                scaledCanvas.height = srcCanvas.height * scale;
                const ctx = scaledCanvas.getContext("2d");
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(srcCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                    exportCanvas = scaledCanvas;
                }
            }

            let dataURL = "";
            try {
                if (typeof exportCanvas.toDataURL === "function") {
                    const res = exportCanvas.toDataURL(mimeType, quality);
                    if (res && typeof res === "string" && res.startsWith("data:")) dataURL = res;
                }
            } catch {
                dataURL = "";
            }
            if (!dataURL) {
                dataURL = `data:${mimeType};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
            }

            let blob = null;
            if (!blob) {
                try {
                    const parts = dataURL.split(",");
                    if (parts.length > 1 && parts[1]) {
                        const bin = atob(parts[1]);
                        const arr = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                        blob = new Blob([arr], { type: mimeType });
                    } else {
                        blob = new Blob([], { type: mimeType });
                    }
                } catch {
                    blob = new Blob([], { type: mimeType });
                }
            }

            const ext = format === "jpg" ? "jpg" : format === "webp" ? "webp" : "png";
            const result = {
                dataURL,
                blob,
                filename: `${filename}.${ext}`,
                width: exportCanvas.width,
                height: exportCanvas.height,
                format,
            };

            if (options.download) {
                const a = document.createElement("a");
                a.href = dataURL;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            return result;
        }

        /**
         * Convenience shortcut to download current frame snapshot immediately.
         */
        downloadSnapshot(format = "png", filename = "ascii-art", scale = 1) {
            return this.exportImage({ format, filename, scale, download: true });
        }

        /** Installs chart data and enables ASCII chart rendering mode. */
        setChartData(data, options = {}) {
            this.opts.chartData = data;
            if (options.type) this.opts.chartType = options.type;
            if (options.title !== undefined) this.opts.chartTitle = options.title;
            if (options.showValues !== undefined) this.opts.chartShowValues = options.showValues;
            if (options.showAxes !== undefined) this.opts.chartShowAxes = options.showAxes;
            this.setMode("chart");
            return this;
        }

        /** Clears active chart data and resets animation mode. */
        clearChart() {
            this.opts.chartData = null;
            this.opts.chartTitle = "";
            if (this.opts.mode === "chart") {
                this.setMode("wave");
            }
            return this;
        }

        /** Returns metadata for the active ASCII chart. */
        getChartInfo() {
            const data = this.opts.chartData;
            const isArray = Array.isArray(data);
            return {
                active: this.opts.mode === "chart" && !!data,
                type: this.opts.chartType || "bar",
                dataLength: isArray ? data.length : 0,
                title: this.opts.chartTitle || "",
            };
        }
    }

export default asciiam;
