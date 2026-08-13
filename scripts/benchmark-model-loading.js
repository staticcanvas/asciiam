import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { loadGltf } from "../src/gltf.js";

const sourcePath = process.env.ASCIIAM_MODEL_PATH;
if (!sourcePath) {
    console.error("Set ASCIIAM_MODEL_PATH to a self-contained .glb or data-URI .gltf fixture.");
    process.exitCode = 2;
} else {
    const iterations = Math.max(1, Math.min(1000, Number(process.env.ASCIIAM_MODEL_ITERATIONS) || 30));
    const source = await readFile(sourcePath);
    const bytes = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    const samples = [];
    let mesh;
    for (let iteration = 0; iteration < iterations + 3; iteration++) {
        const started = performance.now();
        mesh = await loadGltf(bytes);
        const elapsed = performance.now() - started;
        if (iteration >= 3) samples.push(elapsed);
    }
    samples.sort((a, b) => a - b);
    const percentile = (value) => samples[Math.min(samples.length - 1, Math.floor(samples.length * value))];
    console.log(JSON.stringify({
        source: sourcePath,
        bytes: source.byteLength,
        iterations,
        vertices: mesh.vertexCount,
        primitives: mesh.primitiveCount,
        milliseconds: {
            median: Number(percentile(0.5).toFixed(3)),
            p95: Number(percentile(0.95).toFixed(3)),
        },
    }, null, 2));
}
