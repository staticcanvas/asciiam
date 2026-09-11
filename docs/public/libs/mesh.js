/**
 * Dependency-free mesh validation, primitive generation, and cell rasterization.
 * The rasterizer owns reusable typed arrays so a stable mesh can be evaluated each
 * frame without allocating in its projection or triangle loops.
 */

const EPSILON = 1e-8;
const ZERO_VECTOR = Object.freeze([0, 0, 0]);
const ONE_VECTOR = Object.freeze([1, 1, 1]);
const DEFAULT_LIGHT = Object.freeze([-0.4, 0.7, 1]);
const DEFAULT_CAMERA = Object.freeze({
    position: [0, 0, 4],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: Math.PI / 3,
    near: 0.01,
    far: 100,
    orthographicScale: 2.5,
});

/**
 * Copy a finite three-component vector into reusable storage, falling back to a
 * default when the source is missing, too short, or contains non-finite numbers.
 *
 * @param {ArrayLike<number>|null|undefined} value - candidate vector (array or typed array, length >= 3)
 * @param {ArrayLike<number>} fallback - three-component vector used when `value` is invalid
 * @param {Float64Array} output - three-element buffer written in place
 * @returns {Float64Array} `output`, for chaining
 */
function readVector3(value, fallback, output) {
    const source = value && value.length >= 3 ? value : fallback;
    const x = Number(source[0]);
    const y = Number(source[1]);
    const z = Number(source[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        output[0] = x;
        output[1] = y;
        output[2] = z;
    } else {
        output[0] = fallback[0];
        output[1] = fallback[1];
        output[2] = fallback[2];
    }
    return output;
}

/**
 * Normalize one vector into the supplied three-number output array. A
 * near-zero-length input (within `EPSILON`) resolves to the zero vector
 * rather than dividing by a near-zero length.
 *
 * @param {number} x - vector x component
 * @param {number} y - vector y component
 * @param {number} z - vector z component
 * @param {Float64Array} output - three-element buffer written in place
 * @returns {Float64Array} `output`, for chaining
 */
function normalize3(x, y, z, output) {
    const length = Math.hypot(x, y, z);
    if (length <= EPSILON) {
        output[0] = 0;
        output[1] = 0;
        output[2] = 0;
        return output;
    }
    output[0] = x / length;
    output[1] = y / length;
    output[2] = z / length;
    return output;
}

/**
 * Validate and normalize application geometry without copying compatible typed arrays.
 * Positions contain XYZ triples. Indices are optional and default to vertex order.
 *
 * @param {Object} mesh - raw mesh description
 * @param {Float32Array|Float64Array} mesh.positions - flat XYZ triples, one per vertex
 * @param {Uint8Array|Uint16Array|Uint32Array|null} [mesh.indices] - vertex indices; omit to use vertex order directly
 * @param {"points"|"lines"|"triangles"} [mesh.primitive="triangles"] - element topology
 * @param {Float32Array|null} [mesh.normals] - flat XYZ triples matching `positions`, one per vertex
 * @param {Float32Array|null} [mesh.colors] - flat RGBA quadruples, one per vertex
 * @param {Object} [limits] - safety bounds
 * @param {number} [limits.maxVertices=100000] - throws if the vertex count exceeds this
 * @param {number} [limits.maxPrimitives=100000] - throws if the primitive count exceeds this
 * @returns {Readonly<Object>} frozen, normalized mesh with `positions`, `indices`, `normals`, `colors`, `primitive`, `vertexCount`, `primitiveCount`
 * @throws {TypeError} if `mesh` is missing, malformed, or a field has the wrong type
 * @throws {RangeError} if the geometry is empty, index-out-of-bounds, mis-grouped for its primitive, or exceeds `limits`
 */
export function normalizeMeshData(mesh, limits = {}) {
    if (!mesh || typeof mesh !== "object") throw new TypeError("asciiam: mesh must be an object");
    const positions = mesh.positions;
    if (!(positions instanceof Float32Array) && !(positions instanceof Float64Array)) {
        throw new TypeError("asciiam: mesh.positions must be Float32Array or Float64Array");
    }
    if (positions.length < 3 || positions.length % 3 !== 0) {
        throw new RangeError("asciiam: mesh.positions must contain complete XYZ triples");
    }
    const vertexCount = positions.length / 3;
    const maxVertices = Math.max(3, limits.maxVertices ?? 100000);
    if (vertexCount > maxVertices) throw new RangeError(`asciiam: mesh exceeds ${maxVertices} vertices`);
    for (let index = 0; index < positions.length; index++) {
        if (!Number.isFinite(positions[index])) throw new TypeError("asciiam: mesh positions must be finite");
    }

    const indices = mesh.indices ?? null;
    if (indices !== null && !(indices instanceof Uint8Array) && !(indices instanceof Uint16Array) && !(indices instanceof Uint32Array)) {
        throw new TypeError("asciiam: mesh.indices must be Uint8Array, Uint16Array, Uint32Array, or null");
    }
    if (indices) {
        for (let index = 0; index < indices.length; index++) {
            if (indices[index] >= vertexCount) throw new RangeError("asciiam: mesh index exceeds the vertex count");
        }
    }

    const primitive = mesh.primitive ?? "triangles";
    if (!["points", "lines", "triangles"].includes(primitive)) {
        throw new TypeError('asciiam: mesh.primitive must be "points", "lines", or "triangles"');
    }
    const elementCount = indices?.length ?? vertexCount;
    const divisor = primitive === "triangles" ? 3 : primitive === "lines" ? 2 : 1;
    if (elementCount % divisor !== 0) throw new RangeError(`asciiam: ${primitive} require complete ${divisor}-element groups`);
    const primitiveCount = elementCount / divisor;
    const maxPrimitives = Math.max(1, limits.maxPrimitives ?? 100000);
    if (primitiveCount > maxPrimitives) throw new RangeError(`asciiam: mesh exceeds ${maxPrimitives} primitives`);

    const normals = mesh.normals ?? null;
    if (normals !== null && (!(normals instanceof Float32Array) || normals.length !== positions.length)) {
        throw new TypeError("asciiam: mesh.normals must be a Float32Array matching positions");
    }
    const colors = mesh.colors ?? null;
    if (colors !== null && (!(colors instanceof Float32Array) || colors.length !== vertexCount * 4)) {
        throw new TypeError("asciiam: mesh.colors must contain one RGBA Float32 tuple per vertex");
    }

    return Object.freeze({ positions, indices, normals, colors, primitive, vertexCount, primitiveCount });
}

/**
 * Generate an indexed cube centered at the origin.
 *
 * @param {number} [size=2] - edge length; clamped above zero
 * @returns {Readonly<Object>} normalized mesh, see {@link normalizeMeshData}
 *
 * @example
 * const cube = createCubeMesh(1.5);
 */
export function createCubeMesh(size = 2) {
    const half = Math.max(EPSILON, Number(size) || 2) * 0.5;
    return normalizeMeshData({
        positions: new Float32Array([
            -half, -half, -half, half, -half, -half, half, half, -half, -half, half, -half,
            -half, -half, half, half, -half, half, half, half, half, -half, half, half,
        ]),
        indices: new Uint16Array([
            0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7,
            0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
            3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4,
        ]),
    });
}

/**
 * Generate an indexed XY plane centered at the origin.
 *
 * @param {Object} [options]
 * @param {number} [options.width=2] - full width along X; clamped above zero
 * @param {number} [options.height=2] - full height along Y; clamped above zero
 * @param {number} [options.columns=1] - grid subdivisions along X, 1-256
 * @param {number} [options.rows=1] - grid subdivisions along Y, 1-256
 * @returns {Readonly<Object>} normalized mesh, see {@link normalizeMeshData}
 *
 * @example
 * const plane = createPlaneMesh({ width: 4, height: 2, columns: 8, rows: 4 });
 */
export function createPlaneMesh(options = {}) {
    const width = Math.max(EPSILON, Number(options.width ?? 2));
    const height = Math.max(EPSILON, Number(options.height ?? 2));
    const columns = Math.max(1, Math.min(256, Math.round(options.columns ?? 1)));
    const rows = Math.max(1, Math.min(256, Math.round(options.rows ?? 1)));
    const vertexColumns = columns + 1;
    const vertexCount = vertexColumns * (rows + 1);
    const positions = new Float32Array(vertexCount * 3);
    const IndexType = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexType(columns * rows * 6);
    let positionOffset = 0;
    for (let row = 0; row <= rows; row++) {
        const y = (row / rows - 0.5) * height;
        for (let col = 0; col <= columns; col++) {
            positions[positionOffset++] = (col / columns - 0.5) * width;
            positions[positionOffset++] = y;
            positions[positionOffset++] = 0;
        }
    }
    let indexOffset = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const a = row * vertexColumns + col;
            const b = a + 1;
            const d = (row + 1) * vertexColumns + col;
            const c = d + 1;
            indices[indexOffset++] = a;
            indices[indexOffset++] = b;
            indices[indexOffset++] = c;
            indices[indexOffset++] = a;
            indices[indexOffset++] = c;
            indices[indexOffset++] = d;
        }
    }
    return normalizeMeshData({ positions, indices });
}

