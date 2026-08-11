/**
 * @jest-environment node
 */

import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";

const projectUrl = (path) => new URL(`../${path}`, import.meta.url);
const projectFile = (path) => readFileSync(projectUrl(path), "utf8");

describe("local image library", () => {
    it("ships selectable defaults from the public assets/images source", () => {
        const manifest = JSON.parse(projectFile("public/assets/backgrounds.json"));

        expect(manifest.length).toBeGreaterThan(0);
        manifest.forEach((image) => {
            expect(image.name).toEqual(expect.any(String));
            expect(image.src).toMatch(/^\/assets\/images\//);
            expect(existsSync(projectUrl(`public${decodeURIComponent(image.src)}`))).toBe(true);
        });
    });

    it("keeps the demo independent of remote image search UI and API calls", () => {
        const page = projectFile("public/index.html");

        expect(page).toContain("public/assets/images");
        expect(page).not.toContain("image-search");
        expect(page).not.toContain("downloadLocation");
    });
});
