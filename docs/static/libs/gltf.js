import { normalizeMeshData } from "./mesh.js";

const GLB_MAGIC = 0x46546c67;
const GLB_JSON = 0x4e4f534a;
const GLB_BINARY = 0x004e4942;
const COMPONENTS = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 });
const COMPONENT_BYTES = Object.freeze({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 });

/**
 * Throw if a caller-supplied AbortSignal has already fired. Called between every
 * await point in the load pipeline so a mid-flight abort stops work promptly.
 *
 * @param {AbortSignal} [signal] - signal to check; a no-op if omitted
 * @returns {void}
 * @throws {DOMException} `AbortError` if `signal.aborted` is true
 */
function throwIfAborted(signal) {
    if (signal?.aborted) throw new DOMException("The model load was aborted.", "AbortError");
}

/**
 * Read one glTF scalar from an arbitrary aligned or interleaved byte offset.
 *
 * @param {DataView} view - buffer view over the accessor's backing bytes
 * @param {number} offset - absolute byte offset of the component
 * @param {number} type - glTF `componentType` constant (5120-5126)
 * @returns {number} the raw component value (not yet normalized)
 * @throws {TypeError} if `type` is not a supported glTF component type
 */
function readComponent(view, offset, type) {
    if (type === 5120) return view.getInt8(offset);
    if (type === 5121) return view.getUint8(offset);
    if (type === 5122) return view.getInt16(offset, true);
    if (type === 5123) return view.getUint16(offset, true);
    if (type === 5125) return view.getUint32(offset, true);
    if (type === 5126) return view.getFloat32(offset, true);
    throw new TypeError(`asciiam: unsupported glTF componentType ${type}`);
}

/**
 * Convert a normalized integer accessor value to its glTF floating-point range
 * (signed types map to [-1, 1], unsigned to [0, 1]; float types pass through).
 *
 * @param {number} value - raw component value from {@link readComponent}
 * @param {number} type - glTF `componentType` constant (5120-5126)
 * @returns {number} normalized floating-point value
 */
function normalizeComponent(value, type) {
    if (type === 5120) return Math.max(value / 127, -1);
    if (type === 5121) return value / 255;
    if (type === 5122) return Math.max(value / 32767, -1);
    if (type === 5123) return value / 65535;
    if (type === 5125) return value / 4294967295;
    return value;
}

/**
 * Decode a `data:` URI without adding a package or browser request.
 *
 * @param {string} uri - a `data:...` URI, base64-encoded or not
 * @returns {ArrayBuffer} decoded bytes
 * @throws {TypeError} if the URI has no comma separator between metadata and payload
 */
function decodeDataUri(uri) {
    const comma = uri.indexOf(",");
    if (comma < 0) throw new TypeError("asciiam: malformed glTF data URI");
    const metadata = uri.slice(5, comma);
    const payload = uri.slice(comma + 1);
    if (metadata.includes(";base64")) {
        const binary = globalThis.atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
        return bytes.buffer;
    }
    return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
}

/**
 * Fetch bytes with cancellation and bounded progress notifications. Falls back to a
 * single `arrayBuffer()` read when streaming isn't available or no progress callback
 * was given, otherwise reads the response body in chunks to report incremental progress.
 *
 * @async
 * @param {string} url - resource URL to fetch
 * @param {AbortSignal} [signal] - forwarded to `fetch()` and checked between chunks
 * @param {(progress: {loaded: number, total: number|null}) => void} [onProgress] - called with cumulative bytes loaded and, when known from `content-length`, the total
 * @returns {Promise<ArrayBuffer>} the fetched bytes
 * @throws {Error} if the HTTP response is not ok
 * @throws {DOMException} `AbortError` if `signal` fires mid-read
 */
async function fetchBytes(url, signal, onProgress) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`asciiam: model request failed with ${response.status}`);
    const total = Number(response.headers.get("content-length")) || null;
    if (!response.body?.getReader || typeof onProgress !== "function") {
        const buffer = await response.arrayBuffer();
        if (onProgress) onProgress({ loaded: buffer.byteLength, total });
        return buffer;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress({ loaded, total });
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes.buffer;
}

