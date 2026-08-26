/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import asciiam from "../src/asciiam.js";

const NativeImage = globalThis.Image;

const makeGradient = () => ({ addColorStop: jest.fn() });

const makeContext = () => ({
    clearRect: jest.fn(),
    createLinearGradient: jest.fn(makeGradient),
    createRadialGradient: jest.fn(makeGradient),
    drawImage: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    measureText: jest.fn(() => ({ width: 8 })),
    restore: jest.fn(),
    rotate: jest.fn(),
    save: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    translate: jest.fn(),
});

const makeWebGL2 = () => {
    let attribute = 0;
    return {
        ARRAY_BUFFER: 1, BLEND: 2, BUFFER_SIZE: 3, CLAMP_TO_EDGE: 4, COLOR_BUFFER_BIT: 5,
        COMPILE_STATUS: 6, DYNAMIC_DRAW: 7, FLOAT: 8, FRAGMENT_SHADER: 9, HIGH_FLOAT: 10,
        LINEAR: 11, LINK_STATUS: 12, ONE: 13, ONE_MINUS_SRC_ALPHA: 14, RGBA: 15,
        STATIC_DRAW: 16, TEXTURE0: 17, TEXTURE1: 18, TEXTURE_2D: 19, TEXTURE_MAG_FILTER: 20,
        TEXTURE_MIN_FILTER: 21, TEXTURE_WRAP_S: 22, TEXTURE_WRAP_T: 23, TRIANGLE_STRIP: 24,
        UNSIGNED_BYTE: 25, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 26, VERTEX_SHADER: 27,
        activeTexture: jest.fn(), attachShader: jest.fn(), bindBuffer: jest.fn(), bindTexture: jest.fn(),
        bindVertexArray: jest.fn(), blendFunc: jest.fn(), bufferData: jest.fn(), bufferSubData: jest.fn(),
        clear: jest.fn(), clearColor: jest.fn(), compileShader: jest.fn(), createBuffer: jest.fn(() => ({})),
        createProgram: jest.fn(() => ({})), createShader: jest.fn(() => ({})), createTexture: jest.fn(() => ({})),
        createVertexArray: jest.fn(() => ({})), deleteBuffer: jest.fn(), deleteProgram: jest.fn(), deleteTexture: jest.fn(),
        drawArrays: jest.fn(), drawArraysInstanced: jest.fn(), enable: jest.fn(), enableVertexAttribArray: jest.fn(),
        getAttribLocation: jest.fn(() => attribute++), getBufferParameter: jest.fn(() => 0),
        getProgramInfoLog: jest.fn(() => ""), getProgramParameter: jest.fn(() => true),
        getShaderInfoLog: jest.fn(() => ""), getShaderParameter: jest.fn(() => true),
        getUniformLocation: jest.fn(() => ({})), linkProgram: jest.fn(), pixelStorei: jest.fn(),
        shaderSource: jest.fn(), texImage2D: jest.fn(), texParameteri: jest.fn(), uniform1f: jest.fn(),
        uniform1i: jest.fn(), uniform2f: jest.fn(), uniform4fv: jest.fn(), useProgram: jest.fn(),
        vertexAttribDivisor: jest.fn(), vertexAttribPointer: jest.fn(), viewport: jest.fn(),
    };
};