/**
 * Generate an indexed icosphere; subdivision work occurs only during construction,
 * never per frame.
 *
 * @param {Object} [options]
 * @param {number} [options.radius=1] - sphere radius; clamped above zero
 * @param {number} [options.subdivisions=2] - recursive subdivision level, 0-5 (vertex count grows exponentially with this)
 * @returns {Readonly<Object>} normalized mesh, see {@link normalizeMeshData}
 *
 * @example
 * const sphere = createIcosphereMesh({ radius: 2, subdivisions: 3 });
 */
export function createIcosphereMesh(options = {}) {
    const radius = Math.max(EPSILON, Number(options.radius ?? 1));
    const subdivisions = Math.max(0, Math.min(5, Math.round(options.subdivisions ?? 2)));
    const golden = (1 + Math.sqrt(5)) / 2;
    const vertices = [
        [-1, golden, 0], [1, golden, 0], [-1, -golden, 0], [1, -golden, 0],
        [0, -1, golden], [0, 1, golden], [0, -1, -golden], [0, 1, -golden],
        [golden, 0, -1], [golden, 0, 1], [-golden, 0, -1], [-golden, 0, 1],
    ];
    let faces = [
        0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
        1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
        3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
        4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ];
    for (let level = 0; level < subdivisions; level++) {
        const midpoints = new Map();
        const midpoint = (a, b) => {
            const low = Math.min(a, b);
            const high = Math.max(a, b);
            const key = `${low}:${high}`;
            const cached = midpoints.get(key);
            if (cached !== undefined) return cached;
            const first = vertices[a];
            const second = vertices[b];
            const index = vertices.length;
            vertices.push([
                (first[0] + second[0]) * 0.5,
                (first[1] + second[1]) * 0.5,
                (first[2] + second[2]) * 0.5,
            ]);
            midpoints.set(key, index);
            return index;
        };
        const next = [];
        for (let index = 0; index < faces.length; index += 3) {
            const a = faces[index];
            const b = faces[index + 1];
            const c = faces[index + 2];
            const ab = midpoint(a, b);
            const bc = midpoint(b, c);
            const ca = midpoint(c, a);
            next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
        }
        faces = next;
    }
    const positions = new Float32Array(vertices.length * 3);
    for (let index = 0; index < vertices.length; index++) {
        const vertex = vertices[index];
        const length = Math.hypot(vertex[0], vertex[1], vertex[2]) || 1;
        positions[index * 3] = (vertex[0] / length) * radius;
        positions[index * 3 + 1] = (vertex[1] / length) * radius;
        positions[index * 3 + 2] = (vertex[2] / length) * radius;
    }
    const IndexType = vertices.length > 65535 ? Uint32Array : Uint16Array;
    return normalizeMeshData({ positions, indices: new IndexType(faces) });
}

