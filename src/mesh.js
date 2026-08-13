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

/** Copy a finite three-component vector into reusable storage. */
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

/** Normalize one vector into the supplied three-number output array. */
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

/** Generate an indexed cube centered at the origin. */
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

/** Generate an indexed XY plane centered at the origin. */
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

/** Generate an indexed icosphere; subdivision work occurs only during construction. */
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

/** Generate a torus with shared vertices for near-limit benchmark and demo geometry. */
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
 * Rasterize a normalized mesh into reusable cell-resolution depth, intensity, and
 * occupancy buffers. It deliberately does not know about canvas or glyph rendering.
 */
export class MeshCellRasterizer {
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

    /** Resize cell buffers only when the grid dimensions change. */
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

    /** Ensure projected and world-coordinate buffers fit the active vertex count. */
    _ensureVertices(vertexCount) {
        const length = vertexCount * 3;
        if (!this.projected || this.projected.length < length) {
            this.projected = new Float32Array(length);
            this.world = new Float32Array(length);
            this.visible = new Uint8Array(vertexCount);
        }
    }

    /** Build a camera basis once per rasterized frame. */
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

    /** Project every model vertex and retain world coordinates for face lighting. */
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
        const right = this._right;
        const up = this._up;
        const forward = this._forward;
        const cameraPosition = this._cameraPosition;

        for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
            const offset = vertex * 3;
            const sx = source[offset] * scale[0];
            const sy = source[offset + 1] * scale[1];
            const sz = source[offset + 2] * scale[2];
            const rx = sx;
            const ry = sy * cosX - sz * sinX;
            const rz = sy * sinX + sz * cosX;
            const qx = rx * cosY + rz * sinY;
            const qy = ry;
            const qz = -rx * sinY + rz * cosY;
            const wx = qx * cosZ - qy * sinZ + translation[0];
            const wy = qx * sinZ + qy * cosZ + translation[1];
            const wz = qz + translation[2];
            world[offset] = wx;
            world[offset + 1] = wy;
            world[offset + 2] = wz;
            const dx = wx - cameraPosition[0];
            const dy = wy - cameraPosition[1];
            const dz = wz - cameraPosition[2];
            const viewX = dx * right[0] + dy * right[1] + dz * right[2];
            const viewY = dx * up[0] + dy * up[1] + dz * up[2];
            const viewZ = dx * forward[0] + dy * forward[1] + dz * forward[2];
            visible[vertex] = viewZ >= near && viewZ <= far ? 1 : 0;
            const divisor = perspective ? viewZ * tanHalfFov : orthoScale;
            const ndcX = viewX / (divisor * aspect);
            const ndcY = viewY / divisor;
            projected[offset] = (ndcX * 0.5 + 0.5) * (this.cols - 1);
            projected[offset + 1] = (0.5 - ndcY * 0.5) * (this.rows - 1);
            projected[offset + 2] = viewZ;
        }
    }

    /** Store one visible sample when it is nearer than the current cell value. */
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

    /** Draw a depth-interpolated edge with a cell-space DDA. */
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

    /** Fill one projected triangle with barycentric depth interpolation. */
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

    /** Resolve flat face lighting from transformed world coordinates. */
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

    /** Rasterize one frame and return stable buffer references plus occupied count. */
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
