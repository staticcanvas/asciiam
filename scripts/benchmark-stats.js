import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";
import asciiam from "../src/asciiam.js";

const width = Math.max(1, Number(process.env.ASCIIAM_STATS_WIDTH) || 1280);
const height = Math.max(1, Number(process.env.ASCIIAM_STATS_HEIGHT) || 720);
const frames = Math.max(120, Number(process.env.ASCIIAM_STATS_FRAMES) || 600);
const rounds = Math.max(3, Number(process.env.ASCIIAM_STATS_ROUNDS) || 7);
const dom = new JSDOM("<!doctype html><body></body>");

Object.assign(globalThis, {
    document: dom.window.document,
    Image: dom.window.Image,
    window: dom.window,
});
Object.defineProperty(document, "hidden", { configurable: true, value: false });
globalThis.getComputedStyle = () => ({ position: "relative" });
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const context = {
    clearRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage() {},
    fillRect() {},
    fillText() {},
    measureText: () => ({ width: 8 }),
    restore() {},
    save() {},
    setTransform() {},
};
dom.window.HTMLCanvasElement.prototype.getContext = () => context;

const cases = [
    { name: "disabled", showStats: false, extendedStats: false },
    { name: "compact", showStats: true, extendedStats: false },
    { name: "extended", showStats: true, extendedStats: true },
];
const samples = Object.fromEntries(cases.map(({ name }) => [name, []]));

/** Measures complete instance frame work so diagnostics overhead stays in context. */
function measure(testCase) {
    const host = document.createElement("div");
    Object.defineProperties(host, {
        clientHeight: { value: height },
        clientWidth: { value: width },
    });
    document.body.appendChild(host);
    const animation = new asciiam(host, {
        mode: "current",
        quality: "ultra",
        renderer: "canvas2d",
        respectReducedMotion: false,
        showStats: testCase.showStats,
        extendedStats: testCase.extendedStats,
    });
    if (testCase.showStats) animation.attachStats(document.createElement("output"));
    animation._running = true;
    for (let frame = 0; frame < 60; frame++) animation._runFrame(frame * (1000 / 60));
    const started = performance.now();
    for (let frame = 60; frame < frames + 60; frame++) animation._runFrame(frame * (1000 / 60));
    const elapsed = performance.now() - started;
    animation.destroy();
    host.remove();
    return elapsed / frames;
}

for (let round = 0; round < rounds; round++) {
    for (let offset = 0; offset < cases.length; offset++) {
        const testCase = cases[(round + offset) % cases.length];
        samples[testCase.name].push(measure(testCase));
    }
}

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};
const baseline = median(samples.disabled);
console.log(`Stats sampling, Canvas 2D current mode, ${width}x${height}, ${frames} frames, ${rounds} rounds`);
console.log("mode\tmedian ms/frame\tdelta vs disabled");
for (const testCase of cases) {
    const milliseconds = median(samples[testCase.name]);
    const delta = baseline ? ((milliseconds - baseline) / baseline) * 100 : 0;
    console.log(`${testCase.name}\t${milliseconds.toFixed(4)}\t${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`);
}

dom.window.close();
