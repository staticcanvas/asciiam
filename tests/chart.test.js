/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import asciiam from "../src/asciiam.js";

const makeContext = () => ({
    clearRect: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
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

describe("ASCII Charting API", () => {
    let container;
    let anim;

    beforeEach(() => {
        container = document.createElement("div");
        Object.defineProperty(container, "clientWidth", { value: 640, configurable: true });
        Object.defineProperty(container, "clientHeight", { value: 360, configurable: true });
        document.body.appendChild(container);

        HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
            if (type === "2d") return makeContext();
            return null;
        });
    });

    afterEach(() => {
        if (anim) {
            anim.destroy();
            anim = null;
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    it("includes 'chart' in BUILT_IN_MODES", () => {
        expect(asciiam.BUILT_IN_MODES).toContain("chart");
    });

    it("initializes chart options and accepts setChartData()", () => {
        anim = new asciiam(container);
        expect(anim.getChartInfo()).toEqual({
            active: false,
            enabled: false,
            type: "bar",
            dataLength: 0,
            title: "",
            showLegend: true,
            hasColors: false,
            scaleMin: null,
            scaleMax: null,
            animateItems: false,
        });

        const sampleData = [10, 20, 50, 80, 40];
        anim.setChartData(sampleData, { type: "bar", title: "Monthly Sales" });

        expect(anim.opts.chartEnabled).toBe(true);
        expect(anim.getChartInfo()).toEqual({
            active: true,
            enabled: true,
            type: "bar",
            dataLength: 5,
            title: "Monthly Sales",
            showLegend: true,
            hasColors: false,
            scaleMin: null,
            scaleMax: null,
            animateItems: false,
        });
    });

    it("renders bar, horizontalBar, line, heatmap, and donut chart types without error", () => {
        anim = new asciiam(container);
        const sampleData = [15, 30, 75, 45, 90, 60];

        const chartTypes = ["bar", "horizontalBar", "line", "sparkline", "heatmap", "donut"];
        chartTypes.forEach((type) => {
            anim.setChartData(sampleData, { type, title: `Test ${type}` });
            expect(() => anim._draw(16.7)).not.toThrow();
            expect(anim.opts.chartType).toBe(type);
        });
    });

    it("clears chart data with clearChart()", () => {
        anim = new asciiam(container);
        anim.setChartData([5, 10, 15], { title: "Test" });
        expect(anim.getChartInfo().active).toBe(true);

        anim.clearChart();
        expect(anim.opts.chartData).toBeNull();
        expect(anim.opts.chartEnabled).toBe(false);
        expect(anim.getChartInfo().active).toBe(false);
    });

    it("respects chartEnabled toggle switch", () => {
        anim = new asciiam(container);
        anim.setChartData([20, 40, 60], { type: "bar" });
        expect(anim.opts.chartEnabled).toBe(true);

        anim.setOption("chartEnabled", false);
        const cell = anim._chartCell(5, 5, 50, 50);
        expect(cell.char).toBe(" ");
        expect(cell.opacity).toBe(0);

        anim.setOption("chartEnabled", true);
        const cellOn = anim._chartCell(5, 5, 50, 50);
        expect(cellOn).toBeDefined();
    });

    it("includes chart block characters and labels in atlas character generation", () => {
        anim = new asciiam(container);
        anim.setChartData([
            { label: "Alpha", value: 40 },
            { label: "Beta", value: 80 },
        ], { type: "bar", title: "Metrics" });

        const chartChars = anim._getChartCharacters();
        expect(chartChars).toContain("█");
        expect(chartChars).toContain("┌");
        expect(chartChars).toContain("│");
        expect(chartChars).toContain("─");
        expect(chartChars).toContain("Metrics");
        expect(chartChars).toContain("Alpha");
        expect(chartChars).toContain("Beta");

        const webglAtlas = anim._getWebGLAtlas();
        expect(webglAtlas.characterIndex.has("█")).toBe(true);
        expect(webglAtlas.characterIndex.has("│")).toBe(true);
        expect(webglAtlas.characterIndex.has("─")).toBe(true);
        expect(webglAtlas.characterIndex.has("M")).toBe(true);
    });
});
