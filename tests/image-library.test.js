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
            expect(image.thumbnail).toMatch(/^\/assets\/thumbnails\/.*\.webp$/);
            expect(existsSync(projectUrl(`public${decodeURIComponent(image.thumbnail)}`))).toBe(true);
        });
    });

    it("keeps the demo independent of remote image search UI and API calls", () => {
        const page = projectFile("public/index.html");

        expect(page).toContain("public/assets/images");
        expect(page).toContain('fetch("/assets/backgrounds.json", { cache: "no-store" })');
        expect(page).not.toContain("image-search");
        expect(page).not.toContain("downloadLocation");
        expect(page).not.toContain("image.thumbnail || image.src");
    });

    it("ships the site icon and references the repository banner", () => {
        const page = projectFile("public/index.html");
        const readme = projectFile("README.md");

        expect(existsSync(projectUrl("public/assets/branding/asciiam-logo.svg"))).toBe(true);
        expect(page).toContain('rel="icon" href="./assets/branding/asciiam-logo.svg"');
        expect(page).toContain('class="brand-icon"');
        expect(readme).toContain("![asciiam — ASCII Background Animator](branding/asciiam-banner.svg)");
        expect(existsSync(projectUrl("branding/asciiam-banner.svg"))).toBe(true);
    });
});
