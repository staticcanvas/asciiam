/**
 * @jest-environment node
 */

import { afterEach, describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function createDemo() {
    const dom = new JSDOM(projectFile("public/index.html"), {
        runScripts: "outside-only",
        url: "https://demo.test/",
        virtualConsole: new VirtualConsole(),
    });
    const { window } = dom;
    const stage = window.document.getElementById("stage");
    Object.defineProperties(stage, {
        clientWidth: { configurable: true, value: 320 },
        clientHeight: { configurable: true, value: 180 },
    });
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
    window.ResizeObserver = class { observe() {} disconnect() {} };
    window.IntersectionObserver = class { observe() {} disconnect() {} };
    window.HTMLElement.prototype.showPopover = function showPopover() {};
    window.HTMLElement.prototype.hidePopover = function hidePopover() {};
    window.HTMLCanvasElement.prototype.getContext = () => ({
        setTransform() {}, clearRect() {}, fillRect() {}, fillText() {}, save() {}, restore() {}, drawImage() {},
        measureText: () => ({ width: 8 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    });
    window.fetch = async () => Response.json([]);
    window.eval(projectFile("public/libs/asciiam.js"));
    const demoScript = [...window.document.querySelectorAll("script:not([src])")].at(-1);
    window.eval(demoScript.textContent);
    return dom;
}

let activeDom = null;
afterEach(() => {
    activeDom?.window.close();
    activeDom = null;
});

describe("demo toolbar quality-of-life controls", () => {
    it("tracks dirty state and supports undo and redo", () => {
        activeDom = createDemo();
        const { document, Event } = activeDom.window;
        const speed = document.getElementById("speed");
        const indicator = document.getElementById("presetDirtyIndicator");
        const undo = document.getElementById("undoSettingsBtn");
        const redo = document.getElementById("redoSettingsBtn");

        expect(indicator.textContent).toBe("heroWave");
        expect(undo.disabled).toBe(true);

        speed.value = "2";
        speed.dispatchEvent(new Event("input", { bubbles: true }));

        expect(indicator.textContent).toBe("Modified");
        expect(undo.disabled).toBe(false);
        undo.click();
        expect(speed.value).toBe("1");
        expect(redo.disabled).toBe(false);

        redo.click();
        expect(speed.value).toBe("2");
    });

    it("uses one toolbar tab stop and arrow keys skip disabled controls", () => {
        activeDom = createDemo();
        const { document, KeyboardEvent } = activeDom.window;
        const controls = [...document.querySelectorAll(".ctrl-bar > .ctrl-pill")];
        const preset = document.getElementById("presetTriggerBtn");

        expect(controls.filter((control) => control.tabIndex === 0)).toEqual([preset]);
        preset.focus();
        preset.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

        expect(document.activeElement.textContent).toContain("Quality");
        expect(controls.filter((control) => control.tabIndex === 0)).toEqual([document.activeElement]);
    });

    it("surfaces live values, contextual reveal direction, and clear action groups", () => {
        activeDom = createDemo();
        const { document, Event } = activeDom.window;
        const revealGroup = document.getElementById("revealDirectionGroup");
        const fadeInButton = document.querySelector('[data-mode="fadeIn"]');

        expect(document.getElementById("qualityToolbarStatus").textContent).toBe("ultra");
        expect(document.getElementById("modeToolbarStatus").textContent).toBe("wave");
        expect(document.getElementById("motionToolbarStatus").textContent).toBe("1.0×");
        expect(revealGroup.hidden).toBe(true);

        fadeInButton.click();
        expect(revealGroup.hidden).toBe(false);
        expect(document.getElementById("motionToolbarStatus").textContent).toBe("Center");

        const direction = document.getElementById("revealDirection");
        direction.value = "right-to-left";
        direction.dispatchEvent(new Event("change", { bubbles: true }));
        expect(document.getElementById("motionToolbarStatus").textContent).toBe("R→L");
        expect(document.getElementById("motionTriggerBtn").getAttribute("aria-label")).toBe("Motion, R→L");

        expect(document.querySelectorAll(".ctrl-bar__separator")).toHaveLength(2);
        expect(document.getElementById("themeToggleBtn").classList).toContain("ctrl-pill--utility");
        expect(document.querySelector(".ctrl-pill--code").classList).toContain("ctrl-pill--primary");
    });

    it("offers the vortex mode and preset through the live controls", () => {
        activeDom = createDemo();
        const { document } = activeDom.window;
        const vortexButton = document.querySelector('[data-mode="vortex"]');

        expect(vortexButton).not.toBeNull();
        expect(document.querySelector('#preset option[value="vortexFlow"]')).not.toBeNull();
        vortexButton.click();
        expect(vortexButton.getAttribute("aria-pressed")).toBe("true");
        expect(document.getElementById("modeToolbarStatus").textContent).toBe("vortex");
        expect(document.getElementById("usageCodePopover").textContent).toContain('"mode": "vortex"');
    });

    it("offers the plasma mode and preset through the live controls", () => {
        activeDom = createDemo();
        const { document } = activeDom.window;
        const plasmaButton = document.querySelector('[data-mode="plasma"]');

        expect(plasmaButton).not.toBeNull();
        expect(document.querySelector('#preset option[value="plasmaField"]')).not.toBeNull();
        plasmaButton.click();
        expect(plasmaButton.getAttribute("aria-pressed")).toBe("true");
        expect(document.getElementById("modeToolbarStatus").textContent).toBe("plasma");
        expect(document.getElementById("usageCodePopover").textContent).toContain('"mode": "plasma"');
    });

    it("renders safe, classified syntax tokens with the JetBrains Mono code font", () => {
        activeDom = createDemo();
        const { document } = activeDom.window;
        const code = document.getElementById("usageCodePopover");
        const fontLink = document.querySelector("link[href*='family=JetBrains+Mono']");

        expect(fontLink.href).toContain("family=JetBrains+Mono");
        expect(code.querySelectorAll(".token-keyword").length).toBeGreaterThan(0);
        expect(code.querySelectorAll(".token-property").length).toBeGreaterThan(0);
        expect(code.querySelectorAll(".token-string").length).toBeGreaterThan(0);
        expect(code.querySelectorAll(".token-number").length).toBeGreaterThan(0);
        expect(code.querySelector(".token-")).toBeNull();
        expect(code.textContent).toContain("<=>?@");
        expect(code.innerHTML).toContain("&lt;");
    });

    it("provides workflow, control, and operational references in About", () => {
        activeDom = createDemo();
        const { document } = activeDom.window;
        const headings = [...document.querySelectorAll("#pop-about h2")].map((heading) => heading.textContent.trim());

        expect(headings).toEqual(expect.arrayContaining([
            "Architectural Highlights & Features",
            "Working with the demo",
            "Control reference",
            "Operational notes",
        ]));
        expect(document.querySelectorAll(".about-control-table tbody tr")).toHaveLength(9);
        expect(document.getElementById("pop-about").textContent).toContain("Cross-origin sources must permit anonymous Canvas access");
    });
});
