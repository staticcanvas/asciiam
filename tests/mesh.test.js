import { describe, expect, it } from "@jest/globals";
import {
    createCubeMesh,
    createIcosphereMesh,
    createPlaneMesh,
    createTorusMesh,
    MeshCellRasterizer,
    normalizeMeshData,
} from "../src/mesh.js";

describe("dependency-free mesh prototype", () => {
    it("validates positions, indices, primitive groups, and configured limits", () => {
        expect(() => normalizeMeshData({ positions: [0, 0, 0] })).toThrow(TypeError);
        expect(() => normalizeMeshData({ positions: new Float32Array([0, 0]) })).toThrow(RangeError);
        expect(() => normalizeMeshData({
            positions: new Float32Array([0, 0, 0]),
            indices: new Uint16Array([1]),
            primitive: "points",
        })).toThrow(RangeError);
        expect(() => normalizeMeshData(createCubeMesh(), { maxVertices: 3 })).toThrow(RangeError);
    });

    it("generates bounded indexed procedural geometry", () => {
        const cube = createCubeMesh();
        const plane = createPlaneMesh({ columns: 2, rows: 3 });
        const sphere = createIcosphereMesh({ subdivisions: 1 });
        const torus = createTorusMesh({ majorSegments: 12, minorSegments: 8 });
        expect(cube).toMatchObject({ primitive: "triangles", vertexCount: 8, primitiveCount: 12 });
        expect(plane).toMatchObject({ primitive: "triangles", vertexCount: 12, primitiveCount: 12 });
        expect(sphere).toMatchObject({ primitive: "triangles", vertexCount: 42, primitiveCount: 80 });
        expect(torus).toMatchObject({ primitive: "triangles", vertexCount: 96, primitiveCount: 192 });
    });

    it.each(["points", "wireframe", "solid"])("rasterizes triangle meshes as %s cells", (style) => {
        const rasterizer = new MeshCellRasterizer(60, 45);
        const result = rasterizer.rasterize(createCubeMesh(), {
            style,
            transform: { rotation: [0.35, 0.45, 0.1] },
        });
        expect(result.drawn).toBeGreaterThan(0);
        expect(result.occupied.reduce((sum, value) => sum + value, 0)).toBe(result.drawn);
        expect([...result.intensity].some((value) => value > 0)).toBe(true);
    });

    it("reuses cell and vertex buffers after warm-up", () => {
        const mesh = createTorusMesh({ majorSegments: 12, minorSegments: 8 });
        const rasterizer = new MeshCellRasterizer(40, 30);
        const first = rasterizer.rasterize(mesh, { transform: { rotation: [0, 0, 0] } });
        const references = {
            result: first,
            depth: first.depth,
            intensity: first.intensity,
            occupied: first.occupied,
            projected: rasterizer.projected,
            world: rasterizer.world,
        };
        const second = rasterizer.rasterize(mesh, { transform: { rotation: [0.1, 0.2, 0.3] } });
        expect(second).toBe(references.result);
        expect(second.depth).toBe(references.depth);
        expect(second.intensity).toBe(references.intensity);
        expect(second.occupied).toBe(references.occupied);
        expect(rasterizer.projected).toBe(references.projected);
        expect(rasterizer.world).toBe(references.world);
    });

    it("reallocates cell buffers only after a grid resize", () => {
        const rasterizer = new MeshCellRasterizer(10, 10);
        const depth = rasterizer.depth;
        rasterizer.resize(10, 10);
        expect(rasterizer.depth).toBe(depth);
        rasterizer.resize(20, 15);
        expect(rasterizer.depth).not.toBe(depth);
        expect(rasterizer.depth).toHaveLength(300);
    });
});
