import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { chromium, firefox, webkit } from "playwright-core";

const port = 8197;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/http-server/bin/http-server", "public", "-p", String(port), "-c-1"], {
    stdio: "ignore",
});

/** Wait until the built site is accepting requests or fail with the server. */
async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt++) {
        if (server.exitCode !== null) throw new Error(`Web Utility server exited with code ${server.exitCode}`);
        try {
            const response = await fetch(`${origin}/webutil/`);
            if (response.ok) return;
        } catch {
            // The server normally needs one or two event-loop turns to bind.
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out waiting for the Web Utility server");
}

/** Parse the live grid status into dimensions and its logical-resolution value. */
function parseGridStatus(status) {
    const match = /^(\d+)×(\d+) cells · (\d+)% logical resolution$/.exec(status || "");
    assert(match, `Unexpected grid status: ${status}`);
    return { columns: Number(match[1]), rows: Number(match[2]), percent: Number(match[3]) };
}

/** Exercise one built-site authoring flow against a real browser engine. */
async function verifyBrowser(browserType, browserName) {
    const browser = await browserType.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        page.setDefaultTimeout(10000);
        const browserErrors = [];
        page.on("pageerror", (error) => browserErrors.push(error.message));
        page.on("console", (message) => {
            if (message.type() === "error") browserErrors.push(message.text());
        });
        await page.addInitScript(() => localStorage.setItem("asciiam:visited", "true"));
        await page.goto(`${origin}/webutil/`, { waitUntil: "networkidle" });

        const assetRevisions = await page.evaluate(() => {
            const urls = [
                document.querySelector('script[src*="libs/asciiam.js"]')?.src,
                document.querySelector('script[src*="js/webutil.js"]')?.src,
            ];
            return urls.map((url) => new URL(url).searchParams.get("v"));
        });
        assert.match(assetRevisions[0], /^[a-f0-9]{12}$/);
        assert.equal(assetRevisions[1], assetRevisions[0]);

        await page.locator("#moreTriggerBtn").click();
        await page.locator("#qualityTriggerBtn").click();
        assert.equal(await page.locator("#pop-quality").evaluate((element) => element.matches(":popover-open")), true);

        const resolution = page.locator("#resolutionScale");
        const automatic = parseGridStatus(await page.locator("#resolutionGridStatus").textContent());
        const bounds = await resolution.boundingBox();
        assert(bounds, "Grid resolution slider is not visible");
        await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width * 0.98, bounds.y + bounds.height / 2, { steps: 6 });
        await page.mouse.up();
        // Native range dragging differs slightly between engines. A pointer click
        // at the same destination makes the intended endpoint deterministic while
        // still exercising the browser's native input interaction.
        await page.mouse.click(bounds.x + bounds.width * 0.9, bounds.y + bounds.height / 2);
        await page.waitForTimeout(100);
        if (Number(await resolution.inputValue()) * 100 <= automatic.percent) {
            await resolution.focus();
            await page.keyboard.press("End");
        }
        await page.waitForFunction((initialPercent) => {
            const value = Number(document.getElementById("resolutionScale")?.value || 0);
            return Math.round(value * 100) > initialPercent;
        }, automatic.percent);
        const detailed = parseGridStatus(await page.locator("#resolutionGridStatus").textContent());
        assert(detailed.percent > automatic.percent, `${browserName} grid slider did not increase resolution`);
        assert(detailed.columns > automatic.columns);
        assert(detailed.rows > automatic.rows);

        await page.locator("#renderer").selectOption("canvas2d");
        assert.match(await page.locator("#rendererStatus").textContent(), /Canvas 2D CPU renderer active/);
        await resolution.evaluate((element) => {
            element.value = "0.5";
            element.dispatchEvent(new Event("input", { bubbles: true }));
        });
        const coarse = parseGridStatus(await page.locator("#resolutionGridStatus").textContent());
        assert.equal(coarse.percent, 50);
        assert(coarse.columns < automatic.columns);
        assert(coarse.rows < automatic.rows);
        const canvas = page.locator('[data-ascii-target="background"] canvas');
        await page.waitForFunction((element) => {
            const context = element.getContext("2d");
            if (!context) return false;
            const pixels = context.getImageData(0, 0, element.width, element.height).data;
            const stride = Math.max(4, Math.floor(pixels.length / 4096 / 4) * 4);
            for (let index = 3; index < pixels.length; index += stride) {
                if (pixels[index] > 0) return true;
            }
            return false;
        }, await canvas.elementHandle(), { polling: 100, timeout: 3000 });

        await page.locator("#edgeFade").evaluate((element) => {
            element.value = "0.4";
            element.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await page.locator("#color").evaluate((element) => {
            element.value = "#ff0000";
            element.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await page.locator("#pop-quality").evaluate((element) => element.hidePopover());
        await page.locator("#pop-more").evaluate((element) => element.hidePopover());
        await page.locator("#meshTriggerBtn").click();
        await page.locator("#meshPrimitive").selectOption("torus");
        await page.waitForFunction(() => document.getElementById("meshToolbarStatus")?.textContent === "torus");
        const generatedCode = await page.locator("#usageCodePopover").textContent();
        assert.match(generatedCode, /"edgeFade": 0\.4/);
        assert.match(generatedCode, /"color": "#ff0000"/);
        assert.match(generatedCode, /"meshPrimitive": "torus"/);

        await page.locator("#pop-mesh").evaluate((element) => element.hidePopover());
        await page.locator("#moreTriggerBtn").click();
        await page.locator("#qualityTriggerBtn").click();
        await page.locator("#renderer").selectOption("webgpu");
        await page.waitForFunction(() => {
            const info = document.getElementById("rendererStatus")?.textContent || "";
            return /WebGPU|fallback/.test(info);
        });
        assert.equal(await page.locator("#renderer").inputValue(), "webgpu");
        await page.locator("#resetSettingsBtn").click();
        const reset = parseGridStatus(await page.locator("#resolutionGridStatus").textContent());
        assert.equal(reset.percent, 100);

        const directAuthoringControls = ["charsetTriggerBtn", "alignTriggerBtn", "backdropTriggerBtn"];
        for (const id of directAuthoringControls) {
            assert.equal(await page.locator(`#${id}`).evaluate((element) => element.parentElement?.classList.contains("ctrl-bar")), true);
        }
        assert.equal(await page.locator("#qualityTriggerBtn").evaluate((element) => element.parentElement?.classList.contains("ctrl-bar")), true);

        // Close any popover left open by the Reset click above before measuring: its CSS
        // close transition can leave the element `display: block` for a beat after
        // `:popover-open` stops matching, and that box still counts toward .ctrl-bar's
        // scrollWidth until the transition finishes.
        await page.evaluate(() => document.querySelectorAll(":popover-open").forEach((element) => element.hidePopover()));
        await page.waitForFunction(() =>
            [...document.querySelectorAll(".ctrl-popover")].every((element) => getComputedStyle(element).display === "none")
        );

        await page.setViewportSize({ width: 390, height: 844 });
        const mobileToolbar = await page.locator(".ctrl-bar").evaluate((element) => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
        }));
        assert(mobileToolbar.scrollWidth <= mobileToolbar.clientWidth + 1, "Mobile toolbar overflows horizontally");
        for (const id of directAuthoringControls) {
            const size = await page.locator(`#${id}`).evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
            });
            assert(size.width > 0 && size.height >= 44, `${id} is not a usable mobile target (${size.width}×${size.height})`);
        }
        assert.deepEqual(browserErrors, []);
        console.log(`${browserName} smoke passed: ${automatic.columns}×${automatic.rows} → ${detailed.columns}×${detailed.rows}`);
    } finally {
        await browser.close();
    }
}

try {
    await waitForServer();
    for (const [browserName, browserType] of [["Chromium", chromium], ["Firefox", firefox], ["WebKit", webkit]]) {
        await verifyBrowser(browserType, browserName);
    }
} finally {
    server.kill("SIGTERM");
}
