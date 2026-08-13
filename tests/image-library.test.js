/**
 * @jest-environment node
 */

import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";

const projectUrl = (path) => new URL(`../${path}`, import.meta.url);
const projectFile = (path) => readFileSync(projectUrl(path), "utf8");

describe("local image library", () => {
    it("ships selectable defaults from the web utility image source", () => {
        const manifest = JSON.parse(projectFile("docs/static/webutil/assets/backgrounds.json"));

        expect(manifest.length).toBeGreaterThan(0);
        manifest.forEach((image) => {
            expect(image.name).toEqual(expect.any(String));
            expect(image.src).toMatch(/^\.\/assets\/images\//);
            expect(existsSync(projectUrl(`docs/static/webutil/${decodeURIComponent(image.src.slice(2))}`))).toBe(true);
            expect(image.thumbnail).toMatch(/^\.\/assets\/thumbnails\/.*\.webp$/);
            expect(existsSync(projectUrl(`docs/static/webutil/${decodeURIComponent(image.thumbnail.slice(2))}`))).toBe(true);
        });
    });

    it("keeps the demo independent of remote image search UI and API calls", () => {
        const page = projectFile("docs/static/webutil/index.html");
        const utilityScript = projectFile("docs/static/webutil/js/webutil.js");

        expect(page).toContain("docs/static/webutil/assets/images");
        expect(utilityScript).toContain('fetch("./assets/backgrounds.json", { cache: "no-store" })');
        expect(page).not.toContain("image-search");
        expect(page).toContain('src="./js/webutil.js?v=__ASSET_REVISION__"');
        expect(utilityScript.length).toBeGreaterThan(1000);
        expect(page).not.toContain("downloadLocation");
        expect(page).not.toContain("image.thumbnail || image.src");
    });

    it("ships the site icon and references the repository banner", () => {
        const page = projectFile("docs/static/webutil/index.html");
        const readme = projectFile("README.md");

        expect(existsSync(projectUrl("docs/static/webutil/assets/branding/asciiam-logo.svg"))).toBe(true);
        expect(page).toContain('rel="icon" href="./assets/branding/asciiam-logo.svg"');
        expect(page).toContain('class="brand-icon"');
        expect(readme).toContain("![asciiam — ASCII Background Animator](branding/asciiam-banner.svg)");
        expect(existsSync(projectUrl("branding/asciiam-banner.svg"))).toBe(true);
    });
});