/**
 * Generate a torus with shared vertices for near-limit benchmark and demo geometry.
 *
 * @param {Object} [options]
 * @param {number} [options.majorSegments=48] - segments around the ring, 3-512
 * @param {number} [options.minorSegments=24] - segments around the tube cross-section, 3-256
 * @param {number} [options.majorRadius=1] - distance from the origin to the tube's center
 * @param {number} [options.minorRadius=0.38] - tube cross-section radius
 * @returns {Readonly<Object>} normalized mesh, see {@link normalizeMeshData}
 *
 * @example
 * const torus = createTorusMesh({ majorSegments: 64, minorSegments: 32 });
 */
export function createTorusMesh(options = {}) {
    const majorSegments = Math.max(3, Math.min(512, Math.round(options.majorSegments ?? 48)));
    const minorSegments = Math.max(3, Math.min(256, Math.round(options.minorSegments ?? 24)));
    const majorRadius = Math.max(EPSILON, Number(options.majorRadius ?? 1));
    const minorRadius = Math.max(EPSILON, Number(options.minorRadius ?? 0.38));
    const vertexCount = majorSegments * minorSegments;
    const positions = new Float32Array(vertexCount * 3);
    const IndexType = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexType(majorSegments * minorSegments * 6);
    let positionOffset = 0;
    for (let major = 0; major < majorSegments; major++) {
        const u = (major / majorSegments) * Math.PI * 2;
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        for (let minor = 0; minor < minorSegments; minor++) {
            const v = (minor / minorSegments) * Math.PI * 2;
            const radius = majorRadius + minorRadius * Math.cos(v);
            positions[positionOffset++] = radius * cosU;
            positions[positionOffset++] = minorRadius * Math.sin(v);
            positions[positionOffset++] = radius * sinU;
        }
    }
    let indexOffset = 0;
    for (let major = 0; major < majorSegments; major++) {
        const nextMajor = (major + 1) % majorSegments;
        for (let minor = 0; minor < minorSegments; minor++) {
            const nextMinor = (minor + 1) % minorSegments;
            const a = major * minorSegments + minor;
            const b = nextMajor * minorSegments + minor;
            const c = nextMajor * minorSegments + nextMinor;
            const d = major * minorSegments + nextMinor;
            indices[indexOffset++] = a;
            indices[indexOffset++] = b;
            indices[indexOffset++] = c;
            indices[indexOffset++] = a;
            indices[indexOffset++] = c;
            indices[indexOffset++] = d;
        }
    }
    return normalizeMeshData({ positions, indices });
}