/**
 * Normalize a caller-resolved buffer resource (from `options.resolveUri`) into an
 * ArrayBuffer, without imposing a file-picker API of asciiam's own — a string is
 * fetched, a Blob/ArrayBuffer/typed array is read or copied directly.
 *
 * @async
 * @param {string|Blob|ArrayBuffer|ArrayBufferView} resource - value returned by `options.resolveUri`
 * @param {string|null} baseUrl - base URL used to resolve a string resource
 * @param {Object} options - the active `loadGltf()` options (for `signal`/`onProgress`)
 * @param {number} index - buffer index, forwarded to `onProgress` and error messages
 * @returns {Promise<ArrayBuffer>} the resource's bytes
 * @throws {TypeError} if `resource` is not a string, Blob, ArrayBuffer, or typed array
 * @throws {DOMException} `AbortError` if `options.signal` fires mid-read
 */
async function readResolvedBytes(resource, baseUrl, options, index) {
    throwIfAborted(options.signal);
    let buffer;
    if (typeof resource === "string") {
        const url = new URL(resource, baseUrl || globalThis.document?.baseURI || globalThis.location?.href).href;
        return fetchBytes(url, options.signal, (progress) => options.onProgress?.({ ...progress, buffer: index }));
    }
    if (typeof Blob !== "undefined" && resource instanceof Blob) buffer = await resource.arrayBuffer();
    else if (resource instanceof ArrayBuffer || Object.prototype.toString.call(resource) === "[object ArrayBuffer]") buffer = resource;
    else if (ArrayBuffer.isView(resource)) {
        buffer = resource.buffer.slice(resource.byteOffset, resource.byteOffset + resource.byteLength);
    } else throw new TypeError(`asciiam: resolveUri returned an unsupported resource for glTF buffer ${index}`);
    throwIfAborted(options.signal);
    options.onProgress?.({ loaded: buffer.byteLength, total: buffer.byteLength, buffer: index });
    return buffer;
}

/**
 * Parse a GLB v2 container and return its JSON plus optional first binary chunk.
 *
 * @param {ArrayBuffer} buffer - complete GLB file bytes
 * @returns {{json: Object, binary: ArrayBuffer|null}} the parsed glTF JSON document and, if present, the binary (`BIN`) chunk
 * @throws {TypeError} if the header magic, version, or JSON chunk is missing/invalid
 * @throws {RangeError} if the declared length or a chunk length doesn't fit the buffer
 *
 * @example
 * const { json, binary } = parseGlb(await file.arrayBuffer());
 */
export function parseGlb(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new TypeError("asciiam: invalid GLB header");
    if (view.getUint32(4, true) !== 2) throw new TypeError("asciiam: only GLB version 2 is supported");
    const declaredLength = view.getUint32(8, true);
    if (declaredLength !== view.byteLength) throw new RangeError("asciiam: GLB length does not match its header");
    let offset = 12;
    let json = null;
    let binary = null;
    while (offset + 8 <= view.byteLength) {
        const length = view.getUint32(offset, true);
        const type = view.getUint32(offset + 4, true);
        offset += 8;
        if (offset + length > view.byteLength) throw new RangeError("asciiam: GLB chunk exceeds the container");
        const chunk = buffer.slice(offset, offset + length);
        if (type === GLB_JSON && json === null) {
            const bytes = new Uint8Array(chunk);
            let jsonLength = bytes.length;
            while (jsonLength && bytes[jsonLength - 1] <= 0x20) jsonLength--;
            const source = new TextDecoder().decode(bytes.subarray(0, jsonLength));
            json = JSON.parse(source);
        } else if (type === GLB_BINARY && binary === null) {
            binary = chunk;
        }
        offset += length;
    }
    if (!json) throw new TypeError("asciiam: GLB does not contain a JSON chunk");
    return { json, binary };
}

/**
 * Resolve and load every buffer declared in `gltf.buffers`: buffer 0 may come from
 * an embedded GLB binary chunk, others from a `data:` URI, a caller's `resolveUri`,
 * or a same-origin/relative fetch against `baseUrl`.
 *
 * @async
 * @param {Object} gltf - parsed glTF JSON document
 * @param {ArrayBuffer|null} binary - GLB binary chunk, if the source was a GLB container
 * @param {string|null} baseUrl - base URL for resolving relative buffer URIs
 * @param {Object} options - the active `loadGltf()` options (`signal`, `onProgress`, `resolveUri`)
 * @returns {Promise<ArrayBuffer[]>} one entry per `gltf.buffers`, in order
 * @throws {TypeError} if a buffer has no URI and no GLB chunk is available, or lacks a base URL/resolver
 * @throws {RangeError} if a resolved buffer is shorter than its declared `byteLength`
 * @throws {DOMException} `AbortError` if `options.signal` fires mid-load
 */
