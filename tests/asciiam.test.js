/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import asciiam from "../src/asciiam.js";

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
    save: jest.fn(),
    setTransform: jest.fn(),
});

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
        expect(animation._originX).toBe(160);
        expect(animation._originY).toBe(90);

        animation.setOption("align", "top-left");

        expect(animation._originX).toBe(0);
        expect(animation._originY).toBe(0);
        expect(animation._rippleFalloff).toHaveLength(animation.cols * animation.rows);
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

    it("reveals from left, right, or the center", () => {
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
        animation._time = 1.2;

        animation.setOption("revealDirection", "left-to-right");
        const leftToRightStart = animation._fadeInCell(left, row, 0, 0).opacity;
        const leftToRightEnd = animation._fadeInCell(right, row, 0, 0).opacity;
        expect(leftToRightStart).toBeGreaterThan(leftToRightEnd);

        animation.setOption("revealDirection", "right-to-left");
        const rightToLeftStart = animation._fadeInCell(left, row, 0, 0).opacity;
        const rightToLeftEnd = animation._fadeInCell(right, row, 0, 0).opacity;
        expect(rightToLeftEnd).toBeGreaterThan(rightToLeftStart);

        animation.setOption("revealDirection", "center");
        const centerOpacity = animation._fadeInCell(center, row, 0, 0).opacity;
        const edgeOpacity = animation._fadeInCell(left, row, 0, 0).opacity;
        expect(centerOpacity).toBeGreaterThan(edgeOpacity);
        expect(asciiam.presets.introReveal.revealDirection).toBe("left-to-right");
        expect(asciiam.presets.outroFade.revealDirection).toBe("right-to-left");
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
});
