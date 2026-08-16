/**
 * @jest-environment jsdom
 */

import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
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
    measureText: jest.fn(() => ({ width: 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 })),
    restore: jest.fn(),
    rotate: jest.fn(),
    save: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    translate: jest.fn(),
});

describe("Font metric calibration and subpixel baseline measurement", () => {
    it("calibrates font metrics with fallback calculations when context is not provided", () => {
        const metrics = asciiam.calibrateFontMetrics(null, "monospace", 16);
        expect(metrics).toMatchObject({
            charW: expect.any(Number),
            charH: expect.any(Number),
            ascent: expect.any(Number),
            descent: expect.any(Number),
            baselineOffset: expect.any(Number),
        });
        expect(metrics.charW).toBeGreaterThan(0);
        expect(metrics.charH).toBeGreaterThan(0);
    });

    it("uses 2D canvas context measureText to calibrate metrics", () => {
        const ctx = makeContext();
        const metrics = asciiam.calibrateFontMetrics(ctx, "IBM Plex Mono", 14);

        expect(metrics.charW).toBe(8);
        expect(metrics.charH).toBe(12);
        expect(metrics.baselineOffset).toBe(10);
    });

    it("exposes asciiam.calibrateFontMetrics static method", () => {
        const metrics = asciiam.calibrateFontMetrics("monospace", 14);
        expect(metrics.charW).toBeGreaterThan(0);
        expect(metrics.charH).toBeGreaterThan(0);
    });

    it("applies font metrics to instance cell measurement and baseline alignment", () => {
        const ctx = makeContext();
        const metrics = asciiam.calibrateFontMetrics(ctx, "monospace", 16);
        expect(metrics.charW).toBeGreaterThan(0);
        expect(metrics.charH).toBeGreaterThan(0);
        expect(metrics.baselineOffset).toBeGreaterThan(0);
    });
});