async function loadBuffers(gltf, binary, baseUrl, options) {
    const definitions = gltf.buffers || [];
    const buffers = new Array(definitions.length);
    for (let index = 0; index < definitions.length; index++) {
        throwIfAborted(options.signal);
        const definition = definitions[index];
        let buffer;
        if (!definition.uri) {
            if (index !== 0 || !binary) throw new TypeError(`asciiam: glTF buffer ${index} has no URI or GLB chunk`);
            buffer = binary;
        } else if (definition.uri.startsWith("data:")) {
            buffer = decodeDataUri(definition.uri);
        } else {
            const resolved = typeof options.resolveUri === "function"
                ? await options.resolveUri(definition.uri, { kind: "buffer", index, baseUrl })
                : null;
            if (resolved !== null && resolved !== undefined) {
                buffer = await readResolvedBytes(resolved, baseUrl, options, index);
            } else {
                if (!baseUrl) throw new TypeError(`asciiam: glTF buffer ${index} requires a base URL or resolveUri`);
                const url = new URL(definition.uri, baseUrl).href;
                buffer = await fetchBytes(url, options.signal, (progress) => options.onProgress?.({ ...progress, buffer: index }));
            }
        }
        if (buffer.byteLength < definition.byteLength) throw new RangeError(`asciiam: glTF buffer ${index} is shorter than declared`);
        buffers[index] = buffer;
    }
    return buffers;
}

/**
 * Materialize one glTF accessor into a flat typed array, including interleaved
 * (non-packed stride) and sparse (base + override) storage layouts.
 *
 * @param {Object} gltf - parsed glTF JSON document
 * @param {ArrayBuffer[]} buffers - loaded buffers, see {@link loadBuffers}
 * @param {number} accessorIndex - index into `gltf.accessors`
 * @param {boolean} [forceIndices=false] - read as `Uint32Array` for index data instead of `Float32Array`, and skip normalization
 * @returns {{values: Float32Array|Uint32Array, components: number}} the flattened values and the component count per element (1-16)
 * @throws {RangeError} if the accessor, its bufferView, or a sparse bufferView is missing, or a sparse index exceeds the accessor's count
 * @throws {TypeError} if the accessor's type/componentType combination is unsupported
 */
function readAccessor(gltf, buffers, accessorIndex, forceIndices = false) {
    const accessor = gltf.accessors?.[accessorIndex];
    if (!accessor) throw new RangeError(`asciiam: missing glTF accessor ${accessorIndex}`);
    const components = COMPONENTS[accessor.type];
    const componentBytes = COMPONENT_BYTES[accessor.componentType];
    if (!components || !componentBytes) throw new TypeError(`asciiam: unsupported accessor ${accessorIndex}`);
    const length = accessor.count * components;
    const output = forceIndices ? new Uint32Array(length) : new Float32Array(length);
    if (accessor.bufferView !== undefined) {
        const bufferView = gltf.bufferViews?.[accessor.bufferView];
        if (!bufferView) throw new RangeError(`asciiam: missing bufferView ${accessor.bufferView}`);
        const buffer = buffers[bufferView.buffer];
        if (!buffer) throw new RangeError(`asciiam: missing buffer ${bufferView.buffer}`);
        const view = new DataView(buffer);
        const packedStride = componentBytes * components;
        const stride = bufferView.byteStride || packedStride;
        if (stride < packedStride) throw new RangeError(`asciiam: accessor ${accessorIndex} has an invalid stride`);
        const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        for (let item = 0; item < accessor.count; item++) {
            const itemOffset = start + item * stride;
            for (let component = 0; component < components; component++) {
                const value = readComponent(view, itemOffset + component * componentBytes, accessor.componentType);
                output[item * components + component] = !forceIndices && accessor.normalized
                    ? normalizeComponent(value, accessor.componentType)
                    : value;
            }
        }
    }
    if (accessor.sparse) {
        const sparse = accessor.sparse;
        const indexViewDefinition = gltf.bufferViews?.[sparse.indices.bufferView];
        const valueViewDefinition = gltf.bufferViews?.[sparse.values.bufferView];
        if (!indexViewDefinition || !valueViewDefinition) throw new RangeError("asciiam: sparse accessor references a missing bufferView");
        const indexView = new DataView(buffers[indexViewDefinition.buffer]);
        const valueView = new DataView(buffers[valueViewDefinition.buffer]);
        const sparseIndexBytes = COMPONENT_BYTES[sparse.indices.componentType];
        if (![5121, 5123, 5125].includes(sparse.indices.componentType)) throw new TypeError("asciiam: invalid sparse index component type");
        const indexStart = (indexViewDefinition.byteOffset || 0) + (sparse.indices.byteOffset || 0);
        const valueStart = (valueViewDefinition.byteOffset || 0) + (sparse.values.byteOffset || 0);
        for (let item = 0; item < sparse.count; item++) {
            const destination = readComponent(indexView, indexStart + item * sparseIndexBytes, sparse.indices.componentType);
            if (destination >= accessor.count) throw new RangeError("asciiam: sparse accessor index exceeds accessor count");
            for (let component = 0; component < components; component++) {
                const value = readComponent(valueView, valueStart + (item * components + component) * componentBytes, accessor.componentType);
                output[destination * components + component] = !forceIndices && accessor.normalized
                    ? normalizeComponent(value, accessor.componentType)
                    : value;
            }
        }
    }
    return { values: output, components };
}