/**
 * MeshCellRasterizer
 * ─────────────────────────────────────────────
 * Rasterizes a normalized mesh into reusable cell-resolution depth, intensity, and
 * occupancy buffers. It deliberately does not know about canvas or glyph rendering —
 * callers turn `result.depth`/`result.intensity`/`result.occupied` into characters.
 * All working buffers are allocated once and reused across `rasterize()` calls, so a
 * stable mesh can be re-evaluated every frame without allocating in the hot path.
 *
 * @class
 *
 * @example
 * const rasterizer = new MeshCellRasterizer(80, 24);
 * const { depth, intensity, occupied, drawn } = rasterizer.rasterize(mesh, { style: 'solid' });
 */
export class MeshCellRasterizer {
    /**
     * @param {number} cols - initial grid column count
     * @param {number} rows - initial grid row count
     */
    constructor(cols, rows) {
        this._forward = new Float64Array(3);
        this._right = new Float64Array(3);
        this._up = new Float64Array(3);
        this._light = new Float64Array(3);
        this._normal = new Float64Array(3);
        this._cameraPosition = new Float64Array(3);
        this._cameraTarget = new Float64Array(3);
        this._cameraUp = new Float64Array(3);
        this._translation = new Float64Array(3);
        this._rotation = new Float64Array(3);
        this._scale = new Float64Array(3);
        this._inputLight = new Float64Array(3);
        this.result = { depth: null, intensity: null, occupied: null, drawn: 0 };
        this.resize(cols, rows);
    }

    /**
     * Resize cell buffers only when the grid dimensions change — a no-op otherwise,
     * safe to call every frame.
     *
     * @param {number} cols - target grid column count (rounded, floored at 1)
     * @param {number} rows - target grid row count (rounded, floored at 1)
     * @returns {void}
     */
    resize(cols, rows) {
        const nextCols = Math.max(1, Math.round(cols));
        const nextRows = Math.max(1, Math.round(rows));
        if (this.cols === nextCols && this.rows === nextRows) return;
        this.cols = nextCols;
        this.rows = nextRows;
        const cells = nextCols * nextRows;
        this.depth = new Float32Array(cells);
        this.intensity = new Float32Array(cells);
        this.occupied = new Uint8Array(cells);
        this.result.depth = this.depth;
        this.result.intensity = this.intensity;
        this.result.occupied = this.occupied;
    }

