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
});