/**
 * @returns {Float64Array} a fresh 4x4 column-major identity matrix
 */
function identityMatrix() {
    return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

/**
 * Build a column-major 4x4 local transform matrix from a glTF node's explicit
 * `matrix` property, or its translation/rotation(quaternion)/scale properties.
 *
 * @param {Object} node - one entry from `gltf.nodes`
 * @param {number[]} [node.matrix] - explicit column-major 4x4 matrix, takes precedence over TRS
 * @param {number[]} [node.translation=[0,0,0]]
 * @param {number[]} [node.rotation=[0,0,0,1]] - quaternion, xyzw
 * @param {number[]} [node.scale=[1,1,1]]
 * @returns {Float64Array} 4x4 column-major local transform matrix
 */
function nodeMatrix(node) {
    if (node.matrix) return new Float64Array(node.matrix);
    const translation = node.translation || [0, 0, 0];
    const rotation = node.rotation || [0, 0, 0, 1];
    const scale = node.scale || [1, 1, 1];
    const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return new Float64Array([
        (1 - (yy + zz)) * scale[0], (xy + wz) * scale[0], (xz - wy) * scale[0], 0,
        (xy - wz) * scale[1], (1 - (xx + zz)) * scale[1], (yz + wx) * scale[1], 0,
        (xz + wy) * scale[2], (yz - wx) * scale[2], (1 - (xx + yy)) * scale[2], 0,
        translation[0], translation[1], translation[2], 1,
    ]);
}

/**
 * Multiply two column-major 4x4 matrices (`a * b`), used to compose a node's
 * transform with its parent's while walking the scene graph.
 *
 * @param {Float64Array} a - left-hand 4x4 column-major matrix (16 elements)
 * @param {Float64Array} b - right-hand 4x4 column-major matrix (16 elements)
 * @returns {Float64Array} the product, a fresh 4x4 column-major matrix
 */
function multiplyMatrices(a, b) {
    const output = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            output[col * 4 + row] = a[row] * b[col * 4]
                + a[4 + row] * b[col * 4 + 1]
                + a[8 + row] * b[col * 4 + 2]
                + a[12 + row] * b[col * 4 + 3];
        }
    }
    return output;
}

/**
 * Transform a flat XYZ position array by a 4x4 matrix (applying translation).
 *
 * @param {Float32Array} source - flat XYZ triples in local/model space
 * @param {Float64Array} matrix - 4x4 column-major transform, see {@link nodeMatrix}
 * @returns {Float32Array} a fresh array of transformed XYZ triples
 */