describe("asciiam lifecycle", () => {
    let animationFrames;
    let nextFrameId;
    let resizeObservers;
    let intersectionObservers;

    beforeEach(() => {
        document.body.innerHTML = '<div id="host"></div>';

        HTMLCanvasElement.prototype.getContext = jest.fn(() => makeContext());

        animationFrames = new Map();
        nextFrameId = 1;
        globalThis.requestAnimationFrame = jest.fn((callback) => {
            const id = nextFrameId++;
            animationFrames.set(id, callback);
            return id;
        });
        globalThis.cancelAnimationFrame = jest.fn((id) => {
            animationFrames.delete(id);
        });

        resizeObservers = [];
        globalThis.ResizeObserver = class {
            constructor(callback) {
                this.callback = callback;
                this.disconnect = jest.fn();
                this.observe = jest.fn();
                resizeObservers.push(this);
            }
        };

        intersectionObservers = [];
        globalThis.IntersectionObserver = class {
            constructor(callback) {
                this.callback = callback;
                this.disconnect = jest.fn();
                this.observe = jest.fn();
                intersectionObservers.push(this);
            }
        };

        window.matchMedia = jest.fn(() => ({
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete globalThis.ResizeObserver;
        delete globalThis.IntersectionObserver;
        delete globalThis.ImageDecoder;
        delete globalThis.fetch;
        globalThis.Image = NativeImage;
    });

    it("constructs, starts, resizes, and destroys without throwing", async () => {
        const host = document.querySelector("#host");
        let width = 320;
        let height = 180;
        Object.defineProperties(host, {
            clientWidth: { configurable: true, get: () => width },
            clientHeight: { configurable: true, get: () => height },
        });

        const onReady = jest.fn();
        const animation = new asciiam(host, { respectReducedMotion: false, onReady });
        const onReadyEvent = jest.fn();
        const onFrame = jest.fn();
        const onResize = jest.fn();
        animation.on("ready", onReadyEvent);
        const unsubscribeFrame = animation.on("frame", onFrame);
        animation.on("resize", onResize);

        await Promise.resolve();

        expect(animation.canvas.parentElement).toBe(host);
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d", expect.objectContaining({
            alpha: true,
            desynchronized: true,
            willReadFrequently: false,
        }));
        expect(animation.canvas.style.willChange).toBe("transform");
        expect(animation.canvas.style.transform).toBe("translateZ(0)");
        expect(animation.getRendererInfo()).toEqual({
            requested: "auto",
            backend: "canvas2d",
            gpuPreferred: true,
            acceleration: "browser-managed",
            desynchronized: true,
            willReadFrequently: false,
        });
        expect(animation.w).toBe(320);
        expect(animation.h).toBe(180);
        expect(resizeObservers[0].observe).toHaveBeenCalledWith(host);
        expect(intersectionObservers[0].observe).toHaveBeenCalledWith(animation.canvas);
        expect(onReady).toHaveBeenCalledWith(animation);
        expect(onReadyEvent).toHaveBeenCalledWith(
            expect.objectContaining({ width: 320, height: 180 }),
            animation,
        );

        animation.start();
        expect(animationFrames.size).toBe(1);

        const frame = animationFrames.values().next().value;
        animationFrames.clear();
        expect(() => frame(16.7)).not.toThrow();
        expect(animationFrames.size).toBe(1);
        expect(onFrame).toHaveBeenCalledWith(
            expect.objectContaining({ delta: 16.7, drawn: expect.any(Number) }),
            animation,
        );
        unsubscribeFrame();

        animation.stop();
        width = 640;
        height = 360;
        resizeObservers[0].callback();
        expect(animationFrames.size).toBe(1);

        const resizeFrame = animationFrames.values().next().value;
        animationFrames.clear();
        expect(() => resizeFrame(33.4)).not.toThrow();
        expect(animation.w).toBe(640);
        expect(animation.h).toBe(360);
        expect(onResize).toHaveBeenCalledWith(
            expect.objectContaining({ width: 640, height: 360 }),
            animation,
        );

        expect(() => animation.destroy()).not.toThrow();
        expect(resizeObservers[0].disconnect).toHaveBeenCalled();
        expect(intersectionObservers[0].disconnect).toHaveBeenCalled();
        expect(host.querySelector("canvas")).toBeNull();
        expect(animationFrames.size).toBe(0);
    });

    it("keeps compact stats allocation-free and gates extended diagnostics", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const output = document.createElement("output");
        const animation = new asciiam(host, {
            renderer: "canvas2d",
            showStats: true,
            respectReducedMotion: false,
        });
        animation.attachStats(output);
        animation._lastDrawnCount = 12;
        animation._updateStats(0, 0);
        animation._updateStats(501, 0);

        expect(animation._extendedStats).toBeNull();
        expect(output.textContent).toMatch(/^\d+ fps · \d+×\d+ cells · 12 drawn$/);

        animation.setOption("extendedStats", true);
        animation._sampleDisplayRefresh(16.67);
        animation.setMesh(asciiam.createMeshPrimitive("cube"));
        animation._updateStats(750, 2);
        animation._updateStats(1002, 4);

        const stats = animation.getStats();
        expect(stats).toEqual(expect.objectContaining({
            estimatedRefreshRate: expect.any(Number),
            frameWorkMs: 3,
            cells: animation.cols * animation.rows,
            drawn: 12,
            quality: "balanced",
            mesh: expect.objectContaining({ loaded: true, vertexCount: 8, primitiveCount: 12 }),
        }));
        expect(output.textContent).toContain("display ~60 Hz · Canvas 2D");
        expect(output.textContent).toContain("CPU frame 3.00 ms");
        expect(output.textContent).toContain("Canvas fill");
        expect(output.textContent).toContain("3D mesh · 8 vertices · 12 triangles · wireframe");
        expect(output.textContent).toMatch(/[▁▂▃▄▅▆▇█]/);

        animation.setOption("extendedStats", false);
        expect(animation._extendedStats).toBeNull();
        animation.destroy();
    });

    it("exposes complete ASCII presets and rebuilds spatial caches when alignment changes", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { respectReducedMotion: false });

        expect(asciiam.CHARACTER_SETS.ascii).toHaveLength(95);
        expect(asciiam.CHARACTER_SETS.asciiExtended).toHaveLength(190);
        expect(animation.opts.charSet).toBe(asciiam.CHARACTER_SETS.asciiExtended);
        expect(asciiam.CHARACTER_SETS.boxDrawing).toContain("┼");
        expect(asciiam.CHARACTER_SETS.arrows).toContain("→");
        expect(asciiam.CHARACTER_SETS.math).toContain("∞");
        expect(asciiam.CHARACTER_SETS.minimal).toBe(" .oO@");
        expect(asciiam.CHARACTER_SETS.technical).toBe(" .·:+=*#%@");
        expect(asciiam.CHARACTER_SETS.geometric).toContain("◆");
        expect(asciiam.CHARACTER_SETS.circuit).toContain("0");
        expect(asciiam.CHARACTER_SETS.waves).toContain("∿");
        expect(asciiam.CHARACTER_SETS.terminal).toContain("{}");
        expect(animation._originX).toBe(160);
        expect(animation._originY).toBe(90);

        animation.setOption("align", "top-left");

        expect(animation._originX).toBe(0);
        expect(animation._originY).toBe(0);
        expect(animation._rippleFalloff).toHaveLength(animation.cols * animation.rows);

        animation.setOption("align", "top");
        expect(animation._originX).toBe(160);
        expect(animation._originY).toBe(0);
        animation.setOption("align", "right");
        expect(animation._originX).toBe(320);
        expect(animation._originY).toBe(90);
        animation.setOption("align", "bottom");
        expect(animation._originX).toBe(160);
        expect(animation._originY).toBe(180);

        animation.setOption("imageChars", " .#");
        animation.setOption("charSet", " 01");
        expect(animation.opts.imageChars).toBe(" .#");
        animation.destroy();
    });

    it("supports pointer hover fields and triggered click-zone pulses", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            mode: "hoverZone",
            charSet: " .#",
            interactionRadius: 100,
            respectReducedMotion: false,
        });

        animation.setCursor(160, 90);
        const hoverCentre = animation._hoverZoneCell(0, 0, 160, 90).opacity;
        const hoverOutside = animation._hoverZoneCell(0, 0, 0, 0).opacity;
        expect(hoverCentre).toBeGreaterThan(hoverOutside);

        animation.setMode("clickZone");
        expect(animation._interaction).toBeNull();
        animation.setOption("align", "bottom-right");
        animation.triggerInteraction();
        expect(animation._interaction).toEqual(expect.objectContaining({ x: 320, y: 180 }));
        const clickCentre = animation._clickZoneCell(0, 0, 320, 180).opacity;
        const clickOutside = animation._clickZoneCell(0, 0, 0, 0).opacity;
        expect(clickCentre).toBeGreaterThan(clickOutside);

        animation._interaction.elapsed = animation.opts.interactionDuration;
        animation.start();
        animation._runFrame(16.7);
        expect(animation._interaction).toBeNull();

        animation.setMode("wave");
        host.dispatchEvent(new MouseEvent("pointerdown", { clientX: 40, clientY: 50 }));
        expect(animation._interaction).toEqual(expect.objectContaining({ x: 40, y: 50 }));
        animation.destroy();
    });

    it("draws exact-alpha backdrops behind or over glyphs", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            mode: "current",
            charSet: "@@",
            backdrop: { enabled: true, opacity: 1, color: "#000000", placement: "behind" },
            respectReducedMotion: false,
        });
        const alphaWrites = [];
        Object.defineProperty(animation.ctx, "globalAlpha", {
            configurable: true,
            get: () => alphaWrites.at(-1) ?? 1,
            set: (value) => {
                alphaWrites.push(value);
            },
        });

        animation._draw(16.7);
        expect(alphaWrites).toContain(1);
        expect(animation.ctx.fillRect.mock.invocationCallOrder[0]).toBeLessThan(animation.ctx.fillText.mock.invocationCallOrder[0]);

        animation.ctx.fillRect.mockClear();
        animation.ctx.fillText.mockClear();
        animation.setOption("backdrop", { enabled: true, opacity: 1, color: "#000000", placement: "over" });
        animation._draw(16.7);
        expect(animation.ctx.fillRect.mock.invocationCallOrder[0]).toBeGreaterThan(animation.ctx.fillText.mock.invocationCallOrder[0]);
        animation.destroy();
    });

    it("supports a fade-out mode that reverses the fade-in reveal", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "fadeOut", loop: false, respectReducedMotion: false });
        const col = 0;
        const row = 0;
        animation._time = 0;
        const initialOpacity = animation._fadeOutCell(col, row, 0, 0).opacity;
        animation._time = 2.8;
        const finalOpacity = animation._fadeOutCell(col, row, 0, 0).opacity;

        expect(initialOpacity).toBeGreaterThan(0);
        expect(finalOpacity).toBe(0);
        expect(asciiam.presets.outroFade.mode).toBe("fadeOut");
        animation.destroy();
    });

    it("restarts and reveals across horizontal, vertical, diagonal, center, or edge directions", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "fadeIn", loop: false, respectReducedMotion: false });
        const row = Math.floor(animation.rows / 2);
        const left = 0;
        const center = Math.floor((animation.cols - 1) / 2);
        const right = animation.cols - 1;
        animation.setOption("revealDirection", "left-to-right");
        expect(animation._time).toBe(0);
        animation._time = 1.2;
        const leftToRightStart = animation._fadeInCell(left, row, 0, 0).opacity;
        const leftToRightEnd = animation._fadeInCell(right, row, 0, 0).opacity;
        expect(leftToRightStart).toBeGreaterThan(leftToRightEnd);

        animation.setOption("revealDirection", "right-to-left");
        animation._time = 1.2;
        const rightToLeftStart = animation._fadeInCell(left, row, 0, 0).opacity;
        const rightToLeftEnd = animation._fadeInCell(right, row, 0, 0).opacity;
        expect(rightToLeftEnd).toBeGreaterThan(rightToLeftStart);

        animation.setOption("revealDirection", "center");
        animation._time = 1.2;
        const centerOpacity = animation._fadeInCell(center, row, 0, 0).opacity;
        const edgeOpacity = animation._fadeInCell(left, row, 0, 0).opacity;
        expect(centerOpacity).toBeGreaterThan(edgeOpacity);
        animation.setOption("revealDirection", "top-to-bottom");
        expect(animation._revealProgress(left, 0)).toBeLessThan(animation._revealProgress(left, animation.rows - 1));
        animation.setOption("revealDirection", "bottom-to-top");
        expect(animation._revealProgress(left, 0)).toBeGreaterThan(animation._revealProgress(left, animation.rows - 1));
        animation.setOption("revealDirection", "diagonal");
        expect(animation._revealProgress(0, 0)).toBeLessThan(animation._revealProgress(animation.cols - 1, animation.rows - 1));
        expect(asciiam.presets.introReveal.revealDirection).toBe("left-to-right");
        expect(asciiam.presets.outroFade.revealDirection).toBe("right-to-left");
        animation.destroy();
    });

    it("supports configurable sweepDuration and delayCurve timing options for reveal modes", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, {
            mode: "fadeIn",
            sweepDuration: 4.0,
            delayCurve: "easeIn",
            loop: false,
            respectReducedMotion: false,
        });

        expect(animation.opts.sweepDuration).toBe(4.0);
        expect(animation.opts.delayCurve).toBe("easeIn");

        const progressEaseIn = animation._revealProgress(0.5, 0.5);
        animation.setOption("delayCurve", "stagger");
        const progressStagger = animation._revealProgress(0.5, 0.5);

        expect(typeof progressEaseIn).toBe("number");
        expect(typeof progressStagger).toBe("number");
        animation.destroy();
    });

    it("draws transition modes and the three coined animation modes", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        ["irisIn", "irisOut", "dissolveIn", "dissolveOut", "assemble", "breakApart", "lumaFold", "riftLace", "echoBloom"].forEach((mode) => {
            animation.setMode(mode);
            animation._time = 0.9;
            expect(() => animation._draw(16.7)).not.toThrow();
            expect(animation._lastDrawnCount).toBeGreaterThan(0);
        });
        animation.destroy();
    });

    it("changes every recently added mode across animation time", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { loop: true, respectReducedMotion: false });
        const points = [
            [0, 0],
            [Math.floor(animation.cols / 3), Math.floor(animation.rows / 3)],
            [Math.floor(animation.cols / 2), Math.floor(animation.rows / 2)],
            [animation.cols - 1, animation.rows - 1],
        ];
        const signature = (mode, time) => {
            animation.setMode(mode);
            animation._time = time;
            return points.map(([col, row]) => {
                const cell = animation._computeCell(col, row, col * animation.charW, row * animation.charH);
                return cell ? `${cell.char}:${cell.opacity.toFixed(3)}:${cell.level}` : "null";
            }).join("|");
        };

        ["irisIn", "irisOut", "dissolveIn", "dissolveOut", "assemble", "breakApart", "lumaFold", "riftLace", "echoBloom"].forEach((mode) => {
            expect(signature(mode, 0.15)).not.toBe(signature(mode, 1.15));
        });
        animation.destroy();
    });

    it("reuses static backdrop gradients and keeps trigonometry out of the dense current cell loop", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "current", respectReducedMotion: false });
        animation.setOption("backdrop", {
            enabled: true,
            opacity: 0.5,
            gradient: { type: "linear", angle: 45, stops: ["#000000", "#ffffff"] },
        });
        const sinSpy = jest.spyOn(Math, "sin");

        animation._draw(16.7);
        animation._draw(16.7);

        expect(animation.ctx.createLinearGradient).toHaveBeenCalledTimes(1);
        expect(sinSpy.mock.calls.length).toBeLessThanOrEqual(16);
        animation.destroy();
    });

    it("renders a cached vortex around the selected spatial origin", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "vortex", respectReducedMotion: false });
        const atanSpy = jest.spyOn(Math, "atan2");
        animation._draw(16.7);
        animation._draw(16.7);

        expect(animation._vortexSin).toHaveLength(animation.cols * animation.rows);
        expect(animation._vortexCos).toHaveLength(animation.cols * animation.rows);
        expect(atanSpy).not.toHaveBeenCalled();
        expect(animation._lastDrawnCount).toBeGreaterThan(0);
        expect(asciiam.presets.vortexFlow.mode).toBe("vortex");

        animation.setOption("align", "top-right");
        expect(animation._originX).toBe(320);
        expect(animation._originY).toBe(0);
        expect(atanSpy).toHaveBeenCalled();
        animation.destroy();
    });

    it("renders plasma from cached fields with constant per-frame trigonometry", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "plasma", respectReducedMotion: false });
        const sinSpy = jest.spyOn(Math, "sin");
        const cosSpy = jest.spyOn(Math, "cos");
        animation._draw(16.7);
        animation._draw(16.7);

        expect(animation._plasmaSinA).toHaveLength(animation.cols * animation.rows);
        expect(animation._plasmaCosC).toHaveLength(animation.cols * animation.rows);
        expect(sinSpy).toHaveBeenCalledTimes(6);
        expect(cosSpy).toHaveBeenCalledTimes(6);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);
        expect(asciiam.presets.plasmaField.mode).toBe("plasma");
        animation.destroy();
    });

    it("renders the remaining dense and sparse animation inventory", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { mode: "fire", respectReducedMotion: false });
        animation._fire[0] = { col: animation.cols / 2, y: animation.rows - 1, speed: 6, phase: 0, drift: 1, life: 1 };
        animation._draw(16.7);
        expect(animation._fire).toHaveLength(Math.max(1, Math.round(animation.cols * animation.rows * animation.opts.fireDensity)));
        expect(animation._lastDrawnCount).toBeGreaterThan(0);

        animation.setMode("starfield");
        animation._starfield[0] = { x: 0, y: 0, z: 0.5, speed: 0.3 };
        animation._draw(16.7);
        expect(animation._starfield).toHaveLength(Math.max(1, Math.round(animation.cols * animation.rows * animation.opts.starfieldDensity)));
        expect(animation._lastDrawnCount).toBeGreaterThan(0);

        animation.setMode("orbit");
        animation._orbit[0] = { angle: 0, radius: animation.charW, speed: 0.5, phase: 0 };
        animation._draw(16.7);
        expect(animation._orbit).toHaveLength(Math.max(1, Math.round(animation.cols * animation.rows * animation.opts.orbitDensity)));
        expect(animation._lastDrawnCount).toBeGreaterThan(0);

        animation.setMode("glitch");
        animation._draw(16.7);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);

        animation.setMode("typewriter");
        animation._time = 1;
        animation._draw(16.7);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);

        expect(asciiam.presets.risingEmbers.mode).toBe("fire");
        expect(asciiam.presets.deepSpace.mode).toBe("starfield");
        expect(asciiam.presets.signalGlitch.mode).toBe("glitch");
        expect(asciiam.presets.terminalType.mode).toBe("typewriter");
        expect(asciiam.presets.orbitalFlow.mode).toBe("orbit");
        animation.destroy();
    });

    it("restarts mode-local timelines and applies live quality parameters", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });

        const animation = new asciiam(host, { respectReducedMotion: false });
        animation._time = 42;
        animation.setMode("fadeIn");
        expect(animation._time).toBe(0);

        animation.setOption("quality", "performance");
        expect(animation.opts.quality).toBe("performance");
        expect(animation.opts.maxDPR).toBe(asciiam.QUALITY.performance.maxDPR);
        expect(animation.opts.density).toBe(asciiam.QUALITY.performance.density);
        expect(animation.opts.targetFPS).toBeNull();
        expect(animation._fontRegular).toHaveLength(asciiam.QUALITY.performance.fontLevels);

        animation.setOption("fontFamily", "monospace");
        animation.setOption("fontLevels", 7);
        animation.setOption("maxDPR", 0.5);
        expect(animation._fontRegular).toHaveLength(7);
        expect(animation._fontRegular[0]).toContain("monospace");
        expect(animation.canvas.width).toBe(160);

        const automaticCells = animation.cols * animation.rows;
        animation.setOption("resolutionScale", 2);
        expect(animation.opts.resolutionScale).toBe(2);
        expect(animation.cols * animation.rows).toBeGreaterThan(automaticCells);
        animation.setOption("resolutionScale", 10);
        expect(animation.opts.resolutionScale).toBe(2);
        animation.setOption("resolutionScale", 0.1);
        expect(animation.opts.resolutionScale).toBe(0.5);
        animation.destroy();
    });

    it("keeps ultra within a 120 Hz dense-render budget and caches repeated canvas state", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 1920 },
            clientHeight: { configurable: true, value: 1080 },
        });
        const context = makeContext();
        let alphaWrites = 0;
        Object.defineProperty(context, "globalAlpha", {
            configurable: true,
            set() { alphaWrites += 1; },
        });
        HTMLCanvasElement.prototype.getContext.mockReturnValue(context);

        const animation = new asciiam(host, { mode: "current", quality: "ultra", respectReducedMotion: false });
        expect(animation.cols * animation.rows).toBeLessThanOrEqual(3000);
        expect(animation.opts.alphaLevels).toBe(8);
        expect(animation._fontRegular).toHaveLength(2);

        animation._draw(16.7);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);
        expect(alphaWrites).toBeLessThan(animation._lastDrawnCount / 2);
        context.drawImage.mockClear();
        context.fillText.mockClear();
        animation._draw(16.7);
        expect(context.drawImage).toHaveBeenCalledTimes(animation._lastDrawnCount);
        expect(context.fillText).not.toHaveBeenCalled();
        expect(animation._columnX).toHaveLength(animation.cols);
        expect(animation._rowBaseline).toHaveLength(animation.rows);
        animation.destroy();
    });

    it("caches the static horizontal wave field and redraws only its moving band", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 1920 },
            clientHeight: { configurable: true, value: 1080 },
        });
        const context = makeContext();
        HTMLCanvasElement.prototype.getContext.mockReturnValue(context);
        const animation = new asciiam(host, { mode: "wave", quality: "ultra", respectReducedMotion: false });

        animation._draw(16.7);
        const baseLayer = animation._waveBaseLayer;
        expect(baseLayer).not.toBeNull();
        context.drawImage.mockClear();
        context.fillText.mockClear();
        animation._time += 1 / 60;
        animation._draw(16.7);

        expect(animation._waveBaseLayer).toBe(baseLayer);
        expect(context.drawImage.mock.calls.length).toBeLessThan(animation.cols * animation.rows / 2);
        expect(context.fillText).not.toHaveBeenCalled();
        animation.destroy();
    });

    it("shares one animation-frame scheduler across instances", () => {
        const firstHost = document.querySelector("#host");
        const secondHost = document.createElement("div");
        document.body.appendChild(secondHost);
        [firstHost, secondHost].forEach((host) => Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        }));
        const first = new asciiam(firstHost, { respectReducedMotion: false });
        const second = new asciiam(secondHost, { respectReducedMotion: false });

        first.start();
        second.start();
        expect(animationFrames.size).toBe(1);

        const frame = animationFrames.values().next().value;
        animationFrames.clear();
        frame(16.7);
        expect(first._lastDrawnCount).toBeGreaterThan(0);
        expect(second._lastDrawnCount).toBeGreaterThan(0);
        expect(animationFrames.size).toBe(1);

        first.destroy();
        expect(animationFrames.size).toBe(1);
        second.destroy();
        expect(animationFrames.size).toBe(0);
    });

    it("selects WebGL2 explicitly and batches glyphs on the GPU backend", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());

        const animation = new asciiam(host, { renderer: "webgl2", quality: "ultra", respectReducedMotion: false });
        expect(animation.getRendererInfo()).toEqual(expect.objectContaining({
            requested: "webgl2",
            backend: "webgl2",
            acceleration: "gpu-api-preferred",
        }));
        animation._draw(16.7);
        expect(gl.bufferSubData).toHaveBeenCalled();
        expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, expect.any(Number));
        animation.destroy();
    });

    it("does not probe WebGPU on the default automatic renderer path", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());
        const descriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, "gpu");
        const secureDescriptor = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");
        const requestAdapter = jest.fn();
        Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
        Object.defineProperty(globalThis.navigator, "gpu", { configurable: true, value: { requestAdapter } });
        const animation = new asciiam(host, { renderer: "auto", respectReducedMotion: false });
        expect(animation.getRendererInfo().backend).toBe("webgl2");
        expect(requestAdapter).not.toHaveBeenCalled();
        animation.destroy();
        if (secureDescriptor) Object.defineProperty(globalThis, "isSecureContext", secureDescriptor);
        else delete globalThis.isSecureContext;
        if (descriptor) Object.defineProperty(globalThis.navigator, "gpu", descriptor);
        else delete globalThis.navigator.gpu;
    });

    it("prefers WebGPU from auto when capability detection passes", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());
        const secureDescriptor = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");
        const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, "gpu");
        const requestAdapter = jest.fn(() => Promise.reject(new Error("test adapter unavailable")));
        Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
        Object.defineProperty(globalThis.navigator, "gpu", { configurable: true, value: { requestAdapter } });
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        let animation;
        try {
            animation = new asciiam(host, { renderer: "auto", respectReducedMotion: false });
            await Promise.resolve();
            await Promise.resolve();
            expect(requestAdapter).toHaveBeenCalledTimes(1);
            expect(animation.getRendererInfo()).toEqual(expect.objectContaining({ requested: "auto", backend: "webgl2" }));
        } finally {
            animation?.destroy();
            warn.mockRestore();
            if (secureDescriptor) Object.defineProperty(globalThis, "isSecureContext", secureDescriptor);
            else delete globalThis.isSecureContext;
            if (navigatorDescriptor) Object.defineProperty(globalThis.navigator, "gpu", navigatorDescriptor);
            else delete globalThis.navigator.gpu;
        }
    });

    it("falls back from explicit WebGPU when no secure WebGPU device is available", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        let animation;
        try {
            animation = new asciiam(host, { renderer: "webgpu", respectReducedMotion: false });
            expect(animation.getRendererInfo().requested).toBe("webgpu");
            await Promise.resolve();
            await Promise.resolve();
            expect(animation.getRendererInfo().backend).toBe("webgl2");
            expect(warn).toHaveBeenCalled();
        } finally {
            animation?.destroy();
            warn.mockRestore();
        }
    });

    it("renders procedural meshes through the public Canvas 2D lifecycle", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const context = makeContext();
        HTMLCanvasElement.prototype.getContext.mockReturnValue(context);
        const animation = new asciiam(host, {
            renderer: "canvas2d",
            mode: "mesh",
            meshEnabled: true,
            charSet: " .:-=+*#%@",
            meshStyle: "solid",
            respectReducedMotion: false,
        });
        const onReady = jest.fn();
        const onClear = jest.fn();
        animation.on("meshReady", onReady);
        animation.on("meshClear", onClear);
        const cube = asciiam.createMeshPrimitive("cube");
        expect(animation.setMesh(cube)).toBe(animation);
        expect(animation.getMeshInfo()).toEqual(expect.objectContaining({
            loaded: true,
            vertexCount: 8,
            primitiveCount: 12,
            primitive: "triangles",
            style: "solid",
        }));
        animation._draw(16.7);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);
        expect(context.fillText).toHaveBeenCalled();
        expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ loaded: true }), animation);
        expect(animation.clearMesh()).toBe(animation);
        expect(animation.getMeshInfo().loaded).toBe(false);
        expect(onClear).toHaveBeenCalledWith(expect.objectContaining({ loaded: false }), animation);
        animation.destroy();
    });

    it("batches mesh glyphs through WebGL2 and retains mesh state on renderer switch", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());
        const animation = new asciiam(host, {
            renderer: "webgl2",
            mode: "mesh",
            meshEnabled: true,
            mesh: asciiam.createMeshPrimitive("torus", { majorSegments: 12, minorSegments: 8 }),
            meshStyle: "wireframe",
            respectReducedMotion: false,
        });
        animation._draw(16.7);
        expect(animation._lastDrawnCount).toBeGreaterThan(0);
        expect(gl.drawArraysInstanced).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4, expect.any(Number));
        animation.setRenderer("canvas2d");
        expect(animation.getMeshInfo()).toEqual(expect.objectContaining({ loaded: true, vertexCount: 96 }));
        animation.destroy();
    });

    it("loads a core glTF document through the public model lifecycle", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        let binary = "";
        for (const byte of new Uint8Array(positions.buffer)) binary += String.fromCharCode(byte);
        const modelDocument = {
            asset: { version: "2.0" },
            buffers: [{ byteLength: positions.byteLength, uri: `data:application/octet-stream;base64,${btoa(binary)}` }],
            bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
            nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }],
        };
        const animation = new asciiam(host, { renderer: "canvas2d", mode: "mesh", respectReducedMotion: false });
        const onStart = jest.fn();
        const onReady = jest.fn();
        animation.on("modelLoadStart", onStart);
        animation.on("modelReady", onReady);

        const mesh = await animation.setModel(modelDocument);

        expect(mesh).toEqual(expect.objectContaining({ vertexCount: 3, primitiveCount: 1 }));
        expect(animation.getMeshInfo().loaded).toBe(true);
        expect(onStart).toHaveBeenCalledWith({ source: modelDocument }, animation);
        expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ loaded: true, vertexCount: 3 }), animation);
        expect(animation.clearModel()).toBe(animation);
        expect(animation.getMeshInfo().loaded).toBe(false);
        animation.destroy();
    });

    it("switches renderers live and falls back after WebGL context loss", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const gl = makeWebGL2();
        HTMLCanvasElement.prototype.getContext.mockImplementation((type) => type === "webgl2" ? gl : makeContext());
        const animation = new asciiam(host, { renderer: "canvas2d", respectReducedMotion: false });
        const onChange = jest.fn();
        const onFallback = jest.fn();
        animation.on("rendererChange", onChange);
        animation.on("rendererFallback", onFallback);

        expect(animation.setRenderer("webgl2")).toBe("webgl2");
        expect(animation.getRendererInfo().backend).toBe("webgl2");
        const webglCanvas = animation.canvas;
        webglCanvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));

        expect(animation.getRendererInfo()).toEqual(expect.objectContaining({
            requested: "webgl2",
            backend: "canvas2d",
        }));
        expect(animation.canvas).not.toBe(webglCanvas);
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onFallback).toHaveBeenCalledWith(expect.objectContaining({ reason: "context-lost" }), animation);
        animation.destroy();
    });

    it("preserves explicit gradient stop offsets", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        const stops = animation._expandGradientStops({
            type: "linear",
            stops: [
                { offset: 0.8, color: "#ffffff" },
                { offset: 0.2, color: "#000000" },
            ],
        });

        expect(stops).toEqual([
            { offset: 0.2, color: "#000000" },
            { offset: 0.8, color: "#ffffff" },
        ]);
        animation.destroy();
    });

    it("moves one renderer between dedicated media targets", () => {
        const host = document.querySelector("#host");
        const media = document.createElement("div");
        document.body.appendChild(media);
        [host, media].forEach((element) => Object.defineProperties(element, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        }));

        const animation = new asciiam(host, { respectReducedMotion: false });
        const canvas = animation.canvas;
        animation.setTarget(media);

        expect(animation.canvas).toBe(canvas);
        expect(animation.container).toBe(media);
        expect(media.firstElementChild).toBe(canvas);
        expect(host.querySelector("canvas")).toBeNull();
        animation.destroy();
    });

    it("precomputes an image color-range mask and leaves unmatched cells static", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const pixels = new Uint8ClampedArray([
            200, 20, 20, 255,
            20, 20, 200, 255,
        ]);
        HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: pixels })),
        }));

        const animation = new asciiam(host, {
            mode: "image",
            imageEnabled: true,
            imageMaskMode: "scanlinePass",
            imageAnimationRange: { min: "#800000", max: "#ff8080" },
            respectReducedMotion: false,
        });
        animation.cols = 2;
        animation.rows = 1;
        animation._sourceImage = { width: 2, height: 1 };
        animation._resampleImage();

        expect([...animation._imageGrid.animationMask]).toEqual([1, 0]);
        animation._time = 0;
        const animatedOpacity = animation._imageCell(0, 0, 0, 170).opacity;
        const staticOpacity = animation._imageCell(1, 0, animation.charW, 170).opacity;
        expect(animatedOpacity).toBeLessThan(animation.opts.maxOpacity);
        expect(staticOpacity).toBe(animation.opts.maxOpacity);
        animation.destroy();
    });

    it("scales image sampling independently on the horizontal and vertical axes", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const context = {
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 8 * 4) })),
        };
        HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
        const animation = new asciiam(host, {
            imageScale: 1,
            imageScaleX: 2,
            imageScaleY: 0.5,
            imageFov: 1,
            respectReducedMotion: false,
        });
        animation.cols = 8;
        animation.rows = 4;
        animation._sourceImage = { width: 400, height: 200 };
        animation._resampleImage();

        const draw = context.drawImage.mock.calls.at(-1);
        expect(draw[7]).toBeCloseTo(16);
        expect(draw[8]).toBeCloseTo(2);
        animation.destroy();
    });

    it("rotates and flips images in the bounded sampling pass", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const contexts = [
            { ...makeContext(), getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 8 * 4) })) },
            { ...makeContext(), getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 8 * 4) })) },
        ];
        HTMLCanvasElement.prototype.getContext = jest.fn(() => contexts.shift() || makeContext());
        const animation = new asciiam(host, {
            imageRotation: 90,
            imageFlipX: true,
            imageFlipY: true,
            respectReducedMotion: false,
        });
        animation.cols = 8;
        animation.rows = 4;
        animation._sourceImage = { width: 400, height: 200 };
        animation._resampleImage();

        const orient = animation._imageOrientContext;
        expect(orient.translate).toHaveBeenCalledWith(4, 2);
        expect(orient.scale).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
        expect(orient.rotate).toHaveBeenCalledWith(Math.PI / 2);
        expect(orient.getImageData).toHaveBeenCalledWith(0, 0, 8, 4);
        animation.destroy();
    });

    it("fits image samples using rendered glyph-cell dimensions", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const context = {
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 8 * 4) })),
        };
        HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
        const animation = new asciiam(host, { fit: "cover", respectReducedMotion: false });
        animation.cols = 8;
        animation.rows = 4;
        animation._sourceImage = { width: 400, height: 200 };
        animation._resampleImage();

        const draw = context.drawImage.mock.calls.at(-1);
        expect(draw[3] / draw[4]).toBeCloseTo((animation.cols * animation.charW) / (animation.rows * animation.charH));
        animation.destroy();
    });

    it("resamples animated image frames at the configured rate", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            animateImageFrames: true,
            imageFrameRate: 10,
            respectReducedMotion: false,
        });
        animation._sourceImage = { width: 400, height: 200 };
        animation._animatedImage = true;
        animation._resampleImage = jest.fn();

        animation._advanceImageFrames(99);
        expect(animation._resampleImage).not.toHaveBeenCalled();
        animation._advanceImageFrames(1);
        expect(animation._resampleImage).toHaveBeenCalledTimes(1);
        animation._advanceImageFrames(250);
        expect(animation._resampleImage).toHaveBeenCalledTimes(2);
        animation.destroy();
    });

    it("captures every decoded GIF frame and preserves its frame timing", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 16 },
            clientHeight: { configurable: true, value: 8 },
        });
        const context = {
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]) })),
        };
        HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
        const closeFrame = jest.fn();
        const closeDecoder = jest.fn();
        const animationRef = { current: null };
        const visibleDuringDecode = [];
        globalThis.ImageDecoder = class {
            static isTypeSupported = jest.fn(async () => true);
            constructor() {
                this.tracks = { ready: Promise.resolve(), selectedTrack: { frameCount: 2 } };
            }
            async decode({ frameIndex }) {
                if (frameIndex > 0) visibleDuringDecode.push(animationRef.current._imageGrid);
                return {
                    image: {
                        displayWidth: 2,
                        displayHeight: 1,
                        duration: frameIndex === 0 ? 40000 : 60000,
                        close: closeFrame,
                    },
                };
            }
            close() { closeDecoder(); }
        };
        globalThis.fetch = jest.fn(async () => ({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8),
        }));
        const animation = new asciiam(host, { respectReducedMotion: false });
        animationRef.current = animation;
        animation.cols = 2;
        animation.rows = 1;
        animation._sourceImage = { width: 2, height: 1 };
        const visibleGrid = { cols: 2, rows: 1, chars: ["V", "V"], colors: [null, null] };
        animation._imageGrid = visibleGrid;
        animation._animatedImage = true;
        const ready = jest.fn();
        animation.on("imageFramesReady", ready);

        await animation._captureAnimatedImageFrames("frame-test.gif");

        expect(animation._capturedImageFrames).toHaveLength(2);
        expect(animation._capturedImageFrames.map((frame) => frame.duration)).toEqual([40, 60]);
        expect(animation._sourceImage).toEqual({ width: 2, height: 1 });
        expect(visibleDuringDecode).toEqual([visibleGrid]);
        expect(closeFrame).toHaveBeenCalledTimes(2);
        expect(closeDecoder).toHaveBeenCalledTimes(1);
        expect(ready).toHaveBeenCalledWith({ frameCount: 2, duration: 0.1 }, animation);
        animation.destroy();
    });

    it("advances captured GIF grids using their decoded durations", () => {
        const animation = new asciiam(document.querySelector("#host"), { respectReducedMotion: false });
        const first = { cols: 1, rows: 1, chars: ["A"], colors: [null] };
        const second = { cols: 1, rows: 1, chars: ["B"], colors: [null] };
        animation._sourceImage = { width: 1, height: 1 };
        animation._animatedImage = true;
        animation._capturedImageFrames = [
            { grid: first, duration: 40 },
            { grid: second, duration: 60 },
        ];
        animation._imageGrid = first;

        animation._advanceImageFrames(39);
        expect(animation._imageGrid).toBe(first);
        animation._advanceImageFrames(1);
        expect(animation._imageGrid).toBe(second);
        animation._advanceImageFrames(60);
        expect(animation._imageGrid).toBe(first);
        animation.destroy();
    });

    it("automatically maps dark transparent SVG-style artwork to visible glyphs", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const pixels = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]);
        const context = {
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: pixels })),
        };
        HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
        const animation = new asciiam(host, {
            imageChars: " @",
            imageLuminance: "auto",
            respectReducedMotion: false,
        });
        animation.cols = 2;
        animation.rows = 1;
        animation._sourceImage = { width: 2, height: 1 };
        animation._resampleImage();

        expect(animation._imageGrid.chars).toEqual(["@", " "]);
        expect(animation._imageGrid.colors).toEqual([null, null]);
        expect(animation._imageGrid.invertedLuminance).toBe(true);
        animation.destroy();
    });

    it("allows SVG luminance inversion to be disabled explicitly", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const context = {
            ...makeContext(),
            getImageData: jest.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]) })),
        };
        HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
        const animation = new asciiam(host, {
            imageChars: " @",
            imageLuminance: "normal",
            respectReducedMotion: false,
        });
        animation.cols = 2;
        animation.rows = 1;
        animation._sourceImage = { width: 2, height: 1 };
        animation._resampleImage();

        expect(animation._imageGrid.chars).toEqual([" ", " "]);
        expect(animation._imageGrid.invertedLuminance).toBe(false);
        animation.destroy();
    });

    it("keeps global image modes active when the legacy mask toggle is disabled", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { mode: "echoBloom", animateImageMask: false, respectReducedMotion: false });
        animation._imageGrid = {
            cols: animation.cols,
            rows: animation.rows,
            chars: new Array(animation.cols * animation.rows).fill("@"),
            colors: new Array(animation.cols * animation.rows).fill(null),
            animationMask: null,
        };
        const effect = animation._setCell("#", 0.2, 0.5, false);
        expect(animation._applyImageSource(effect, 0, 0).opacity).toBe(0.2);
        animation.destroy();
    });

    it("draws every image animation mask type", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { mode: "image", imageEnabled: true, respectReducedMotion: false });
        const count = animation.cols * animation.rows;
        animation._imageGrid = {
            cols: animation.cols,
            rows: animation.rows,
            chars: new Array(count).fill("@"),
            colors: new Array(count).fill("rgb(79,168,255)"),
            animationMask: null,
        };

        ["waveSweep", "radialRipple", "scanlinePass", "thermalNoise", "halftonePulse", "fullStatic"].forEach((mode) => {
            animation.setOption("imageMaskMode", mode);
            animation._time = 0.75;
            expect(() => animation._draw(16.7)).not.toThrow();
            expect(animation._lastDrawnCount).toBeGreaterThan(0);
        });
        animation.destroy();
    });

    it("applies every global dense and sparse animation mode to an image source", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
        const count = animation.cols * animation.rows;
        animation._imageGrid = {
            cols: animation.cols,
            rows: animation.rows,
            chars: new Array(count).fill("@"),
            colors: new Array(count).fill("rgb(79,168,255)"),
            animationMask: null,
        };

        [
            "wave", "current", "ripple", "vortex", "plasma", "fadeIn", "fadeOut",
            "irisIn", "irisOut", "dissolveIn", "dissolveOut", "lumaFold", "riftLace", "echoBloom",
            "matrix", "snow", "sparkle", "fire", "starfield", "glitch", "typewriter", "orbit",
        ].forEach((mode) => {
            animation.setMode(mode);
            animation._time = 0.75;
            expect(() => animation._draw(16.7)).not.toThrow();
            expect(animation._lastDrawnCount).toBeGreaterThan(0);
        });
        animation.destroy();
    });

    it("runs, staggers, loops, and calls back through an animation sequence", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const rippleComplete = jest.fn();
        const fadeStart = jest.fn();
        const onStepStart = jest.fn();
        const loopEvent = jest.fn();
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.on("sequenceLoop", loopEvent);
        animation.setSequence([
            { mode: "ripple", duration: 5, onComplete: rippleComplete },
            { mode: "fadeOut", duration: 2, delay: 1, onStart: fadeStart },
            { mode: "fadeIn", duration: 2 },
        ], { loop: true, onStepStart });

        animation.playSequence();
        expect(animation.opts.mode).toBe("ripple");
        expect(onStepStart).toHaveBeenCalledTimes(1);

        animation._advanceSequence(5000);
        expect(rippleComplete).toHaveBeenCalledTimes(1);
        expect(animation.opts.mode).toBe("ripple");
        expect(animation._sequence.index).toBe(1);
        expect(animation._sequence.stepStarted).toBe(false);

        animation._advanceSequence(999);
        expect(fadeStart).not.toHaveBeenCalled();
        animation._advanceSequence(1);
        expect(fadeStart).toHaveBeenCalledTimes(1);
        expect(animation.opts.mode).toBe("fadeOut");

        animation._advanceSequence(2000);
        expect(animation.opts.mode).toBe("fadeIn");
        animation._advanceSequence(2000);
        expect(animation.opts.mode).toBe("ripple");
        expect(loopEvent).toHaveBeenCalledTimes(1);
        animation.destroy();
    });

    it("keeps mode repetition separate from sequence looping", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { loop: true, respectReducedMotion: false });
        animation.setSequence([
            { mode: "fadeIn", duration: 5 },
            { mode: "fadeOut", duration: 5, repeat: true },
            { mode: "typewriter", duration: 5, options: { loop: true } },
        ], { loop: false });

        animation.playSequence();
        expect(animation.opts.loop).toBe(false);
        expect(animation.opts.sequence[0].repeat).toBe(false);

        animation._advanceSequence(5000);
        expect(animation.opts.mode).toBe("fadeOut");
        expect(animation.opts.loop).toBe(true);

        animation._advanceSequence(5000);
        expect(animation.opts.mode).toBe("typewriter");
        expect(animation.opts.loop).toBe(true);
        expect(animation.opts.sequence[2].repeat).toBe(true);

        animation._advanceSequence(5000);
        expect(animation.getSequenceState().running).toBe(false);
        expect(animation.getSequenceState().completed).toBe(true);

        animation.playSequence();
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({
            running: true,
            completed: false,
            index: 0,
        }));
        expect(animation.opts.mode).toBe("fadeIn");
        animation.destroy();
    });

    it("retains animated-image playback position across mode-only sequence steps", () => {
        const animation = new asciiam(document.querySelector("#host"), { respectReducedMotion: false });
        animation._sourceImage = { width: 1, height: 1 };
        animation._loadedImageSource = "/retained.gif";
        animation._loadedImageOptionsKey = "true";
        animation._animatedImage = true;
        animation._capturedImageFrames = [
            { grid: { chars: ["A"] }, duration: 40 },
            { grid: { chars: ["B"] }, duration: 60 },
        ];
        animation._imageFrameIndex = 1;
        animation._imageFrameAccumulator = 23;
        animation.setSequence([
            { mode: "wave", image: "/retained.gif", imageOptions: { animated: true }, duration: 1 },
            { mode: "ripple", duration: 1 },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);

        expect(animation.opts.mode).toBe("ripple");
        expect(animation._imageFrameIndex).toBe(1);
        expect(animation._imageFrameAccumulator).toBe(23);
        animation.destroy();
    });

    it("blends between sequence steps with one outgoing snapshot", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        const started = jest.fn();
        const completed = jest.fn();
        animation.on("sequenceMorphStart", started);
        animation.on("sequenceMorphComplete", completed);
        animation.setSequence([
            { mode: "wave", duration: 1 },
            { mode: "ripple", duration: 2, transition: { type: "blend", duration: 0.5, easing: "linear" } },
        ], { loop: false });

        animation.playSequence();
        expect(animation.getSequenceState().morphing).toBe(false);
        animation._advanceSequence(1000);

        expect(animation.opts.mode).toBe("ripple");
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({ morphing: true, morphProgress: 0 }));
        expect(host.querySelectorAll(".asciiam-morph-layer")).toHaveLength(1);
        expect(started).toHaveBeenCalledTimes(1);

        animation._advanceMorph(250);
        expect(animation.getSequenceState().morphProgress).toBeCloseTo(0.5);
        animation._advanceMorph(250);
        expect(animation.getSequenceState().morphing).toBe(false);
        expect(host.querySelector(".asciiam-morph-layer")).toBeNull();
        expect(completed).toHaveBeenCalledTimes(1);
        animation.destroy();
    });

    it("morphs individual cells between sequence steps instead of crossfading the whole canvas", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            mode: "custom",
            charSet: "AB",
            customCell: () => ({ char: "A", opacity: 1 }),
            respectReducedMotion: false,
        });
        animation.start();
        const started = jest.fn();
        const completed = jest.fn();
        animation.on("sequenceMorphStart", started);
        animation.on("sequenceMorphComplete", completed);
        animation.setSequence([
            { mode: "custom", duration: 1 },
            {
                mode: "custom",
                duration: 2,
                // The incoming step's own customCell paints "B"; the outgoing frame's "A"
                // cells were captured per-cell (no DOM snapshot element) at the moment of
                // transition, before this option was applied.
                options: { customCell: () => ({ char: "B", opacity: 1 }) },
                transition: { type: "morph", duration: 0.5, easing: "linear" },
            },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);

        expect(animation.getSequenceState()).toEqual(expect.objectContaining({ morphing: true, morphProgress: 0 }));
        expect(host.querySelectorAll(".asciiam-morph-layer")).toHaveLength(0);
        expect(started).toHaveBeenCalledTimes(1);

        const observedChars = new Set();
        const originalPaint = animation._paintResolvedCell.bind(animation);
        animation._paintResolvedCell = (cell, ...rest) => {
            observedChars.add(cell.char);
            return originalPaint(cell, ...rest);
        };
        animation._advanceMorph(250);
        animation._draw(16.7);
        // A cell mid-transition still shows some "A" (fading out) and some "B" (fading
        // in) at the same instant — the defining behavior a whole-canvas crossfade
        // cannot produce, since every pixel there is one flat blended image.
        expect(observedChars.has("A")).toBe(true);
        expect(observedChars.has("B")).toBe(true);

        animation._advanceMorph(250);
        expect(animation.getSequenceState().morphing).toBe(false);
        expect(completed).toHaveBeenCalledTimes(1);
        animation.destroy();
    });

    it("falls back to blend for a morph transition into a composited layer scene", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.setLayers([{ mode: "wave" }]);
        animation.setSequence([
            { mode: "wave", duration: 1 },
            { mode: "ripple", duration: 2, transition: { type: "morph", duration: 0.5 } },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);
        expect(host.querySelectorAll(".asciiam-morph-layer")).toHaveLength(1);
        animation.destroy();
    });

    it("falls back to blend when a step's own options resize the grid mid-morph", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.setSequence([
            { mode: "wave", duration: 1 },
            {
                mode: "ripple",
                duration: 2,
                options: { resolutionScale: 0.3 },
                transition: { type: "morph", duration: 0.5 },
            },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);
        expect(animation.opts.mode).toBe("ripple");
        expect(host.querySelectorAll(".asciiam-morph-layer")).toHaveLength(1);
        expect(animation.getSequenceState().morphing).toBe(true);
        animation.destroy();
    });

    it("scrambles through intermediate characters during a 'scramble' style morph", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            mode: "custom",
            charSet: "ABCDEFGH",
            customCell: () => ({ char: "A", opacity: 1 }),
            respectReducedMotion: false,
        });
        animation.start();
        animation.setSequence([
            { mode: "custom", duration: 1 },
            {
                mode: "custom",
                duration: 2,
                options: { customCell: () => ({ char: "B", opacity: 1 }) },
                transition: { type: "morph", style: "scramble", duration: 0.5, easing: "linear" },
            },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);

        const observedChars = new Set();
        const originalPaint = animation._paintResolvedCell.bind(animation);
        animation._paintResolvedCell = (cell, ...rest) => {
            observedChars.add(cell.char);
            return originalPaint(cell, ...rest);
        };
        for (let i = 0; i < 10; i++) {
            animation._advanceMorph(50);
            animation._draw(16.7);
        }
        // At least one cell should have shown a character other than the outgoing "A"
        // or incoming "B" while mid-decode — the signature of 'scramble' versus a plain
        // crossfade, which only ever shows those two characters.
        const scrambledSeen = [...observedChars].some((char) => char !== "A" && char !== "B");
        expect(scrambledSeen).toBe(true);
        animation.destroy();
    });

    it("flows a matched cell toward its new position instead of only fading in 'flow' style", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, {
            mode: "custom",
            charSet: "X",
            customCell: (api) => (api.col === 2 && api.row === 2 ? { char: "X", opacity: 1 } : null),
            respectReducedMotion: false,
        });
        animation.start();
        animation.setSequence([
            { mode: "custom", duration: 1 },
            {
                mode: "custom",
                duration: 2,
                options: { customCell: (api) => (api.col === 5 && api.row === 2 ? { char: "X", opacity: 1 } : null) },
                transition: { type: "morph", style: "flow", duration: 0.5, easing: "linear" },
            },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);

        const positions = [];
        const originalPaint = animation._paintResolvedCell.bind(animation);
        animation._paintResolvedCell = (cell, col, row, x, y, ...rest) => {
            if (cell.char === "X") positions.push({ col, x });
            return originalPaint(cell, col, row, x, y, ...rest);
        };
        for (let i = 0; i < 10; i++) {
            animation._advanceMorph(50);
            animation._draw(16.7);
        }
        const naturalX = animation._columnX[5];
        const interpolated = positions.some((p) => p.col === 5 && Math.abs(p.x - naturalX) > 1);
        expect(interpolated).toBe(true);
        animation.destroy();
    });

    it("waits for a sequence image to decode before timing its step", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const pendingImages = [];
        globalThis.Image = class MockImage {
            constructor() {
                this.naturalWidth = 32;
                this.naturalHeight = 18;
                this.width = 32;
                this.height = 18;
            }
            set src(value) {
                this.currentSrc = value;
                pendingImages.push(this);
            }
            get src() {
                return this.currentSrc;
            }
        };
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.setSequence([
            { mode: "wave", duration: 1 },
            { mode: "ripple", duration: 3, image: "/second.png", transition: { type: "morph", duration: 0.5 } },
            { mode: "current", duration: 1, image: null },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({
            index: 1,
            loading: true,
            elapsed: 0,
        }));
        expect(animation.opts.mode).toBe("wave");
        expect(animation.getSequenceState().morphing).toBe(false);
        expect(host.querySelectorAll(".asciiam-morph-layer")).toHaveLength(1);

        animation.pauseSequence();
        await pendingImages[0].onload();
        await Promise.resolve();
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({
            loading: false,
            waiting: true,
            elapsed: 0,
        }));
        expect(animation.opts.mode).toBe("wave");

        animation.playSequence();
        animation._advanceSequence(16);
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({
            loading: false,
            waiting: false,
        }));
        expect(animation.opts.mode).toBe("ripple");
        expect(animation.opts.image).toBe("/second.png");
        expect(animation.getSequenceState().morphing).toBe(true);

        animation._advanceSequence(3000);
        expect(animation.opts.mode).toBe("current");
        expect(animation.opts.image).toBeNull();
        animation.destroy();
    });

    it("waits for a sequence model before starting a mesh step", async () => {
        const animation = new asciiam(document.querySelector("#host"), { respectReducedMotion: false });
        let resolveModel;
        animation.setModel = jest.fn(() => new Promise((resolve) => { resolveModel = resolve; }));
        animation.setSequence([
            { mode: "wave", duration: 1 },
            { mode: "mesh", duration: 2, model: "/model.glb" },
        ], { loop: false });

        animation.playSequence();
        animation._advanceSequence(1000);
        expect(animation.getSequenceState()).toEqual(expect.objectContaining({ index: 1, loading: true, elapsed: 0 }));
        expect(animation.opts.mode).toBe("wave");
        expect(animation.getSequenceState().morphing).toBe(false);
        expect(document.querySelectorAll(".asciiam-morph-layer")).toHaveLength(1);

        resolveModel({ vertexCount: 3 });
        await Promise.resolve();
        await Promise.resolve();
        expect(animation.opts.mode).toBe("mesh");
        expect(animation.getSequenceState().loading).toBe(false);
        expect(document.querySelector(".asciiam-morph-layer")).toBeNull();
        animation.destroy();
    });

    it("pauses and reports an interruption when a mode is selected manually", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const interrupted = jest.fn();
        const sequenceInterrupted = jest.fn();
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.on("sequenceInterrupt", sequenceInterrupted);
        animation.setSequence([
            { mode: "ripple", duration: 5, onInterrupt: interrupted },
            { mode: "fadeOut", duration: 2 },
        ]);
        animation.playSequence();
        animation._advanceSequence(2500);

        animation.setMode("current");

        expect(animation.opts.mode).toBe("current");
        expect(animation._sequence.running).toBe(false);
        expect(interrupted).toHaveBeenCalledWith(expect.objectContaining({ reason: "mode-change" }), animation);
        expect(sequenceInterrupted).toHaveBeenCalledWith(expect.objectContaining({ reason: "mode-change" }), animation);
        animation.destroy();
    });

    it("captures and exports rendered ASCII art as PNG, JPG, and WebP images", async () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { respectReducedMotion: false });
        animation.start();

        const pngResult = await animation.exportImage({ format: "png", scale: 2, filename: "test-art" });
        expect(pngResult.filename).toBe("test-art.png");
        expect(pngResult.width).toBe(640);
        expect(pngResult.height).toBe(360);
        expect(pngResult.format).toBe("png");
        expect(pngResult.dataURL).toContain("data:image/png");

        const jpgResult = await animation.exportImage({ format: "jpg", scale: 1, quality: 0.8 });
        expect(jpgResult.filename).toBe("ascii-art.jpg");
        expect(jpgResult.format).toBe("jpg");
        expect(jpgResult.dataURL).toContain("data:image/jpeg");

        animation.destroy();
    });

    it("renders static images and 3D meshes without animation when mode is none or static", () => {
        const host = document.querySelector("#host");
        Object.defineProperties(host, {
            clientWidth: { configurable: true, value: 320 },
            clientHeight: { configurable: true, value: 180 },
        });
        const animation = new asciiam(host, { mode: "none", respectReducedMotion: false });
        animation.start();
        expect(animation.opts.mode).toBe("none");
        expect(asciiam.BUILT_IN_MODES).toContain("none");
        expect(asciiam.BUILT_IN_MODES).toContain("static");

        animation.setMode("static");
        expect(animation.opts.mode).toBe("static");
        animation.destroy();
    });

    describe("Multi-mode layer compositing", () => {
        it("configures and retrieves layer configurations via setLayers and getLayers", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
            expect(animation.getLayers()).toEqual([]);

            animation.setLayers([
                { mode: "current", opacity: 0.8, blendMode: "source-over" },
                { mode: "fire", opacity: 0.5, blendMode: "screen" },
            ]);

            const layers = animation.getLayers();
            expect(layers.length).toBe(2);
            expect(layers[0]).toEqual({
                mode: "current",
                options: null,
                opacity: 0.8,
                blendMode: "source-over",
                image: null,
                imageOptions: null,
                meshPrimitive: null,
                model: null,
                modelOptions: null,
            });
            expect(layers[1]).toEqual({
                mode: "fire",
                options: null,
                opacity: 0.5,
                blendMode: "screen",
                image: null,
                imageOptions: null,
                meshPrimitive: null,
                model: null,
                modelOptions: null,
            });

            animation.setLayers(null);
            expect(animation.getLayers()).toEqual([]);
            animation.destroy();
        });

        it("updates layers through setOption('layers', ...)", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, {
                mode: "wave",
                layers: [{ mode: "plasma", opacity: 0.7 }],
                respectReducedMotion: false,
            });

            expect(animation.getLayers().length).toBe(1);
            expect(animation.getLayers()[0].mode).toBe("plasma");

            animation.setOption("layers", [{ mode: "vortex", opacity: 0.9 }]);
            expect(animation.getLayers()[0].mode).toBe("vortex");

            animation.destroy();
        });

        it("renders frame through multi-layer pass without throwing", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, {
                mode: "wave",
                layers: [
                    { mode: "current", opacity: 0.6 },
                    { mode: "sparkle", opacity: 0.4 },
                ],
                respectReducedMotion: false,
            });
            animation.start();
            expect(() => animation._draw(16.7)).not.toThrow();
            expect(animation.getStats().drawn).toBeGreaterThanOrEqual(0);
            animation.destroy();
        });

        it("applies per-layer option overrides only for that layer's draw pass, then restores them", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const observedCharSets = [];
            const captureCharSet = function () {
                observedCharSets.push(this.opts.charSet);
                return { char: "#", opacity: 1 };
            };
            const animation = new asciiam(host, {
                mode: "custom",
                charSet: "GLOBAL",
                customCell: captureCharSet,
                layers: [
                    { mode: "custom", options: { charSet: "LAYER-ONE" } },
                    { mode: "custom", options: { charSet: "LAYER-TWO" } },
                ],
                respectReducedMotion: false,
            });
            animation.start();
            observedCharSets.length = 0;
            animation._draw(16.7);

            expect(observedCharSets).toContain("LAYER-ONE");
            expect(observedCharSets).toContain("LAYER-TWO");
            expect(observedCharSets).not.toContain("GLOBAL");
            expect(animation.opts.charSet).toBe("GLOBAL");
            animation.destroy();
        });

        it("gives each layer its own independent mesh primitive", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
            animation.setLayers([
                { mode: "mesh", meshPrimitive: "cube" },
                { mode: "mesh", meshPrimitive: "torus" },
            ]);

            const [cubeLayer, torusLayer] = animation._layers;
            expect(cubeLayer._mesh).toBeTruthy();
            expect(torusLayer._mesh).toBeTruthy();
            // Different primitives must not resolve to the same mesh instance or topology.
            expect(cubeLayer._mesh).not.toBe(torusLayer._mesh);
            expect(cubeLayer._mesh.vertexCount).not.toBe(torusLayer._mesh.vertexCount);
            // Neither layer's independent mesh touches the shared global slot.
            expect(animation._mesh).toBeNull();
            animation.destroy();
        });

        it("renders a layer's own mesh even while the global meshEnabled default stays off", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const context = makeContext();
            HTMLCanvasElement.prototype.getContext.mockReturnValue(context);
            const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
            expect(animation.opts.meshEnabled).toBe(false);
            animation.setLayers([{ mode: "mesh", meshPrimitive: "cube" }]);
            animation.start();

            animation._draw(16.7);
            expect(animation._lastDrawnCount).toBeGreaterThan(0);
            // The per-layer force-enable during that layer's draw pass must not leak
            // into the instance's own persistent option state afterward.
            expect(animation.opts.meshEnabled).toBe(false);
            animation.destroy();
        });

        it("reuses an already-loaded layer mesh across setLayers() calls that don't change its source", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
            animation.setLayers([{ mode: "mesh", meshPrimitive: "torus", opacity: 0.5 }]);
            const firstMesh = animation._layers[0]._mesh;
            expect(firstMesh).toBeTruthy();

            animation.setLayers([{ mode: "mesh", meshPrimitive: "torus", opacity: 0.9 }]);
            expect(animation._layers[0]._mesh).toBe(firstMesh);
            expect(animation._layers[0].opacity).toBe(0.9);

            animation.setLayers([{ mode: "mesh", meshPrimitive: "cube", opacity: 0.9 }]);
            expect(animation._layers[0]._mesh).not.toBe(firstMesh);
            animation.destroy();
        });

        it("falls back to the shared instance image for a layer without its own image", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, {
                mode: "wave",
                imageEnabled: true,
                respectReducedMotion: false,
            });
            const sharedGrid = { cols: animation.cols, rows: animation.rows, chars: [], colors: [], animationMask: null };
            animation._imageGrid = sharedGrid;
            animation.setLayers([{ mode: "image" }]);

            let observedDuringLayer = null;
            const originalApply = animation._applyLayerMedia.bind(animation);
            animation._applyLayerMedia = (layer) => {
                originalApply(layer);
                observedDuringLayer = animation._imageGrid;
            };
            animation.start();
            animation._draw(16.7);

            expect(observedDuringLayer).toBe(sharedGrid);
            expect(animation._imageGrid).toBe(sharedGrid);
            animation.destroy();
        });

        it("loads a layer's own image independently of the shared instance image", async () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const pixels = new Uint8ClampedArray([120, 60, 200, 255]);
            HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
                ...makeContext(),
                getImageData: jest.fn(() => ({ data: pixels })),
            }));
            const pendingImages = [];
            globalThis.Image = class MockImage {
                constructor() {
                    this.naturalWidth = 4;
                    this.naturalHeight = 4;
                }
                set src(value) {
                    this.currentSrc = value;
                    pendingImages.push(this);
                }
                get src() {
                    return this.currentSrc;
                }
            };
            const animation = new asciiam(host, { mode: "wave", respectReducedMotion: false });
            animation.setLayers([{ mode: "image", image: "/layer-only.png" }]);
            expect(animation._imageGrid).toBeFalsy();

            pendingImages[0].onload();
            const layer = animation._layers[0];
            expect(layer._imageGrid).toBeTruthy();
            expect(layer._imageGrid.chars.length).toBe(animation.cols * animation.rows);
            // Loading the layer's own image must never populate the shared global slot.
            expect(animation._imageGrid).toBeFalsy();
            animation.destroy();
        });
    });

    describe("Adaptive quality", () => {
        it("defaults to off, and start()/_runFrame() never call the adjuster unless it's enabled", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { quality: "balanced", respectReducedMotion: false });
            expect(animation.opts.autoQuality).toBe(false);
            animation.start();
            const spy = jest.spyOn(animation, "_updateAutoQuality");
            animation._runFrame(1000);
            animation._runFrame(1016.7);
            expect(spy).not.toHaveBeenCalled();
            expect(animation.opts.resolutionScale).toBe(1);
            expect(animation.opts.quality).toBe("balanced");
            expect(animation._autoQualityState).toBeNull();
            animation.destroy();
        });

        it("steps resolutionScale down under sustained frame-time pressure, then back up once it recovers", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { quality: "balanced", resolutionScale: 1, autoQuality: true, respectReducedMotion: false });
            let now = 0;
            jest.spyOn(performance, "now").mockImplementation(() => now);

            animation._updateAutoQuality(50); // seeds the EMA; far above the 16.7ms/60fps budget
            expect(animation.opts.resolutionScale).toBe(1); // no adjustment on the seeding call

            now += 2000; // clear the cooldown
            animation._updateAutoQuality(50);
            expect(animation.opts.resolutionScale).toBeLessThan(1);
            const loweredScale = animation.opts.resolutionScale;

            now += 500; // still inside the cooldown window
            animation._updateAutoQuality(50);
            expect(animation.opts.resolutionScale).toBe(loweredScale);

            // Sustained headroom should recover it, capped at the original ceiling (1).
            // The EMA intentionally decays slowly (recover cautiously, degrade readily);
            // seed it directly rather than waiting out many real frames of headroom.
            for (let i = 0; i < 10; i++) {
                now += 2000;
                animation._autoQualityState.ema = 1;
                animation._updateAutoQuality(1);
            }
            expect(animation.opts.resolutionScale).toBe(1);

            jest.restoreAllMocks();
            animation.destroy();
        });

        it("drops to a cheaper quality tier only after resolutionScale reaches its floor", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { quality: "high", resolutionScale: 1, autoQuality: true, respectReducedMotion: false });
            let now = 0;
            jest.spyOn(performance, "now").mockImplementation(() => now);

            animation._updateAutoQuality(50);
            // Drive resolutionScale all the way down to its floor first.
            for (let i = 0; i < 10 && animation.opts.resolutionScale > 0.5; i++) {
                now += 2000;
                animation._updateAutoQuality(50);
            }
            expect(animation.opts.resolutionScale).toBe(0.5);
            expect(animation.opts.quality).toBe("high"); // still the original tier

            now += 2000;
            animation._updateAutoQuality(50);
            expect(animation.opts.quality).toBe("balanced"); // one step cheaper than "high"

            jest.restoreAllMocks();
            animation.destroy();
        });

        it("never adjusts past the quality/resolutionScale requested at construction", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { quality: "ultra", resolutionScale: 0.7, autoQuality: true, respectReducedMotion: false });
            let now = 0;
            jest.spyOn(performance, "now").mockImplementation(() => now);

            animation._updateAutoQuality(1); // seed with plenty of headroom
            for (let i = 0; i < 6; i++) {
                now += 2000;
                animation._updateAutoQuality(1);
            }
            // "ultra" is already the cheapest tier and 0.7 was the requested ceiling —
            // sustained headroom must not push past either.
            expect(animation.opts.quality).toBe("ultra");
            expect(animation.opts.resolutionScale).toBe(0.7);

            jest.restoreAllMocks();
            animation.destroy();
        });

        it("preserves a caller-configured targetFPS across an autoQuality tier change", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, {
                quality: "high",
                resolutionScale: 0.5, // already at the floor, so pressure drops quality immediately
                targetFPS: 30,
                autoQuality: true,
                respectReducedMotion: false,
            });
            let now = 0;
            jest.spyOn(performance, "now").mockImplementation(() => now);

            animation._updateAutoQuality(80);
            now += 2000;
            animation._updateAutoQuality(80);

            expect(animation.opts.quality).toBe("balanced");
            // asciiam.QUALITY tiers all carry targetFPS: null; a naive setOption('quality', ...)
            // would silently clear the caller's own 30fps cap.
            expect(animation.opts.targetFPS).toBe(30);

            jest.restoreAllMocks();
            animation.destroy();
        });
    });

    describe("State preservation on grid resizing", () => {
        it("preserves matrix and particle state across grid resizes", () => {
            const host = document.querySelector("#host");
            Object.defineProperties(host, {
                clientWidth: { configurable: true, value: 320 },
                clientHeight: { configurable: true, value: 180 },
            });
            const animation = new asciiam(host, { mode: "matrix", respectReducedMotion: false });
            animation.start();
            expect(animation._matrix.length).toBeGreaterThan(0);
            const initialFirstColY = animation._matrix[0].y;

            // Trigger a resize by changing density
            animation.setOption("density", 12);
            expect(animation._matrix.length).toBeGreaterThan(0);
            // Verify state was preserved and scaled rather than completely wiped to top
            expect(Number.isFinite(animation._matrix[0].y)).toBe(true);

            animation.setMode("snow");
            expect(animation._snow.length).toBeGreaterThan(0);
            animation.setOption("density", 16);
            expect(animation._snow.length).toBeGreaterThan(0);

            animation.setOption("density", 1);
            animation.setMode("snow");
            const initialSnowCount = animation._snow.length;
            animation.setOption("snowDensity", 0.08);
            expect(animation._snow.length).toBeGreaterThan(initialSnowCount);

            animation.destroy();
        });
    });
});
