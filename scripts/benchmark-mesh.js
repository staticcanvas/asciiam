import { performance } from "node:perf_hooks";
import { createTorusMesh, MeshCellRasterizer } from "../src/mesh.js";

const iterations = Math.max(100, Number.parseInt(process.argv[2] || "1200", 10));
const warmup = Math.max(20, Math.min(300, Math.round(iterations * 0.1)));
const mesh = createTorusMesh({ majorSegments: 40, minorSegments: 24 });
const rasterizer = new MeshCellRasterizer(60, 45);
const options = {
    style: "solid",
    transform: { rotation: [0.35, 0, 0.2], scale: [1, 1, 1] },
    camera: { position: [0, 0, 4], target: [0, 0, 0] },
};

for (let frame = 0; frame < warmup; frame++) {
    options.transform.rotation[1] = frame * 0.01;
    rasterizer.rasterize(mesh, options);
}

const samples = new Float64Array(iterations);
let drawn = 0;
for (let frame = 0; frame < iterations; frame++) {
    options.transform.rotation[1] = frame * 0.01;
    const start = performance.now();
    drawn = rasterizer.rasterize(mesh, options).drawn;
    samples[frame] = performance.now() - start;
}
samples.sort();
const median = samples[Math.floor(samples.length * 0.5)];
const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
const result = {
    grid: `${rasterizer.cols}x${rasterizer.rows}`,
    vertices: mesh.vertexCount,
    triangles: mesh.primitiveCount,
    drawnCells: drawn,
    iterations,
    milliseconds: {
        mean: Number(mean.toFixed(3)),
        median: Number(median.toFixed(3)),
        p95: Number(p95.toFixed(3)),
    },
    gate: { median: 4, p95: 8 },
    passed: median <= 4 && p95 <= 8,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exitCode = 1;