function transformPositions(source, matrix) {
    const output = new Float32Array(source.length);
    for (let index = 0; index < source.length; index += 3) {
        const x = source[index], y = source[index + 1], z = source[index + 2];
        output[index] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
        output[index + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
        output[index + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    }
    return output;
}

/**
 * Transform a flat XYZ normal array by the inverse transpose of a 4x4 matrix's
 * upper-left 3x3 block (translation-free, so non-uniform node scale doesn't
 * incorrectly tilt the imported surface lighting), and re-normalize each result.
 *
 * @param {Float32Array|null} source - flat XYZ normal triples in local/model space, or null if the primitive has none
 * @param {Float64Array} matrix - 4x4 column-major transform, see {@link nodeMatrix}
 * @returns {Float32Array|null} a fresh array of transformed, unit-length normals, or null if `source` was null
 */
function transformNormals(source, matrix) {
    if (!source) return null;
    // Normals use the inverse transpose of the world matrix so non-uniform node
    // scale does not incorrectly tilt the imported surface lighting.
    const a00 = matrix[0], a01 = matrix[4], a02 = matrix[8];
    const a10 = matrix[1], a11 = matrix[5], a12 = matrix[9];
    const a20 = matrix[2], a21 = matrix[6], a22 = matrix[10];
    const determinant = a00 * (a11 * a22 - a12 * a21)
        - a01 * (a10 * a22 - a12 * a20)
        + a02 * (a10 * a21 - a11 * a20);
    const inverse = Math.abs(determinant) > Number.EPSILON ? 1 / determinant : 1;
    const n00 = (a11 * a22 - a12 * a21) * inverse;
    const n01 = (a12 * a20 - a10 * a22) * inverse;
    const n02 = (a10 * a21 - a11 * a20) * inverse;
    const n10 = (a02 * a21 - a01 * a22) * inverse;
    const n11 = (a00 * a22 - a02 * a20) * inverse;
    const n12 = (a01 * a20 - a00 * a21) * inverse;
    const n20 = (a01 * a12 - a02 * a11) * inverse;
    const n21 = (a02 * a10 - a00 * a12) * inverse;
    const n22 = (a00 * a11 - a01 * a10) * inverse;
    const output = new Float32Array(source.length);
    for (let index = 0; index < source.length; index += 3) {
        const x = n00 * source[index] + n01 * source[index + 1] + n02 * source[index + 2];
        const y = n10 * source[index] + n11 * source[index + 1] + n12 * source[index + 2];
        const z = n20 * source[index] + n21 * source[index + 1] + n22 * source[index + 2];
        const length = Math.hypot(x, y, z) || 1;
        output[index] = x / length;
        output[index + 1] = y / length;
        output[index + 2] = z / length;
    }
    return output;
}

/**
 * Convert every core glTF primitive topology (`mode` 0-6: points, lines, line loop,
 * line strip, triangles, triangle strip, triangle fan) to explicit point, line, or
 * triangle indices — asciiam's mesh pipeline only understands those three.
 *
 * @param {number|undefined} mode - glTF primitive `mode`; `undefined` defaults to 4 (triangles)
 * @param {Uint32Array|null} source - explicit index accessor values, or null to use vertex order
 * @param {number} vertexCount - vertex count, used to synthesize sequential indices when `source` is null
 * @returns {{primitive: "points"|"lines"|"triangles", indices: Uint32Array}} normalized topology and indices
 * @throws {TypeError} if `mode` is not one of the 7 core glTF primitive modes
 */
function convertPrimitiveIndices(mode, source, vertexCount) {
    const input = source || Uint32Array.from({ length: vertexCount }, (_, index) => index);
    if (mode === undefined || mode === 4) return { primitive: "triangles", indices: input };
    if (mode === 0) return { primitive: "points", indices: input };
    if (mode === 1) return { primitive: "lines", indices: input };
    const output = [];
    if (mode === 2) {
        for (let index = 0; index < input.length; index++) output.push(input[index], input[(index + 1) % input.length]);
        return { primitive: "lines", indices: new Uint32Array(output) };
    }
    if (mode === 3) {
        for (let index = 0; index + 1 < input.length; index++) output.push(input[index], input[index + 1]);
        return { primitive: "lines", indices: new Uint32Array(output) };
    }
    if (mode === 5) {
        for (let index = 0; index + 2 < input.length; index++) {
            if (index % 2) output.push(input[index + 1], input[index], input[index + 2]);
            else output.push(input[index], input[index + 1], input[index + 2]);
        }
        return { primitive: "triangles", indices: new Uint32Array(output) };
    }
    if (mode === 6) {
        for (let index = 1; index + 1 < input.length; index++) output.push(input[0], input[index], input[index + 1]);
        return { primitive: "triangles", indices: new Uint32Array(output) };
    }
    throw new TypeError(`asciiam: unsupported glTF primitive mode ${mode}`);
}

/**
 * Flatten the selected glTF scene (walking its node hierarchy, applying each node's
 * world transform, and enforcing vertex/primitive limits as it goes) into one
 * normalized mesh. Every primitive in the scene must share the same topology
 * (points, lines, or triangles) since {@link normalizeMeshData} models one mesh as
 * a single primitive type.
 *
 * @param {Object} gltf - parsed glTF JSON document
 * @param {ArrayBuffer[]} buffers - loaded buffers, see {@link loadBuffers}
 * @param {Object} options - the active `loadGltf()` options
 * @param {number} [options.scene] - scene index to flatten; defaults to `gltf.scene`, then 0
 * @param {Object} [options.limits] - forwarded to {@link normalizeMeshData}
 * @returns {Readonly<Object>} normalized mesh, see {@link normalizeMeshData}
 * @throws {RangeError} if the scene, a referenced node, or a referenced mesh is missing, or vertex/primitive limits are exceeded
 * @throws {TypeError} if the node hierarchy contains a cycle, a primitive is missing POSITION, an attribute has the wrong accessor type, or primitives mix topologies
 */
function buildSceneMesh(gltf, buffers, options) {
    const sceneIndex = options.scene ?? gltf.scene ?? 0;
    const scene = gltf.scenes?.[sceneIndex];
    if (!scene) throw new RangeError(`asciiam: missing glTF scene ${sceneIndex}`);
    const parts = [];
    const maxVertices = Math.max(3, options.limits?.maxVertices ?? 100000);
    const maxPrimitives = Math.max(1, options.limits?.maxPrimitives ?? 100000);
    let plannedVertices = 0;
    let plannedPrimitives = 0;
    const visit = (nodeIndex, parentMatrix, ancestry) => {
        if (ancestry.has(nodeIndex)) throw new TypeError("asciiam: glTF node hierarchy contains a cycle");
        const node = gltf.nodes?.[nodeIndex];
        if (!node) throw new RangeError(`asciiam: missing glTF node ${nodeIndex}`);
        const nextAncestry = new Set(ancestry);
        nextAncestry.add(nodeIndex);
        const matrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
        if (node.mesh !== undefined) {
            const mesh = gltf.meshes?.[node.mesh];
            if (!mesh) throw new RangeError(`asciiam: missing glTF mesh ${node.mesh}`);
            for (const primitiveDefinition of mesh.primitives || []) {
                const positionIndex = primitiveDefinition.attributes?.POSITION;
                if (positionIndex === undefined) throw new TypeError("asciiam: glTF mesh primitive requires POSITION");
                const positionDefinition = gltf.accessors?.[positionIndex];
                if (!positionDefinition || positionDefinition.type !== "VEC3") throw new TypeError("asciiam: POSITION must be VEC3");
                plannedVertices += positionDefinition.count;
                if (plannedVertices > maxVertices) throw new RangeError(`asciiam: model exceeds ${maxVertices} vertices`);
                const elementCount = primitiveDefinition.indices === undefined
                    ? positionDefinition.count
                    : gltf.accessors?.[primitiveDefinition.indices]?.count;
                if (!Number.isInteger(elementCount)) throw new RangeError("asciiam: model references a missing index accessor");
                const mode = primitiveDefinition.mode ?? 4;
                plannedPrimitives += mode === 0 ? elementCount
                    : mode === 1 ? elementCount / 2
                        : mode === 2 ? elementCount
                            : mode === 3 ? Math.max(0, elementCount - 1)
                                : mode === 4 ? elementCount / 3
                                    : Math.max(0, elementCount - 2);
                if (plannedPrimitives > maxPrimitives) throw new RangeError(`asciiam: model exceeds ${maxPrimitives} primitives`);
                const positionAccessor = readAccessor(gltf, buffers, positionIndex);
                if (positionAccessor.components !== 3) throw new TypeError("asciiam: POSITION must be VEC3");
                const normalAccessor = primitiveDefinition.attributes.NORMAL === undefined
                    ? null
                    : readAccessor(gltf, buffers, primitiveDefinition.attributes.NORMAL);
                if (normalAccessor && normalAccessor.components !== 3) throw new TypeError("asciiam: NORMAL must be VEC3");
                if (normalAccessor && normalAccessor.values.length !== positionAccessor.values.length) throw new RangeError("asciiam: NORMAL count must match POSITION");
                const colorAccessor = primitiveDefinition.attributes.COLOR_0 === undefined
                    ? null
                    : readAccessor(gltf, buffers, primitiveDefinition.attributes.COLOR_0);
                if (colorAccessor && ![3, 4].includes(colorAccessor.components)) throw new TypeError("asciiam: COLOR_0 must be VEC3 or VEC4");
                if (colorAccessor && colorAccessor.values.length / colorAccessor.components !== positionAccessor.values.length / 3) throw new RangeError("asciiam: COLOR_0 count must match POSITION");
                const indexResult = primitiveDefinition.indices === undefined
                    ? null
                    : readAccessor(gltf, buffers, primitiveDefinition.indices, true);
                if (indexResult && indexResult.components !== 1) throw new TypeError("asciiam: indices accessor must be SCALAR");
                const indexAccessor = indexResult?.values || null;
                const topology = convertPrimitiveIndices(primitiveDefinition.mode, indexAccessor, positionAccessor.values.length / 3);
                let colors = null;
                if (colorAccessor) {
                    const vertexCount = positionAccessor.values.length / 3;
                    colors = new Float32Array(vertexCount * 4);
                    for (let vertex = 0; vertex < vertexCount; vertex++) {
                        colors[vertex * 4] = colorAccessor.values[vertex * colorAccessor.components];
                        colors[vertex * 4 + 1] = colorAccessor.values[vertex * colorAccessor.components + 1];
                        colors[vertex * 4 + 2] = colorAccessor.values[vertex * colorAccessor.components + 2];
                        colors[vertex * 4 + 3] = colorAccessor.components === 4 ? colorAccessor.values[vertex * 4 + 3] : 1;
                    }
                }
                parts.push({
                    primitive: topology.primitive,
                    positions: transformPositions(positionAccessor.values, matrix),
                    normals: transformNormals(normalAccessor?.values, matrix),
                    colors,
                    indices: topology.indices,
                });
            }
        }
        for (const child of node.children || []) visit(child, matrix, nextAncestry);
    };
    for (const node of scene.nodes || []) visit(node, identityMatrix(), new Set());
    if (!parts.length) throw new TypeError("asciiam: glTF scene contains no mesh primitives");
    const primitive = parts[0].primitive;
    if (parts.some((part) => part.primitive !== primitive)) {
        throw new TypeError("asciiam: mixed point, line, and triangle topologies require separate models");
    }
    const vertexCount = parts.reduce((sum, part) => sum + part.positions.length / 3, 0);
    const indexCount = parts.reduce((sum, part) => sum + part.indices.length, 0);
    const positions = new Float32Array(vertexCount * 3);
    const hasNormals = parts.some((part) => part.normals);
    const hasColors = parts.some((part) => part.colors);
    const normals = hasNormals ? new Float32Array(vertexCount * 3) : null;
    const colors = hasColors ? new Float32Array(vertexCount * 4) : null;
    const IndexType = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexType(indexCount);
    let vertexOffset = 0;
    let indexOffset = 0;
    for (const part of parts) {
        const partVertices = part.positions.length / 3;
        positions.set(part.positions, vertexOffset * 3);
        if (normals && part.normals) normals.set(part.normals, vertexOffset * 3);
        if (colors) {
            if (part.colors) colors.set(part.colors, vertexOffset * 4);
            else for (let vertex = 0; vertex < partVertices; vertex++) colors.fill(1, (vertexOffset + vertex) * 4, (vertexOffset + vertex + 1) * 4);
        }
        for (let index = 0; index < part.indices.length; index++) indices[indexOffset++] = part.indices[index] + vertexOffset;
        vertexOffset += partVertices;
    }
    return normalizeMeshData({ positions, indices, normals, colors, primitive }, options.limits);
}

const gltfDecoders = new Map();

/**
 * Register a custom decoder callback for a compressed glTF extension (e.g.
 * `KHR_draco_mesh_compression`, `EXT_meshopt_compression`). asciiam ships with no
 * decoders of its own — an asset declaring a required extension with no matching
 * registered decoder is rejected by {@link validateDocumentHeader} before any
 * buffer is fetched.
 *
 * @param {string} name - the glTF extension name as it appears in `extensionsUsed`/`extensionsRequired`
 * @param {Function} decoderFn - decoder callback (shape defined by the extension/caller, not enforced here)
 * @returns {void}
 * @throws {TypeError} if `name` isn't a string or `decoderFn` isn't a function
 *
 * @example
 * registerGltfDecoder('KHR_draco_mesh_compression', myDracoDecoder);
 */
export function registerGltfDecoder(name, decoderFn) {
    if (typeof name !== "string" || typeof decoderFn !== "function") {
        throw new TypeError("asciiam: registerGltfDecoder requires an extension name string and a decoder function");
    }
    gltfDecoders.set(name, decoderFn);
}

/**
 * @returns {string[]} names of every glTF extension with a registered decoder, see {@link registerGltfDecoder}
 */
export function getGltfDecoders() {
    return Array.from(gltfDecoders.keys());
}

/**
 * Reject incompatible documents before fetching buffers or allocating accessor
 * arrays: only glTF 2.x assets are supported, and every extension the document
 * marks as required must have a decoder registered via {@link registerGltfDecoder}.
 *
 * @param {Object} gltf - parsed glTF JSON document
 * @returns {void}
 * @throws {TypeError} if the asset version isn't 2.x, or a required extension has no registered decoder
 */
function validateDocumentHeader(gltf) {
    if (gltf.asset?.version !== "2.0" && !String(gltf.asset?.minVersion || "").startsWith("2.")) {
        throw new TypeError("asciiam: only glTF 2.x assets are supported");
    }
    if (gltf.extensionsRequired?.length) {
        const unsupported = gltf.extensionsRequired.filter((ext) => !gltfDecoders.has(ext));
        if (unsupported.length > 0) {
            throw new TypeError(`asciiam: unsupported required glTF extensions: ${unsupported.join(", ")}. Register a custom decoder via asciiam.registerGltfDecoder().`);
        }
    }
}

/**
 * Load core, uncompressed glTF 2.0 or GLB v2 into an asciiam-normalized mesh — the
 * same shape {@link normalizeMeshData} produces, ready for `setMesh()`/`setModel()`.
 * Accepts a URL, a `Blob`, a raw byte buffer, or an already-parsed glTF JSON object;
 * source type is auto-detected by magic bytes/asset shape.
 *
 * @async
 * @param {string|Blob|ArrayBuffer|ArrayBufferView|Object} source - model source; a string is fetched as a URL
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - aborts an in-flight load; checked between every await
 * @param {(progress: {loaded: number, total: number|null, buffer?: number}) => void} [options.onProgress] - called with cumulative byte progress per buffer fetched
 * @param {string} [options.baseUrl] - base URL for resolving relative buffer/image URIs; defaults to the document/fetched-source URL
 * @param {(uri: string, context: {kind: string, index: number, baseUrl: string|null}) => (string|Blob|ArrayBuffer|ArrayBufferView|null|undefined|Promise<*>)} [options.resolveUri] - intercepts buffer URI resolution (e.g. to serve from a bundler-managed asset map) before falling back to a relative fetch
 * @param {number} [options.scene] - scene index to load; defaults to the glTF document's default scene, then 0
 * @param {Object} [options.limits] - forwarded to {@link normalizeMeshData} (`maxVertices`, `maxPrimitives`)
 * @returns {Promise<Readonly<Object>>} normalized mesh, see {@link normalizeMeshData}
 * @throws {TypeError} if the source type, glTF version, a required extension, or the document structure is unsupported/invalid
 * @throws {RangeError} if the document exceeds `options.limits`, or references a missing scene/node/mesh/accessor/bufferView
 * @throws {DOMException} `AbortError` if `options.signal` fires mid-load
 *
 * @example
 * const mesh = await loadGltf('/models/bunny.glb', { limits: { maxVertices: 50000 } });
 * anim.setMesh(mesh);
 */
export async function loadGltf(source, options = {}) {
    throwIfAborted(options.signal);
    let gltf;
    let binary = null;
    let baseUrl = options.baseUrl || null;
    if (typeof source === "string") {
        const url = new URL(source, globalThis.document?.baseURI || globalThis.location?.href).href;
        const buffer = await fetchBytes(url, options.signal, options.onProgress);
        baseUrl = baseUrl || url;
        const view = new DataView(buffer);
        if (view.byteLength >= 4 && view.getUint32(0, true) === GLB_MAGIC) ({ json: gltf, binary } = parseGlb(buffer));
        else gltf = JSON.parse(new TextDecoder().decode(buffer));
    } else if (typeof Blob !== "undefined" && source instanceof Blob) {
        const buffer = await source.arrayBuffer();
        throwIfAborted(options.signal);
        const view = new DataView(buffer);
        if (view.byteLength >= 4 && view.getUint32(0, true) === GLB_MAGIC) ({ json: gltf, binary } = parseGlb(buffer));
        else gltf = JSON.parse(new TextDecoder().decode(buffer));
    } else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        const buffer = source instanceof ArrayBuffer
            ? source
            : source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
        const view = new DataView(buffer);
        if (view.byteLength >= 4 && view.getUint32(0, true) === GLB_MAGIC) ({ json: gltf, binary } = parseGlb(buffer));
        else gltf = JSON.parse(new TextDecoder().decode(buffer));
    } else if (source && typeof source === "object" && source.asset) {
        gltf = source;
    } else {
        throw new TypeError("asciiam: model source must be a URL, Blob, byte buffer, or glTF object");
    }
    validateDocumentHeader(gltf);
    throwIfAborted(options.signal);
    const buffers = await loadBuffers(gltf, binary, baseUrl, options);
    return buildSceneMesh(gltf, buffers, options);
}
