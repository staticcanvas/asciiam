import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { loadGltf, parseGlb } from "../src/gltf.js";

function dataUri(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:application/octet-stream;base64,${btoa(binary)}`;
}

function triangleDocument(options = {}) {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const indices = new Uint16Array([0, 1, 2]);
    const bytes = new Uint8Array(positions.byteLength + indices.byteLength);
    bytes.set(new Uint8Array(positions.buffer));
    bytes.set(new Uint8Array(indices.buffer), positions.byteLength);
    return {
        asset: { version: "2.0" },
        buffers: [{ byteLength: bytes.byteLength, uri: dataUri(bytes) }],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength },
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, ...options.primitive }] }],
        nodes: [{ mesh: 0, ...options.node }],
        scenes: [{ nodes: [0] }],
        scene: 0,
        ...options.document,
    };
}

function glbFromDocument(document, binary) {
    const encoded = new TextEncoder().encode(JSON.stringify(document));
    const jsonLength = Math.ceil(encoded.length / 4) * 4;
    const binaryLength = Math.ceil(binary.byteLength / 4) * 4;
    const buffer = new ArrayBuffer(12 + 8 + jsonLength + 8 + binaryLength);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, buffer.byteLength, true);
    view.setUint32(12, jsonLength, true);
    view.setUint32(16, 0x4e4f534a, true);
    bytes.fill(0x20, 20, 20 + jsonLength);
    bytes.set(encoded, 20);
    const binaryHeader = 20 + jsonLength;
    view.setUint32(binaryHeader, binaryLength, true);
    view.setUint32(binaryHeader + 4, 0x004e4942, true);
    bytes.set(new Uint8Array(binary), binaryHeader + 8);
    return buffer;
}

describe("dependency-free glTF and GLB loader", () => {
    const nativeFetch = globalThis.fetch;
    afterEach(() => { globalThis.fetch = nativeFetch; });
    it("loads indexed glTF geometry from a data URI", async () => {
        const mesh = await loadGltf(triangleDocument());
        expect(mesh).toMatchObject({ primitive: "triangles", vertexCount: 3, primitiveCount: 1 });
        expect([...mesh.indices]).toEqual([0, 1, 2]);
    });

    it("applies node transforms while flattening the selected scene", async () => {
        const mesh = await loadGltf(triangleDocument({ node: { translation: [2, 3, 4] } }));
        expect([...mesh.positions.slice(0, 3)]).toEqual([2, 3, 4]);
        expect([...mesh.positions.slice(3, 6)]).toEqual([3, 3, 4]);
    });

    it("parses GLB v2 JSON and binary chunks", async () => {
        const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        const document = triangleDocument();
        document.buffers = [{ byteLength: positions.byteLength }];
        document.bufferViews = [{ buffer: 0, byteLength: positions.byteLength }];
        document.accessors = [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }];
        document.meshes[0].primitives[0].indices = undefined;
        const glb = glbFromDocument(document, positions.buffer);
        expect(parseGlb(glb).json.asset.version).toBe("2.0");
        const mesh = await loadGltf(new Uint8Array(glb));
        expect(mesh.primitiveCount).toBe(1);
    });

    it("materializes sparse accessors without a base bufferView", async () => {
        const sparseIndices = new Uint8Array([0, 1, 2]);
        const sparseValues = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        const bytes = new Uint8Array(4 + sparseValues.byteLength);
        bytes.set(sparseIndices);
        bytes.set(new Uint8Array(sparseValues.buffer), 4);
        const document = triangleDocument();
        document.buffers = [{ byteLength: bytes.length, uri: dataUri(bytes) }];
        document.bufferViews = [
            { buffer: 0, byteOffset: 0, byteLength: 3 },
            { buffer: 0, byteOffset: 4, byteLength: sparseValues.byteLength },
        ];
        document.accessors = [{
            componentType: 5126,
            count: 3,
            type: "VEC3",
            sparse: {
                count: 3,
                indices: { bufferView: 0, componentType: 5121 },
                values: { bufferView: 1 },
            },
        }];
        document.meshes[0].primitives[0].indices = undefined;
        const mesh = await loadGltf(document);
        expect([...mesh.positions]).toEqual([...sparseValues]);
    });

    it("resolves external buffers and reports transfer progress", async () => {
        const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        const document = triangleDocument();
        document.buffers = [{ byteLength: positions.byteLength, uri: "triangle.bin" }];
        document.bufferViews = [{ buffer: 0, byteLength: positions.byteLength }];
        document.accessors = [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }];
        document.meshes[0].primitives[0].indices = undefined;
        const json = new TextEncoder().encode(JSON.stringify(document)).buffer;
        globalThis.fetch = jest.fn(async (url) => ({
            ok: true,
            status: 200,
            headers: { get: () => null },
            body: null,
            arrayBuffer: async () => url.endsWith("triangle.bin") ? positions.buffer : json,
        }));
        const progress = jest.fn();

        const mesh = await loadGltf("https://example.test/model.gltf", { onProgress: progress });

        expect(mesh.vertexCount).toBe(3);
        expect(globalThis.fetch).toHaveBeenNthCalledWith(2, "https://example.test/triangle.bin", expect.any(Object));
        expect(progress).toHaveBeenCalledWith(expect.objectContaining({ loaded: positions.byteLength, buffer: 0 }));
    });

    it("maps an external buffer to a caller-selected file or byte resource", async () => {
        const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        const document = triangleDocument();
        document.buffers = [{ byteLength: positions.byteLength, uri: "triangle.bin" }];
        document.bufferViews = [{ buffer: 0, byteLength: positions.byteLength }];
        document.accessors = [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }];
        document.meshes[0].primitives[0].indices = undefined;
        const resolveUri = jest.fn(async () => positions.buffer);

        const mesh = await loadGltf(document, { resolveUri });

        expect(mesh.vertexCount).toBe(3);
        expect(resolveUri).toHaveBeenCalledWith("triangle.bin", { kind: "buffer", index: 0, baseUrl: null });
    });

    it("honors a caller cancellation signal before allocation", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(loadGltf(triangleDocument(), { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    });

    it("rejects malformed containers, required compression, and mixed topology", async () => {
        expect(() => parseGlb(new ArrayBuffer(20))).toThrow("invalid GLB header");
        await expect(loadGltf(triangleDocument({
            document: { extensionsRequired: ["KHR_draco_mesh_compression"] },
        }))).rejects.toThrow("unsupported required glTF extensions");

        const document = triangleDocument();
        document.meshes[0].primitives.push({ attributes: { POSITION: 0 }, mode: 1 });
        await expect(loadGltf(document)).rejects.toThrow("mixed point, line, and triangle topologies");
    });

    it("registers and queries custom glTF extension decoders", async () => {
        const { registerGltfDecoder, getGltfDecoders } = await import("../src/gltf.js");
        const dummyDecoder = jest.fn();
        registerGltfDecoder("KHR_draco_mesh_compression", dummyDecoder);
        expect(getGltfDecoders()).toContain("KHR_draco_mesh_compression");

        // Document with registered extension does not throw during header validation
        const document = triangleDocument({
            document: { extensionsRequired: ["KHR_draco_mesh_compression"] },
        });
        const mesh = await loadGltf(document);
        expect(mesh.vertexCount).toBe(3);
    });
});