    /**
     * Ensure the projected/world-coordinate/visibility buffers fit the active vertex
     * count, growing (never shrinking) them only when needed.
     *
     * @private
     * @param {number} vertexCount - vertex count the buffers must accommodate
     * @returns {void}
     */
    _ensureVertices(vertexCount) {
        const length = vertexCount * 3;
        if (!this.projected || this.projected.length < length) {
            this.projected = new Float32Array(length);
            this.world = new Float32Array(length);
            this.visible = new Uint8Array(vertexCount);
        }
    }

    /**
     * Build an orthonormal camera basis (forward/right/up) once per rasterized frame,
     * writing into the instance's reusable `_forward`/`_right`/`_up` buffers.
     *
     * @private
     * @param {Object} [camera] - camera description; missing fields fall back to `DEFAULT_CAMERA`
     * @param {ArrayLike<number>} [camera.position] - world-space eye position
     * @param {ArrayLike<number>} [camera.target] - world-space look-at point
     * @param {ArrayLike<number>} [camera.up] - approximate up direction
     * @returns {void}
     */
    _prepareCamera(camera) {
        const position = readVector3(camera?.position, DEFAULT_CAMERA.position, this._cameraPosition);
        const target = readVector3(camera?.target, DEFAULT_CAMERA.target, this._cameraTarget);
        const up = readVector3(camera?.up, DEFAULT_CAMERA.up, this._cameraUp);
        normalize3(target[0] - position[0], target[1] - position[1], target[2] - position[2], this._forward);
        normalize3(
            this._forward[1] * up[2] - this._forward[2] * up[1],
            this._forward[2] * up[0] - this._forward[0] * up[2],
            this._forward[0] * up[1] - this._forward[1] * up[0],
            this._right,
        );
        normalize3(
            this._right[1] * this._forward[2] - this._right[2] * this._forward[1],
            this._right[2] * this._forward[0] - this._right[0] * this._forward[2],
            this._right[0] * this._forward[1] - this._right[1] * this._forward[0],
            this._up,
        );
    }

