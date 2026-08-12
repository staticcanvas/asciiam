import { performance } from "node:perf_hooks";
import { JSDOM } from "jsdom";
import asciiam from "../src/asciiam.js";

const width = Math.max(1, Number(process.env.ASCIIAM_BENCH_WIDTH) || 1920);
const height = Math.max(1, Number(process.env.ASCIIAM_BENCH_HEIGHT) || 1080);
const frames = Math.max(10, Number(process.env.ASCIIAM_BENCH_FRAMES) || 120);
const instanceCount = Math.max(1, Number(process.env.ASCIIAM_BENCH_INSTANCES) || 1);
const mode = process.env.ASCIIAM_BENCH_MODE || "current";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, {
    document: dom.window.document,
    Image: dom.window.Image,
    window: dom.window,
});
globalThis.getComputedStyle = () => ({ position: "relative" });
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
};
globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
};
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

console.log(`Canvas 2D CPU path, dense ${mode} mode, ${width}x${height}, ${frames} measured frames, ${instanceCount} instance(s)`);
console.log("quality\tcells/instance\tms/shared frame\ttheoretical JS fps");

for (const quality of Object.keys(asciiam.QUALITY)) {
    const animations = [];
    for (let index = 0; index < instanceCount; index++) {
        const host = document.createElement("div");
        Object.defineProperties(host, {
            clientHeight: { value: height },
            clientWidth: { value: width },
        });
        document.body.appendChild(host);
        animations.push(new asciiam(host, { mode, quality, renderer: "canvas2d", respectReducedMotion: false }));
    }

    for (let frame = 0; frame < 10; frame++) {
        for (const animation of animations) animation._draw(16.7);
    }
    const started = performance.now();
    for (let frame = 0; frame < frames; frame++) {
        for (const animation of animations) {
            animation._time += 1 / 60;
            animation._draw(16.7);
        }
    }
    const milliseconds = (performance.now() - started) / frames;
    const cells = animations[0].cols * animations[0].rows;
    console.log(`${quality}\t${cells}\t${milliseconds.toFixed(3)}\t${Math.round(1000 / milliseconds)}`);
    animations.forEach((animation) => animation.destroy());
}

dom.window.close();
