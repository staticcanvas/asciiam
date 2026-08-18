import { describe, expect, it } from "@jest/globals";
import asciiam from "../src/asciiam.js";

describe("Headless ASCII String & Frame Generator (SSR / CLI)", () => {
    it("renders ASCII frame grid using asciiam.renderFrame static method", () => {
        const grid = asciiam.renderFrame({
            cols: 20,
            rows: 10,
            mode: "matrix",
            time: 1.5,
        });

        expect(grid.length).toBe(10);
        expect(grid[0].length).toBe(20);

        const firstCell = grid[0][0];
        expect(firstCell).toHaveProperty("char");
        expect(firstCell).toHaveProperty("r");
        expect(firstCell).toHaveProperty("g");
        expect(firstCell).toHaveProperty("b");
        expect(firstCell).toHaveProperty("a");
        expect(typeof firstCell.char).toBe("string");
    });

    it("renders multi-line ASCII string using asciiam.renderToString static method", () => {
        const output = asciiam.renderToString({
            cols: 40,
            rows: 8,
            mode: "plasma",
            time: 0.5,
        });

        expect(typeof output).toBe("string");
        const lines = output.split("\n");
        expect(lines.length).toBe(8);
        expect(lines[0].length).toBe(40);
    });

    it("supports ANSI color codes when ansi option is true", () => {
        const output = asciiam.renderToString({
            cols: 10,
            rows: 4,
            mode: "wave",
            time: 2.0,
            ansi: true,
            color: "#ffaa00",
        });

        expect(typeof output).toBe("string");
        expect(output).toContain("\x1b[38;2;");
        expect(output).toContain("\x1b[0m");
    });

    it("supports invert, custom character sets, and density options", () => {
        const outputNormal = asciiam.renderToString({
            cols: 15,
            rows: 5,
            mode: "vortex",
            time: 1.0,
            invert: false,
        });

        const outputInverted = asciiam.renderToString({
            cols: 15,
            rows: 5,
            mode: "vortex",
            time: 1.0,
            invert: true,
        });

        expect(outputNormal).not.toBe(outputInverted);
    });

    it("renders different modes deterministically based on time offset", () => {
        const frame0 = asciiam.renderToString({ cols: 30, rows: 6, mode: "fire", time: 0.0 });
        const frame1 = asciiam.renderToString({ cols: 30, rows: 6, mode: "fire", time: 5.0 });

        expect(frame0).not.toBe(frame1);
    });
});