    /**
     * Project every model vertex through a combined model/view/perspective (or
     * orthographic) transform into grid-cell space, and retain world coordinates
     * (needed for face-normal lighting) and per-vertex near/far visibility.
     *
     * @private
     * @param {Object} mesh - normalized mesh, see {@link normalizeMeshData}
     * @param {Object} options - rasterize() options (camera, transform, projection)
     * @param {Object} [options.camera] - see {@link MeshCellRasterizer#_prepareCamera}
     * @param {Object} [options.transform] - `{ position, rotation, scale }` model transform
     * @param {"perspective"|"orthographic"} [options.projection="perspective"] - projection mode
     * @returns {void}
     */
    _project(mesh, options) {
        this._ensureVertices(mesh.vertexCount);
        const camera = options.camera;
        this._prepareCamera(camera);
        const transform = options.transform || {};
        const translation = readVector3(transform.position, ZERO_VECTOR, this._translation);
        const rotation = readVector3(transform.rotation, ZERO_VECTOR, this._rotation);
        const scale = readVector3(transform.scale, ONE_VECTOR, this._scale);

        const sinX = Math.sin(rotation[0]);
        const cosX = Math.cos(rotation[0]);
        const sinY = Math.sin(rotation[1]);
        const cosY = Math.cos(rotation[1]);
        const sinZ = Math.sin(rotation[2]);
        const cosZ = Math.cos(rotation[2]);

        const scaleX = scale[0];
        const scaleY = scale[1];
        const scaleZ = scale[2];
        const tx = translation[0];
        const ty = translation[1];
        const tz = translation[2];

        // Combined 3x3 Model Matrix
        const m00 = (cosY * cosZ) * scaleX;
        const m01 = (sinX * sinY * cosZ - cosX * sinZ) * scaleY;
        const m02 = (cosX * sinY * cosZ + sinX * sinZ) * scaleZ;

        const m10 = (cosY * sinZ) * scaleX;
        const m11 = (sinX * sinY * sinZ + cosX * cosZ) * scaleY;
        const m12 = (cosX * sinY * sinZ - sinX * cosZ) * scaleZ;

        const m20 = (-sinY) * scaleX;
        const m21 = (sinX * cosY) * scaleY;
        const m22 = (cosX * cosY) * scaleZ;

        const right = this._right;
        const up = this._up;
        const forward = this._forward;
        const cameraPosition = this._cameraPosition;

        const txRel = tx - cameraPosition[0];
        const tyRel = ty - cameraPosition[1];
        const tzRel = tz - cameraPosition[2];

        // Combined View-Model Matrix
        const T00 = m00 * right[0] + m10 * right[1] + m20 * right[2];
        const T01 = m01 * right[0] + m11 * right[1] + m21 * right[2];
        const T02 = m02 * right[0] + m12 * right[1] + m22 * right[2];
        const T03 = txRel * right[0] + tyRel * right[1] + tzRel * right[2];

        const T10 = m00 * up[0] + m10 * up[1] + m20 * up[2];
        const T11 = m01 * up[0] + m11 * up[1] + m21 * up[2];
        const T12 = m02 * up[0] + m12 * up[1] + m22 * up[2];
        const T13 = txRel * up[0] + tyRel * up[1] + tzRel * up[2];

        const T20 = m00 * forward[0] + m10 * forward[1] + m20 * forward[2];
        const T21 = m01 * forward[0] + m11 * forward[1] + m21 * forward[2];
        const T22 = m02 * forward[0] + m12 * forward[1] + m22 * forward[2];
        const T23 = txRel * forward[0] + tyRel * forward[1] + tzRel * forward[2];

        const near = Math.max(EPSILON, Number(camera?.near) || DEFAULT_CAMERA.near);
        const far = Math.max(near + EPSILON, Number(camera?.far) || DEFAULT_CAMERA.far);
        const aspect = this.cols / this.rows;
        const perspective = options.projection !== "orthographic";
        const tanHalfFov = Math.tan(Math.max(0.05, Math.min(Math.PI - 0.05, Number(camera?.fov) || DEFAULT_CAMERA.fov)) * 0.5);
        const orthoScale = Math.max(EPSILON, Number(camera?.orthographicScale) || DEFAULT_CAMERA.orthographicScale);
        const source = mesh.positions;
        const projected = this.projected;
        const world = this.world;
        const visible = this.visible;
        const colsMinus1 = this.cols - 1;
        const rowsMinus1 = this.rows - 1;

        for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
            const offset = vertex * 3;
            const x = source[offset];
            const y = source[offset + 1];
            const z = source[offset + 2];

            const wx = m00 * x + m01 * y + m02 * z + tx;
            const wy = m10 * x + m11 * y + m12 * z + ty;
            const wz = m20 * x + m21 * y + m22 * z + tz;
            world[offset] = wx;
            world[offset + 1] = wy;
            world[offset + 2] = wz;

            const viewX = T00 * x + T01 * y + T02 * z + T03;
            const viewY = T10 * x + T11 * y + T12 * z + T13;
            const viewZ = T20 * x + T21 * y + T22 * z + T23;

            visible[vertex] = viewZ >= near && viewZ <= far ? 1 : 0;
            const divisor = perspective ? viewZ * tanHalfFov : orthoScale;
            const ndcX = viewX / (divisor * aspect);
            const ndcY = viewY / divisor;
            projected[offset] = (ndcX * 0.5 + 0.5) * colsMinus1;
            projected[offset + 1] = (0.5 - ndcY * 0.5) * rowsMinus1;
            projected[offset + 2] = viewZ;
        }
    }

    /**
     * Store one sample into the nearest cell (round-to-nearest) when it is closer than
     * the depth already recorded there — the rasterizer's depth test. Silently
     * discards samples outside the grid or at non-positive depth.
     *
     * @private
     * @param {number} x - projected column coordinate (fractional)
     * @param {number} y - projected row coordinate (fractional)
     * @param {number} depth - view-space depth used for the nearest-wins test
     * @param {number} intensity - lighting intensity to store if this sample wins
     * @returns {void}
     */
    _sample(x, y, depth, intensity) {
        const col = Math.round(x);
        const row = Math.round(y);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows || depth <= 0) return;
        const index = row * this.cols + col;
        if (depth >= this.depth[index]) return;
        this.depth[index] = depth;
        this.intensity[index] = intensity;
        this.occupied[index] = 1;
    }

    /**
     * Draw a depth-interpolated edge between two projected vertices using a
     * cell-space DDA (digital differential analyzer) walk. No-ops if either
     * endpoint failed the near/far visibility test.
     *
     * @private
     * @param {number} a - index of the first vertex
     * @param {number} b - index of the second vertex
     * @param {number} intensity - lighting intensity applied to every sample on the edge
     * @returns {void}
     */
    _line(a, b, intensity) {
        if (!this.visible[a] || !this.visible[b]) return;
        const pa = a * 3;
        const pb = b * 3;
        const x0 = this.projected[pa];
        const y0 = this.projected[pa + 1];
        const z0 = this.projected[pa + 2];
        const dx = this.projected[pb] - x0;
        const dy = this.projected[pb + 1] - y0;
        const dz = this.projected[pb + 2] - z0;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            this._sample(x0 + dx * t, y0 + dy * t, z0 + dz * t, intensity);
        }
    }

    /**
     * Fill one projected triangle using a barycentric-coordinate scanline test over
     * its screen-space bounding box, depth-interpolating each covered cell. No-ops
     * if any vertex failed visibility or the triangle is degenerate (near-zero area).
     *
     * @private
     * @param {number} a - index of the first vertex
     * @param {number} b - index of the second vertex
     * @param {number} c - index of the third vertex
     * @param {number} intensity - flat lighting intensity applied across the face
     * @returns {void}
     */
    _triangle(a, b, c, intensity) {
        if (!this.visible[a] || !this.visible[b] || !this.visible[c]) return;
        const pa = a * 3;
        const pb = b * 3;
        const pc = c * 3;
        const ax = this.projected[pa];
        const ay = this.projected[pa + 1];
        const bx = this.projected[pb];
        const by = this.projected[pb + 1];
        const cx = this.projected[pc];
        const cy = this.projected[pc + 1];
        const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(area) <= EPSILON) return;
        const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
        const maxX = Math.min(this.cols - 1, Math.ceil(Math.max(ax, bx, cx)));
        const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
        const maxY = Math.min(this.rows - 1, Math.ceil(Math.max(ay, by, cy)));
        const za = this.projected[pa + 2];
        const zb = this.projected[pb + 2];
        const zc = this.projected[pc + 2];
        const inverseArea = 1 / area;
        for (let row = minY; row <= maxY; row++) {
            const y = row + 0.5;
            for (let col = minX; col <= maxX; col++) {
                const x = col + 0.5;
                const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) * inverseArea;
                const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) * inverseArea;
                const wc = 1 - wa - wb;
                if (wa < 0 || wb < 0 || wc < 0) continue;
                this._sample(col, row, wa * za + wb * zb + wc * zc, intensity);
            }
        }
    }

    /**
     * Resolve flat (per-face) lighting intensity from transformed world coordinates:
     * the face normal's alignment with the light direction, unsigned (so a face lit
     * from either side reads as lit, rather than going dark from behind).
     *
     * @private
     * @param {number} a - index of the first vertex
     * @param {number} b - index of the second vertex
     * @param {number} c - index of the third vertex
     * @param {number} ambient - flat intensity floor, 0-1
     * @param {number} strength - diffuse contribution multiplier
     * @returns {number} intensity in [0, 1]
     */
    _faceIntensity(a, b, c, ambient, strength) {
        const pa = a * 3;
        const pb = b * 3;
        const pc = c * 3;
        const abx = this.world[pb] - this.world[pa];
        const aby = this.world[pb + 1] - this.world[pa + 1];
        const abz = this.world[pb + 2] - this.world[pa + 2];
        const acx = this.world[pc] - this.world[pa];
        const acy = this.world[pc + 1] - this.world[pa + 1];
        const acz = this.world[pc + 2] - this.world[pa + 2];
        normalize3(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx, this._normal);
        const diffuse = Math.abs(this._normal[0] * this._light[0] + this._normal[1] * this._light[1] + this._normal[2] * this._light[2]);
        return Math.min(1, ambient + diffuse * strength);
    }

    /**
     * Rasterize one frame: projects the mesh, resolves per-face or per-point lighting,
     * and fills the depth/intensity/occupancy buffers. `meshInput` is normalized via
     * {@link normalizeMeshData} automatically if it isn't already (no `vertexCount`).
     *
     * @param {Object} meshInput - a normalized mesh, or raw mesh data to normalize first
     * @param {Object} [options]
     * @param {Object} [options.camera] - see {@link MeshCellRasterizer#_prepareCamera}
     * @param {Object} [options.transform] - see {@link MeshCellRasterizer#_project}
     * @param {"perspective"|"orthographic"} [options.projection] - projection mode
     * @param {"solid"|"wireframe"|"points"} [options.style] - fill style; defaults to `"solid"` for triangle meshes, else the mesh's own primitive
     * @param {Object} [options.light]
     * @param {ArrayLike<number>} [options.light.direction] - light direction, see `DEFAULT_LIGHT`
     * @param {number} [options.light.ambient=0.15] - ambient floor, 0-1
     * @param {number} [options.light.intensity=0.85] - diffuse strength multiplier
     * @param {Object} [options.limits] - forwarded to {@link normalizeMeshData} when `meshInput` needs normalizing
     * @returns {{depth: Float32Array, intensity: Float32Array, occupied: Uint8Array, drawn: number}} stable buffer references (reused across calls — copy out before the next `rasterize()` if retaining) plus the occupied-cell count
     */
    rasterize(meshInput, options = {}) {
        const mesh = meshInput.vertexCount ? meshInput : normalizeMeshData(meshInput, options.limits);
        this.depth.fill(Infinity);
        this.intensity.fill(0);
        this.occupied.fill(0);
        this._project(mesh, options);
        const light = readVector3(options.light?.direction, DEFAULT_LIGHT, this._inputLight);
        normalize3(light[0], light[1], light[2], this._light);
        const ambient = Math.max(0, Math.min(1, Number(options.light?.ambient ?? 0.15)));
        const strength = Math.max(0, Number(options.light?.intensity ?? 0.85));
        const style = options.style ?? (mesh.primitive === "triangles" ? "solid" : mesh.primitive);
        const indices = mesh.indices;
        const count = indices?.length ?? mesh.vertexCount;

        if (mesh.primitive === "points") {
            for (let index = 0; index < count; index++) {
                const vertex = indices ? indices[index] : index;
                if (!this.visible[vertex]) continue;
                const offset = vertex * 3;
                this._sample(this.projected[offset], this.projected[offset + 1], this.projected[offset + 2], 1);
            }
        } else if (mesh.primitive === "lines") {
            for (let index = 0; index < count; index += 2) {
                this._line(indices ? indices[index] : index, indices ? indices[index + 1] : index + 1, 1);
            }
        } else {
            for (let index = 0; index < count; index += 3) {
                const a = indices ? indices[index] : index;
                const b = indices ? indices[index + 1] : index + 1;
                const c = indices ? indices[index + 2] : index + 2;
                const intensity = this._faceIntensity(a, b, c, ambient, strength);
                if (style === "points") {
                    const offsetA = a * 3;
                    const offsetB = b * 3;
                    const offsetC = c * 3;
                    if (this.visible[a]) this._sample(this.projected[offsetA], this.projected[offsetA + 1], this.projected[offsetA + 2], intensity);
                    if (this.visible[b]) this._sample(this.projected[offsetB], this.projected[offsetB + 1], this.projected[offsetB + 2], intensity);
                    if (this.visible[c]) this._sample(this.projected[offsetC], this.projected[offsetC + 1], this.projected[offsetC + 2], intensity);
                } else if (style === "wireframe") {
                    this._line(a, b, intensity);
                    this._line(b, c, intensity);
                    this._line(c, a, intensity);
                } else {
                    this._triangle(a, b, c, intensity);
                }
            }
        }

        let drawn = 0;
        for (let index = 0; index < this.occupied.length; index++) drawn += this.occupied[index];
        this.result.drawn = drawn;
        return this.result;
    }
}
