/*! asciiam v0.26.0 | https://gitlab.com/staticcanvas/asciiam#readme | MIT */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).asciiam=e()}(this,function(){"use strict";var t=Object.defineProperty,e=Object.defineProperties,s=Object.getOwnPropertyDescriptors,i=Object.getOwnPropertySymbols,a=Object.prototype.hasOwnProperty,r=Object.prototype.propertyIsEnumerable,n=(e,s,i)=>s in e?t(e,s,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[s]=i,o=(t,e)=>{for(var s in e||(e={}))a.call(e,s)&&n(t,s,e[s]);if(i)for(var s of i(e))r.call(e,s)&&n(t,s,e[s]);return t},h=(t,i)=>e(t,s(i)),l=(t,e,s)=>n(t,"symbol"!=typeof e?e+"":e,s),c=(t,e,s)=>new Promise((i,a)=>{var r=t=>{try{o(s.next(t))}catch(t){a(t)}},n=t=>{try{o(s.throw(t))}catch(t){a(t)}},o=t=>t.done?i(t.value):Promise.resolve(t.value).then(r,n);o((s=s.apply(t,e)).next())});const d=1e-8,u=Object.freeze([0,0,0]),m=Object.freeze([1,1,1]),p=Object.freeze([-.4,.7,1]),_=Object.freeze({position:[0,0,4],target:[0,0,0],up:[0,1,0],fov:Math.PI/3,near:.01,far:100,orthographicScale:2.5});function g(t,e,s){const i=t&&t.length>=3?t:e,a=Number(i[0]),r=Number(i[1]),n=Number(i[2]);return Number.isFinite(a)&&Number.isFinite(r)&&Number.isFinite(n)?(s[0]=a,s[1]=r,s[2]=n):(s[0]=e[0],s[1]=e[1],s[2]=e[2]),s}function f(t,e,s,i){const a=Math.hypot(t,e,s);return a<=d?(i[0]=0,i[1]=0,i[2]=0,i):(i[0]=t/a,i[1]=e/a,i[2]=s/a,i)}function y(t,e={}){var s,i,a,r,n,o,h;if(!t||"object"!=typeof t)throw new TypeError("asciiam: mesh must be an object");const l=t.positions;if(!(l instanceof Float32Array||l instanceof Float64Array))throw new TypeError("asciiam: mesh.positions must be Float32Array or Float64Array");if(l.length<3||l.length%3!=0)throw new RangeError("asciiam: mesh.positions must contain complete XYZ triples");const c=l.length/3,d=Math.max(3,null!=(s=e.maxVertices)?s:1e5);if(c>d)throw new RangeError(`asciiam: mesh exceeds ${d} vertices`);for(let t=0;t<l.length;t++)if(!Number.isFinite(l[t]))throw new TypeError("asciiam: mesh positions must be finite");const u=null!=(i=t.indices)?i:null;if(!(null===u||u instanceof Uint8Array||u instanceof Uint16Array||u instanceof Uint32Array))throw new TypeError("asciiam: mesh.indices must be Uint8Array, Uint16Array, Uint32Array, or null");if(u)for(let t=0;t<u.length;t++)if(u[t]>=c)throw new RangeError("asciiam: mesh index exceeds the vertex count");const m=null!=(a=t.primitive)?a:"triangles";if(!["points","lines","triangles"].includes(m))throw new TypeError('asciiam: mesh.primitive must be "points", "lines", or "triangles"');const p=null!=(r=null==u?void 0:u.length)?r:c,_="triangles"===m?3:"lines"===m?2:1;if(p%_!==0)throw new RangeError(`asciiam: ${m} require complete ${_}-element groups`);const g=p/_,f=Math.max(1,null!=(n=e.maxPrimitives)?n:1e5);if(g>f)throw new RangeError(`asciiam: mesh exceeds ${f} primitives`);const y=null!=(o=t.normals)?o:null;if(!(null===y||y instanceof Float32Array&&y.length===l.length))throw new TypeError("asciiam: mesh.normals must be a Float32Array matching positions");const v=null!=(h=t.colors)?h:null;if(!(null===v||v instanceof Float32Array&&v.length===4*c))throw new TypeError("asciiam: mesh.colors must contain one RGBA Float32 tuple per vertex");return Object.freeze({positions:l,indices:u,normals:y,colors:v,primitive:m,vertexCount:c,primitiveCount:g})}class v{
/**
     * @param {number} cols - initial grid column count
     * @param {number} rows - initial grid row count
     */
constructor(t,e){this._forward=new Float64Array(3),this._right=new Float64Array(3),this._up=new Float64Array(3),this._light=new Float64Array(3),this._normal=new Float64Array(3),this._cameraPosition=new Float64Array(3),this._cameraTarget=new Float64Array(3),this._cameraUp=new Float64Array(3),this._translation=new Float64Array(3),this._rotation=new Float64Array(3),this._scale=new Float64Array(3),this._inputLight=new Float64Array(3),this.result={depth:null,intensity:null,occupied:null,drawn:0},this.resize(t,e)}
/**
     * Resize cell buffers only when the grid dimensions change — a no-op otherwise,
     * safe to call every frame.
     *
     * @param {number} cols - target grid column count (rounded, floored at 1)
     * @param {number} rows - target grid row count (rounded, floored at 1)
     * @returns {void}
     */resize(t,e){const s=Math.max(1,Math.round(t)),i=Math.max(1,Math.round(e));if(this.cols===s&&this.rows===i)return;this.cols=s,this.rows=i;const a=s*i;this.depth=new Float32Array(a),this.intensity=new Float32Array(a),this.occupied=new Uint8Array(a),this.result.depth=this.depth,this.result.intensity=this.intensity,this.result.occupied=this.occupied}
/**
     * Ensure the projected/world-coordinate/visibility buffers fit the active vertex
     * count, growing (never shrinking) them only when needed.
     *
     * @private
     * @param {number} vertexCount - vertex count the buffers must accommodate
     * @returns {void}
     */_ensureVertices(t){const e=3*t;(!this.projected||this.projected.length<e)&&(this.projected=new Float32Array(e),this.world=new Float32Array(e),this.visible=new Uint8Array(t))}
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
     */_prepareCamera(t){const e=g(null==t?void 0:t.position,_.position,this._cameraPosition),s=g(null==t?void 0:t.target,_.target,this._cameraTarget),i=g(null==t?void 0:t.up,_.up,this._cameraUp);f(s[0]-e[0],s[1]-e[1],s[2]-e[2],this._forward),f(this._forward[1]*i[2]-this._forward[2]*i[1],this._forward[2]*i[0]-this._forward[0]*i[2],this._forward[0]*i[1]-this._forward[1]*i[0],this._right),f(this._right[1]*this._forward[2]-this._right[2]*this._forward[1],this._right[2]*this._forward[0]-this._right[0]*this._forward[2],this._right[0]*this._forward[1]-this._right[1]*this._forward[0],this._up)}
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
     */_project(t,e){this._ensureVertices(t.vertexCount);const s=e.camera;this._prepareCamera(s);const i=e.transform||{},a=g(i.position,u,this._translation),r=g(i.rotation,u,this._rotation),n=g(i.scale,m,this._scale),o=Math.sin(r[0]),h=Math.cos(r[0]),l=Math.sin(r[1]),c=Math.cos(r[1]),p=Math.sin(r[2]),f=Math.cos(r[2]),y=n[0],v=n[1],w=n[2],M=a[0],b=a[1],x=a[2],S=c*f*y,C=(o*l*f-h*p)*v,A=(h*l*f+o*p)*w,F=c*p*y,R=(o*l*p+h*f)*v,T=(h*l*p-o*f)*w,O=-l*y,E=o*c*v,I=h*c*w,L=this._right,P=this._up,k=this._forward,q=this._cameraPosition,B=M-q[0],D=b-q[1],G=x-q[2],z=S*L[0]+F*L[1]+O*L[2],U=C*L[0]+R*L[1]+E*L[2],W=A*L[0]+T*L[1]+I*L[2],N=B*L[0]+D*L[1]+G*L[2],j=S*P[0]+F*P[1]+O*P[2],V=C*P[0]+R*P[1]+E*P[2],X=A*P[0]+T*P[1]+I*P[2],$=B*P[0]+D*P[1]+G*P[2],Y=S*k[0]+F*k[1]+O*k[2],H=C*k[0]+R*k[1]+E*k[2],K=A*k[0]+T*k[1]+I*k[2],Q=B*k[0]+D*k[1]+G*k[2],Z=Math.max(d,Number(null==s?void 0:s.near)||_.near),J=Math.max(Z+d,Number(null==s?void 0:s.far)||_.far),tt=this.cols/this.rows,et="orthographic"!==e.projection,st=Math.tan(.5*Math.max(.05,Math.min(Math.PI-.05,Number(null==s?void 0:s.fov)||_.fov))),it=Math.max(d,Number(null==s?void 0:s.orthographicScale)||_.orthographicScale),at=t.positions,rt=this.projected,nt=this.world,ot=this.visible,ht=this.cols-1,lt=this.rows-1;for(let e=0;e<t.vertexCount;e++){const t=3*e,s=at[t],i=at[t+1],a=at[t+2],r=S*s+C*i+A*a+M,n=F*s+R*i+T*a+b,o=O*s+E*i+I*a+x;nt[t]=r,nt[t+1]=n,nt[t+2]=o;const h=z*s+U*i+W*a+N,l=j*s+V*i+X*a+$,c=Y*s+H*i+K*a+Q;ot[e]=c>=Z&&c<=J?1:0;const d=et?c*st:it,u=h/(d*tt),m=l/d;rt[t]=(.5*u+.5)*ht,rt[t+1]=(.5-.5*m)*lt,rt[t+2]=c}}
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
     */_sample(t,e,s,i){const a=Math.round(t),r=Math.round(e);if(a<0||a>=this.cols||r<0||r>=this.rows||s<=0)return;const n=r*this.cols+a;s>=this.depth[n]||(this.depth[n]=s,this.intensity[n]=i,this.occupied[n]=1)}
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
     */_line(t,e,s){if(!this.visible[t]||!this.visible[e])return;const i=3*t,a=3*e,r=this.projected[i],n=this.projected[i+1],o=this.projected[i+2],h=this.projected[a]-r,l=this.projected[a+1]-n,c=this.projected[a+2]-o,d=Math.max(1,Math.ceil(Math.max(Math.abs(h),Math.abs(l))));for(let t=0;t<=d;t++){const e=t/d;this._sample(r+h*e,n+l*e,o+c*e,s)}}
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
     */_triangle(t,e,s,i){if(!this.visible[t]||!this.visible[e]||!this.visible[s])return;const a=3*t,r=3*e,n=3*s,o=this.projected[a],h=this.projected[a+1],l=this.projected[r],c=this.projected[r+1],u=this.projected[n],m=this.projected[n+1],p=(c-m)*(o-u)+(u-l)*(h-m);if(Math.abs(p)<=d)return;const _=Math.max(0,Math.floor(Math.min(o,l,u))),g=Math.min(this.cols-1,Math.ceil(Math.max(o,l,u))),f=Math.max(0,Math.floor(Math.min(h,c,m))),y=Math.min(this.rows-1,Math.ceil(Math.max(h,c,m))),v=this.projected[a+2],w=this.projected[r+2],M=this.projected[n+2],b=1/p;for(let t=f;t<=y;t++){const e=t+.5;for(let s=_;s<=g;s++){const a=s+.5,r=((c-m)*(a-u)+(u-l)*(e-m))*b,n=((m-h)*(a-u)+(o-u)*(e-m))*b,d=1-r-n;r<0||n<0||d<0||this._sample(s,t,r*v+n*w+d*M,i)}}}
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
     */_faceIntensity(t,e,s,i,a){const r=3*t,n=3*e,o=3*s,h=this.world[n]-this.world[r],l=this.world[n+1]-this.world[r+1],c=this.world[n+2]-this.world[r+2],d=this.world[o]-this.world[r],u=this.world[o+1]-this.world[r+1],m=this.world[o+2]-this.world[r+2];f(l*m-c*u,c*d-h*m,h*u-l*d,this._normal);const p=Math.abs(this._normal[0]*this._light[0]+this._normal[1]*this._light[1]+this._normal[2]*this._light[2]);return Math.min(1,i+p*a)}
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
     */rasterize(t,e={}){var s,i,a,r,n,o,h;const l=t.vertexCount?t:y(t,e.limits);this.depth.fill(1/0),this.intensity.fill(0),this.occupied.fill(0),this._project(l,e);const c=g(null==(s=e.light)?void 0:s.direction,p,this._inputLight);f(c[0],c[1],c[2],this._light);const d=Math.max(0,Math.min(1,Number(null!=(a=null==(i=e.light)?void 0:i.ambient)?a:.15))),u=Math.max(0,Number(null!=(n=null==(r=e.light)?void 0:r.intensity)?n:.85)),m=null!=(o=e.style)?o:"triangles"===l.primitive?"solid":l.primitive,_=l.indices,v=null!=(h=null==_?void 0:_.length)?h:l.vertexCount;if("points"===l.primitive)for(let t=0;t<v;t++){const e=_?_[t]:t;if(!this.visible[e])continue;const s=3*e;this._sample(this.projected[s],this.projected[s+1],this.projected[s+2],1)}else if("lines"===l.primitive)for(let t=0;t<v;t+=2)this._line(_?_[t]:t,_?_[t+1]:t+1,1);else for(let t=0;t<v;t+=3){const e=_?_[t]:t,s=_?_[t+1]:t+1,i=_?_[t+2]:t+2,a=this._faceIntensity(e,s,i,d,u);if("points"===m){const t=3*e,r=3*s,n=3*i;this.visible[e]&&this._sample(this.projected[t],this.projected[t+1],this.projected[t+2],a),this.visible[s]&&this._sample(this.projected[r],this.projected[r+1],this.projected[r+2],a),this.visible[i]&&this._sample(this.projected[n],this.projected[n+1],this.projected[n+2],a)}else"wireframe"===m?(this._line(e,s,a),this._line(s,i,a),this._line(i,e,a)):this._triangle(e,s,i,a)}let w=0;for(let t=0;t<this.occupied.length;t++)w+=this.occupied[t];return this.result.drawn=w,this.result}}const w=1179937895,M=Object.freeze({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}),b=Object.freeze({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4});function x(t){if(null==t?void 0:t.aborted)throw new DOMException("The model load was aborted.","AbortError")}function S(t,e,s){if(5120===s)return t.getInt8(e);if(5121===s)return t.getUint8(e);if(5122===s)return t.getInt16(e,!0);if(5123===s)return t.getUint16(e,!0);if(5125===s)return t.getUint32(e,!0);if(5126===s)return t.getFloat32(e,!0);throw new TypeError(`asciiam: unsupported glTF componentType ${s}`)}function C(t,e){return 5120===e?Math.max(t/127,-1):5121===e?t/255:5122===e?Math.max(t/32767,-1):5123===e?t/65535:5125===e?t/4294967295:t}function A(t){const e=t.indexOf(",");if(e<0)throw new TypeError("asciiam: malformed glTF data URI");const s=t.slice(5,e),i=t.slice(e+1);if(s.includes(";base64")){const t=globalThis.atob(i),e=new Uint8Array(t.length);for(let s=0;s<t.length;s++)e[s]=t.charCodeAt(s);return e.buffer}return(new TextEncoder).encode(decodeURIComponent(i)).buffer}function F(t,e,s){return c(this,null,function*(){var i;const a=yield fetch(t,{signal:e});if(!a.ok)throw new Error(`asciiam: model request failed with ${a.status}`);const r=Number(a.headers.get("content-length"))||null;if(!(null==(i=a.body)?void 0:i.getReader)||"function"!=typeof s){const t=yield a.arrayBuffer();return s&&s({loaded:t.byteLength,total:r}),t}const n=a.body.getReader(),o=[];let h=0;for(;;){const{done:t,value:e}=yield n.read();if(t)break;o.push(e),h+=e.byteLength,s({loaded:h,total:r})}const l=new Uint8Array(h);let c=0;for(const t of o)l.set(t,c),c+=t.byteLength;return l.buffer})}function R(t,e,s,i){return c(this,null,function*(){var a,r,n;let l;if(x(s.signal),"string"==typeof t){return F(new URL(t,e||(null==(a=globalThis.document)?void 0:a.baseURI)||(null==(r=globalThis.location)?void 0:r.href)).href,s.signal,t=>{var e;return null==(e=s.onProgress)?void 0:e.call(s,h(o({},t),{buffer:i}))})}if("undefined"!=typeof Blob&&t instanceof Blob)l=yield t.arrayBuffer();else if(t instanceof ArrayBuffer||"[object ArrayBuffer]"===Object.prototype.toString.call(t))l=t;else{if(!ArrayBuffer.isView(t))throw new TypeError(`asciiam: resolveUri returned an unsupported resource for glTF buffer ${i}`);l=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength)}return x(s.signal),null==(n=s.onProgress)||n.call(s,{loaded:l.byteLength,total:l.byteLength,buffer:i}),l})}function T(t){const e=new DataView(t);if(e.byteLength<20||e.getUint32(0,!0)!==w)throw new TypeError("asciiam: invalid GLB header");if(2!==e.getUint32(4,!0))throw new TypeError("asciiam: only GLB version 2 is supported");if(e.getUint32(8,!0)!==e.byteLength)throw new RangeError("asciiam: GLB length does not match its header");let s=12,i=null,a=null;for(;s+8<=e.byteLength;){const r=e.getUint32(s,!0),n=e.getUint32(s+4,!0);if(s+=8,s+r>e.byteLength)throw new RangeError("asciiam: GLB chunk exceeds the container");const o=t.slice(s,s+r);if(1313821514===n&&null===i){const t=new Uint8Array(o);let e=t.length;for(;e&&t[e-1]<=32;)e--;const s=(new TextDecoder).decode(t.subarray(0,e));i=JSON.parse(s)}else 5130562===n&&null===a&&(a=o);s+=r}if(!i)throw new TypeError("asciiam: GLB does not contain a JSON chunk");return{json:i,binary:a}}function O(t,e,s,i=!1){var a,r,n,o;const h=null==(a=t.accessors)?void 0:a[s];if(!h)throw new RangeError(`asciiam: missing glTF accessor ${s}`);const l=M[h.type],c=b[h.componentType];if(!l||!c)throw new TypeError(`asciiam: unsupported accessor ${s}`);const d=h.count*l,u=i?new Uint32Array(d):new Float32Array(d);if(void 0!==h.bufferView){const a=null==(r=t.bufferViews)?void 0:r[h.bufferView];if(!a)throw new RangeError(`asciiam: missing bufferView ${h.bufferView}`);const n=e[a.buffer];if(!n)throw new RangeError(`asciiam: missing buffer ${a.buffer}`);const o=new DataView(n),d=c*l,m=a.byteStride||d;if(m<d)throw new RangeError(`asciiam: accessor ${s} has an invalid stride`);const p=(a.byteOffset||0)+(h.byteOffset||0);for(let t=0;t<h.count;t++){const e=p+t*m;for(let s=0;s<l;s++){const a=S(o,e+s*c,h.componentType);u[t*l+s]=!i&&h.normalized?C(a,h.componentType):a}}}if(h.sparse){const s=h.sparse,a=null==(n=t.bufferViews)?void 0:n[s.indices.bufferView],r=null==(o=t.bufferViews)?void 0:o[s.values.bufferView];if(!a||!r)throw new RangeError("asciiam: sparse accessor references a missing bufferView");const d=new DataView(e[a.buffer]),m=new DataView(e[r.buffer]),p=b[s.indices.componentType];if(![5121,5123,5125].includes(s.indices.componentType))throw new TypeError("asciiam: invalid sparse index component type");const _=(a.byteOffset||0)+(s.indices.byteOffset||0),g=(r.byteOffset||0)+(s.values.byteOffset||0);for(let t=0;t<s.count;t++){const e=S(d,_+t*p,s.indices.componentType);if(e>=h.count)throw new RangeError("asciiam: sparse accessor index exceeds accessor count");for(let s=0;s<l;s++){const a=S(m,g+(t*l+s)*c,h.componentType);u[e*l+s]=!i&&h.normalized?C(a,h.componentType):a}}}return{values:u,components:l}}function E(){return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function I(t,e){const s=new Float32Array(t.length);for(let i=0;i<t.length;i+=3){const a=t[i],r=t[i+1],n=t[i+2];s[i]=e[0]*a+e[4]*r+e[8]*n+e[12],s[i+1]=e[1]*a+e[5]*r+e[9]*n+e[13],s[i+2]=e[2]*a+e[6]*r+e[10]*n+e[14]}return s}function L(t,e){if(!t)return null;const s=e[0],i=e[4],a=e[8],r=e[1],n=e[5],o=e[9],h=e[2],l=e[6],c=e[10],d=s*(n*c-o*l)-i*(r*c-o*h)+a*(r*l-n*h),u=Math.abs(d)>Number.EPSILON?1/d:1,m=(n*c-o*l)*u,p=(o*h-r*c)*u,_=(r*l-n*h)*u,g=(a*l-i*c)*u,f=(s*c-a*h)*u,y=(i*h-s*l)*u,v=(i*o-a*n)*u,w=(a*r-s*o)*u,M=(s*n-i*r)*u,b=new Float32Array(t.length);for(let e=0;e<t.length;e+=3){const s=m*t[e]+p*t[e+1]+_*t[e+2],i=g*t[e]+f*t[e+1]+y*t[e+2],a=v*t[e]+w*t[e+1]+M*t[e+2],r=Math.hypot(s,i,a)||1;b[e]=s/r,b[e+1]=i/r,b[e+2]=a/r}return b}function P(t,e,s){const i=e||Uint32Array.from({length:s},(t,e)=>e);if(void 0===t||4===t)return{primitive:"triangles",indices:i};if(0===t)return{primitive:"points",indices:i};if(1===t)return{primitive:"lines",indices:i};const a=[];if(2===t){for(let t=0;t<i.length;t++)a.push(i[t],i[(t+1)%i.length]);return{primitive:"lines",indices:new Uint32Array(a)}}if(3===t){for(let t=0;t+1<i.length;t++)a.push(i[t],i[t+1]);return{primitive:"lines",indices:new Uint32Array(a)}}if(5===t){for(let t=0;t+2<i.length;t++)t%2?a.push(i[t+1],i[t],i[t+2]):a.push(i[t],i[t+1],i[t+2]);return{primitive:"triangles",indices:new Uint32Array(a)}}if(6===t){for(let t=1;t+1<i.length;t++)a.push(i[0],i[t],i[t+1]);return{primitive:"triangles",indices:new Uint32Array(a)}}throw new TypeError(`asciiam: unsupported glTF primitive mode ${t}`)}function k(t,e,s){var i,a,r,n,o,h,l;const c=null!=(a=null!=(i=s.scene)?i:t.scene)?a:0,d=null==(r=t.scenes)?void 0:r[c];if(!d)throw new RangeError(`asciiam: missing glTF scene ${c}`);const u=[],m=Math.max(3,null!=(o=null==(n=s.limits)?void 0:n.maxVertices)?o:1e5),p=Math.max(1,null!=(l=null==(h=s.limits)?void 0:h.maxPrimitives)?l:1e5);let _=0,g=0;const f=(s,i,a)=>{var r,n,o,h,l,c,d;if(a.has(s))throw new TypeError("asciiam: glTF node hierarchy contains a cycle");const y=null==(r=t.nodes)?void 0:r[s];if(!y)throw new RangeError(`asciiam: missing glTF node ${s}`);const v=new Set(a);v.add(s);const w=function(t,e){const s=new Float64Array(16);for(let i=0;i<4;i++)for(let a=0;a<4;a++)s[4*i+a]=t[a]*e[4*i]+t[4+a]*e[4*i+1]+t[8+a]*e[4*i+2]+t[12+a]*e[4*i+3];return s}(i,function(t){if(t.matrix)return new Float64Array(t.matrix);const e=t.translation||[0,0,0],s=t.rotation||[0,0,0,1],i=t.scale||[1,1,1],a=s[0],r=s[1],n=s[2],o=s[3],h=a+a,l=r+r,c=n+n,d=a*h,u=a*l,m=a*c,p=r*l,_=r*c,g=n*c,f=o*h,y=o*l,v=o*c;return new Float64Array([(1-(p+g))*i[0],(u+v)*i[0],(m-y)*i[0],0,(u-v)*i[1],(1-(d+g))*i[1],(_+f)*i[1],0,(m+y)*i[2],(_-f)*i[2],(1-(d+p))*i[2],0,e[0],e[1],e[2],1])}(y));if(void 0!==y.mesh){const s=null==(n=t.meshes)?void 0:n[y.mesh];if(!s)throw new RangeError(`asciiam: missing glTF mesh ${y.mesh}`);for(const i of s.primitives||[]){const s=null==(o=i.attributes)?void 0:o.POSITION;if(void 0===s)throw new TypeError("asciiam: glTF mesh primitive requires POSITION");const a=null==(h=t.accessors)?void 0:h[s];if(!a||"VEC3"!==a.type)throw new TypeError("asciiam: POSITION must be VEC3");if(_+=a.count,_>m)throw new RangeError(`asciiam: model exceeds ${m} vertices`);const r=void 0===i.indices?a.count:null==(c=null==(l=t.accessors)?void 0:l[i.indices])?void 0:c.count;if(!Number.isInteger(r))throw new RangeError("asciiam: model references a missing index accessor");const n=null!=(d=i.mode)?d:4;if(g+=0===n?r:1===n?r/2:2===n?r:3===n?Math.max(0,r-1):4===n?r/3:Math.max(0,r-2),g>p)throw new RangeError(`asciiam: model exceeds ${p} primitives`);const f=O(t,e,s);if(3!==f.components)throw new TypeError("asciiam: POSITION must be VEC3");const y=void 0===i.attributes.NORMAL?null:O(t,e,i.attributes.NORMAL);if(y&&3!==y.components)throw new TypeError("asciiam: NORMAL must be VEC3");if(y&&y.values.length!==f.values.length)throw new RangeError("asciiam: NORMAL count must match POSITION");const v=void 0===i.attributes.COLOR_0?null:O(t,e,i.attributes.COLOR_0);if(v&&![3,4].includes(v.components))throw new TypeError("asciiam: COLOR_0 must be VEC3 or VEC4");if(v&&v.values.length/v.components!==f.values.length/3)throw new RangeError("asciiam: COLOR_0 count must match POSITION");const M=void 0===i.indices?null:O(t,e,i.indices,!0);if(M&&1!==M.components)throw new TypeError("asciiam: indices accessor must be SCALAR");const b=(null==M?void 0:M.values)||null,x=P(i.mode,b,f.values.length/3);let S=null;if(v){const t=f.values.length/3;S=new Float32Array(4*t);for(let e=0;e<t;e++)S[4*e]=v.values[e*v.components],S[4*e+1]=v.values[e*v.components+1],S[4*e+2]=v.values[e*v.components+2],S[4*e+3]=4===v.components?v.values[4*e+3]:1}u.push({primitive:x.primitive,positions:I(f.values,w),normals:L(null==y?void 0:y.values,w),colors:S,indices:x.indices})}}for(const t of y.children||[])f(t,w,v)};for(const t of d.nodes||[])f(t,E(),new Set);if(!u.length)throw new TypeError("asciiam: glTF scene contains no mesh primitives");const v=u[0].primitive;if(u.some(t=>t.primitive!==v))throw new TypeError("asciiam: mixed point, line, and triangle topologies require separate models");const w=u.reduce((t,e)=>t+e.positions.length/3,0),M=u.reduce((t,e)=>t+e.indices.length,0),b=new Float32Array(3*w),x=u.some(t=>t.normals),S=u.some(t=>t.colors),C=x?new Float32Array(3*w):null,A=S?new Float32Array(4*w):null,F=new(w>65535?Uint32Array:Uint16Array)(M);let R=0,T=0;for(const t of u){const e=t.positions.length/3;if(b.set(t.positions,3*R),C&&t.normals&&C.set(t.normals,3*R),A)if(t.colors)A.set(t.colors,4*R);else for(let t=0;t<e;t++)A.fill(1,4*(R+t),4*(R+t+1));for(let e=0;e<t.indices.length;e++)F[T++]=t.indices[e]+R;R+=e}return y({positions:b,indices:F,normals:C,colors:A,primitive:v},s.limits)}const q=new Map;function B(t){return c(this,arguments,function*(t,e={}){var s,i;let a;x(e.signal);let r=null,n=e.baseUrl||null;if("string"==typeof t){const o=new URL(t,(null==(s=globalThis.document)?void 0:s.baseURI)||(null==(i=globalThis.location)?void 0:i.href)).href,h=yield F(o,e.signal,e.onProgress);n=n||o;const l=new DataView(h);l.byteLength>=4&&l.getUint32(0,!0)===w?({json:a,binary:r}=T(h)):a=JSON.parse((new TextDecoder).decode(h))}else if("undefined"!=typeof Blob&&t instanceof Blob){const s=yield t.arrayBuffer();x(e.signal);const i=new DataView(s);i.byteLength>=4&&i.getUint32(0,!0)===w?({json:a,binary:r}=T(s)):a=JSON.parse((new TextDecoder).decode(s))}else if(t instanceof ArrayBuffer||ArrayBuffer.isView(t)){const e=t instanceof ArrayBuffer?t:t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength),s=new DataView(e);s.byteLength>=4&&s.getUint32(0,!0)===w?({json:a,binary:r}=T(e)):a=JSON.parse((new TextDecoder).decode(e))}else{if(!t||"object"!=typeof t||!t.asset)throw new TypeError("asciiam: model source must be a URL, Blob, byte buffer, or glTF object");a=t}!function(t){var e,s,i;if("2.0"!==(null==(e=t.asset)?void 0:e.version)&&!String((null==(s=t.asset)?void 0:s.minVersion)||"").startsWith("2."))throw new TypeError("asciiam: only glTF 2.x assets are supported");if(null==(i=t.extensionsRequired)?void 0:i.length){const e=t.extensionsRequired.filter(t=>!q.has(t));if(e.length>0)throw new TypeError(`asciiam: unsupported required glTF extensions: ${e.join(", ")}. Register a custom decoder via asciiam.registerGltfDecoder().`)}}(a),x(e.signal);const l=yield function(t,e,s,i){return c(this,null,function*(){const a=t.buffers||[],r=new Array(a.length);for(let t=0;t<a.length;t++){x(i.signal);const n=a[t];let l;if(n.uri)if(n.uri.startsWith("data:"))l=A(n.uri);else{const e="function"==typeof i.resolveUri?yield i.resolveUri(n.uri,{kind:"buffer",index:t,baseUrl:s}):null;if(null!=e)l=yield R(e,s,i,t);else{if(!s)throw new TypeError(`asciiam: glTF buffer ${t} requires a base URL or resolveUri`);const e=new URL(n.uri,s).href;l=yield F(e,i.signal,e=>{var s;return null==(s=i.onProgress)?void 0:s.call(i,h(o({},e),{buffer:t}))})}}else{if(0!==t||!e)throw new TypeError(`asciiam: glTF buffer ${t} has no URI or GLB chunk`);l=e}if(l.byteLength<n.byteLength)throw new RangeError(`asciiam: glTF buffer ${t} is shorter than declared`);r[t]=l}return r})}(a,r,n,e);return k(a,l,e)})}const D=new Set(["matrix","snow","sparkle","fire","starfield","orbit"]),G="▁▂▃▄▅▆▇█";function z(){var t;return!0===globalThis.isSecureContext&&!!(null==(t=globalThis.navigator)?void 0:t.gpu)}function U(t,e,s,i){if(!(e&&i>0))return"";let a="";const r=e<t.length?0:s;for(let s=0;s<e;s++){const e=t[(r+s)%t.length],n=Math.min(7,Math.max(0,Math.round(e/i*7)));a+=G[n]}return a}function W(t,e="monospace",s=14){const i=t&&"function"==typeof t.measureText?t:null;if(i||"string"!=typeof t||(s="number"==typeof e?e:s,e=t),!i){return{charW:Math.ceil(.6*s),charH:Math.ceil(1.2*s),ascent:.8*s,descent:.2*s,baselineOffset:.8*s}}i.font=`${s}px ${e}`;const a=i.measureText("M|g@"),r=i.measureText("M"),n=Math.max(1,r.width);let o=.8*s,h=.2*s;"number"==typeof a.actualBoundingBoxAscent&&"number"==typeof a.actualBoundingBoxDescent&&(a.actualBoundingBoxAscent>0||a.actualBoundingBoxDescent>0)?(o=a.actualBoundingBoxAscent,h=Math.max(0,a.actualBoundingBoxDescent)):"number"==typeof a.fontBoundingBoxAscent&&"number"==typeof a.fontBoundingBoxDescent&&(o=a.fontBoundingBoxAscent,h=a.fontBoundingBoxDescent);return{charW:n,charH:Math.max(1,Math.ceil(o+h)),ascent:o,descent:h,baselineOffset:o}}function N(t={}){var e;const s=Math.max(1,t.cols||80),i=Math.max(1,t.rows||24),a=t.mode||"matrix",r="number"==typeof t.time?t.time:0,n=t.charSet||"ascii-extended",o="string"==typeof n?(null==(e=Y.CHARACTER_SETS)?void 0:e[n])||n:" .:-=+*#%@",h=!!t.invert,l=t.color||"#00ff66";let c=0,d=255,u=102;if("string"==typeof l&&l.startsWith("#")){const t=l.slice(1);3===t.length?(c=parseInt(t[0]+t[0],16)||0,d=parseInt(t[1]+t[1],16)||255,u=parseInt(t[2]+t[2],16)||102):t.length>=6&&(c=parseInt(t.slice(0,2),16)||0,d=parseInt(t.slice(2,4),16)||255,u=parseInt(t.slice(4,6),16)||102)}const m=Math.max(1,o.length),p=[];for(let t=0;t<i;t++){const e=[],n=t/Math.max(1,i-1)*2-1;for(let l=0;l<s;l++){const p=l/Math.max(1,s-1)*2-1;let _=0;if("plasma"===a)_=.5+.5*(Math.sin(4*p+2*r)+Math.cos(4*n+1.5*r)+Math.sin(3*(p+n)+2.5*r))/3;else if("wave"===a)_=.5+.5*Math.sin(5*p+3*r)*Math.cos(5*n+2*r);else if("vortex"===a){const t=Math.atan2(n,p),e=Math.sqrt(p*p+n*n);_=.5+.5*Math.sin(4*t+10*e-4*r)}else if("fire"===a){const e=.5*Math.sin(.4*l+.2*t+5*r)+.5,s=Math.max(0,1-t/i-.3*e);_=Math.min(1,Math.max(0,s))}else if("snow"===a){const e=Math.floor((8*r+3.7*l)%i);_=t===e?.95:t===(e+1)%i?.4:.05}else if("matrix"===a){const e=Math.floor((12*r+5.3*l)%(i+10))-t;_=0===e?1:e>0&&e<8?(8-e)/8:.02}else if("starfield"===a){const t=Math.sqrt(p*p+n*n);_=Math.sin(12*t-6*r)>.8?.9:.05}else if("ripple"===a){const t=Math.sqrt(p*p+n*n);_=.5+.5*Math.sin(16*t-5*r)}else if("sparkle"===a){const e=Math.sin(12.3*l+45.6*t+4*r);_=e>.7?(e-.7)/.3:.05}else if("orbit"===a){const t=Math.atan2(n,p),e=Math.sqrt(p*p+n*n);_=Math.abs(e-.5-.1*Math.sin(3*t+2*r))<.15?.85:.05}else _=.5+.5*Math.sin(2*p+2*n+r);_=Math.max(0,Math.min(1,_)),h&&(_=1-_);const g=o[Math.min(m-1,Math.floor(_*m))]||" ";e.push({char:g,r:Math.round(c*_),g:Math.round(d*_),b:Math.round(u*_),a:_})}p.push(e)}return p}function j(t={}){const e=N(t),s=!!t.ansi;return e.map(t=>s?t.map(t=>`[38;2;${t.r};${t.g};${t.b}m${t.char}[0m`).join(""):t.map(t=>t.char).join("")).join("\n")}class V{
/**
     * @param {HTMLCanvasElement} canvas - canvas to acquire a `webgl2` context from
     * @param {Object} [options]
     * @param {boolean} [options.desynchronized=true] - passed through to `getContext()`'s `desynchronized` hint
     * @param {"high-performance"|"low-power"|"default"} [options.powerPreference="high-performance"] - passed through to `getContext()`
     * @throws {Error} if a WebGL2 context could not be acquired
     */
constructor(t,e={}){if(this.canvas=t,this.gl=t.getContext("webgl2",{alpha:!0,antialias:!1,depth:!1,stencil:!1,desynchronized:!1!==e.desynchronized,powerPreference:e.powerPreference||"high-performance",premultipliedAlpha:!0,preserveDrawingBuffer:!0}),!this.gl)throw new Error("WebGL2 unavailable");this.capacity=4096,this.count=0,this.stride=12,this.instances=new Float32Array(this.capacity*this.stride),this.atlasKey="",this.gradientTextures=new Map,this._initialize()}
/**
     * Compile one shader stage.
     *
     * @private
     * @param {number} type - `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`
     * @param {string} source - GLSL ES 3.00 source
     * @returns {WebGLShader} the compiled shader
     * @throws {Error} if compilation fails
     */_shader(t,e){const s=this.gl,i=s.createShader(t);if(s.shaderSource(i,e),s.compileShader(i),!s.getShaderParameter(i,s.COMPILE_STATUS))throw new Error(s.getShaderInfoLog(i)||"WebGL shader compile failed");return i}
/**
     * Compile and link a vertex/fragment shader pair into a program.
     *
     * @private
     * @param {string} vertex - vertex shader GLSL ES 3.00 source
     * @param {string} fragment - fragment shader GLSL ES 3.00 source
     * @returns {WebGLProgram} the linked program
     * @throws {Error} if either shader fails to compile or the program fails to link
     */_program(t,e){const s=this.gl,i=s.createProgram();if(s.attachShader(i,this._shader(s.VERTEX_SHADER,t)),s.attachShader(i,this._shader(s.FRAGMENT_SHADER,e)),s.linkProgram(i),!s.getProgramParameter(i,s.LINK_STATUS))throw new Error(s.getProgramInfoLog(i)||"WebGL program link failed");return i}
/**
     * Compile the glyph and surface shader programs, set up vertex array objects
     * and buffers (a static unit-quad corner buffer shared by both, and the
     * per-instance rect/uv/color buffer for glyphs), and enable premultiplied-alpha
     * blending. Called once from the constructor.
     *
     * @private
     * @returns {void}
     * @throws {Error} if any shader/program fails to compile or link
     */_initialize(){const t=this.gl;this.program=this._program("#version 300 es\n                in vec2 a_corner;\n                in vec4 a_rect;\n                in vec4 a_uv;\n                in vec4 a_color;\n                uniform vec2 u_viewport;\n                out vec2 v_uv;\n                out vec4 v_color;\n                out vec2 v_position;\n                void main() {\n                    vec2 pixel = a_rect.xy + a_corner * a_rect.zw;\n                    vec2 clip = pixel / u_viewport * 2.0 - 1.0;\n                    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);\n                    v_uv = mix(a_uv.xy, a_uv.zw, a_corner);\n                    v_color = a_color;\n                    v_position = pixel / u_viewport;\n                }","#version 300 es\n                precision mediump float;\n                uniform sampler2D u_atlas;\n                uniform sampler2D u_gradient;\n                uniform bool u_use_gradient;\n                uniform int u_gradient_type;\n                uniform float u_gradient_angle;\n                in vec2 v_uv;\n                in vec4 v_color;\n                in vec2 v_position;\n                out vec4 outColor;\n                void main() {\n                    float mask = texture(u_atlas, v_uv).a;\n                    if (mask < 0.01) discard;\n                    vec4 color = v_color;\n                    if (u_use_gradient) {\n                        vec2 p = v_position - vec2(0.5);\n                        float t;\n                        if (u_gradient_type == 1) t = clamp(length(p) * 1.4142, 0.0, 1.0);\n                        else {\n                            vec2 dir = vec2(cos(u_gradient_angle), sin(u_gradient_angle));\n                            t = clamp(dot(p, dir) + 0.5, 0.0, 1.0);\n                        }\n                        color.rgb = texture(u_gradient, vec2(t, 0.5)).rgb;\n                    }\n                    outColor = vec4(color.rgb * color.a, color.a) * mask;\n                }"),this.surfaceProgram=this._program("#version 300 es\n                in vec2 a_corner;\n                out vec2 v_position;\n                void main() { v_position = a_corner; gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0); }","#version 300 es\n                precision mediump float;\n                uniform sampler2D u_gradient;\n                uniform vec4 u_color;\n                uniform bool u_use_gradient;\n                uniform int u_gradient_type;\n                uniform float u_gradient_angle;\n                in vec2 v_position;\n                out vec4 outColor;\n                void main() {\n                    vec4 color = u_color;\n                    if (u_use_gradient) {\n                        vec2 p = v_position - vec2(0.5);\n                        float t = u_gradient_type == 1 ? clamp(length(p) * 1.4142, 0.0, 1.0)\n                            : clamp(dot(p, vec2(cos(u_gradient_angle), sin(u_gradient_angle))) + 0.5, 0.0, 1.0);\n                        color.rgb = texture(u_gradient, vec2(t, 0.5)).rgb;\n                    }\n                    outColor = vec4(color.rgb * color.a, color.a);\n                }"),this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),this.cornerBuffer=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.cornerBuffer),t.bufferData(t.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),t.STATIC_DRAW);const e=t.getAttribLocation(this.program,"a_corner");t.enableVertexAttribArray(e),t.vertexAttribPointer(e,2,t.FLOAT,!1,0,0),this.instanceBuffer=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.instanceBuffer),t.bufferData(t.ARRAY_BUFFER,this.instances.byteLength,t.DYNAMIC_DRAW),[["a_rect",4,0],["a_uv",4,4],["a_color",4,8]].forEach(([e,s,i])=>{const a=t.getAttribLocation(this.program,e);t.enableVertexAttribArray(a),t.vertexAttribPointer(a,s,t.FLOAT,!1,4*this.stride,4*i),t.vertexAttribDivisor(a,1)}),this.surfaceVao=t.createVertexArray(),t.bindVertexArray(this.surfaceVao),t.bindBuffer(t.ARRAY_BUFFER,this.cornerBuffer);const s=t.getAttribLocation(this.surfaceProgram,"a_corner");t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,0,0),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA)}
/**
     * Update the GL viewport to match the backing canvas size.
     *
     * @param {number} width - drawing-buffer width in device pixels
     * @param {number} height - drawing-buffer height in device pixels
     * @returns {void}
     */resize(t,e){this.gl.viewport(0,0,t,e)}
/**
     * Upload a new glyph atlas texture, replacing the current one. A no-op if
     * `key` already matches the currently-bound atlas (cache-key equality check,
     * not a pixel comparison).
     *
     * @param {CanvasImageSource} source - the atlas canvas/image to upload
     * @param {string} key - opaque cache key identifying this atlas's content
     * @returns {void}
     */setAtlas(t,e){if(e===this.atlasKey)return;const s=this.gl;this.atlasTexture||(this.atlasTexture=s.createTexture()),s.bindTexture(s.TEXTURE_2D,this.atlasTexture),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,s.RGBA,s.UNSIGNED_BYTE,t),this.atlasKey=e}
/**
     * @param {string} key - gradient cache key, see {@link WebGL2GlyphRenderer#setGradient}
     * @returns {boolean} true if a gradient texture is already cached under `key`
     */hasGradient(t){return this.gradientTextures.has(t)}
/**
     * Upload a gradient strip texture, or return the already-cached one for `key`.
     * The cache is capped at 8 entries with FIFO (insertion-order) eviction —
     * least-recently-*inserted*, not least-recently-*used*, to keep this cheap.
     *
     * @param {CanvasImageSource|null} source - a 1D gradient strip (e.g. a 256x1 canvas); ignored if `key` is already cached
     * @param {string} key - opaque cache key identifying this gradient's content (and, for animated gradients, its current time step)
     * @returns {WebGLTexture|null} the gradient texture, or null if `source` was falsy and `key` wasn't already cached
     */setGradient(t,e){if(!t||this.gradientTextures.has(e))return this.gradientTextures.get(e)||null;const s=this.gl,i=s.createTexture();if(s.bindTexture(s.TEXTURE_2D,i),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,s.RGBA,s.UNSIGNED_BYTE,t),this.gradientTextures.set(e,i),this.gradientTextures.size>8){const t=this.gradientTextures.keys().next().value;s.deleteTexture(this.gradientTextures.get(t)),this.gradientTextures.delete(t)}return i}
/**
     * Begin a frame: reset the glyph instance count and either clear the canvas
     * to `clearColor` or preserve its current contents (for the trail-persistence
     * effect, which composites a low-alpha overlay instead of clearing).
     *
     * @param {number[]} clearColor - `[r, g, b, a]` in 0-1, used only when `preserve` is false
     * @param {boolean} [preserve=false] - skip the clear, leaving prior frame content in the color buffer
     * @returns {void}
     */begin(t,e=!1){const s=this.gl;this.count=0,e||(s.clearColor(t[0],t[1],t[2],t[3]),s.clear(s.COLOR_BUFFER_BIT))}
/**
     * Draw one full-viewport flat or gradient-filled quad — used for the trail
     * overlay and the backdrop layer, neither of which involve glyph geometry.
     *
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {{textureKey: string, type?: "linear"|"radial", angle?: number}|null} [gradient] - active gradient, or null for a flat fill
     * @returns {void}
     */surface(t,e=null){const s=this.gl;s.useProgram(this.surfaceProgram),s.bindVertexArray(this.surfaceVao),s.uniform4fv(s.getUniformLocation(this.surfaceProgram,"u_color"),t),this._gradientUniforms(this.surfaceProgram,e),s.drawArrays(s.TRIANGLE_STRIP,0,4)}
/**
     * Append one glyph instance to the pending batch, growing the backing typed
     * array (doubling capacity) if it's full. Instances accumulate here across
     * many calls within a frame and are uploaded together by {@link WebGL2GlyphRenderer#flush}.
     *
     * @param {number} x - destination pixel x (top-left, atlas padding already subtracted by the caller)
     * @param {number} y - destination pixel y (top-left, atlas padding already subtracted by the caller)
     * @param {number} width - destination tile width in pixels
     * @param {number} height - destination tile height in pixels
     * @param {Float32Array} uv - flat atlas UV rect array, 4 floats per tile (`[u0, v0, u1, v1, ...]`)
     * @param {number} uvOffset - index into `uv` where this glyph's 4-float UV rect starts
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {number} opacity - multiplied into the color's alpha channel
     * @returns {void}
     */push(t,e,s,i,a,r,n,o){if(this.count>=this.capacity){this.capacity*=2;const t=new Float32Array(this.capacity*this.stride);t.set(this.instances),this.instances=t}const h=this.count++*this.stride,l=this.instances;l[h]=t,l[h+1]=e,l[h+2]=s,l[h+3]=i,l[h+4]=a[r],l[h+5]=a[r+1],l[h+6]=a[r+2],l[h+7]=a[r+3],l[h+8]=n[0],l[h+9]=n[1],l[h+10]=n[2],l[h+11]=n[3]*o}
/**
     * Bind the active gradient (if any) to a program's `u_use_gradient`/
     * `u_gradient_type`/`u_gradient_angle`/`u_gradient` uniforms. Shared by both
     * the glyph and surface programs.
     *
     * @private
     * @param {WebGLProgram} program - program whose uniforms should be set (must declare the gradient uniform set)
     * @param {{textureKey: string, type?: "linear"|"radial", angle?: number}|null} gradient - active gradient, or null to disable it for this draw
     * @returns {void}
     */_gradientUniforms(t,e){const s=this.gl,i=e?this.gradientTextures.get(e.textureKey):null,a=!!i;s.uniform1i(s.getUniformLocation(t,"u_use_gradient"),a?1:0),s.uniform1i(s.getUniformLocation(t,"u_gradient_type"),"radial"===(null==e?void 0:e.type)?1:0),s.uniform1f(s.getUniformLocation(t,"u_gradient_angle"),((null==e?void 0:e.angle)||0)*Math.PI/180),a&&(s.activeTexture(s.TEXTURE1),s.bindTexture(s.TEXTURE_2D,i),s.uniform1i(s.getUniformLocation(t,"u_gradient"),1))}
/**
     * Upload the accumulated glyph instance batch and draw it in one instanced
     * call. A no-op if nothing was pushed this frame.
     *
     * @param {number} width - viewport width in device pixels, for NDC conversion in the shader
     * @param {number} height - viewport height in device pixels, for NDC conversion in the shader
     * @param {{textureKey: string, type?: "linear"|"radial", angle?: number}|null} [gradient] - active gradient applied uniformly to every glyph in the batch, or null
     * @returns {void}
     */flush(t,e,s=null){if(!this.count)return;const i=this.gl;i.useProgram(this.program),i.bindVertexArray(this.vao),i.bindBuffer(i.ARRAY_BUFFER,this.instanceBuffer),this.instances.byteLength>i.getBufferParameter(i.ARRAY_BUFFER,i.BUFFER_SIZE)&&i.bufferData(i.ARRAY_BUFFER,this.instances.byteLength,i.DYNAMIC_DRAW),i.bufferSubData(i.ARRAY_BUFFER,0,this.instances.subarray(0,this.count*this.stride)),i.uniform2f(i.getUniformLocation(this.program,"u_viewport"),t,e),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.atlasTexture),i.uniform1i(i.getUniformLocation(this.program,"u_atlas"),0),this._gradientUniforms(this.program,s),i.drawArraysInstanced(i.TRIANGLE_STRIP,0,4,this.count)}
/**
     * Reads adapter strings once, only for explicitly enabled diagnostics
     * (`showStats`/`extendedStats`); caches the result for subsequent calls since
     * `WEBGL_debug_renderer_info` queries are not free and the answer can't change
     * mid-session. Falls back to generic `VENDOR`/`RENDERER` parameters, then to
     * placeholder strings, if the debug extension or query itself is unavailable
     * (privacy controls commonly reject `WEBGL_debug_renderer_info`).
     *
     * @returns {{vendor: string, renderer: string}} best-effort adapter description
     */getAdapterInfo(){var t;if(this._adapterInfo)return this._adapterInfo;const e=this.gl;let s="unavailable",i="WebGL2";try{const a=null==(t=e.getExtension)?void 0:t.call(e,"WEBGL_debug_renderer_info");a?(s=String(e.getParameter(a.UNMASKED_VENDOR_WEBGL)||s),i=String(e.getParameter(a.UNMASKED_RENDERER_WEBGL)||i)):"function"==typeof e.getParameter&&(s=String(e.getParameter(e.VENDOR)||s),i=String(e.getParameter(e.RENDERER)||i))}catch(t){}return this._adapterInfo={vendor:s,renderer:i},this._adapterInfo}
/**
     * Release every GPU resource this renderer owns (atlas texture, gradient
     * textures, buffers, shader programs). Does not lose the WebGL context itself.
     *
     * @returns {void}
     */destroy(){const t=this.gl;this.atlasTexture&&t.deleteTexture(this.atlasTexture),this.gradientTextures.forEach(e=>t.deleteTexture(e)),this.gradientTextures.clear(),[this.cornerBuffer,this.instanceBuffer].forEach(e=>{e&&t.deleteBuffer(e)}),[this.program,this.surfaceProgram].forEach(e=>{e&&t.deleteProgram(e)})}}class X{
/**
     * @param {HTMLCanvasElement} canvas - canvas to acquire a `webgpu` context from
     * @param {Object} [options]
     * @param {"high-performance"|"low-power"|"default"} [options.powerPreference="high-performance"] - forwarded to `requestAdapter()`
     */
constructor(t,e={}){this.canvas=t,this.capacity=4096,this.count=0,this.stride=12,this.instances=new Float32Array(this.capacity*this.stride),this.atlasKey="",this.gradientSources=new Map,this.gradientViews=new Map,this.bindGroups=new Map,this.uniformValues=new Float32Array(12),this._uniformSlots=[],this._uniformSlotIndex=0,this.ready=this._initialize(e)}
/**
     * Acquire a GPU adapter/device and configure the canvas context. Sets
     * `this.device`/`this.adapter`/`this.context`/`this.format` and builds the
     * render pipelines on success. Assigned to `this.ready` by the constructor;
     * callers await that rather than calling this directly.
     *
     * @private
     * @async
     * @param {Object} options - see constructor options
     * @returns {Promise<WebGPUGlyphRenderer>} resolves to `this` once ready to draw
     * @throws {Error} if not in a secure context, no adapter/device/context is available
     */_initialize(t){return c(this,null,function*(){var e;if(!globalThis.isSecureContext||!(null==(e=globalThis.navigator)?void 0:e.gpu))throw new Error("WebGPU unavailable: secure context or navigator.gpu missing");const s=yield globalThis.navigator.gpu.requestAdapter({powerPreference:t.powerPreference||"high-performance"});if(!s)throw new Error("WebGPU unavailable: no adapter");const i=yield s.requestDevice(),a=this.canvas.getContext("webgpu");if(!a)throw new Error("WebGPU canvas context unavailable");return this.adapter=s,this.device=i,this.context=a,this.format=globalThis.navigator.gpu.getPreferredCanvasFormat(),this.context.configure({device:i,format:this.format,alphaMode:"premultiplied"}),this._buildPipelines(),i.lost.then(t=>{!this._destroyed&&this.onDeviceLost&&this.onDeviceLost((null==t?void 0:t.reason)||"device-lost")}),this._resizePending=!0,this})}
/**
     * Compile the shared WGSL shader module, build the glyph and surface render
     * pipelines (premultiplied-alpha "one, one-minus-src-alpha" blending, matching
     * the WebGL2 backend), and allocate the static corner/instance/sampler/1x1
     * fallback-texture GPU resources. Called once from {@link WebGPUGlyphRenderer#_initialize}.
     *
     * @private
     * @returns {void}
     */_buildPipelines(){const t=this.device,e=t.createShaderModule({code:"\n                struct Uniforms { viewport: vec2f, color: vec4f, useGradient: f32 };\n                @group(0) @binding(0) var<uniform> uniforms: Uniforms;\n                @group(0) @binding(1) var atlas: texture_2d<f32>;\n                @group(0) @binding(2) var atlasSampler: sampler;\n                @group(0) @binding(3) var gradient: texture_2d<f32>;\n                @group(0) @binding(4) var gradientSampler: sampler;\n\n                struct VertexInput {\n                    @location(0) corner: vec2f,\n                    @location(1) rect: vec4f,\n                    @location(2) uv: vec4f,\n                    @location(3) cellColor: vec4f,\n                };\n                struct VertexOutput {\n                    @builtin(position) position: vec4f,\n                    @location(0) uv: vec2f,\n                    @location(1) color: vec4f,\n                    @location(2) screen: vec2f,\n                };\n\n                @vertex fn glyphVertex(input: VertexInput) -> VertexOutput {\n                    var out: VertexOutput;\n                    let pixel = input.rect.xy + input.corner * input.rect.zw;\n                    let clip = pixel / uniforms.viewport * 2.0 - 1.0;\n                    out.position = vec4f(clip.x, -clip.y, 0.0, 1.0);\n                    out.uv = mix(input.uv.xy, input.uv.zw, input.corner);\n                    out.color = input.cellColor;\n                    out.screen = pixel / uniforms.viewport;\n                    return out;\n                }\n\n                @fragment fn glyphFragment(input: VertexOutput) -> @location(0) vec4f {\n                    let mask = textureSample(atlas, atlasSampler, input.uv).a;\n                    if (mask < 0.01) { discard; }\n                    var color = input.color;\n                    if (uniforms.useGradient > 0.5) {\n                        let t = clamp(input.screen.x, 0.0, 1.0);\n                        color = vec4f(textureSample(gradient, gradientSampler, vec2f(t, 0.5)).rgb, color.a);\n                    }\n                    return vec4f(color.rgb * color.a, color.a) * mask;\n                }\n\n                @vertex fn surfaceVertex(@location(0) corner: vec2f) -> @builtin(position) vec4f {\n                    return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);\n                }\n                @fragment fn surfaceFragment() -> @location(0) vec4f {\n                    let color = uniforms.color;\n                    return vec4f(color.rgb * color.a, color.a);\n                }\n            "}),s={color:{srcFactor:"one",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}};this.glyphPipeline=t.createRenderPipeline({layout:"auto",vertex:{module:e,entryPoint:"glyphVertex",buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}]},{arrayStride:4*this.stride,stepMode:"instance",attributes:[{shaderLocation:1,offset:0,format:"float32x4"},{shaderLocation:2,offset:16,format:"float32x4"},{shaderLocation:3,offset:32,format:"float32x4"}]}]},fragment:{module:e,entryPoint:"glyphFragment",targets:[{format:this.format,blend:s}]},primitive:{topology:"triangle-strip"}}),this.surfacePipeline=t.createRenderPipeline({layout:"auto",vertex:{module:e,entryPoint:"surfaceVertex",buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}]}]},fragment:{module:e,entryPoint:"surfaceFragment",targets:[{format:this.format,blend:s}]},primitive:{topology:"triangle-strip"}});const i=globalThis.GPUBufferUsage,a=globalThis.GPUTextureUsage;this.cornerBuffer=t.createBuffer({size:32,usage:i.VERTEX|i.COPY_DST}),t.queue.writeBuffer(this.cornerBuffer,0,new Float32Array([0,0,1,0,0,1,1,1])),this.instanceBuffer=t.createBuffer({size:this.instances.byteLength,usage:i.VERTEX|i.COPY_DST}),this.sampler=t.createSampler({minFilter:"linear",magFilter:"linear"}),this.gradientSampler=t.createSampler({minFilter:"linear",magFilter:"linear"}),this._emptyTexture=t.createTexture({size:[1,1],format:"rgba8unorm",usage:a.TEXTURE_BINDING|a.COPY_DST}),t.queue.writeTexture({texture:this._emptyTexture},new Uint8Array([255,255,255,255]),{bytesPerRow:4},[1,1])}
/**
     * Record the target presentation size. A no-op while the device isn't ready
     * yet — {@link WebGPUGlyphRenderer#_initialize} sets `_resizePending` in that
     * case so the caller can detect a resize is still owed once it settles.
     *
     * @param {number} width - drawing-buffer width in device pixels
     * @param {number} height - drawing-buffer height in device pixels
     * @returns {void}
     */resize(t,e){this.device&&(this.width=t,this.height=e,this._resizePending=!1)}
/**
     * Upload a new glyph atlas texture, replacing the current one, and clear the
     * bind-group cache (every cached glyph bind group referenced the old atlas
     * view). A no-op while the device isn't ready, or if `key` already matches the
     * currently-bound atlas.
     *
     * @param {CanvasImageSource} source - the atlas canvas/image to upload
     * @param {string} key - opaque cache key identifying this atlas's content
     * @returns {void}
     */setAtlas(t,e){var s;if(!this.device||e===this.atlasKey)return;null==(s=this.atlasTexture)||s.destroy();const i=globalThis.GPUTextureUsage;this.atlasTexture=this.device.createTexture({size:[t.width,t.height],format:"rgba8unorm",usage:i.TEXTURE_BINDING|i.COPY_DST|i.RENDER_ATTACHMENT}),this.device.queue.copyExternalImageToTexture({source:t},{texture:this.atlasTexture},[t.width,t.height]),this.atlasKey=e,this.atlasView=this.atlasTexture.createView(),this.bindGroups.clear()}
/**
     * @param {string} key - gradient cache key, see {@link WebGPUGlyphRenderer#setGradient}
     * @returns {boolean} true if a gradient texture is already cached under `key`
     */hasGradient(t){return this.gradientSources.has(t)}
/**
     * Upload a gradient strip texture, or reuse the already-cached one for `key`.
     * The texture (and its matching view) cache is capped at 8 entries with FIFO
     * eviction; the bind-group cache is only invalidated when an eviction actually
     * happens here, not on every new key — an animated gradient (a new key roughly
     * every 50ms) would otherwise defeat WebGPU bind-group caching for the whole
     * scene on every frame.
     *
     * @param {CanvasImageSource|null} source - a 1D gradient strip (e.g. a 256x1 canvas); ignored if `key` is already cached or the device isn't ready
     * @param {string} key - opaque cache key identifying this gradient's content (and, for animated gradients, its current time step)
     * @returns {void}
     */setGradient(t,e){var s;if(!this.device||!t||this.gradientSources.has(e))return;const i=globalThis.GPUTextureUsage,a=this.device.createTexture({size:[t.width,t.height],format:"rgba8unorm",usage:i.TEXTURE_BINDING|i.COPY_DST|i.RENDER_ATTACHMENT});if(this.device.queue.copyExternalImageToTexture({source:t},{texture:a},[t.width,t.height]),this.gradientSources.set(e,a),this.gradientViews.set(e,a.createView()),this.gradientSources.size>8){const t=this.gradientSources.keys().next().value;null==(s=this.gradientSources.get(t))||s.destroy(),this.gradientSources.delete(t),this.gradientViews.delete(t),this.bindGroups.clear()}}
/**
     * Begin a frame: reset the glyph instance count and uniform-slot pool index,
     * open a command encoder and render pass, and either clear the canvas to
     * `clearColor` or preserve its current contents (for the trail-persistence
     * effect). A no-op while the device isn't ready.
     *
     * @param {number[]} clearColor - `[r, g, b, a]` in 0-1, used only when `preserve` is false
     * @param {boolean} [preserve=false] - skip the clear, leaving prior frame content (`loadOp: "load"` instead of `"clear"`)
     * @returns {void}
     */begin(t,e=!1){this.device&&(this.count=0,this._uniformSlotIndex=0,this.encoder=this.device.createCommandEncoder(),this.pass=this.encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:t[0],g:t[1],b:t[2],a:t[3]},loadOp:e?"load":"clear",storeOp:"store"}]}))}
/**
     * Returns a distinct `{ buffer }` for each draw call within one frame (index
     * reset by {@link WebGPUGlyphRenderer#begin}/{@link WebGPUGlyphRenderer#_beginLoadedPass}),
     * growing the pool lazily and reusing it across frames. Every draw recorded
     * before `queue.submit()` must read its *own* uniform buffer —
     * `writeBuffer()` calls made before `submit()` all land before any of that
     * submission's draws execute, so draws that shared one buffer would all read
     * whichever draw's uniforms were written *last*, not their own (this is how the
     * trail/backdrop "surface" quads used to render solid white: `flush()`'s own,
     * unrelated glyph-pipeline uniform write of `[1,1,1,1]` always happened last).
     *
     * @private
     * @returns {{buffer: GPUBuffer}} the next pooled uniform slot for this frame
     */_acquireUniformSlot(){let t=this._uniformSlots[this._uniformSlotIndex];if(!t){const e=globalThis.GPUBufferUsage;t={buffer:this.device.createBuffer({size:48,usage:e.UNIFORM|e.COPY_DST})},this._uniformSlots[this._uniformSlotIndex]=t}return this._uniformSlotIndex++,t}
/**
     * Write one draw call's uniform values (viewport, color, gradient flag) into a
     * pooled slot's buffer. WGSL struct layout: `viewport` (vec2f, offset 0) is
     * padded to 16 bytes so `color` (vec4f) can start at its required 16-byte
     * alignment (offset 4 in float units), and the struct itself rounds up to a
     * 16-byte multiple (48 bytes / 12 floats) to hold trailing `useGradient` (f32,
     * offset 8).
     *
     * @private
     * @param {{buffer: GPUBuffer}} slot - target slot, see {@link WebGPUGlyphRenderer#_acquireUniformSlot}
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {boolean} [useGradient=false] - whether the shader should sample the bound gradient texture instead of using `color` directly
     * @returns {void}
     */_uniforms(t,e,s=!1){const i=this.uniformValues;i[0]=this.width||1,i[1]=this.height||1,i[4]=e[0],i[5]=e[1],i[6]=e[2],i[7]=e[3],i[8]=s?1:0,this.device.queue.writeBuffer(t.buffer,0,i)}
/**
     * Write `slot`'s uniforms, then return a bind group referencing it — cached
     * per (uniform-slot ordinal position, pipeline, gradient key) so a repeat draw
     * shape within a frame doesn't re-create a `GPUBindGroup` every time.
     *
     * @private
     * @param {{buffer: GPUBuffer}} slot - target slot, see {@link WebGPUGlyphRenderer#_acquireUniformSlot}
     * @param {GPURenderPipeline} pipeline - `this.glyphPipeline` or `this.surfacePipeline`; determines which bind group layout/entries are built
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {boolean} [useGradient=false] - whether the shader should sample the bound gradient texture instead of using `color` directly
     * @returns {GPUBindGroup} the bind group for this draw
     */_bindGroup(t,e,s,i=!1){this._uniforms(t,s,i);const a=`${this._uniformSlotIndex}:${e===this.glyphPipeline?`glyph:${this._gradientKey||"none"}`:"surface"}`,r=this.bindGroups.get(a);if(r)return r;const n=[{binding:0,resource:{buffer:t.buffer}}];e===this.glyphPipeline&&n.push({binding:1,resource:this.atlasView||this._emptyTexture.createView()},{binding:2,resource:this.sampler},{binding:3,resource:this.gradientViews.get(this._gradientKey)||this._emptyTexture.createView()},{binding:4,resource:this.gradientSampler});const o=this.device.createBindGroup({layout:e.getBindGroupLayout(0),entries:n});return this.bindGroups.set(a,o),o}
/**
     * Draw one full-viewport flat or gradient-filled quad — used for the trail
     * overlay and the backdrop layer. If no pass is already open (called outside
     * a `begin()`/`flush()` bracket), opens a self-contained load-preserving pass
     * and submits it immediately afterward; otherwise draws into the currently
     * open pass, leaving submission to the caller.
     *
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {{textureKey: string, type?: "linear"|"radial", angle?: number}|null} [gradient] - active gradient, or null for a flat fill
     * @returns {void}
     */surface(t,e=null){if(!this.device)return;const s=!this.pass;s&&this._beginLoadedPass(),this._gradientKey=(null==e?void 0:e.textureKey)||"";const i=this._acquireUniformSlot();this.pass.setPipeline(this.surfacePipeline),this.pass.setBindGroup(0,this._bindGroup(i,this.surfacePipeline,t,!!this._gradientKey)),this.pass.setVertexBuffer(0,this.cornerBuffer),this.pass.draw(4),s&&(this.pass.end(),this.device.queue.submit([this.encoder.finish()]),this.pass=null)}
/**
     * Open a render pass that preserves existing canvas content (`loadOp: "load"`)
     * instead of clearing it — used by {@link WebGPUGlyphRenderer#surface} when
     * called outside a `begin()`/`flush()` bracket.
     *
     * @private
     * @returns {void}
     */_beginLoadedPass(){this._uniformSlotIndex=0,this.encoder=this.device.createCommandEncoder(),this.pass=this.encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:"load",storeOp:"store"}]})}
/**
     * Append one glyph instance to the pending batch, growing the backing typed
     * array and re-creating the GPU instance buffer (doubling capacity) if full.
     * Instances accumulate here across many calls within a frame and are uploaded
     * together by {@link WebGPUGlyphRenderer#flush}.
     *
     * @param {number} x - destination pixel x (top-left, atlas padding already subtracted by the caller)
     * @param {number} y - destination pixel y (top-left, atlas padding already subtracted by the caller)
     * @param {number} width - destination tile width in pixels
     * @param {number} height - destination tile height in pixels
     * @param {Float32Array} uv - flat atlas UV rect array, 4 floats per tile (`[u0, v0, u1, v1, ...]`)
     * @param {number} uvOffset - index into `uv` where this glyph's 4-float UV rect starts
     * @param {number[]} color - `[r, g, b, a]` in 0-1
     * @param {number} opacity - multiplied into the color's alpha channel
     * @returns {void}
     */push(t,e,s,i,a,r,n,o){if(this.count>=this.capacity){this.capacity*=2,this.instances=new Float32Array(this.capacity*this.stride),this.instanceBuffer.destroy();const t=globalThis.GPUBufferUsage;this.instanceBuffer=this.device.createBuffer({size:this.instances.byteLength,usage:t.VERTEX|t.COPY_DST})}const h=this.count++*this.stride,l=this.instances;l[h]=t,l[h+1]=e,l[h+2]=s,l[h+3]=i,l[h+4]=a[r],l[h+5]=a[r+1],l[h+6]=a[r+2],l[h+7]=a[r+3],l[h+8]=n[0],l[h+9]=n[1],l[h+10]=n[2],l[h+11]=n[3]*o}
/**
     * Upload the accumulated glyph instance batch (if any and if an atlas is
     * bound), draw it, then end and submit the render pass opened by
     * {@link WebGPUGlyphRenderer#begin}. The `color` uniform passed to the glyph
     * pipeline (`[1,1,1,1]`) is an inert placeholder — `glyphFragment` reads
     * per-instance color from the vertex buffer, not `uniforms.color`.
     *
     * @param {number} width - viewport width in device pixels, stored for the next frame's uniform writes
     * @param {number} height - viewport height in device pixels, stored for the next frame's uniform writes
     * @param {{textureKey: string, type?: "linear"|"radial", angle?: number}|null} [gradient] - active gradient applied uniformly to every glyph in the batch, or null
     * @returns {void}
     */flush(t,e,s=null){if(this.device&&this.pass){if(this.width=t,this.height=e,this.count&&this.atlasTexture){this.device.queue.writeBuffer(this.instanceBuffer,0,this.instances.subarray(0,this.count*this.stride)),this._gradientKey=(null==s?void 0:s.textureKey)||"";const t=this._acquireUniformSlot();this.pass.setPipeline(this.glyphPipeline),this.pass.setBindGroup(0,this._bindGroup(t,this.glyphPipeline,[1,1,1,1],!!this._gradientKey)),this.pass.setVertexBuffer(0,this.cornerBuffer),this.pass.setVertexBuffer(1,this.instanceBuffer),this.pass.draw(4,this.count)}this.pass.end(),this.device.queue.submit([this.encoder.finish()]),this.pass=null}}
/**
     * @returns {{vendor: string, renderer: string}} best-effort adapter description from `GPUAdapter.info` (falls back to placeholder strings if unavailable — `info` is not supported by every browser)
     */getAdapterInfo(){var t,e,s,i;return{vendor:"WebGPU",renderer:(null==(e=null==(t=this.adapter)?void 0:t.info)?void 0:e.description)||(null==(i=null==(s=this.adapter)?void 0:s.info)?void 0:i.device)||"available"}}
/**
     * Release every GPU resource this renderer owns (atlas texture, gradient
     * textures, pooled uniform buffers, instance/corner/fallback buffers/textures)
     * and the device itself. Safe to call even if `_initialize()` never completed
     * (e.g. adapter acquisition failed) — every field it touches is initialized in
     * the constructor.
     *
     * @returns {void}
     */destroy(){var t,e,s;this._destroyed=!0,null==(t=this.atlasTexture)||t.destroy(),this.gradientSources.forEach(t=>t.destroy()),this.gradientSources.clear(),this.gradientViews.clear(),this.bindGroups.clear(),this._uniformSlots.forEach(t=>{var e,s;return null==(s=null==(e=t.buffer)?void 0:e.destroy)?void 0:s.call(e)}),this._uniformSlots=[],[this.cornerBuffer,this.instanceBuffer,this._emptyTexture].forEach(t=>{var e;return null==(e=null==t?void 0:t.destroy)?void 0:e.call(t)}),this.pass&&this.pass.end(),this.pass=null,null==(s=null==(e=this.device)?void 0:e.destroy)||s.call(e)}}const $=class t{
/**
     * Ensures all running instances are served by one shared `requestAnimationFrame`
     * callback rather than one RAF loop per instance. A no-op if a frame is already
     * scheduled or no instance is currently running.
     *
     * @private
     * @static
     * @returns {void}
     */
static _scheduleFrame(){null===t._schedulerRaf&&t._activeInstances.size&&(t._schedulerRaf=requestAnimationFrame(t._tickFrame))}
/**
     * The shared scheduler's `requestAnimationFrame` callback: advances every
     * active instance for this tick, then reschedules the next shared frame.
     *
     * @private
     * @static
     * @param {DOMHighResTimeStamp} t - timestamp supplied by `requestAnimationFrame`
     * @returns {void}
     */static _tickFrame(e){t._schedulerRaf=null;for(const s of t._activeInstances)s._runFrame(e);t._scheduleFrame()}
/**
     * Registers a process-wide named cell callback usable as `mode: name` on any
     * instance — the plugin-mode registration mechanism.
     *
     * @static
     * @param {string} name - mode name to register, referenced later via `mode`/`setMode()`
     * @param {(api: Object) => ({char: string, opacity?: number, intensity?: number, bold?: boolean, color?: string|null}|null)} fn - per-cell callback; receives the same `api` shape as `customCell`
     * @returns {void}
     *
     * @example
     * asciiam.registerMode('checkerboard', (api) => ({
     *   char: (api.col + api.row) % 2 === 0 ? '#' : ' ',
     *   opacity: 1,
     * }));
     */static registerMode(e,s){t._registry[e]=s}
/**
     * Create dependency-free procedural geometry suitable for `setMesh()`.
     *
     * @static
     * @param {"cube"|"plane"|"icosphere"|"torus"} name - primitive to generate
     * @param {Object} [options] - forwarded to the matching `create*Mesh()` helper in mesh.js
     * @returns {Readonly<Object>} normalized mesh, see `normalizeMeshData` in mesh.js
     * @throws {TypeError} if `name` is not a recognized primitive
     *
     * @example
     * anim.setMesh(asciiam.createMeshPrimitive('torus', { majorSegments: 64 }));
     */static createMeshPrimitive(t,e){if("cube"===t)return function(t=2){const e=.5*Math.max(d,Number(t)||2);return y({positions:new Float32Array([-e,-e,-e,e,-e,-e,e,e,-e,-e,e,-e,-e,-e,e,e,-e,e,e,e,e,-e,e,e]),indices:new Uint16Array([0,2,1,0,3,2,4,5,6,4,6,7,0,4,7,0,7,3,1,2,6,1,6,5,3,7,6,3,6,2,0,1,5,0,5,4])})}(null==e?void 0:e.size);if("plane"===t)return function(t={}){var e,s,i,a;const r=Math.max(d,Number(null!=(e=t.width)?e:2)),n=Math.max(d,Number(null!=(s=t.height)?s:2)),o=Math.max(1,Math.min(256,Math.round(null!=(i=t.columns)?i:1))),h=Math.max(1,Math.min(256,Math.round(null!=(a=t.rows)?a:1))),l=o+1,c=l*(h+1),u=new Float32Array(3*c),m=new(c>65535?Uint32Array:Uint16Array)(o*h*6);let p=0;for(let t=0;t<=h;t++){const e=(t/h-.5)*n;for(let t=0;t<=o;t++)u[p++]=(t/o-.5)*r,u[p++]=e,u[p++]=0}let _=0;for(let t=0;t<h;t++)for(let e=0;e<o;e++){const s=t*l+e,i=s+1,a=(t+1)*l+e,r=a+1;m[_++]=s,m[_++]=i,m[_++]=r,m[_++]=s,m[_++]=r,m[_++]=a}return y({positions:u,indices:m})}(e);if("icosphere"===t)return function(t={}){var e,s;const i=Math.max(d,Number(null!=(e=t.radius)?e:1)),a=Math.max(0,Math.min(5,Math.round(null!=(s=t.subdivisions)?s:2))),r=(1+Math.sqrt(5))/2,n=[[-1,r,0],[1,r,0],[-1,-r,0],[1,-r,0],[0,-1,r],[0,1,r],[0,-1,-r],[0,1,-r],[r,0,-1],[r,0,1],[-r,0,-1],[-r,0,1]];let o=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];for(let t=0;t<a;t++){const t=new Map,e=(e,s)=>{const i=`${Math.min(e,s)}:${Math.max(e,s)}`,a=t.get(i);if(void 0!==a)return a;const r=n[e],o=n[s],h=n.length;return n.push([.5*(r[0]+o[0]),.5*(r[1]+o[1]),.5*(r[2]+o[2])]),t.set(i,h),h},s=[];for(let t=0;t<o.length;t+=3){const i=o[t],a=o[t+1],r=o[t+2],n=e(i,a),h=e(a,r),l=e(r,i);s.push(i,n,l,a,h,n,r,l,h,n,h,l)}o=s}const h=new Float32Array(3*n.length);for(let t=0;t<n.length;t++){const e=n[t],s=Math.hypot(e[0],e[1],e[2])||1;h[3*t]=e[0]/s*i,h[3*t+1]=e[1]/s*i,h[3*t+2]=e[2]/s*i}return y({positions:h,indices:new(n.length>65535?Uint32Array:Uint16Array)(o)})}(e);if("torus"===t)return function(t={}){var e,s,i,a;const r=Math.max(3,Math.min(512,Math.round(null!=(e=t.majorSegments)?e:48))),n=Math.max(3,Math.min(256,Math.round(null!=(s=t.minorSegments)?s:24))),o=Math.max(d,Number(null!=(i=t.majorRadius)?i:1)),h=Math.max(d,Number(null!=(a=t.minorRadius)?a:.38)),l=r*n,c=new Float32Array(3*l),u=new(l>65535?Uint32Array:Uint16Array)(r*n*6);let m=0;for(let t=0;t<r;t++){const e=t/r*Math.PI*2,s=Math.cos(e),i=Math.sin(e);for(let t=0;t<n;t++){const e=t/n*Math.PI*2,a=o+h*Math.cos(e);c[m++]=a*s,c[m++]=h*Math.sin(e),c[m++]=a*i}}let p=0;for(let t=0;t<r;t++){const e=(t+1)%r;for(let s=0;s<n;s++){const i=(s+1)%n,a=t*n+s,r=e*n+s,o=e*n+i,h=t*n+i;u[p++]=a,u[p++]=r,u[p++]=o,u[p++]=a,u[p++]=o,u[p++]=h}}return y({positions:c,indices:u})}(e);throw new TypeError(`asciiam: unknown mesh primitive "${t}"`)}
/**
     * Decode a glTF 2.0 or GLB v2 source without constructing a renderer instance —
     * useful for pre-loading/caching a model before calling `setModel()`.
     *
     * @static
     * @async
     * @param {string|Blob|ArrayBuffer|ArrayBufferView|Object} source - model source, see `loadGltf()` in gltf.js
     * @param {Object} [options] - forwarded to `loadGltf()` in gltf.js
     * @returns {Promise<Readonly<Object>>} normalized mesh, see `normalizeMeshData` in mesh.js
     * @throws {TypeError} if the source or document is invalid/unsupported
     */static loadModel(t,e){return B(t,e)}
/**
     * Register a custom decoder callback for a compressed glTF extension (e.g.
     * `KHR_draco_mesh_compression`). Forwards to `registerGltfDecoder()` in gltf.js.
     *
     * @static
     * @param {string} name - the glTF extension name as it appears in `extensionsUsed`/`extensionsRequired`
     * @param {Function} decoderFn - decoder callback (shape defined by the extension/caller)
     * @returns {void}
     * @throws {TypeError} if `name` isn't a string or `decoderFn` isn't a function
     */static registerGltfDecoder(t,e){return function(t,e){if("string"!=typeof t||"function"!=typeof e)throw new TypeError("asciiam: registerGltfDecoder requires an extension name string and a decoder function");q.set(t,e)}(t,e)}
/**
     * @static
     * @returns {string[]} names of every glTF extension with a registered decoder
     */static getGltfDecoders(){return Array.from(q.keys())}
/**
     * Measures font metrics (charW, charH, ascent, descent, baselineOffset) with
     * subpixel precision. Forwards to the module-level `calibrateFontMetrics()`.
     *
     * @static
     * @param {CanvasRenderingContext2D|string} [target] - a 2D context to measure with, or (if a string) the font family
     * @param {string} [fontFamily="monospace"] - CSS font family
     * @param {number} [fontSize=14] - font size in pixels
     * @returns {{charW: number, charH: number, ascent: number, descent: number, baselineOffset: number}} measured or estimated metrics
     */static calibrateFontMetrics(t,e,s){return W(t,e,s)}
/**
     * Headless cell frame generator for Node.js, Bun, Deno, or CLI text output.
     * Forwards to the module-level `renderFrame()`.
     *
     * @static
     * @param {Object} [options] - see the module-level `renderFrame()`
     * @returns {{char: string, r: number, g: number, b: number, a: number}[][]} a `rows`-length array of `cols`-length cell arrays
     */static renderFrame(t){return N(t)}
/**
     * Headless ASCII multi-line text generator for SSR, terminal, or CLI output.
     * Forwards to the module-level `renderToString()`.
     *
     * @static
     * @param {Object} [options] - see the module-level `renderToString()`
     * @returns {string} newline-joined rows of characters
     */static renderToString(t){return j(t)}
/**
     * Feature-detect before constructing, for graceful fallback in older browsers
     * or restricted environments. A `new asciiam(...)` call itself never throws
     * even if this would return false — it degrades to a disabled, no-op instance
     * instead — but callers wanting to skip construction entirely can check first.
     *
     * @static
     * @returns {boolean} true if a canvas element can provide a WebGL2 or 2D context
     */static isSupported(){try{const t=document.createElement("canvas");return!(!t.getContext||!t.getContext("webgl2")&&!t.getContext("2d"))}catch(t){return!1}}
/**
     * Creates an instance around a container element (a canvas is created and
     * managed internally) or an application-owned `<canvas>` (drawn into directly,
     * never resized/replaced by asciiam). Never throws on an unsupported
     * environment — falls back to a disabled instance whose public methods are
     * safe no-ops instead.
     *
     * @param {string|HTMLElement} target - a CSS selector, a container element, or a `<canvas>` element
     * @param {Object} [opts] - see the options reference table in README.md / docs/content/api/_index.md for the full list
     * @throws {Error} if `target` is a selector that matches no element
     *
     * @example
     * const anim = new asciiam('#hero', { mode: 'wave', color: '#4FA8FF', speed: 1 });
     * anim.start();
     */constructor(e,s={}){const i="string"==typeof e?document.querySelector(e):e;if(!i)throw new Error("asciiam: target not found");if(this._gpuPreferred=!1!==s.preferGPU,this._desynchronized=this._gpuPreferred&&!1!==s.desynchronized,this._rendererRequested=s.renderer||(this._gpuPreferred?"auto":"canvas2d"),!["auto","webgl2","webgpu","canvas2d"].includes(this._rendererRequested))throw new TypeError('asciiam: renderer must be "auto", "webgl2", "webgpu", or "canvas2d"');if(!t.isSupported())return console.warn("asciiam: canvas 2D not supported in this browser — instance is a no-op."),this._disabled=!0,this.start=this.stop=this.destroy=this.setMode=this.setOption=this.setTarget=this.setCursor=this.triggerInteraction=this.clearImage=this.setMesh=this.clearMesh=this.clearModel=this.setSequence=this.playSequence=this.pauseSequence=this.stopSequence=this.clearSequence=this.seekSequence=this.nextSequenceStep=this.setRenderer=this.setLayers=()=>{},this.getLayers=()=>[],this.getSequenceState=()=>({configured:!1,running:!1,completed:!1,index:-1,length:0,loop:!1,elapsed:0,waiting:!1,loading:!1,morphing:!1,morphProgress:0}),this.getRendererInfo=()=>({requested:"canvas2d",backend:"canvas2d",gpuPreferred:!1,acceleration:"not-requested",desynchronized:!1,willReadFrequently:!1}),this.getStats=()=>({fps:0,estimatedRefreshRate:null,frameWorkMs:null,cells:0,drawn:0,occupancy:0,renderer:this.getRendererInfo(),quality:null,dpr:1,mesh:this.getMeshInfo()}),this.on=()=>()=>{},this.off=()=>{},this.setImage=()=>Promise.resolve(null),this.setModel=()=>Promise.resolve(null),this.getMeshInfo=()=>({loaded:!1,vertexCount:0,primitiveCount:0,primitive:null}),this.exportImage=()=>Promise.resolve(null),this.downloadSnapshot=()=>Promise.resolve(null),this.setChartData=()=>this,this.clearChart=()=>this,this.getChartInfo=()=>({active:!1,enabled:!1,type:s.chartType||"bar",dataLength:0,title:s.chartTitle||"",showLegend:!1,hasColors:!1,scaleMin:null,scaleMax:null,animateItems:!1}),this.renderFrame=(t={})=>N(o({cols:80,rows:24,mode:s.mode||"matrix",charSet:s.charSet,invert:s.invert,color:s.color,align:s.align},t)),void(this.renderToString=(t={})=>j(o({cols:80,rows:24,mode:s.mode||"matrix",charSet:s.charSet,invert:s.invert,color:s.color,align:s.align},t)));"CANVAS"===i.tagName?(this.canvas=i,this.container=i.parentElement,this._ownsCanvas=!1):(this.container=i,this.canvas=document.createElement("canvas"),this._ownsCanvas=!0,this.canvas.style.cssText="display:block;width:100%;height:100%;position:absolute;inset:0;z-index:-1;pointer-events:none;contain:strict;",this.canvas.setAttribute("aria-hidden","true"),this.canvas.setAttribute("role","presentation"),"static"===getComputedStyle(this.container).position&&(this.container.style.position="relative"),this.container.style.isolation="isolate",this.container.insertBefore(this.canvas,this.container.firstChild)),this._gpuPreferred&&(this.canvas.style.willChange="transform",this.canvas.style.backfaceVisibility="hidden",this._ownsCanvas&&(this.canvas.style.transform="translateZ(0)")),this._webgl=null;let a=!1;if("webgpu"===this._rendererRequested||"auto"===this._rendererRequested&&z())try{this._webgl=new X(this.canvas,{powerPreference:s.powerPreference}),this._renderer="webgpu",this._webgl.onDeviceLost=t=>this._fallbackFromWebGPU(t),this._webgl.ready.then(()=>{!this._disabled&&["auto","webgpu"].includes(this._rendererRequested)&&this._webgl&&(this._resize(),this._emit("rendererChange",this.getRendererInfo()))},t=>this._fallbackFromWebGPU(t))}catch(t){this._fallbackFromWebGPU(t)}else if("canvas2d"!==this._rendererRequested)try{this._webgl=new V(this.canvas,{desynchronized:this._desynchronized,powerPreference:s.powerPreference})}catch(t){a=!0,"webgl2"===this._rendererRequested&&console.warn("asciiam: WebGL2 initialization failed; using Canvas 2D.",t)}if(this._renderer||(this._renderer=this._webgl?"webgl2":"canvas2d"),this._webgl instanceof V&&this._bindWebGLFallback(),this._webgl){const t=document.createElement("canvas");this.ctx=t.getContext("2d",{alpha:!0,willReadFrequently:!1})}else{const t={alpha:!0,desynchronized:this._desynchronized,willReadFrequently:!1};try{this.ctx=this.canvas.getContext("2d",t)}catch(t){this.ctx=this.canvas.getContext("2d",{alpha:!0})}this.ctx||(this.ctx=this.canvas.getContext("2d",{alpha:!0})),!this.ctx&&a&&(this._replacePresentationCanvas(),this.ctx=this.canvas.getContext("2d",t)||this.canvas.getContext("2d",{alpha:!0}))}if(!this.ctx)return console.warn("asciiam: failed to acquire 2D context — instance is a no-op."),this._disabled=!0,this.start=this.stop=this.destroy=this.setMode=this.setOption=this.setTarget=this.setCursor=this.triggerInteraction=this.setMesh=this.clearMesh=this.clearModel=this.setSequence=this.playSequence=this.pauseSequence=this.stopSequence=this.clearSequence=this.seekSequence=this.nextSequenceStep=this.setRenderer=this.setLayers=()=>{},this.getLayers=()=>[],this.getSequenceState=()=>({configured:!1,running:!1,index:-1,length:0,loop:!1,elapsed:0,waiting:!1}),this.getRendererInfo=()=>({requested:this._rendererRequested,backend:"canvas2d",gpuPreferred:!1,acceleration:"not-requested",desynchronized:!1,willReadFrequently:!1}),this.getStats=()=>({fps:0,estimatedRefreshRate:null,frameWorkMs:null,cells:0,drawn:0,occupancy:0,renderer:this.getRendererInfo(),quality:null,dpr:1,mesh:this.getMeshInfo()}),this.on=()=>()=>{},this.off=()=>{},this.setImage=()=>Promise.resolve(null),this.clearImage=()=>{},this.setModel=()=>Promise.resolve(null),this.getMeshInfo=()=>({loaded:!1,vertexCount:0,primitiveCount:0,primitive:null}),this.exportImage=()=>Promise.resolve(null),this.downloadSnapshot=()=>Promise.resolve(null),this.setChartData=()=>this,this.clearChart=()=>this,this.getChartInfo=()=>({active:!1,enabled:!1,type:s.chartType||"bar",dataLength:0,title:s.chartTitle||"",showLegend:!1,hasColors:!1,scaleMin:null,scaleMax:null,animateItems:!1}),this.renderFrame=(t={})=>N(o({cols:80,rows:24,mode:s.mode||"matrix",charSet:s.charSet,invert:s.invert,color:s.color,align:s.align},t)),void(this.renderToString=(t={})=>j(o({cols:80,rows:24,mode:s.mode||"matrix",charSet:s.charSet,invert:s.invert,color:s.color,align:s.align},t)));const r=t.QUALITY[s.quality]||t.QUALITY.balanced;if(this.opts=Object.assign({quality:t.QUALITY[s.quality]?s.quality:"balanced",mode:"wave",charSet:t.CHARACTER_SETS.asciiExtended,fontFamily:"'IBM Plex Mono', ui-monospace, Consolas, monospace",fontSize:14,density:r.density,resolutionScale:1,
// Opt-in: automatically steps resolutionScale and quality down under
// sustained frame-time pressure and back up when there's headroom,
// never exceeding the quality/resolutionScale requested at construction.
autoQuality:!1,color:"#4FA8FF",gradient:null,background:"transparent",backdrop:null,speed:1,direction:"horizontal",revealDirection:"center",revealDuration:2.2,sweepDuration:2.2,delayCurve:"linear",align:"center",minOpacity:.05,maxOpacity:.85,boldOnPeak:!0,loop:!0,image:null,imageChars:t.CHARACTER_SETS.asciiExtended,imageScale:1,imageScaleX:1,imageScaleY:1,imageFov:1,imageRotation:0,imageFlipX:!1,imageFlipY:!1,fit:"cover",imageLuminance:"auto",colorFromImage:!1,imageBrightness:1,imageContrast:1,animateImageMask:!0,imageMaskMode:"waveSweep",imageAnimationRange:null,
// { min:'#000000', max:'#ffffff' }; null animates every sampled color
animateImageFrames:!0,imageFrameRate:12,edgeFade:0,maxDPR:r.maxDPR,targetFPS:r.targetFPS,showStats:!1,extendedStats:!1,fontLevels:r.fontLevels||6,alphaLevels:r.alphaLevels||32,useGlyphAtlas:!!r.useGlyphAtlas,cacheStaticWave:!!r.cacheStaticWave,preferGPU:this._gpuPreferred,desynchronized:this._desynchronized,renderer:this._rendererRequested,powerPreference:s.powerPreference||"high-performance",respectReducedMotion:!0,onReady:null,onImageError:null,onModelError:null,sequence:null,sequenceOptions:null,layers:Array.isArray(s.layers)?s.layers:null,
// --- wave tuning (previously hardcoded) ---
ambient:.35,
// 0..1, base noise level between wave passes
bandWidth:.14,
// fraction of extent the bright band spans
// --- free / near-free additions ---
trail:0,
// 0..1, afterglow strength (0 = classic full clear)
trailColor:"#070809",pulse:null,
// { amplitude, speed } — global opacity breathing, ~free
colorAnimation:null,
// { type:'hueRotate'|'breathe', speed, ... } — one calc/frame
// --- opt-in, small added cost ---
cursor:null,
// { enabled, radius, strength, mode:'boost' }
interactionRadius:180,interactionDuration:1.1,
// --- sparse mode density ---
snowDensity:.02,sparkleDensity:.05,fireDensity:.035,starfieldDensity:.018,orbitDensity:.014,
// --- dense mode timing / strength ---
glitchIntensity:.32,typewriterDuration:4.5,
// --- dependency-free 3D-to-ASCII source ---
meshEnabled:!1,mesh:null,meshPrimitive:null,meshStyle:"wireframe",meshProjection:"perspective",meshCamera:null,meshTransform:null,meshLight:null,meshAutoRotate:!0,meshRotationSpeed:[.2,.45,.1],meshMaxVertices:1e5,meshMaxPrimitives:1e5,model:null,
// --- sampled image source ---
imageEnabled:!1,
// --- dependency-free ASCII chart source ---
chartEnabled:!1,chartData:null,
// number[] | {label, value, color}[] | number[][]
chartType:"bar",
// bar | horizontalBar | line | sparkline | heatmap | donut
chartTitle:"",chartShowValues:!0,chartShowAxes:!0,chartShowLegend:!0,
// render per-series label legend below chart
chartColors:null,
// string[] | null  — per-bar/series color overrides
chartScaleMin:null,
// number | null  — explicit Y-axis minimum (null = auto 0)
chartScaleMax:null,
// number | null  — explicit Y-axis maximum (null = auto max)
chartAnimateItems:!1,
// stagger-reveal individual bars/segments on entry
// --- extensibility ---
customCell:null},s),this.opts.charSet||(this.opts.charSet=t.CHARACTER_SETS.asciiExtended),this._time=0,this._raf=null,this._running=!1,this._visible=!0,this._lastT=null,this._acc=0,this._resizePending=!1,this._resizeRaf=null,this._lastFillStyle=null,this._lastFont=null,this._lastAlpha=-1,this._activeGlyphAtlas=null,this._waveBaseLayer=null,this._gradientKey=null,this._gradientObj=null,this._gradientSource=null,this._backdropGradientKey=null,this._backdropGradientObj=null,this._edgeFadeCache=null,this._cell={char:" ",opacity:0,level:0,bold:!1,color:null},this._morphRecording=null,this._morphCaptureA=null,this._morphCaptureB=null,this._morphClaimed=null,this._morphBeforeScratch={char:" ",opacity:0,level:0,bold:!1,color:null},this._morphScrambleScratch={char:" ",opacity:0,level:0,bold:!1,color:null},this._frames=0,this._fps=0,this._autoQualityState=null,this._statsEl=null,this._statsWindowStart=null,this._extendedStats=null,this._warnedZeroSize=!1,this._pulseFactor=1,this._animatedColor=null,this._cursor=null,this._interaction=null,this._canvasRect=null,this._sequence=null,this._applyingSequence=!1,this._events=new Map,this._morph=null,this._destroyed=!1,this._animatedImage=!1,this._imageFrameAccumulator=0,this._capturedImageFrames=null,this._imageFrameIndex=0,this._imageLoadToken=0,this._imageCaptureToken=0,this._animatedImageData=null,this._imageRecaptureTimer=null,this._imageSampleCanvas=null,this._imageSampleContext=null,this._imageOrientCanvas=null,this._imageOrientContext=null,this._loadedImageSource=null,this._loadedImageOptionsKey=null,this._mesh=null,this._meshRasterizer=null,this._meshBaseRotation=new Float64Array(3),this._meshRotation=new Float64Array(3),this._meshPosition=new Float64Array(3),this._meshScale=new Float64Array([1,1,1]),this._meshRasterOptions={style:this.opts.meshStyle,projection:this.opts.meshProjection,camera:this.opts.meshCamera,transform:{position:this._meshPosition,rotation:this._meshRotation,scale:this._meshScale},light:this.opts.meshLight},this._modelLoadToken=0,this._modelAbortController=null,this._loadedModelSource=null,this._api={col:0,row:0,x:0,y:0,time:0,cols:0,rows:0,w:0,h:0,charSet:"",seed:(t,e)=>this._seed(t,e),set:(t,e,s,i)=>this._setCell(t,e,s,i)},this._mq=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null,this._reduced=!!(this._mq&&this._mq.matches&&this.opts.respectReducedMotion),this._onMqChange=t=>{this._reduced=t.matches&&this.opts.respectReducedMotion,this._reduced?(this.stop(),this._draw(16.7)):this.start()},this._mq&&(this._mq.addEventListener?this._mq.addEventListener("change",this._onMqChange):this._mq.addListener(this._onMqChange)),this._bindLifecycle(),this._bindCursor(),this._layers=this._normalizeLayers(this.opts.layers),this._buildFontCache(),this._resize(),document.fonts&&document.fonts.ready&&document.fonts.ready.then(()=>{this._buildFontCache(),this._resize()}).catch(()=>{}),this.opts.image&&this.setImage(this.opts.image),this.opts.mesh)this.setMesh(this.opts.mesh);else if(this.opts.meshPrimitive){const e=this.opts.meshPrimitive;this.setMesh(t.createMeshPrimitive(e)),this.opts.meshPrimitive=e}if(this.opts.model&&this.setModel(this.opts.model).catch(()=>{}),Array.isArray(this.opts.sequence)&&this.opts.sequence.length){const t=this.opts.sequenceOptions||{};this.setSequence(this.opts.sequence,t),t.autoplay&&this.playSequence()}Promise.resolve().then(()=>{if(this._destroyed)return;const t={width:this.w,height:this.h,cols:this.cols,rows:this.rows};this._emit("ready",t),"function"==typeof this.opts.onReady&&this.opts.onReady(this)})}
// ---- public API ----
/**
     * Starts or resumes this instance on the shared frame scheduler. A no-op if
     * already running, destroyed, or the instance was disabled at construction
     * (unsupported environment). If `prefers-reduced-motion` is respected and
     * active, draws exactly one static frame instead of starting the loop.
     *
     * @returns {void}
     */
start(){this._disabled||this._destroyed||this._running||(this._reduced?this._draw(16.7):(this._running=!0,this._raf=!0,t._activeInstances.add(this),t._scheduleFrame()))}
/**
     * Stops frame scheduling while retaining renderer and animation state — a
     * subsequent {@link asciiam#start} resumes rather than restarting. A no-op if
     * not currently running.
     *
     * @returns {void}
     */stop(){this._running&&(this._running=!1,this._raf=null,t._activeInstances.delete(this),t._activeInstances.size||null===t._schedulerRaf||(cancelAnimationFrame(t._schedulerRaf),t._schedulerRaf=null))}
/**
     * Releases observers, listeners, and renderer resources, and removes the
     * canvas from the DOM — including an application-owned canvas passed in
     * directly, not only one asciiam created itself around a container target.
     * {@link asciiam#start} becomes a permanent no-op afterward.
     *
     * @returns {void}
     */destroy(){var t;this._destroyed=!0,this.stop(),this._clearMorph(),this._io&&this._io.disconnect(),this._ro&&this._ro.disconnect(),this._resizeRaf&&cancelAnimationFrame(this._resizeRaf),document.removeEventListener("visibilitychange",this._onVisChange),this._onResize&&window.removeEventListener("resize",this._onResize),this._mq&&(this._mq.removeEventListener?this._mq.removeEventListener("change",this._onMqChange):this._mq.removeListener(this._onMqChange)),this._unbindCursor(),this._onWebGLContextLost&&this.canvas.removeEventListener("webglcontextlost",this._onWebGLContextLost),this._webgl&&this._webgl.destroy(),this._webgl=null,this._sourceImage=null,this._imageGrid=null,this._capturedImageFrames=null,this._animatedImageData=null,this._imageLoadToken++,this._imageCaptureToken++,null!==this._imageRecaptureTimer&&clearTimeout(this._imageRecaptureTimer),this._imageRecaptureTimer=null,this._imageSampleCanvas=null,this._imageSampleContext=null,this._imageOrientCanvas=null,this._imageOrientContext=null,this._mesh=null,this._meshRasterizer=null,this._modelLoadToken++,null==(t=this._modelAbortController)||t.abort(),this._modelAbortController=null,this._loadedModelSource=null,this.canvas.parentElement&&this.canvas.parentElement.removeChild(this.canvas),this._events.clear()}
/**
     * Advances time-dependent state in a fixed order before presenting a frame:
     * morph/sequence timelines, simulation time, pointer-interaction decay, image
     * frame playback, then the actual draw. Skips entirely while not running, the
     * document is hidden, or the instance is off-screen; self-throttles to
     * `targetFPS` when set. Called once per tick by the shared scheduler
     * ({@link asciiam._tickFrame}), never directly by user code.
     *
     * @private
     * @param {DOMHighResTimeStamp} t - timestamp supplied by `requestAnimationFrame`
     * @returns {void}
     * @fires asciiam#frame
     */_runFrame(t){var e,s,i;if(!this._running)return;if(document.hidden||!this._visible)return this._lastT=null,void(this._statsWindowStart=null);const a=null!==this._lastT,r=a?t-this._lastT:16.7;this._lastT=t;const n=!(!this.opts.showStats||!this.opts.extendedStats);if(n&&a&&this._sampleDisplayRefresh(r),this.opts.targetFPS){this._acc+=r;const t=1e3/this.opts.targetFPS;if(this._acc<t)return;this._acc%=t}const o=(n||this.opts.autoQuality)&&(null==(e=globalThis.performance)?void 0:e.now)?globalThis.performance.now():null;if(this._advanceMorph(r),(null==(s=this._sequence)?void 0:s.running)&&this._advanceSequence(r),this._time+=.001*r*this.opts.speed,this._interaction){this._interaction.elapsed+=.001*r;const t=Math.max(.05,Number(this.opts.interactionDuration)||1.1);this._interaction.elapsed>=t&&(this._interaction=null)}this._advanceImageFrames(r),this._draw(r),(null==(i=this._events.get("frame"))?void 0:i.size)&&this._emit("frame",{time:this._time,delta:r,drawn:this._lastDrawnCount});const h=null===o?0:Math.max(0,globalThis.performance.now()-o);this.opts.showStats&&this._updateStats(t,h),this.opts.autoQuality&&a&&this._updateAutoQuality(h)}
/**
     * Steps `resolutionScale` (the finer-grained, cheaper-to-rebuild lever) and, once
     * that reaches its floor, `quality` (the coarser tier lever) down under sustained
     * CPU frame-time pressure, and back up — never past what was originally
     * requested — once there's sustained headroom. Reuses the exact CPU frame-work
     * measurement `showStats`/`extendedStats` already takes (`performance.now()`
     * around `_draw()`), just decoupled from whether the stats overlay is open, so
     * enabling `autoQuality` costs nothing beyond that one timestamp pair per frame.
     * A smoothed running average (not a single frame) and a cooldown between any two
     * adjustments avoid reacting to a one-off hitch or thrashing back and forth —
     * `setOption('resolutionScale'|'quality', ...)` both trigger a real `_resize()`
     * (rebuilds seed/edge-fade/spatial caches, forces a layout reflow), so adjustments
     * must stay infrequent, not per-frame.
     *
     * @private
     * @param {number} frameWorkMs - this frame's measured CPU work time in milliseconds
     * @returns {void}
     * @fires asciiam#autoQualityChange
     */_updateAutoQuality(t){var e;const s=(null==(e=globalThis.performance)?void 0:e.now)?globalThis.performance.now():Date.now();let i=this._autoQualityState;if(!i)return void(i=this._autoQualityState={ema:t,lastAdjust:s,ceilingQuality:this.opts.quality,ceilingResolutionScale:Number(this.opts.resolutionScale)||1,
// A quality-tier switch applies that whole tier's preset — including
// targetFPS: null on every built-in tier — so stepping quality would
// otherwise silently clear a targetFPS the caller explicitly set.
userTargetFPS:this.opts.targetFPS});if(i.ema=.85*i.ema+.15*t,s-i.lastAdjust<1500)return;const a=["high","balanced","performance","ultra"],r=1e3/(this.opts.targetFPS||60);if(i.ema>1.25*r){const t=Number(this.opts.resolutionScale)||1;if(t>.5)this.setOption("resolutionScale",Math.max(.5,Math.round(100*(t-.15))/100));else{const t=a.indexOf(this.opts.quality);if(!(t>=0&&t<a.length-1))return;this.setOption("quality",a[t+1]),i.userTargetFPS&&(this.opts.targetFPS=i.userTargetFPS)}i.lastAdjust=s,this._emit("autoQualityChange",{reason:"pressure",quality:this.opts.quality,resolutionScale:this.opts.resolutionScale,frameWorkMs:Math.round(100*i.ema)/100})}else if(i.ema<.6*r){const t=a.indexOf(this.opts.quality);if(t>a.indexOf(i.ceilingQuality)&&t>0)this.setOption("quality",a[t-1]),i.userTargetFPS&&(this.opts.targetFPS=i.userTargetFPS);else{const t=Number(this.opts.resolutionScale)||1,e=i.ceilingResolutionScale;if(!(t<e))return;this.setOption("resolutionScale",Math.min(e,Math.round(100*(t+.15))/100))}i.lastAdjust=s,this._emit("autoQualityChange",{reason:"recovery",quality:this.opts.quality,resolutionScale:this.opts.resolutionScale,frameWorkMs:Math.round(100*i.ema)/100})}}
/**
     * Subscribe to a lifecycle event (`frame`, `resize`, `rendererChange`,
     * `rendererFallback`, `autoQualityChange`, `sequenceStart`/`sequenceStepStart`/
     * etc., `imageFramesReady`, and more — see the events reference in
     * docs/content/api/_index.md for the full list and payload shapes).
     *
     * @param {string} event - event name
     * @param {Function} listener - called with an event-specific detail object
     * @returns {() => void} an unsubscribe function equivalent to `off(event, listener)`
     * @throws {TypeError} if `listener` is not a function
     * @listens asciiam#frame
     *
     * @example
     * const stop = anim.on('rendererFallback', ({ backend }) => console.warn(`fell back to ${backend}`));
     * stop(); // unsubscribe
     */on(t,e){if("function"!=typeof e)throw new TypeError("asciiam: event listener must be a function");let s=this._events.get(t);return s||(s=new Set,this._events.set(t,s)),s.add(e),()=>this.off(t,e)}
/**
     * Removes a previously registered lifecycle listener. A no-op if `event`/
     * `listener` isn't currently registered.
     *
     * @param {string} event - event name passed to the original {@link asciiam#on} call
     * @param {Function} listener - the exact listener function passed to the original {@link asciiam#on} call
     * @returns {void}
     */off(t,e){const s=this._events.get(t);s&&(s.delete(e),s.size||this._events.delete(t))}
/**
     * Changes the animation algorithm and restarts its mode-local timeline (so a
     * one-shot mode like `fadeIn` always plays from the start when freshly
     * selected, even on a long-running instance). Interrupts an in-progress
     * sequence step unless `fromSequence` is true (the sequence engine's own
     * internal call path, which manages its own step lifecycle).
     *
     * @param {string} mode - a built-in mode name (see `asciiam.BUILT_IN_MODES`), a name registered via `asciiam.registerMode()`, or `"custom"` (paired with the `customCell` option)
     * @param {boolean} [fromSequence=false] - true when called internally by the sequence engine; suppresses the sequence-interrupt side effect
     * @returns {void}
     * @fires asciiam#sequenceInterrupt
     */setMode(t,e=!1){var s;!e&&(null==(s=this._sequence)?void 0:s.running)&&((this._sequence.stepStarted||this._sequence.stepLoading)&&this._interruptSequenceStep("mode-change"),this.pauseSequence("mode-change"),this._sequence.elapsed=0,this._sequence.delayElapsed=0,this._emit("sequenceInterrupt",this._sequenceDetail({reason:"mode-change"}))),this.opts.mode=t,"clickZone"===t&&(this._interaction=null),this._time=0,this._lastT=null,"matrix"===t&&this._initMatrix(),"snow"===t&&this._initSnow(),"sparkle"===t&&this._initSparkle(),"fire"===t&&this._initFire(),"starfield"===t&&this._initStarfield(),"orbit"===t&&this._initOrbit()}
/**
     * Updates one option and rebuilds only its dependent state or caches — e.g.
     * changing `fontSize` rebuilds the font cache and grid, but changing `color`
     * only invalidates the glyph atlas, and most options touch nothing beyond the
     * `opts` object itself, taking effect on the very next frame. `key: "layers"`
     * and `key: "mode"` delegate to {@link asciiam#setLayers}/{@link asciiam#setMode}
     * respectively rather than being set directly. See the options reference table
     * in README.md / docs/content/api/_index.md for the full option list and defaults.
     *
     * @param {string} key - option name
     * @param {*} value - new value; an empty `charSet` falls back to the default ramp rather than being accepted as-is
     * @returns {void}
     */setOption(e,s){if("layers"!==e)if("mode"!==e){if("quality"===e){const e=t.QUALITY[s];if(!e)return;return this.opts.quality=s,Object.assign(this.opts,e),this._buildFontCache(),void this._resize()}this.opts[e]=s,"charSet"!==e||s||(this.opts.charSet=t.CHARACTER_SETS.asciiExtended),"extendedStats"!==e||s||(this._extendedStats=null),"fontSize"!==e&&"density"!==e&&"resolutionScale"!==e||(this._buildFontCache(),this._resize()),"fontFamily"===e&&(this._buildFontCache(),this._resize()),"fontLevels"===e&&this._buildFontCache(),"color"!==e&&"charSet"!==e&&"useGlyphAtlas"!==e||(this._activeGlyphAtlas=null,this._waveBaseLayer=null),"maxDPR"===e&&this._resize(),"gradient"===e&&(this._gradientKey=null,this._gradientSource=null),"backdrop"===e&&(this._backdropGradientKey=null,this._backdropGradientObj=null),"edgeFade"===e&&(this._buildEdgeFadeCache(),this._waveBaseLayer=null),"matrixDensity"!==e&&"snowDensity"!==e&&"sparkleDensity"!==e&&"fireDensity"!==e&&"starfieldDensity"!==e&&"orbitDensity"!==e||this.cols>0&&this.rows>0&&this._adaptStateOnResize(this.cols,this.rows,this.cols,this.rows),"align"===e&&(this._buildSpatialCache(),this._buildCurrentCache()),"revealDirection"!==e&&"revealDuration"!==e||!["fadeIn","fadeOut","irisIn","irisOut","dissolveIn","dissolveOut","assemble","breakApart"].includes(this.opts.mode)||(this._time=0,this._lastT=null),"imageScale"!==e&&"imageScaleX"!==e&&"imageScaleY"!==e&&"imageFov"!==e&&"imageRotation"!==e&&"imageFlipX"!==e&&"imageFlipY"!==e&&"fit"!==e&&"imageChars"!==e&&"imageLuminance"!==e&&"colorFromImage"!==e&&"imageAnimationRange"!==e&&"imageBrightness"!==e&&"imageContrast"!==e||(this._sourceImage&&this._resampleImage(),this._scheduleAnimatedFrameCapture()),"animateImageFrames"===e&&(this._imageFrameAccumulator=0),"snowDensity"===e&&this._initSnow(),"sparkleDensity"===e&&this._initSparkle(),"fireDensity"===e&&this._initFire(),"starfieldDensity"===e&&this._initStarfield(),"orbitDensity"===e&&this._initOrbit(),"mesh"===e&&(s?this.setMesh(s):this.clearMesh()),"meshPrimitive"===e&&(s?(this.setMesh(t.createMeshPrimitive(s)),this.opts.meshPrimitive=s):this.opts.model||this.clearMesh()),"model"===e&&(s?this.setModel(s).catch(()=>{}):this.clearModel()),"meshStyle"!==e&&"meshProjection"!==e&&"meshCamera"!==e&&"meshLight"!==e||this._syncMeshOptions(),"meshTransform"!==e&&"meshRotationSpeed"!==e||this._syncMeshOptions(),"respectReducedMotion"===e&&(this._reduced=!!(this._mq&&this._mq.matches&&s),this._reduced&&(this.stop(),this._draw(16.7)))}else this.setMode(s);else this.setLayers(s)}
/**
     * Sets an array of layer configurations to composite in order during frame
     * rendering — each layer can run its own mode, opacity, blend mode, and
     * (independent of the instance's shared image/mesh) its own image or 3D model
     * source. Re-calling with a layer whose media fields are unchanged from the
     * previous call reuses the already-loaded source instead of reloading it.
     *
     * @param {Object[]} layers - layer configs; see README.md / docs/content/api/_index.md for the full per-layer field list
     * @param {string} layers[].mode - animation mode for this layer
     * @param {Object} [layers[].options] - per-layer option overrides applied only during this layer's draw pass
     * @param {number} [layers[].opacity=1] - layer opacity, clamped to [0, 1]
     * @param {string} [layers[].blendMode="source-over"] - canvas `globalCompositeOperation` value
     * @param {string|null} [layers[].image] - image source independent of the instance-wide image
     * @param {Object} [layers[].imageOptions] - forwarded to this layer's own image sampling pass
     * @param {string|null} [layers[].meshPrimitive] - procedural mesh primitive independent of the instance-wide mesh
     * @param {*} [layers[].model] - glTF/GLB model source independent of the instance-wide model
     * @param {Object} [layers[].modelOptions] - forwarded to this layer's own model load
     * @returns {asciiam} `this`, for chaining
     */setLayers(t){return this._layers=this._normalizeLayers(t),this.opts.layers=this._layers,this._loadLayerMedia(),this}
/**
     * @returns {Object[]} a snapshot of the current composition layers (deep-copied `options`/`imageOptions`/`modelOptions`), or `[]` if none are set
     */getLayers(){return this._layers?this._layers.map(t=>({mode:t.mode,options:t.options?Object.assign({},t.options):null,opacity:t.opacity,blendMode:t.blendMode,image:t.image,imageOptions:t.imageOptions?Object.assign({},t.imageOptions):null,meshPrimitive:t.meshPrimitive,model:t.model,modelOptions:t.modelOptions?Object.assign({},t.modelOptions):null})):[]}
/**
     * Temporarily overlays a layer's `options` onto `this.opts` for the duration
     * of that layer's draw pass, so every mode-cell function (which reads
     * `this.opts.*` directly) picks up per-layer overrides without a broader
     * refactor.
     *
     * @private
     * @param {Object} layer - a normalized layer, see {@link asciiam#_normalizeLayers}
     * @returns {string[]|null} the key list to hand back to {@link asciiam#_restoreLayerOptions}; `null` when the layer has no per-layer options
     */_applyLayerOptions(t){const e=t._optionKeys;if(!e||0===e.length)return null;const s=this._layerRestoreScratch||(this._layerRestoreScratch={});for(let i=0;i<e.length;i++){const a=e[i];s[a]=this.opts[a],this.opts[a]=t.options[a]}return e}
/**
     * Restores `this.opts` fields saved by {@link asciiam#_applyLayerOptions}. A
     * no-op if `keys` is null (the layer had no per-layer options to restore).
     *
     * @private
     * @param {string[]|null} keys - key list returned by {@link asciiam#_applyLayerOptions}
     * @returns {void}
     */_restoreLayerOptions(t){if(!t)return;const e=this._layerRestoreScratch;for(let s=0;s<t.length;s++){const i=t[s];this.opts[i]=e[i]}}
/**
     * Normalizes a `setLayers()` config array. Each layer may carry its own
     * `image`/`imageOptions` and `meshPrimitive`/`model`/`modelOptions`, independent
     * of the instance's single global `_imageGrid`/`_mesh` — matching the identical
     * fields sequence steps already support. Re-normalization is positional: a
     * layer at the same index whose media fields are unchanged from the previous
     * `setLayers()` call carries its already-loaded `_imageGrid`/`_mesh` forward
     * instead of reloading, so re-calling `setLayers()` for an unrelated tweak
     * (opacity, blend mode) doesn't re-fetch or re-decode anything.
     *
     * @private
     * @param {Object[]} layers - raw layer configs, see {@link asciiam#setLayers}
     * @returns {Object[]|null} normalized, internally-augmented layer objects, or `null` if `layers` is empty/not an array
     */_normalizeLayers(t){if(!Array.isArray(t)||0===t.length)return null;const e=this._layers;return t.map((t,s)=>{const i=e&&e[s],a="string"==typeof t.image?t.image:null,r="string"==typeof t.meshPrimitive?t.meshPrimitive:null,n=void 0!==t.model&&null!==t.model?t.model:null,o=t.options&&"object"==typeof t.options?Object.assign({},t.options):null;o&&"charSet"in o&&!o.charSet&&delete o.charSet;const h={mode:"string"==typeof t.mode?t.mode:"wave",options:o,
// Precomputed once per setLayers() call so the per-frame apply/restore
// path below never allocates. `mode` is excluded: layer.mode is always
// authoritative, so a stray `options.mode` can't fight with it.
_optionKeys:o?Object.keys(o).filter(t=>"mode"!==t):null,opacity:"number"==typeof t.opacity?Math.max(0,Math.min(1,t.opacity)):1,blendMode:"string"==typeof t.blendMode?t.blendMode:"source-over",image:a,imageOptions:t.imageOptions&&"object"==typeof t.imageOptions?Object.assign({},t.imageOptions):null,meshPrimitive:r,model:n,modelOptions:t.modelOptions&&"object"==typeof t.modelOptions?Object.assign({},t.modelOptions):null,_sourceImage:null,_imageGrid:null,_imageLoadToken:0,_mesh:null,_meshRasterizer:null,_modelLoadToken:0,_modelAbortController:null};return i&&i.image===a&&i._imageGrid&&(h._sourceImage=i._sourceImage,h._imageGrid=i._imageGrid,h._imageLoadToken=i._imageLoadToken),i&&i.meshPrimitive===r&&i.model===n&&i._mesh&&(h._mesh=i._mesh,h._meshRasterizer=i._meshRasterizer,h._modelLoadToken=i._modelLoadToken),h})}
/**
     * Kicks off (or skips, if already loaded — see {@link asciiam#_normalizeLayers})
     * each layer's own independent image/mesh source.
     *
     * @private
     * @returns {void}
     */_loadLayerMedia(){if(this._layers)for(const t of this._layers)t.image&&!t._imageGrid&&this._loadLayerImage(t),!t.meshPrimitive&&!t.model||t._mesh||this._loadLayerModel(t)}
/**
     * Decodes one layer's independent image source; does not touch the shared
     * `_imageGrid`.
     *
     * @private
     * @param {Object} layer - a normalized layer with an `image` source, see {@link asciiam#_normalizeLayers}
     * @returns {void}
     */_loadLayerImage(t){const e=++t._imageLoadToken,s=new Image;s.crossOrigin="anonymous",s.onload=()=>{e!==t._imageLoadToken||this._destroyed||(t._sourceImage=s,this._resampleLayerImage(t))},s.onerror=s=>{e!==t._imageLoadToken||this._destroyed||console.warn("asciiam: failed to load layer image:",t.image,s)},s.src=t.image}
/**
     * Samples a layer's own decoded image into its own `_imageGrid`, reusing
     * `_resampleImage()` — the same tested single-slot pipeline the global image
     * uses — via a synchronous swap: point the instance's image state at the
     * layer's `<img>`, resample as normal, copy the result out to the layer, then
     * restore the instance's own image state exactly as it was. No `await` runs
     * between the swap and the restore, so there's no re-entrancy hazard from
     * another load resolving mid-swap. `layer.imageOptions` overlays `this.opts`
     * for the same window (same pattern as `_applyLayerOptions`) so per-layer
     * fit/scale/rotation/luminance options affect only that layer's sampling pass.
     *
     * @private
     * @param {Object} layer - a normalized layer with a decoded `_sourceImage`, see {@link asciiam#_normalizeLayers}
     * @returns {void}
     */_resampleLayerImage(t){if(!t._sourceImage||!this.cols||!this.rows)return;const e=this._sourceImage,s=this._imageGrid,i=t.imageOptions,a=i?Object.keys(i):null,r=a?{}:null;if(a)for(const t of a)r[t]=this.opts[t],this.opts[t]=i[t];if(this._sourceImage=t._sourceImage,this._imageGrid=null,this._resampleImage(),t._imageGrid=this._imageGrid,a)for(const t of a)this.opts[t]=r[t];this._sourceImage=e,this._imageGrid=s}
/**
     * Loads one layer's own independent mesh: a procedural `meshPrimitive` (built
     * synchronously, mirroring `setOption('meshPrimitive', ...)`) or a glTF/GLB
     * `model` (async, mirroring `setModel()`, with its own per-layer cancellation
     * token/abort controller so two layers' loads can never race each other).
     *
     * @private
     * @param {Object} layer - a normalized layer with `meshPrimitive` and/or `model` set, see {@link asciiam#_normalizeLayers}
     * @returns {void}
     */_loadLayerModel(e){var s;if(e.meshPrimitive){const s=y(t.createMeshPrimitive(e.meshPrimitive),{maxVertices:this.opts.meshMaxVertices,maxPrimitives:this.opts.meshMaxPrimitives});return e._mesh=s,void(e._meshRasterizer=new v(this.cols||1,this.rows||1))}if(!e.model)return;const i=++e._modelLoadToken;null==(s=e._modelAbortController)||s.abort();const a=new AbortController;e._modelAbortController=a;const r=e.modelOptions||{};B(e.model,h(o({},r),{signal:a.signal,limits:o({maxVertices:this.opts.meshMaxVertices,maxPrimitives:this.opts.meshMaxPrimitives},r.limits)})).then(t=>{i!==e._modelLoadToken||this._destroyed||(e._mesh=y(t,{maxVertices:this.opts.meshMaxVertices,maxPrimitives:this.opts.meshMaxPrimitives}),e._meshRasterizer=new v(this.cols||1,this.rows||1))}).catch(t=>{i===e._modelLoadToken&&"AbortError"!==(null==t?void 0:t.name)&&console.warn("asciiam: failed to load layer model:",e.model,t)})}
/**
     * Swaps the shared `_imageGrid`/`_mesh`/`_meshRasterizer` (and force-enables the
     * corresponding gate) for a layer's own media, for the duration of that layer's
     * draw pass — the same technique `_applyLayerOptions` uses for `this.opts`, just
     * for the media singletons `_applyImageSource`/`_drawMesh` read directly. Layers
     * without their own media are unaffected and keep reading the shared globals, so
     * `mode: 'image'`/`'mesh'` layers with no per-layer source still show whatever
     * `setImage()`/`setModel()` loaded instance-wide, exactly as before this existed.
     * Uses pooled scratch fields, not an allocated object, since this runs per layer
     * per frame.
     *
     * @private
     * @param {Object} layer - a normalized layer, see {@link asciiam#_normalizeLayers}
     * @returns {void}
     */_applyLayerMedia(t){this._layerMediaScratchImageGrid=this._imageGrid,this._layerMediaScratchMesh=this._mesh,this._layerMediaScratchMeshRasterizer=this._meshRasterizer,this._layerMediaScratchImageEnabled=this.opts.imageEnabled,this._layerMediaScratchMeshEnabled=this.opts.meshEnabled,t._imageGrid&&(this._imageGrid=t._imageGrid,this.opts.imageEnabled=!0),t._mesh&&(this._mesh=t._mesh,this._meshRasterizer=t._meshRasterizer,this.opts.meshEnabled=!0)}
/**
     * Restores state saved by {@link asciiam#_applyLayerMedia}.
     *
     * @private
     * @returns {void}
     */_restoreLayerMedia(){this._imageGrid=this._layerMediaScratchImageGrid,this._mesh=this._layerMediaScratchMesh,this._meshRasterizer=this._layerMediaScratchMeshRasterizer,this.opts.imageEnabled=this._layerMediaScratchImageEnabled,this.opts.meshEnabled=this._layerMediaScratchMeshEnabled}
/**
     * Validate and retain typed-array geometry for the mesh animation mode
     * (requires `meshEnabled: true`, or `mode: "mesh"`, to actually render). Clears
     * any `meshPrimitive` set previously, since an explicit mesh takes precedence.
     *
     * @param {Object} mesh - raw mesh data, see `normalizeMeshData()` in mesh.js
     * @returns {asciiam} `this`, for chaining
     * @throws {TypeError} if `mesh` is malformed, see `normalizeMeshData()` in mesh.js
     * @throws {RangeError} if `mesh` exceeds `meshMaxVertices`/`meshMaxPrimitives`
     * @fires asciiam#meshReady
     */setMesh(t){return this._mesh=y(t,{maxVertices:this.opts.meshMaxVertices,maxPrimitives:this.opts.meshMaxPrimitives}),this.opts.mesh=t,this.opts.meshPrimitive=null,this._meshRasterizer?this._meshRasterizer.resize(this.cols||1,this.rows||1):this._meshRasterizer=new v(this.cols||1,this.rows||1),this._syncMeshOptions(),this._emit("meshReady",this.getMeshInfo()),this}
/**
     * Release retained geometry and raster buffers. Does not cancel an in-flight
     * `setModel()` load — see {@link asciiam#clearModel} for that.
     *
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#meshClear
     */clearMesh(){return this._mesh=null,this.opts.mesh=null,this.opts.meshPrimitive=null,this._meshRasterizer=null,this._emit("meshClear",this.getMeshInfo()),this}
/**
     * Report normalized mesh topology without exposing mutable internal buffers.
     *
     * @returns {{loaded: boolean, vertexCount: number, primitiveCount: number, primitive: string|null, style: string, projection: string}} current mesh state summary
     */getMeshInfo(){var t,e,s;return{loaded:!!this._mesh,vertexCount:(null==(t=this._mesh)?void 0:t.vertexCount)||0,primitiveCount:(null==(e=this._mesh)?void 0:e.primitiveCount)||0,primitive:(null==(s=this._mesh)?void 0:s.primitive)||null,style:this.opts.meshStyle,projection:this.opts.meshProjection}}
/**
     * Decode and retain a glTF 2.0 or GLB v2 model with cancellation and progress
     * events, applying it via {@link asciiam#setMesh} once loaded. A new call
     * aborts any load already in flight. Passing a nullish/empty `source` clears
     * the model instead of loading (equivalent to {@link asciiam#clearModel}).
     *
     * @async
     * @param {string|Blob|ArrayBuffer|ArrayBufferView|Object|null} source - model source, see `loadGltf()` in gltf.js; nullish/empty clears instead of loading
     * @param {Object} [options] - forwarded to `loadGltf()` in gltf.js
     * @param {AbortSignal} [options.signal] - external signal that also aborts this load; combined with the internal one this method manages
     * @param {(progress: {loaded: number, total: number|null}) => void} [options.onProgress] - forwarded, and re-emitted as the `modelProgress` event
     * @returns {Promise<Readonly<Object>|null>} the normalized mesh once ready, or `null` if cleared or superseded by a later call
     * @throws {*} re-throws any load error that isn't from being superseded/aborted, after emitting `modelError` and calling `opts.onModelError` if set
     * @fires asciiam#modelLoadStart
     * @fires asciiam#modelProgress
     * @fires asciiam#modelReady
     * @fires asciiam#modelError
     */setModel(t){return c(this,arguments,function*(t,e={}){var s,i,a;if(null==t||""===t)return this.clearModel(),null;const r=++this._modelLoadToken;null==(s=this._modelAbortController)||s.abort();const n=new AbortController;this._modelAbortController=n;const l=()=>n.abort();null==(i=e.signal)||i.addEventListener("abort",l,{once:!0}),this.opts.model=t,this._emit("modelLoadStart",{source:t});try{const s=yield B(t,h(o({},e),{signal:n.signal,limits:o({maxVertices:this.opts.meshMaxVertices,maxPrimitives:this.opts.meshMaxPrimitives},e.limits),onProgress:t=>{var s;null==(s=e.onProgress)||s.call(e,t),r===this._modelLoadToken&&this._emit("modelProgress",t)}}));return r!==this._modelLoadToken||this._destroyed?null:(this._loadedModelSource=t,this.setMesh(s),this.opts.model=t,this._emit("modelReady",o({source:t},this.getMeshInfo())),s)}catch(e){if(r!==this._modelLoadToken||"AbortError"===(null==e?void 0:e.name))return null;throw this._emit("modelError",{source:t,error:e}),"function"==typeof this.opts.onModelError&&this.opts.onModelError(e),e}finally{null==(a=e.signal)||a.removeEventListener("abort",l),r===this._modelLoadToken&&(this._modelAbortController=null)}})}
/**
     * Cancel any in-flight {@link asciiam#setModel} load and release its retained
     * geometry.
     *
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#modelClear
     */clearModel(){var t;return this._modelLoadToken++,null==(t=this._modelAbortController)||t.abort(),this._modelAbortController=null,this._loadedModelSource=null,this.opts.model=null,this.clearMesh(),this._emit("modelClear",{}),this}
/**
     * Copy public mesh transform/style options into stable typed arrays and a
     * pooled rasterize-options object, consumed by the hot raster loop without
     * per-frame allocation or repeated option lookups.
     *
     * @private
     * @returns {void}
     */_syncMeshOptions(){const t=(t,e,s)=>{for(let i=0;i<3;i++){const a=Number(null==t?void 0:t[i]);e[i]=Number.isFinite(a)?a:s[i]}},e=this.opts.meshTransform;t(null==e?void 0:e.position,this._meshPosition,[0,0,0]),t(null==e?void 0:e.rotation,this._meshBaseRotation,[0,0,0]),t(null==e?void 0:e.scale,this._meshScale,[1,1,1]),this._meshRotation.set(this._meshBaseRotation),this._meshRasterOptions.style=this.opts.meshStyle,this._meshRasterOptions.projection=this.opts.meshProjection,this._meshRasterOptions.camera=this.opts.meshCamera,this._meshRasterOptions.light=this.opts.meshLight}
/**
     * Generates a headless 2D grid of cell character/color data, seeded from this
     * instance's current grid size and options (overridable per call), without
     * touching the canvas. Delegates to the module-level `renderFrame()`.
     *
     * @param {Object} [options] - overrides merged over this instance's current `cols`/`rows`/`mode`/`charSet`/`invert`/`color`/`align`; see the module-level `renderFrame()` for the full option list
     * @returns {{char: string, r: number, g: number, b: number, a: number}[][]} a `rows`-length array of `cols`-length cell arrays
     */renderFrame(t={}){return N(o({cols:this.cols||80,rows:this.rows||24,mode:this.opts.mode||"matrix",charSet:this.opts.charSet,invert:this.opts.invert,color:this.opts.color,align:this.opts.align},t))}
/**
     * Generates a headless multi-line ASCII string, seeded from this instance's
     * current grid size and options (overridable per call), without requiring a
     * DOM canvas. Delegates to the module-level `renderToString()`.
     *
     * @param {Object} [options] - overrides merged over this instance's current `cols`/`rows`/`mode`/`charSet`/`invert`/`color`/`align`; see the module-level `renderToString()` for the full option list
     * @returns {string} newline-joined rows of characters
     */renderToString(t={}){return j(o({cols:this.cols||80,rows:this.rows||24,mode:this.opts.mode||"matrix",charSet:this.opts.charSet,invert:this.opts.invert,color:this.opts.color,align:this.opts.align},t))}
/**
     * Move the existing renderer/canvas to another container without creating a
     * second animation loop or renderer instance. A no-op resize (not a full
     * re-target) if `target` resolves to the current container.
     *
     * @param {string|HTMLElement} target - a CSS selector or a new container element
     * @returns {void}
     * @throws {Error} if `target` is a selector that matches no element
     */setTarget(t){const e="string"==typeof t?document.querySelector(t):t;if(!e)throw new Error("asciiam: target not found");e!==this.container?(this._unbindCursor(),this._ro&&this._ro.disconnect(),"static"===getComputedStyle(e).position&&(e.style.position="relative"),e.style.isolation="isolate",e.insertBefore(this.canvas,e.firstChild),this.container=e,this._bindCursor(),this._ro&&"ResizeObserver"in window&&(this._ro=new ResizeObserver(()=>this._scheduleResize()),this._ro.observe(e)),this._resize()):this._scheduleResize()}
/**
     * Configure an ordered set of mode steps without starting playback — call
     * {@link asciiam#playSequence} to begin. Interrupts and pauses an
     * already-running sequence first if one exists. See
     * docs/content/guides/sequences.md for the full step/transition contract.
     *
     * @param {Object[]} steps - ordered step definitions
     * @param {string} steps[].mode - animation mode for this step
     * @param {number} [steps[].duration=5] - step duration in seconds; non-positive/non-finite falls back to the default
     * @param {number} [steps[].delay=0] - delay in seconds before this step starts, after the previous one completes
     * @param {boolean} [steps[].repeat] - whether this step's own mode timeline loops within its duration; defaults from `steps[].options.loop` for backward compatibility, else `false`
     * @param {string|null} [steps[].image] - omit to retain the current image, `null` to clear it, a string to load a new one before the step's duration begins
     * @param {Object} [steps[].imageOptions] - forwarded to image sampling for this step
     * @param {*} [steps[].model] - omit to retain the current model, `null` to clear it, a source to load and wait on before the step's duration begins
     * @param {Object} [steps[].modelOptions] - forwarded to `setModel()` for this step
     * @param {Object} [steps[].options] - per-step option overrides applied via `setOption()` when this step activates
     * @param {Object} [steps[].transition] - `{ type: 'cut'|'blend'|'morph', duration, easing, style, spread }`; unrecognized `type` falls back to an instant `cut`
     * @param {(detail: Object) => void} [steps[].onStart] - called when this step activates
     * @param {(detail: Object) => void} [steps[].onComplete] - called when this step finishes normally
     * @param {(detail: Object) => void} [steps[].onInterrupt] - called if this step is interrupted (manual mode change, reconfigure, etc.)
     * @param {(detail: Object) => void} [steps[].onError] - called if this step's image/model fails to load
     * @param {Object} [options] - sequence-level options
     * @param {boolean} [options.loop=true] - whether the sequence restarts from step 0 after the last step completes
     * @param {boolean} [options.autoplay=false] - recorded on `opts.sequenceOptions` for code-export/inspection purposes; does not itself start playback — call `playSequence()`
     * @param {(detail: Object) => void} [options.onStepStart]
     * @param {(detail: Object) => void} [options.onStepComplete]
     * @param {(detail: Object) => void} [options.onStepInterrupt]
     * @param {(detail: Object) => void} [options.onComplete] - called when the sequence completes (only reachable when `loop` is false)
     * @returns {asciiam} `this`, for chaining
     * @throws {TypeError} if `steps` isn't an array, or a step is missing/malformed
     * @fires asciiam#sequenceInterrupt
     *
     * @example
     * anim.setSequence([
     *   { mode: 'wave', duration: 4 },
     *   { mode: 'matrix', duration: 4, transition: { type: 'blend', duration: 1 } },
     * ], { loop: true });
     * anim.playSequence();
     */setSequence(t,e={}){var s;if(!Array.isArray(t))throw new TypeError("asciiam: sequence steps must be an array");(null==(s=this._sequence)?void 0:s.running)&&((this._sequence.stepStarted||this._sequence.stepLoading)&&this._interruptSequenceStep("reconfigure"),this.pauseSequence("reconfigure"));const i=t.map((t,e)=>{var s,i,a;if(!t||"object"!=typeof t)throw new TypeError(`asciiam: sequence step ${e} must be an object`);if("string"!=typeof t.mode||!t.mode)throw new TypeError(`asciiam: sequence step ${e} requires a mode`);const r=Number(t.duration),n=Number(t.delay),h=Number(null==(s=t.transition)?void 0:s.duration),l=null==(i=t.transition)?void 0:i.type,c="blend"===l||"morph"===l?o({type:l,duration:Number.isFinite(h)&&h>0?h:.8,easing:["linear","easeIn","easeOut","easeInOut"].includes(t.transition.easing)?t.transition.easing:"easeInOut"},"morph"===l?{style:["dissolve","scramble","flow"].includes(t.transition.style)?t.transition.style:"dissolve",spread:Number.isFinite(Number(t.transition.spread))?Math.max(.02,Math.min(.9,Number(t.transition.spread))):.22}:{}):{type:"cut",duration:0,easing:"linear"};return{id:t.id||`step-${e+1}`,label:t.label||t.mode,mode:t.mode,duration:Number.isFinite(r)&&r>0?r:5,delay:Number.isFinite(n)&&n>0?n:0,
// `repeat` controls a mode's finite timeline within this step.
// Preserve configurations that previously used options.loop,
// while keeping one-shot sequence steps as the default.
repeat:!0===t.repeat||void 0===t.repeat&&!0===(null==(a=t.options)?void 0:a.loop),
// `undefined` retains the current image, `null` clears it, and a
// string loads a new source before this step's duration begins.
image:Object.prototype.hasOwnProperty.call(t,"image")?null===t.image?null:String(t.image):void 0,imageOptions:t.imageOptions&&"object"==typeof t.imageOptions?o({},t.imageOptions):{},
// Models follow the same retained-source contract as images:
// omitted retains, null clears, and a source waits for decode.
model:Object.prototype.hasOwnProperty.call(t,"model")?t.model:void 0,modelOptions:t.modelOptions&&"object"==typeof t.modelOptions?o({},t.modelOptions):{},options:t.options&&"object"==typeof t.options?o({},t.options):{},transition:c,onStart:"function"==typeof t.onStart?t.onStart:null,onComplete:"function"==typeof t.onComplete?t.onComplete:null,onInterrupt:"function"==typeof t.onInterrupt?t.onInterrupt:null,onError:"function"==typeof t.onError?t.onError:null}});return this._sequence={steps:i,index:-1,elapsed:0,delayElapsed:0,stepStarted:!1,stepLoading:!1,activationToken:0,startedOnce:!1,completed:!1,running:!1,loop:!1!==e.loop,onStepStart:"function"==typeof e.onStepStart?e.onStepStart:null,onStepComplete:"function"==typeof e.onStepComplete?e.onStepComplete:null,onStepInterrupt:"function"==typeof e.onStepInterrupt?e.onStepInterrupt:null,onComplete:"function"==typeof e.onComplete?e.onComplete:null},this.opts.sequence=i,this.opts.sequenceOptions=h(o({},e),{loop:!1!==e.loop,autoplay:!!e.autoplay}),this}
/**
     * Start or resume the configured sequence, and start the renderer if it isn't
     * already running. Restarts from step 0 (or `startIndex`) if the sequence
     * hasn't been started yet or previously completed; otherwise resumes from
     * wherever it was paused.
     *
     * @param {number} [startIndex] - step index to (re)start from (wraparound-normalized); omit to resume/continue from the current position
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#sequenceStart
     * @fires asciiam#sequenceResume
     */playSequence(t){const e=this._sequence;if(!e||!e.steps.length)return this;const s=e.index<0||e.completed;if(e.running=!0,void 0!==t||s){const e=void 0===t?0:this._normalizeSequenceIndex(t);this._activateSequenceStep(e)}return this._emit(s?"sequenceStart":"sequenceResume",this._sequenceDetail()),this.start(),this}
/**
     * Pauses sequence time without stopping the renderer — the current step's
     * mode keeps animating, but its own timeline and the sequence's step timer
     * stop advancing. A no-op if not currently running.
     *
     * @param {string} [reason="pause"] - included in the `sequencePause` event detail
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#sequencePause
     */pauseSequence(t="pause"){var e;return(null==(e=this._sequence)?void 0:e.running)?(this._sequence.running=!1,this._emit("sequencePause",this._sequenceDetail({reason:t})),this):this}
/**
     * Stops sequence playback and resets its position to before step 0, clearing
     * any in-progress morph transition. A no-op if no sequence is configured.
     *
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#sequenceStop
     */stopSequence(){return this._sequence?((this._sequence.stepStarted||this._sequence.stepLoading)&&this._interruptSequenceStep("stop"),this._sequence.running=!1,this._sequence.index=-1,this._sequence.elapsed=0,this._sequence.delayElapsed=0,this._sequence.stepStarted=!1,this._sequence.stepLoading=!1,this._sequence.activationToken++,this._sequence.startedOnce=!1,this._sequence.completed=!1,this._clearMorph(),this._emit("sequenceStop",this._sequenceDetail({reason:"stop"})),this):this}
/**
     * Stops playback (see {@link asciiam#stopSequence}) and removes the configured
     * sequence entirely — a subsequent `setSequence()` call is required before
     * playing again.
     *
     * @returns {asciiam} `this`, for chaining
     */clearSequence(){return this.stopSequence(),this._sequence=null,this.opts.sequence=null,this.opts.sequenceOptions=null,this}
/**
     * Selects a step using normalized wraparound indexing (negative or
     * out-of-range indices wrap into range), interrupting the active step first
     * if one is in progress.
     *
     * @param {number} index - target step index; wraps via {@link asciiam#_normalizeSequenceIndex}
     * @returns {asciiam} `this`, for chaining
     */seekSequence(t){var e;return(null==(e=this._sequence)?void 0:e.steps.length)?((this._sequence.stepStarted||this._sequence.stepLoading)&&this._interruptSequenceStep("seek"),this._activateSequenceStep(this._normalizeSequenceIndex(t)),this):this}
/**
     * Interrupts the active step and advances to the next one, honoring the
     * sequence's loop policy (wraps to step 0 and fires `sequenceLoop` if looping,
     * otherwise completes the sequence at the end).
     *
     * @returns {asciiam} `this`, for chaining
     * @fires asciiam#sequenceLoop
     */nextSequenceStep(){const t=this._sequence;if(!(null==t?void 0:t.steps.length))return this;(t.stepStarted||t.stepLoading)&&this._interruptSequenceStep("skip");const e=t.index+1;return e<t.steps.length?this._activateSequenceStep(e):t.loop?(this._emit("sequenceLoop",this._sequenceDetail()),this._activateSequenceStep(0)):this._completeSequence(),this}
/**
     * @returns {{configured: boolean, running: boolean, completed: boolean, index: number, length: number, loop: boolean, elapsed: number, waiting: boolean, loading: boolean, morphing: boolean, morphProgress: number}} a serializable snapshot of sequence playback state
     */getSequenceState(){var t,e,s,i,a;const r=this._sequence;return{configured:!!(null==r?void 0:r.steps.length),running:!!(null==r?void 0:r.running),completed:!!(null==r?void 0:r.completed),index:null!=(t=null==r?void 0:r.index)?t:-1,length:null!=(e=null==r?void 0:r.steps.length)?e:0,loop:null!=(s=null==r?void 0:r.loop)&&s,elapsed:null!=(i=null==r?void 0:r.elapsed)?i:0,waiting:!!r&&r.index>=0&&!r.stepStarted,loading:!!(null==r?void 0:r.stepLoading),morphing:!!(null==(a=this._morph)?void 0:a.started),morphProgress:this._morph?Math.min(1,this._morph.elapsed/this._morph.duration):0}}
/**
     * @returns {{requested: "auto"|"webgl2"|"webgpu"|"canvas2d", backend: "webgl2"|"webgpu"|"canvas2d", gpuPreferred: boolean, acceleration: "gpu-api-preferred"|"browser-managed"|"not-requested", desynchronized: boolean, willReadFrequently: boolean}} the requested renderer policy and the currently-resolved backend
     */getRendererInfo(){var t,e,s;const i=(null==(t=this._webgl)?void 0:t.gl)||this.ctx,a="function"==typeof(null==i?void 0:i.getContextAttributes)?i.getContextAttributes():null;return{requested:this._rendererRequested,backend:this._renderer,gpuPreferred:this._gpuPreferred,acceleration:"webgl2"===this._renderer||"webgpu"===this._renderer?"gpu-api-preferred":this._gpuPreferred?"browser-managed":"not-requested",desynchronized:null!=(e=null==a?void 0:a.desynchronized)?e:this._desynchronized,willReadFrequently:null!=(s=null==a?void 0:a.willReadFrequently)&&s}}
/**
     * Explicitly switches the presentation backend, replacing the canvas and
     * renderer resources while retaining instance-level state (options, grid,
     * timing). A no-op returning the current backend if `renderer` already
     * resolves to what's active. `"auto"`/`"webgpu"` initialize asynchronously —
     * `rendererChange` fires once WebGPU is actually ready, not immediately.
     *
     * @param {"auto"|"webgl2"|"webgpu"|"canvas2d"} renderer - backend to switch to
     * @param {string} [requestedRenderer=renderer] - the policy recorded on `opts.renderer`/`getRendererInfo().requested`; distinct from `renderer` only in fallback call paths recording what was originally asked for
     * @returns {"webgl2"|"webgpu"|"canvas2d"} the backend now active (may not equal `renderer` yet if `"webgpu"` init is still pending)
     * @throws {TypeError} if `renderer` isn't one of the four valid values
     * @throws {Error} if no backend (including the Canvas 2D fallback) could be initialized
     * @fires asciiam#rendererChange
     * @fires asciiam#rendererFallback
     */setRenderer(t,e=t){if(!["auto","webgl2","webgpu","canvas2d"].includes(t))throw new TypeError('asciiam: renderer must be "auto", "webgl2", "webgpu", or "canvas2d"');const s="canvas2d"!==t,i="webgpu"===t||"auto"===t&&z();if(t===this._renderer&&"webgpu"!==this._renderer||i&&"webgpu"===this._renderer||!s&&"canvas2d"===this._renderer){const t=this._rendererRequested!==e;return this._rendererRequested=e,this.opts.renderer=e,t&&this._emit("rendererChange",this.getRendererInfo()),this._renderer}const a=this.canvas,r=document.createElement("canvas");if(r.style.cssText=a.style.cssText,r.setAttribute("aria-hidden","true"),r.setAttribute("role","presentation"),a.replaceWith(r),this._io&&(this._io.disconnect(),this._io.observe(r)),this._webgl&&this._webgl.destroy(),this._onWebGLContextLost&&a.removeEventListener("webglcontextlost",this._onWebGLContextLost),this.canvas=r,this._ownsCanvas=!0,this._webgl=null,i){this._renderer="webgpu";try{this._webgl=new X(r,{powerPreference:this.opts.powerPreference}),this._webgl.onDeviceLost=t=>this._fallbackFromWebGPU(t),this._webgl.ready.then(()=>{["auto","webgpu"].includes(this._rendererRequested)&&this._webgl&&(this._resize(),this._emit("rendererChange",this.getRendererInfo()))},t=>this._fallbackFromWebGPU(t))}catch(t){this._fallbackFromWebGPU(t)}}else if(s)try{this._webgl=new V(r,{desynchronized:this._desynchronized,powerPreference:this.opts.powerPreference})}catch(e){"webgl2"===t&&console.warn("asciiam: WebGL2 initialization failed; using Canvas 2D.",e)}if(i||(this._renderer=this._webgl?"webgl2":"canvas2d"),this._webgl instanceof V&&this._bindWebGLFallback(),this._webgl){const t=document.createElement("canvas");this.ctx=t.getContext("2d",{alpha:!0,willReadFrequently:!1})}else this.ctx=r.getContext("2d",{alpha:!0,desynchronized:this._desynchronized,willReadFrequently:!1}),!this.ctx&&s&&(this._replacePresentationCanvas(),this.ctx=this.canvas.getContext("2d",{alpha:!0,desynchronized:this._desynchronized,willReadFrequently:!1})||this.canvas.getContext("2d",{alpha:!0}));if(!this.ctx)throw new Error("asciiam: failed to initialize renderer fallback");return this._rendererRequested=e,this.opts.renderer=e,this._webglAtlas=null,this._activeGlyphAtlas=null,this._waveBaseLayer=null,this._buildFontCache(),this._resize(),this._emit("rendererChange",this.getRendererInfo()),this._renderer}
/**
     * Replaces an unavailable WebGPU surface with WebGL2 (preferred) or Canvas 2D.
     * Called on WebGPU init failure/rejection or device loss. A no-op if the
     * instance is disabled or the current renderer isn't WebGPU (guards against a
     * stale async callback firing after a later, unrelated renderer change).
     *
     * @private
     * @param {Error|string} [reason] - the WebGPU failure reason; logged as a warning and included in the `rendererFallback` event
     * @returns {void}
     * @fires asciiam#rendererFallback
     */_fallbackFromWebGPU(t){var e;if(!this._disabled&&"webgpu"===this._renderer){t&&console.warn("asciiam: WebGPU initialization failed; using Canvas 2D.",t),this._webgl&&this._webgl.destroy(),this._webgl=null,this._replacePresentationCanvas();try{this._webgl=new V(this.canvas,{desynchronized:this._desynchronized,powerPreference:null==(e=this.opts)?void 0:e.powerPreference})}catch(t){this._webgl=null}if(this._webgl){this._renderer="webgl2",this._bindWebGLFallback();const t=document.createElement("canvas");this.ctx=t.getContext("2d",{alpha:!0,willReadFrequently:!1})}else this.ctx=this.canvas.getContext("2d",{alpha:!0,desynchronized:this._desynchronized,willReadFrequently:!1})||this.canvas.getContext("2d",{alpha:!0}),this._renderer="canvas2d";this.ctx&&this.opts&&(this._buildFontCache(),this._resize()),this._emit("rendererFallback",o({reason:"webgpu-unavailable",detail:String((null==t?void 0:t.message)||t||"unavailable")},this.getRendererInfo()))}}
/**
     * Swaps in a fresh presentation canvas (used when falling back off a backend that
     * failed to initialize). Always re-targets the IntersectionObserver at the new
     * element — the observer was bound to the old canvas in `_bindLifecycle()`, and an
     * observed element that gets detached from the document (`replaceWith` here) never
     * reports `isIntersecting` again, which would otherwise leave `_visible` stuck at
     * `false` and `_runFrame()` permanently skipping every frame.
     *
     * @private
     * @returns {HTMLCanvasElement} the new canvas, now assigned to `this.canvas`
     */_replacePresentationCanvas(){const t=this.canvas,e=document.createElement("canvas");return e.style.cssText=t.style.cssText,e.setAttribute("aria-hidden",t.getAttribute("aria-hidden")||"true"),e.setAttribute("role",t.getAttribute("role")||"presentation"),t.parentNode&&t.replaceWith(e),this.canvas=e,this._ownsCanvas=!0,this._io&&(this._io.disconnect(),this._io.observe(e),this._visible=!0,this._lastT=null),e}
/**
     * Attaches a `webglcontextlost` listener that falls back to Canvas 2D — a lost
     * WebGL2 context is generally unrecoverable in-place, so this recovers by
     * switching backends rather than attempting `webglcontextrestored`.
     *
     * @private
     * @returns {void}
     * @listens webglcontextlost
     * @fires asciiam#rendererFallback
     */_bindWebGLFallback(){this._onWebGLContextLost=t=>{t.preventDefault();const e=this._rendererRequested;this.setRenderer("canvas2d",e),this._emit("rendererFallback",o({reason:"context-lost"},this.getRendererInfo()))},this.canvas.addEventListener("webglcontextlost",this._onWebGLContextLost,!1)}
/**
     * Clamp and round a caller-supplied step index into `[0, steps.length - 1]`.
     *
     * @private
     * @param {number} index - candidate step index
     * @returns {number} the clamped, rounded index
     */_normalizeSequenceIndex(t){const e=Math.max(0,this._sequence.steps.length-1);return Math.max(0,Math.min(e,Math.round(Number(t)||0)))}
/**
     * Reset per-step playback state and jump to `index`, starting it immediately
     * if it has no delay, or leaving it pending for `_advanceSequence()` to start
     * once the delay elapses.
     *
     * @private
     * @param {number} index - step index to activate, already normalized
     * @returns {void}
     */_activateSequenceStep(t){const e=this._sequence;e.stepLoading&&this._cancelSequenceLoads(),e.index=t,e.elapsed=0,e.delayElapsed=0,e.stepStarted=!1,e.stepLoading=!1,e.activationToken++,e.completed=!1,0===e.steps[t].delay&&this._startSequenceStep()}
/**
     * Starts loading whatever the active step's `image`/`model` requires (skipping
     * a source already loaded), preparing an outgoing morph snapshot first if this
     * isn't the sequence's first step. Commits the step immediately if nothing
     * needs loading, otherwise defers to {@link asciiam#_commitSequenceStep} once
     * loading resolves. A no-op if the step is already started or loading.
     *
     * @private
     * @returns {void}
     * @fires asciiam#sequenceStepError
     */_startSequenceStep(){const t=this._sequence,e=t.steps[t.index];if(t.stepStarted||t.stepLoading)return;const s=t.activationToken,i=void 0===e.imageOptions.animated?"":String(!!e.imageOptions.animated),a="string"==typeof e.image&&(e.image!==this._loadedImageSource||i!==this._loadedImageOptionsKey),r=void 0!==e.model&&null!==e.model&&e.model!==this._loadedModelSource;t.startedOnce&&this._prepareMorph(e.transition,a||r),null===e.image&&this.clearImage(),null===e.model&&this.clearModel();const n=a?this.setImage(e.image,e.imageOptions):null,o=r?this.setModel(e.model,e.modelOptions):null;if(n||o)return t.stepLoading=!0,void Promise.all([n,o].filter(Boolean)).then(i=>{i.some(t=>!t)||t.activationToken!==s||(t.stepLoading=!1,t.running&&this._commitSequenceStep(e))}).catch(i=>{if(t.activationToken!==s)return;t.stepLoading=!1,t.running=!1,this._clearMorph();const a=this._sequenceDetail({step:e,reason:"source-error",error:i});this._callSequenceCallback(e.onError,a),this._emit("sequenceStepError",a)});this._commitSequenceStep(e)}
/**
     * Applies a decoded sequence step's options/mode and starts its timed
     * lifecycle — the step is now actively animating.
     *
     * @private
     * @param {Object} step - the normalized step to commit, see {@link asciiam#setSequence}
     * @returns {void}
     * @fires asciiam#sequenceStepStart
     */_commitSequenceStep(t){const e=this._sequence;this._applyingSequence=!0;try{for(const[e,s]of Object.entries(t.options))"mode"!==e&&"image"!==e&&"model"!==e&&"loop"!==e&&"sequence"!==e&&"sequenceOptions"!==e&&this.setOption(e,s);this.setOption("loop",t.repeat),this.setMode(t.mode,!0)}finally{this._applyingSequence=!1}e.startedOnce&&this._startPreparedMorph(t.transition),e.stepStarted=!0,e.startedOnce=!0;const s=this._sequenceDetail({step:t});this._callSequenceCallback(t.onStart,s),this._callSequenceCallback(e.onStepStart,s),this._emit("sequenceStepStart",s)}
/**
     * Fires a step's completion callbacks/event when its duration elapses
     * naturally (called by {@link asciiam#_advanceSequence}, not user code).
     *
     * @private
     * @returns {void}
     * @fires asciiam#sequenceStepComplete
     */_completeSequenceStep(){const t=this._sequence,e=t.steps[t.index],s=this._sequenceDetail({step:e,reason:"complete"});this._callSequenceCallback(e.onComplete,s),this._callSequenceCallback(t.onStepComplete,s),this._emit("sequenceStepComplete",s),t.stepStarted=!1}
/**
     * Cancels the active step's pending loads/morph and fires its interrupt
     * callbacks/event — called before manually seeking, skipping, stopping, or
     * reconfiguring a step that hasn't completed on its own.
     *
     * @private
     * @param {string} reason - included in the `sequenceStepInterrupt` event detail (e.g. `"seek"`, `"skip"`, `"stop"`, `"mode-change"`, `"reconfigure"`)
     * @returns {void}
     * @fires asciiam#sequenceStepInterrupt
     */_interruptSequenceStep(t){const e=this._sequence,s=e.steps[e.index];e.stepLoading&&this._cancelSequenceLoads(),this._clearMorph();const i=this._sequenceDetail({step:s,reason:t});this._callSequenceCallback(null==s?void 0:s.onInterrupt,i),this._callSequenceCallback(e.onStepInterrupt,i),this._emit("sequenceStepInterrupt",i),e.stepStarted=!1,e.stepLoading=!1,e.activationToken++}
/**
     * Marks the sequence complete (only reachable when `loop` is false and the
     * last step finishes) and fires its completion callback/event.
     *
     * @private
     * @returns {void}
     * @fires asciiam#sequenceComplete
     */_completeSequence(){const t=this._sequence;t.running=!1,t.completed=!0;const e=this._sequenceDetail({reason:"complete"});this._callSequenceCallback(t.onComplete,e),this._emit("sequenceComplete",e)}
/**
     * Builds the common detail object passed to sequence callbacks/events.
     *
     * @private
     * @param {Object} [extra={}] - additional fields merged into (and overriding) the base detail
     * @returns {{index: number, length: number, loop: boolean, elapsed: number, step: Object|null}} sequence event detail
     */_sequenceDetail(t={}){var e,s,i,a;const r=this._sequence;return o({index:null!=(e=null==r?void 0:r.index)?e:-1,length:null!=(s=null==r?void 0:r.steps.length)?s:0,loop:null!=(i=null==r?void 0:r.loop)&&i,elapsed:null!=(a=null==r?void 0:r.elapsed)?a:0,step:r&&r.index>=0?r.steps[r.index]:null},t)}
/**
     * Invoke a user-supplied sequence/step callback, catching and logging (rather
     * than propagating) any error it throws so one broken callback can't stall
     * sequence playback.
     *
     * @private
     * @param {((detail: Object, instance: asciiam) => void)|null|undefined} callback - the callback to invoke, if any
     * @param {Object} detail - event detail, see {@link asciiam#_sequenceDetail}
     * @returns {void}
     */_callSequenceCallback(t,e){if(t)try{t(e,this)}catch(t){console.error("asciiam: sequence callback failed",t)}}
/**
     * Capture the outgoing presentation before incoming source preparation begins.
     * `transition.type === 'morph'` captures real per-cell "before" state (see
     * `_prepareRealMorph`); `'blend'`, and any transition kept alive only to bridge
     * an async image/model load (`retainDuringLoad`), fall back to the original
     * whole-canvas crossfade — a real per-cell morph has no "after" cells to work
     * with until that load finishes, so there is nothing to morph toward yet.
     *
     * @private
     * @param {Object} transition - the incoming step's transition config, see {@link asciiam#setSequence}
     * @param {boolean} [retainDuringLoad=false] - true when bridging an async image/model load rather than an immediate mode change
     * @returns {void}
     */_prepareMorph(t,e=!1){if(this._clearMorph(),!this._reduced&&!e&&"morph"===(null==t?void 0:t.type)&&this._prepareRealMorph(t))return;const s=!this._reduced&&("blend"===(null==t?void 0:t.type)||"morph"===(null==t?void 0:t.type));(s||e)&&this.canvas.parentElement&&this._createBlendSnapshot(t,s)}
/**
     * Rasterizes the canvas as it currently appears into an offscreen overlay
     * element, faded out over the transition by `_advanceMorph`. Shared by
     * `_prepareMorph` (called before a step's options mutate `this.opts`, so the
     * canvas still shows the outgoing content) and `_startPreparedMorph`'s
     * grid-mismatch recovery path (called right after mutation but before the next
     * paint, so the canvas — not yet repainted — still shows the outgoing content
     * there too).
     *
     * @private
     * @param {Object} transition - the transition config, see {@link asciiam#setSequence}
     * @param {boolean} isBlend - true for a real `type: 'blend'` fade; false when only bridging an async load (`retainDuringLoad`) with no actual fade requested
     * @returns {void}
     */_createBlendSnapshot(t,e){const s=1e3*Math.max(.05,Number(null==t?void 0:t.duration)||.8),i=document.createElement("canvas");i.width=this.canvas.width,i.height=this.canvas.height,i.className="asciiam-morph-layer",i.setAttribute("aria-hidden","true"),i.style.cssText=this.canvas.style.cssText,i.style.pointerEvents="none",i.style.opacity="1",i.style.willChange="opacity";try{const t=i.getContext("2d",{alpha:!0});if(!t)return;t.drawImage(this.canvas,0,0)}catch(t){return}this.canvas.after(i),this._morph={kind:"blend",canvas:i,elapsed:0,duration:s,easing:(null==t?void 0:t.easing)||"easeInOut",isBlend:e,started:!1}}
/**
     * Captures the current frame's cells (CPU-side char/opacity/color per cell, no
     * canvas/pixel readback) into a pooled buffer and prepares real per-cell morph
     * state. Returns false — caller falls back to the whole-canvas blend — when the
     * active scene can't be captured cell-by-cell: a composited `setLayers()` scene
     * has no single per-cell color (multiple layers blend at the pixel level, not
     * the cell level), and an empty grid has nothing to capture.
     *
     * @private
     * @param {Object} transition - the `type: 'morph'` transition config, see {@link asciiam#setSequence}
     * @returns {boolean} true if real per-cell morph state was prepared; false if the caller should fall back to a whole-canvas blend
     */_prepareRealMorph(t){if(this._layers&&this._layers.length||!this.cols||!this.rows)return!1;const e=this._captureMorphFrame("_morphCaptureA");return!!e&&(this._morph={kind:"morph",capture:e,matches:null,progress:0,elapsed:0,duration:1e3*Math.max(.05,Number(null==t?void 0:t.duration)||.8),easing:(null==t?void 0:t.easing)||"easeInOut",style:(null==t?void 0:t.style)||"dissolve",feather:Number.isFinite(null==t?void 0:t.spread)?t.spread:.22,started:!1},!0)}
/**
     * Runs the current mode's normal per-cell compute loop (dense/sparse/mesh —
     * whichever the active `this.opts.mode` would use to paint right now) but
     * records each resolved cell's char/opacity/level/bold and fully-resolved color
     * into `this[bufferProp]` instead of drawing it. Reuses `_prepareModeFrame()`/
     * `_pulseFactor`/animated-color/gradient setup so the capture matches exactly
     * what was (or is about to be) on screen. Sparse modes are advanced by `dt`
     * inside their own draw loop, so this passes `dt = 0` to avoid double-advancing
     * particle state — this call is a snapshot of the current instant, not an extra
     * animation tick.
     *
     * @private
     * @param {"_morphCaptureA"|"_morphCaptureB"} bufferProp - which pooled instance buffer to write into
     * @returns {Object|null} the filled buffer (`this[bufferProp]`), or `null` if the current scene can't be captured (composited layers, or an empty grid)
     */_captureMorphFrame(t){var e;if(this._layers&&this._layers.length||!this.cols||!this.rows)return null;const s=this._ensureMorphBuffer(this[t],this.cols,this.rows);this[t]=s,this._prepareModeFrame(),this._pulseFactor=this.opts.pulse?Math.max(0,1+this.opts.pulse.amplitude*Math.sin(this._time*(null!=(e=this.opts.pulse.speed)?e:1))):1,this._updateAnimatedColor();const i=this.opts.gradient&&!this.opts.colorFromImage?this._getGradient():null;this._activeGlyphAtlas=this._getGlyphAtlas(),this._morphRecording=s;try{"mesh"===this.opts.mode?this._drawMesh(i):D.has(this.opts.mode)?(this._imageGrid&&this._drawImageSourceBase(i),this._drawSparse(0,i)):this._drawDense(i),this._mesh&&this._meshRasterizer&&"mesh"!==this.opts.mode&&this._drawMesh(i)}finally{this._morphRecording=null}return s}
/**
     * Pooled cols*rows cell-capture buffer; grown (never shrunk) across
     * transitions to avoid repeated allocation for a stable grid size.
     *
     * @private
     * @param {Object|null} buffer - existing pooled buffer to reuse/grow, or null to allocate fresh
     * @param {number} cols - current grid column count
     * @param {number} rows - current grid row count
     * @returns {{cols: number, rows: number, chars: (string|null)[], colors: (string|null)[], opacity: Float32Array, level: Uint8Array, bold: Uint8Array}} the buffer, ready to be filled
     */_ensureMorphBuffer(t,e,s){const i=e*s;return!t||t.chars.length<i?t={cols:e,rows:s,chars:new Array(i).fill(null),colors:new Array(i).fill(null),opacity:new Float32Array(i),level:new Uint8Array(i),bold:new Uint8Array(i)}:(t.cols=e,t.rows=s,t.chars.fill(null,0,i)),t}
/**
     * Reads a captured cell back into a pooled scratch object; null if that cell
     * was blank (never captured, or captured as blank).
     *
     * @private
     * @param {Object|null} buffer - a filled capture buffer, see {@link asciiam#_ensureMorphBuffer}
     * @param {number} index - flat cell index (`row * cols + col`)
     * @param {Object} scratch - pooled cell object written in place and returned
     * @returns {Object|null} `scratch`, or `null` if `buffer` is missing or that cell was blank
     */_readMorphCell(t,e,s){if(!t)return null;const i=t.chars[e];return null===i?null:(s.char=i,s.opacity=t.opacity[e],s.level=t.level[e],s.bold=1===t.bold[e],s.color=t.colors[e],s)}
/**
     * Builds the before→after cell-position match table for the 'flow' style: for
     * each live cell, search a small fixed-radius ring for an unclaimed captured
     * "before" cell with the same character, so it can visually slide into place
     * instead of dissolving. Runs once at transition start (not per frame); bounded
     * by radius regardless of character distribution, and skipped outright above a
     * cell-count ceiling, so it can't become a per-frame or unbounded cost. Degrades
     * to 'dissolve' whenever a same-size, non-layered "after" snapshot isn't
     * available — matching needs both snapshots at identical grid dimensions.
     *
     * @private
     * @returns {void}
     */_buildMorphMatches(){const t=this._morph;if(!t||"morph"!==t.kind)return;const e=t.capture.cols,s=t.capture.rows,i=e*s;if(this._layers&&this._layers.length||this.cols!==e||this.rows!==s||i>2e4)return void(t.style="dissolve");const a=this._captureMorphFrame("_morphCaptureB");if(!a)return void(t.style="dissolve");const r=this._morphClaimed&&this._morphClaimed.length>=i?this._morphClaimed:new Uint8Array(i);r.fill(0,0,i),this._morphClaimed=r;const n=new Int32Array(i).fill(-1),o=t.capture.chars;for(let t=0;t<s;t++)for(let i=0;i<e;i++){const h=t*e+i,l=a.chars[h];if(null===l)continue;let c=-1,d=1/0;for(let a=-3;a<=3;a++){const n=t+a;if(!(n<0||n>=s))for(let t=-3;t<=3;t++){const s=i+t;if(s<0||s>=e)continue;const h=n*e+s;if(r[h]||o[h]!==l)continue;const u=a*a+t*t;u<d&&(d=u,c=h)}}c>=0&&(r[c]=1,n[h]=c)}t.matches=n}
/**
     * Reveal the live incoming state beneath the retained outgoing frame — called
     * once the incoming step's options have already mutated `this.opts`, right
     * after {@link asciiam#_prepareMorph} captured the outgoing state. Falls back
     * to a whole-canvas blend if the step's own options resized the grid
     * mid-transition (a real `morph` can't align mismatched captured/live indices).
     *
     * @private
     * @param {Object} transition - the incoming step's transition config, see {@link asciiam#setSequence}
     * @returns {void}
     * @fires asciiam#sequenceMorphStart
     */_startPreparedMorph(t){if(!this._morph||"blend"!==this._morph.kind||this._morph.isBlend){if(this._morph||(this._prepareMorph(t),this._morph)){if("morph"===this._morph.kind)if(this.cols!==this._morph.capture.cols||this.rows!==this._morph.capture.rows){const e=!this._reduced&&"cut"!==(null==t?void 0:t.type);if(this._morph=null,e&&this.canvas.parentElement&&this._createBlendSnapshot(t,e),!this._morph)return}else"flow"===this._morph.style&&this._buildMorphMatches();this._morph.started=!0,this._emit("sequenceMorphStart",this._sequenceDetail({transition:t}))}}else this._clearMorph()}
/**
     * Advances the active transition's eased progress and, for a `blend`
     * transition, the outgoing snapshot's CSS opacity. Emits `sequenceMorphComplete`
     * and clears transition state once progress reaches 1. A no-op if no
     * transition has started.
     *
     * @private
     * @param {number} dt - elapsed time since the last frame, in milliseconds
     * @returns {void}
     * @fires asciiam#sequenceMorphComplete
     */_advanceMorph(t){const e=this._morph;if(!(null==e?void 0:e.started))return;e.elapsed=Math.min(e.duration,e.elapsed+Math.max(0,t));const s=e.elapsed/e.duration;let i=s;if("easeIn"===e.easing?i=s*s:"easeOut"===e.easing?i=1-(1-s)*(1-s):"easeInOut"===e.easing&&(i=s<.5?2*s*s:1-Math.pow(-2*s+2,2)/2),"morph"!==e.kind){if(e.canvas.style.opacity=String(1-i),s>=1){const t=this._sequenceDetail({transition:{type:"blend",duration:e.duration/1e3,easing:e.easing}});this._clearMorph(),this._emit("sequenceMorphComplete",t)}}else if(e.progress=i,s>=1){const t=this._sequenceDetail({transition:{type:"morph",style:e.style,duration:e.duration/1e3,easing:e.easing}});this._clearMorph(),this._emit("sequenceMorphComplete",t)}}
/**
     * Removes an active `blend` transition's DOM overlay (if any) and clears
     * transition state entirely. Safe to call whether or not a transition is
     * active.
     *
     * @private
     * @returns {void}
     */_clearMorph(){var t;"blend"===(null==(t=this._morph)?void 0:t.kind)&&this._morph.canvas.parentElement&&this._morph.canvas.remove(),this._morph=null}
/**
     * Cancel every source preparation owned by an interrupted sequence step:
     * bumps every load-cancellation token (so an already-in-flight load's
     * `.then()`/`.onload` sees a mismatched token and no-ops) and aborts the
     * active model load's `AbortController`.
     *
     * @private
     * @returns {void}
     */_cancelSequenceLoads(){var t;this._imageLoadToken++,this._imageCaptureToken++,this._modelLoadToken++,null==(t=this._modelAbortController)||t.abort()}
/**
     * Consumes elapsed time against the active step's delay-then-duration
     * timeline, starting the step once its delay elapses and completing/advancing
     * it once its duration elapses — looping within one call if `dt` spans
     * multiple step boundaries (e.g. after a long tab-hidden gap). A no-op if no
     * sequence is configured or running.
     *
     * @private
     * @param {number} dt - elapsed time since the last frame, in milliseconds
     * @returns {void}
     */_advanceSequence(t){const e=this._sequence;if(!(null==e?void 0:e.running)||!e.steps.length)return;let s=Math.max(0,t)/1e3;for(;s>0&&e.running;){const t=e.steps[e.index];if(!e.stepStarted){const i=Math.max(0,t.delay-e.delayElapsed),a=Math.min(s,i);if(e.delayElapsed+=a,s-=a,e.delayElapsed+Number.EPSILON<t.delay)return;if(this._startSequenceStep(),!e.stepStarted)return;if(s<=0)return}const i=Math.max(0,t.duration-e.elapsed),a=Math.min(s,i);if(e.elapsed+=a,s-=a,e.elapsed+Number.EPSILON<t.duration)return;this._completeSequenceStep();const r=e.index+1;r<e.steps.length?this._activateSequenceStep(r):e.loop?(this._emit("sequenceLoop",this._sequenceDetail()),this._activateSequenceStep(0)):this._completeSequence()}}
/**
     * Loads and samples an image (raster, SVG, or animated GIF) into the ASCII
     * grid (requires `imageEnabled: true`, or `mode: "image"`, to actually render).
     * A new call cancels any load already in flight. Passing a nullish/empty `src`
     * clears the image instead of loading (equivalent to {@link asciiam#clearImage}).
     *
     * @param {string|null} src - image URL, or nullish/empty to clear instead of loading
     * @param {Object} [options]
     * @param {boolean} [options.animated] - force animated-GIF handling on/off; auto-detected from `src`'s extension/data URI when omitted
     * @returns {Promise<HTMLImageElement|null>} the loaded `<img>` once sampled, or `null` if cleared, failed, or superseded by a later call
     * @throws {*} rejects with the underlying `<img>` error event if loading fails and wasn't superseded
     */setImage(t,e={}){if(null==t||""===t)return this.clearImage(),Promise.resolve(null);this.opts.image=String(t);const s=++this._imageLoadToken,i=++this._imageCaptureToken;return null!==this._imageRecaptureTimer&&clearTimeout(this._imageRecaptureTimer),this._imageRecaptureTimer=null,this._capturedImageFrames=null,this._animatedImageData=null,this._imageFrameIndex=0,new Promise((a,r)=>{const n=new Image;n.crossOrigin="anonymous",n.onload=()=>c(this,null,function*(){var r;if(s!==this._imageLoadToken||this._destroyed)a(null);else{if(this._sourceImage=n,this._loadedImageSource=String(t),this._loadedImageOptionsKey=void 0===e.animated?"":String(!!e.animated),this._animatedImage=null!=(r=e.animated)?r:/^(?:data:image\/gif)|\.gif(?:$|[?#])/i.test(String(t)),this._imageFrameAccumulator=0,this._resampleImage(),this._animatedImage)try{yield this._captureAnimatedImageFrames(t,s,i)}catch(t){console.warn("asciiam: exact GIF frame capture unavailable; using browser frame sampling.",t)}s!==this._imageLoadToken||this._destroyed?a(null):a(n)}}),n.onerror=e=>{s!==this._imageLoadToken||this._destroyed?a(null):(console.warn("asciiam: failed to load image:",t),this.opts.onImageError&&this.opts.onImageError(e),r(e))},n.src=t})}
/**
     * Clears the sampled image (and any captured GIF frames) while retaining the
     * active procedural mode. Cancels a load already in flight.
     *
     * @returns {asciiam} `this`, for chaining
     */clearImage(){return this._imageLoadToken++,this._imageCaptureToken++,null!==this._imageRecaptureTimer&&clearTimeout(this._imageRecaptureTimer),this._imageRecaptureTimer=null,this._sourceImage=null,this._loadedImageSource=null,this._loadedImageOptionsKey=null,this._imageGrid=null,this._capturedImageFrames=null,this._animatedImageData=null,this._animatedImage=!1,this._imageFrameIndex=0,this._imageFrameAccumulator=0,this._activeGlyphAtlas=null,this.opts.image=null,this}
/**
     * Decodes a GIF once via `ImageDecoder` (WebCodecs) and stores per-frame ASCII
     * grids instead of retaining raw bitmaps, so playback afterward is just
     * grid-swapping. Falls back silently (returns `false`) when `ImageDecoder` or
     * GIF decoding support is unavailable — the caller then relies on
     * browser-timed `<img>` frame sampling instead. Yields to the main thread
     * periodically so a long GIF's decode doesn't block interaction.
     *
     * @private
     * @async
     * @param {string|null} src - GIF URL to fetch; `null` reuses already-fetched bytes (see {@link asciiam#_scheduleAnimatedFrameCapture})
     * @param {number} [token] - image-load cancellation token to check against `this._imageLoadToken`
     * @param {number} [captureToken] - capture-specific cancellation token to check against `this._imageCaptureToken`
     * @returns {Promise<boolean>} true if frames were captured; false if unsupported, cancelled, or the GIF has fewer than 2 frames
     * @throws {Error} if the fetch itself fails (network error or non-ok response)
     * @fires asciiam#imageFramesReady
     */_captureAnimatedImageFrames(t){return c(this,arguments,function*(t,e=this._imageLoadToken,s=this._imageCaptureToken){const i=globalThis.ImageDecoder;if("function"!=typeof i)return!1;if("function"==typeof i.isTypeSupported&&!(yield i.isTypeSupported("image/gif")))return!1;let a=this._animatedImageData;if(!a){const i=yield fetch(t);if(!i.ok)throw new Error(`GIF fetch failed with ${i.status}`);if(a=yield i.arrayBuffer(),e!==this._imageLoadToken||s!==this._imageCaptureToken||this._destroyed)return!1;this._animatedImageData=a}const r=new i({data:a,type:"image/gif",preferAnimation:!0});try{yield r.tracks.ready;const t=r.tracks.selectedTrack,i=(null==t?void 0:t.frameCount)||0;if(i<2)return!1;const a=this._sourceImage,n=this._imageGrid,o=new Array(i);let h=0;for(let t=0;t<i;t++){if(e!==this._imageLoadToken||s!==this._imageCaptureToken||this._destroyed)return!1;const i=(yield r.decode({frameIndex:t,completeFramesOnly:!0})).image;try{this._sourceImage=i,this._resampleImage();const e=this._imageGrid,s=Math.max(10,Number(i.duration)>0?Number(i.duration)/1e3:100);h+=s,o[t]={grid:e,duration:s}}finally{this._sourceImage===i&&(this._sourceImage=a),this._imageGrid=n,"function"==typeof i.close&&i.close()}t%8==7&&(yield new Promise(t=>setTimeout(t,0)))}return e===this._imageLoadToken&&s===this._imageCaptureToken&&!this._destroyed&&(this._capturedImageFrames=o,this._imageFrameIndex=0,this._imageFrameAccumulator=0,this._imageGrid=o[0].grid,this._emit("imageFramesReady",{frameCount:i,duration:h/1e3}),!0)}finally{"function"==typeof r.close&&r.close()}})}
/**
     * Debounces GIF recapture (180ms) after geometry or sampling options change —
     * re-decoding every frame at the new grid size on every intermediate resize
     * tick would be wasteful, so this coalesces rapid changes into one recapture.
     * A no-op if no animated GIF is currently loaded.
     *
     * @private
     * @returns {void}
     */_scheduleAnimatedFrameCapture(){if(!this._animatedImage||!this._animatedImageData||this._destroyed)return;this._capturedImageFrames=null,this._imageFrameIndex=0,this._imageFrameAccumulator=0;const t=this._imageLoadToken,e=++this._imageCaptureToken;null!==this._imageRecaptureTimer&&clearTimeout(this._imageRecaptureTimer),this._imageRecaptureTimer=setTimeout(()=>{this._imageRecaptureTimer=null,this._captureAnimatedImageFrames(null,t,e).catch(t=>{console.warn("asciiam: GIF frame recapture unavailable; using browser frame sampling.",t)})},180)}
/**
     * Advances animated-image playback: steps through `_capturedImageFrames` by
     * their own decoded durations if available, otherwise falls back to the
     * browser-timed compatibility sampler at `opts.imageFrameRate`. A no-op unless
     * an animated image is loaded and `opts.animateImageFrames` is enabled.
     *
     * @private
     * @param {number} dt - elapsed time since the last frame, in milliseconds
     * @returns {void}
     */_advanceImageFrames(t){var e;if(!this._animatedImage||!this.opts.animateImageFrames||!this._sourceImage)return;if(null==(e=this._capturedImageFrames)?void 0:e.length){this._imageFrameAccumulator+=Math.max(0,t);let e=this._capturedImageFrames[this._imageFrameIndex],s=!1;for(;this._imageFrameAccumulator>=e.duration;)this._imageFrameAccumulator-=e.duration,this._imageFrameIndex=(this._imageFrameIndex+1)%this._capturedImageFrames.length,e=this._capturedImageFrames[this._imageFrameIndex],s=!0;return void(s&&(this._imageGrid=e.grid,this._activeGlyphAtlas=null))}const s=1e3/Math.max(1,Math.min(60,Number(this.opts.imageFrameRate)||12));this._imageFrameAccumulator+=Math.max(0,t),this._imageFrameAccumulator<s||(this._imageFrameAccumulator%=s,this._resampleImage())}
/**
     * Programmatically drive the cursor-reactive modifier (`hoverField` mode, the
     * `cursor` glow option) — useful for touch, audio-sync, or scripted demos
     * where there's no real pointer to track.
     *
     * @param {number|null} x - canvas-relative x in pixels; `null` (with `y` omitted) clears it
     * @param {number} [y] - canvas-relative y in pixels
     * @returns {void}
     */setCursor(t,e){this._cursor=null==t?null:{x:t,y:e}}
/**
     * Starts a click-zone pulse at the supplied coordinates, or the configured
     * alignment origin if omitted. A no-op if the resolved coordinates aren't
     * finite numbers.
     *
     * @param {number} [x=this._originX] - canvas-relative x in pixels
     * @param {number} [y=this._originY] - canvas-relative y in pixels
     * @returns {void}
     */triggerInteraction(t=this._originX,e=this._originY){Number.isFinite(t)&&Number.isFinite(e)&&(this._interaction={x:t,y:e,elapsed:0})}
/**
     * Synchronously invokes every listener registered for `event` via
     * {@link asciiam#on}, passing `detail` and this instance.
     *
     * @private
     * @param {string} event - event name
     * @param {Object} detail - event-specific payload
     * @returns {void}
     */_emit(t,e){const s=this._events.get(t);s&&[...s].forEach(t=>t(e,this))}
// ---- lifecycle ----
/**
     * Wires up off-screen auto-pausing (`IntersectionObserver`), tab-visibility
     * resume, and resize detection (`ResizeObserver`, falling back to a `window`
     * `resize` listener where unsupported). Called once from the constructor.
     *
     * @private
     * @returns {void}
     * @listens visibilitychange
     */
_bindLifecycle(){"IntersectionObserver"in window&&(this._io=new IntersectionObserver(t=>{this._visible=t[0].isIntersecting,this._visible&&(this._lastT=null)},{threshold:0}),this._io.observe(this.canvas)),this._onVisChange=()=>{document.hidden||(this._lastT=null)},document.addEventListener("visibilitychange",this._onVisChange);const t=this.container||this.canvas.parentElement;"ResizeObserver"in window&&t?(this._ro=new ResizeObserver(()=>this._scheduleResize()),this._ro.observe(t)):(this._onResize=()=>this._scheduleResize(),window.addEventListener("resize",this._onResize))}
/**
     * Debounces `_resize()` to at most once per animation frame — a
     * `ResizeObserver`/`window resize` callback can fire multiple times before
     * the next paint, and `_resize()` itself is comparatively expensive (rebuilds
     * caches, forces layout reads).
     *
     * @private
     * @returns {void}
     */_scheduleResize(){this._resizePending||(this._resizePending=!0,this._resizeRaf=requestAnimationFrame(()=>{this._resizeRaf=null,this._resizePending=!1,this._resize()}))}
/**
     * Binds pointer tracking (supplies cursor modifiers and `hoverZone`/`clickZone`
     * interactive modes) to the container, not the canvas — the presentation
     * canvas remains pointer-transparent (`pointer-events: none`-equivalent
     * behavior via not listening on it), so page content stacked above/below it
     * stays interactive.
     *
     * @private
     * @returns {void}
     */_bindCursor(){const t=this.container||this.canvas.parentElement;t&&(this._onPointerMove=t=>{this._canvasRect||(this._canvasRect=this.canvas.getBoundingClientRect()),this._cursor={x:t.clientX-this._canvasRect.left,y:t.clientY-this._canvasRect.top}},this._onPointerLeave=()=>{this._cursor=null},this._onPointerDown=t=>{this._canvasRect||(this._canvasRect=this.canvas.getBoundingClientRect()),this.triggerInteraction(t.clientX-this._canvasRect.left,t.clientY-this._canvasRect.top)},t.addEventListener("pointermove",this._onPointerMove,{passive:!0}),t.addEventListener("pointerleave",this._onPointerLeave,{passive:!0}),t.addEventListener("pointerdown",this._onPointerDown,{passive:!0}))}
/**
     * Removes pointer listeners bound by {@link asciiam#_bindCursor}. A no-op if
     * they were never bound.
     *
     * @private
     * @returns {void}
     */_unbindCursor(){const t=this.container||this.canvas.parentElement;t&&this._onPointerMove&&(t.removeEventListener("pointermove",this._onPointerMove),t.removeEventListener("pointerleave",this._onPointerLeave),t.removeEventListener("pointerdown",this._onPointerDown))}
// ---- sizing / measurement ----
/**
     * Rebuilds font metrics and the regular/bold font-string cache for every
     * `fontLevels` shading level, from `fontSize`/`fontFamily`/`resolutionScale`/
     * `density`. Called whenever any of those change.
     *
     * @private
     * @returns {void}
     */
_buildFontCache(){const t=Math.max(.5,Math.min(2,Number(this.opts.resolutionScale)||1));this.opts.resolutionScale=t;const e=this.opts.fontSize/t;this._effectiveFontSize=e,this.ctx.font=`${e}px ${this.opts.fontFamily}`;const s=W(this.ctx,this.opts.fontFamily,e);this.charW=Math.max(4,s.charW*this.opts.density),this.charH=Math.max(6,1.2*e*this.opts.density),this._fontBaselineOffset=(s.baselineOffset||.8*e)*this.opts.density;const i=Math.max(2,Math.round(this.opts.fontLevels||2));this.opts.fontLevels=i,this._fontRegular=[],this._fontBold=[];for(let t=0;t<i;t++){const s=1+t/(i-1)*.5,a=Math.round(e*s*10)/10;this._fontRegular.push(`400 ${a}px ${this.opts.fontFamily}`),this._fontBold.push(`700 ${a}px ${this.opts.fontFamily}`)}this._activeGlyphAtlas=null,this._waveBaseLayer=null}
/**
     * Deduped characters an atlas needs to rasterize: the active charSet plus any
     * image/chart characters currently in play. Shared by
     * {@link asciiam#_getGlyphAtlas} (Canvas 2D) and `_getWebGLAtlas()`
     * (WebGL2/WebGPU) so the two atlases can't drift apart.
     *
     * @private
     * @returns {string[]} deduped characters, in first-seen order
     */_computeAtlasCharacterSet(){const t="chart"===this.opts.mode||this.opts.chartData||this._layers&&this._layers.some(t=>"chart"===t.mode)?this._getChartCharacters():"",e=this._imageGrid&&this.opts.imageChars||"";return[...new Set(this.opts.charSet+e+t)]}
/**
     * Builds (or reuses, from an instance-level or shared static cache) the
     * Canvas 2D glyph atlas: every character x bold x font-level combination
     * pre-rasterized into one offscreen canvas, so per-cell painting is a cheap
     * `drawImage()` instead of a `fillText()` call. Returns `null` when atlasing
     * is disabled or incompatible with the active options (a gradient, animated
     * color, or image-derived color all need per-cell color, which a shared atlas
     * can't represent).
     *
     * @private
     * @returns {Object|null} the atlas (`{canvas, characterIndex, characters, sourceX, sourceY, tileWidth, tileHeight, baseline, padding}`), or `null` if atlasing isn't applicable right now
     */_getGlyphAtlas(){if(!this.opts.useGlyphAtlas||this.opts.gradient||this.opts.colorAnimation||this.opts.colorFromImage)return null;const e=this._computeAtlasCharacterSet(),s=e.join("");if(this._glyphAtlas&&this._glyphAtlasCharSet===s&&this._glyphAtlasColor===this.opts.color&&this._glyphAtlasRegular===this._fontRegular&&this._glyphAtlasBold===this._fontBold&&this._glyphAtlasCharHeight===this.charH)return this._glyphAtlas;const i=JSON.stringify([s,this._fontRegular,this._fontBold,this.opts.color,this.charH]),a=t._glyphAtlases.get(i);if(a)return t._glyphAtlases.delete(i),t._glyphAtlases.set(i,a),this._cacheGlyphAtlas(a,s),a;const r=1.5*this._effectiveFontSize,n=Math.max(4,Math.ceil(r+4)),o=Math.max(6,Math.ceil(this.charH+4)),h=Math.max(1,Math.floor(2048/n)),l=2*this._fontRegular.length,c=e.length*l,d=Math.ceil(c/h),u=document.createElement("canvas");u.width=h*n,u.height=d*o;const m=u.getContext("2d",{alpha:!0,willReadFrequently:!1});if(!m)return null;m.textBaseline="alphabetic",m.fillStyle=this.opts.color;const p=o-2,_=new Map(e.map((t,e)=>[t,e])),g=new Uint16Array(c),f=new Uint16Array(c);for(let t=0;t<2;t++){const s=t?this._fontBold:this._fontRegular;for(let i=0;i<s.length;i++){m.font=s[i];const a=t*s.length+i;for(let t=0;t<e.length;t++){const s=a*e.length+t,i=s%h*n,r=Math.floor(s/h)*o;g[s]=i,f[s]=r,m.fillText(e[t],i+2,r+p)}}}const y={canvas:u,characterIndex:_,characters:e.length,sourceX:g,sourceY:f,tileWidth:n,tileHeight:o,baseline:p,padding:2};return t._glyphAtlases.set(i,y),t._glyphAtlases.size>t._glyphAtlasLimit&&t._glyphAtlases.delete(t._glyphAtlases.keys().next().value),this._cacheGlyphAtlas(y,s),y}
/**
     * Records the built/reused atlas and the exact config it's valid for, so
     * {@link asciiam#_getGlyphAtlas}'s cheap instance-level check can skip the
     * shared-cache lookup entirely on unchanged frames.
     *
     * @private
     * @param {Object} atlas - the atlas to cache, see {@link asciiam#_getGlyphAtlas}
     * @param {string} [characterSet=this.opts.charSet] - the exact character set this atlas covers
     * @returns {void}
     */_cacheGlyphAtlas(t,e=this.opts.charSet){this._glyphAtlas=t,this._glyphAtlasCharSet=e,this._glyphAtlasColor=this.opts.color,this._glyphAtlasRegular=this._fontRegular,this._glyphAtlasBold=this._fontBold,this._glyphAtlasCharHeight=this.charH}
/**
     * Re-measures the container, resizes the canvas backing store and logical
     * grid, and invalidates every geometry-dependent cache (spatial, seed,
     * current-field, edge-fade, gradients, glyph atlas, wave-layer cache). Also
     * re-samples the active image and rebuilds sparse-mode particle state to fit
     * the new grid (preserving trajectories where possible via
     * {@link asciiam#_adaptStateOnResize}). Called on construction, container
     * resize, and any option change affecting cell/font geometry.
     *
     * @private
     * @returns {void}
     * @fires asciiam#resize
     */_resize(){var t;const e=this.cols||0,s=this.rows||0,i=Math.min(window.devicePixelRatio||1,this.opts.maxDPR);this._dpr=i;const a=this.canvas.parentElement||this.canvas,r=a.clientWidth,n=a.clientHeight;(r<2||n<2)&&!this._warnedZeroSize&&(console.warn("asciiam: container has zero (or near-zero) size — give it an explicit width/height. Nothing will render until it does."),this._warnedZeroSize=!0),this.w=r,this.h=n,this.canvas.width=Math.max(1,Math.round(r*i)),this.canvas.height=Math.max(1,Math.round(n*i)),this.canvas.style.width=r+"px",this.canvas.style.height=n+"px",this._webgl?this._webgl.resize(this.canvas.width,this.canvas.height):this.ctx.setTransform(i,0,0,i,0,0),this.cols=Math.max(1,Math.ceil(r/this.charW)),this.rows=Math.max(1,Math.ceil(n/this.charH)),this._meshRasterizer&&this._meshRasterizer.resize(this.cols,this.rows),this._columnX=new Float32Array(this.cols),this._rowY=new Float32Array(this.rows),this._rowBaseline=new Float32Array(this.rows);const o=this._fontBaselineOffset||.78*this.charH;for(let t=0;t<this.cols;t++)this._columnX[t]=t*this.charW;for(let t=0;t<this.rows;t++){const e=t*this.charH;this._rowY[t]=e,this._rowBaseline[t]=e+o}if(this._buildSeedCache(),this._buildSpatialCache(),this._buildCurrentCache(),this._buildEdgeFadeCache(),this._gradientKey=null,this._gradientSource=null,this._backdropGradientKey=null,this._backdropGradientObj=null,this._waveBaseLayer=null,this._canvasRect=this.canvas.getBoundingClientRect(),this._sourceImage&&this._resampleImage(),this._layers)for(const t of this._layers)t._sourceImage&&this._resampleLayerImage(t),t._meshRasterizer&&t._meshRasterizer.resize(this.cols||1,this.rows||1);this._scheduleAnimatedFrameCapture(),e>0&&s>0?this._adaptStateOnResize(e,s,this.cols,this.rows):("matrix"===this.opts.mode&&this._initMatrix(),"snow"===this.opts.mode&&this._initSnow(),"sparkle"===this.opts.mode&&this._initSparkle(),"fire"===this.opts.mode&&this._initFire(),"starfield"===this.opts.mode&&this._initStarfield(),"orbit"===this.opts.mode&&this._initOrbit()),this._reduced&&this._draw(16.7),(null==(t=this._events.get("resize"))?void 0:t.size)&&this._emit("resize",{width:this.w,height:this.h,cols:this.cols,rows:this.rows})}
/**
     * Rescales and extends/trims sparse-mode particle state (matrix columns,
     * snow/sparkle/fire/starfield/orbit particles) proportionally to a grid
     * resize, instead of discarding and reseeding everything — keeps trajectories
     * visually continuous across a resize rather than resetting all animation.
     *
     * @private
     * @param {number} oldCols - grid column count before the resize
     * @param {number} oldRows - grid row count before the resize
     * @param {number} newCols - grid column count after the resize
     * @param {number} newRows - grid row count after the resize
     * @returns {void}
     */_adaptStateOnResize(t,e,s,i){const a=s/t,r=i/e;if(this._matrix){if(s>t)for(let e=t;e<s;e++)this._matrix[e]={y:-Math.random()*i,speed:8+14*Math.random(),length:6+Math.floor(10*Math.random())};else s<t&&(this._matrix.length=s);for(let t=0;t<this._matrix.length;t++)this._matrix[t]&&(this._matrix[t].y*=r)}else"matrix"===this.opts.mode&&this._initMatrix();if(this._snow){const t=Math.max(1,Math.round(s*i*this.opts.snowDensity));for(let t=0;t<this._snow.length;t++){const e=this._snow[t];e.col=Math.min(s-1,Math.max(0,Math.floor(e.col*a))),e.y*=r}for(;this._snow.length<t;)this._snow.push({col:Math.floor(Math.random()*s),y:Math.random()*i,speed:2+5*Math.random(),phase:Math.random()*Math.PI*2,drift:.3+.6*Math.random()});this._snow.length>t&&(this._snow.length=t)}else"snow"===this.opts.mode&&this._initSnow();if(this._sparkle){const t=Math.max(1,Math.round(s*i*this.opts.sparkleDensity));for(let t=0;t<this._sparkle.length;t++){const e=this._sparkle[t];e.col=Math.min(s-1,Math.max(0,Math.floor(e.col*a))),e.row=Math.min(i-1,Math.max(0,Math.floor(e.row*r)))}for(;this._sparkle.length<t;)this._sparkle.push({col:Math.floor(Math.random()*s),row:Math.floor(Math.random()*i),phase:Math.random()*Math.PI*2,speed:.6+1.4*Math.random()});this._sparkle.length>t&&(this._sparkle.length=t)}else"sparkle"===this.opts.mode&&this._initSparkle();if(this._fire){const t=Math.max(1,Math.round(s*i*this.opts.fireDensity));for(let t=0;t<this._fire.length;t++){const e=this._fire[t];e.col*=a,e.y*=r}for(;this._fire.length<t;)this._resetFireParticle({},!0);this._fire.length>t&&(this._fire.length=t)}else"fire"===this.opts.mode&&this._initFire();if(this._starfield){const t=Math.max(1,Math.round(s*i*this.opts.starfieldDensity));for(;this._starfield.length<t;)this._resetStar({},!0);this._starfield.length>t&&(this._starfield.length=t)}else"starfield"===this.opts.mode&&this._initStarfield();if(this._orbit){const t=Math.max(1,Math.round(s*i*this.opts.orbitDensity)),e=.45*Math.min(s,i);for(;this._orbit.length<t;)this._orbit.push({angle:Math.random()*Math.PI*2,radius:e*(.12+.82*Math.random()),speed:(.28+.7*Math.random())*(Math.random()>.2?1:-1),phase:Math.random()*Math.PI*2});this._orbit.length>t&&(this._orbit.length=t)}else"orbit"===this.opts.mode&&this._initOrbit()}
/**
     * Precomputes a per-cell vignette multiplier from `opts.edgeFade`, so the hot
     * paint loop can look it up instead of recomputing a radial falloff every
     * frame. Clears the cache (falls back to no vignette) when `edgeFade` is
     * falsy or the grid has zero size.
     *
     * @private
     * @returns {void}
     */_buildEdgeFadeCache(){if(!(this.opts.edgeFade&&this.cols&&this.rows&&this.w&&this.h))return void(this._edgeFadeCache=null);const t=this.opts.edgeFade;this._edgeFadeCache=new Float32Array(this.cols*this.rows);for(let e=0;e<this.rows;e++)for(let s=0;s<this.cols;s++){const i=s*this.charW/this.w*2-1,a=e*this.charH/this.h*2-1,r=Math.min(1.4,Math.sqrt(i*i+a*a)),n=Math.max(0,(r-(1-t))/t);this._edgeFadeCache[e*this.cols+s]=1-Math.min(1,n)}}
/**
     * Precomputes a stable per-cell pseudo-random value (and the same value for
     * the next row down) for every cell — the deterministic noise source used by
     * `assemble`/`breakApart`/dissolve/iris reveal wavefronts and the real per-cell
     * morph transition, so their staggering doesn't need fresh randomness each
     * frame.
     *
     * @private
     * @returns {void}
     */_buildSeedCache(){const t=this.cols*this.rows;this._seedCache=new Float32Array(t),this._seedNextRowCache=new Float32Array(t);for(let t=0;t<this.rows;t++){const e=t*this.cols;for(let s=0;s<this.cols;s++)this._seedCache[e+s]=this._seed(s,t),this._seedNextRowCache[e+s]=this._seed(s,t+1)}}
/**
     * Precomputes per-cell sin/cos phase values for the `current` mode's three
     * overlapping wave phases (X, Y, and diagonal), so its per-frame cell compute
     * only needs a cheap phase-shift combination instead of six fresh
     * trigonometric calls per cell.
     *
     * @private
     * @returns {void}
     */_buildCurrentCache(){const t=this.cols*this.rows;this._currentSinX=new Float32Array(t),this._currentCosX=new Float32Array(t),this._currentSinY=new Float32Array(t),this._currentCosY=new Float32Array(t),this._currentSinXY=new Float32Array(t),this._currentCosXY=new Float32Array(t);for(let t=0;t<this.rows;t++){const e=t*this.charH,s=t*this.cols;for(let t=0;t<this.cols;t++){const i=s+t,a=t*this.charW-this._originX,r=e-this._originY,n=.02*a,o=.035*r,h=.015*(a+r);this._currentSinX[i]=Math.sin(n),this._currentCosX[i]=Math.cos(n),this._currentSinY[i]=Math.sin(o),this._currentCosY[i]=Math.cos(o),this._currentSinXY[i]=Math.sin(h),this._currentCosXY[i]=Math.cos(h)}}}
/**
     * Resolves the alignment origin (`opts.align`) into pixel coordinates, then
     * precomputes per-cell sin/cos/falloff values for every radial/spatial mode
     * (ripple, vortex, plasma, image ripple) relative to that origin — the same
     * caching strategy as {@link asciiam#_buildCurrentCache}, trading memory for
     * avoiding per-frame trigonometry.
     *
     * @private
     * @returns {void}
     */_buildSpatialCache(){if(!this.cols||!this.rows)return;switch(this.opts.align){case"top-left":this._originX=0,this._originY=0;break;case"top":this._originX=.5*this.w,this._originY=0;break;case"top-right":this._originX=this.w,this._originY=0;break;case"left":this._originX=0,this._originY=.5*this.h;break;case"right":this._originX=this.w,this._originY=.5*this.h;break;case"bottom-left":this._originX=0,this._originY=this.h;break;case"bottom":this._originX=.5*this.w,this._originY=this.h;break;case"bottom-right":this._originX=this.w,this._originY=this.h;break;default:this._originX=.5*this.w,this._originY=.5*this.h}const t=this.cols*this.rows;this._rippleSin=new Float32Array(t),this._rippleCos=new Float32Array(t),this._imageRippleSin=new Float32Array(t),this._imageRippleCos=new Float32Array(t),this._rippleFalloff=new Float32Array(t),this._vortexSin=new Float32Array(t),this._vortexCos=new Float32Array(t),this._plasmaSinA=new Float32Array(t),this._plasmaCosA=new Float32Array(t),this._plasmaSinB=new Float32Array(t),this._plasmaCosB=new Float32Array(t),this._plasmaSinC=new Float32Array(t),this._plasmaCosC=new Float32Array(t);for(let t=0;t<this.rows;t++){const e=t*this.charH,s=t*this.cols;for(let t=0;t<this.cols;t++){const i=s+t,a=t*this.charW,r=a-this._originX,n=e-this._originY,o=Math.hypot(r,n),h=3*Math.atan2(n,r)+.045*o,l=.018*a+.011*e,c=.028*o,d=.009*a-.021*e;this._rippleSin[i]=Math.sin(.06*o),this._rippleCos[i]=Math.cos(.06*o),this._imageRippleSin[i]=Math.sin(.05*o),this._imageRippleCos[i]=Math.cos(.05*o),this._rippleFalloff[i]=Math.max(0,1-o/(.85*Math.max(this.w,this.h))),this._vortexSin[i]=Math.sin(h),this._vortexCos[i]=Math.cos(h),this._plasmaSinA[i]=Math.sin(l),this._plasmaCosA[i]=Math.cos(l),this._plasmaSinB[i]=Math.sin(c),this._plasmaCosB[i]=Math.cos(c),this._plasmaSinC[i]=Math.sin(d),this._plasmaCosC[i]=Math.cos(d)}}}
/**
     * Deterministic pseudo-random value in [0, 1) for a grid cell — a classic
     * sine-hash noise function, stable across frames for the same `(col, row)`.
     *
     * @private
     * @param {number} col - grid column
     * @param {number} row - grid row
     * @returns {number} a pseudo-random value in [0, 1)
     */_seed(t,e){const s=43758.5453*Math.sin(12.9898*t+78.233*e);return s-Math.floor(s)}
// ---- gradient (built once per frame at most, never per cell) ----
/**
     * Builds (or reuses, cached by a content+size+time key) the Canvas 2D
     * `CanvasGradient` for `opts.gradient`. Returns `null` if no gradient is
     * configured.
     *
     * @private
     * @returns {CanvasGradient|null} the active foreground gradient, or `null`
     */
_getGradient(){const t=this.opts.gradient;if(!t)return null;if(!t.animate&&t===this._gradientSource&&this._gradientObj)return this._gradientObj;const e=JSON.stringify(t)+(t.animate?Math.floor(20*this._time):"");if(!t.animate&&e===this._gradientKey)return this._gradientObj;const s=this._expandGradientStops(t);let i;if("radial"===t.type){const e=this.w*(t.center?t.center[0]:.5),s=this.h*(t.center?t.center[1]:.5),a=Math.max(this.w,this.h)*(t.radius||.75);i=this.ctx.createRadialGradient(e,s,0,e,s,a)}else{const e=((t.angle||0)+(t.animate?20*this._time:0))*Math.PI/180,s=Math.cos(e),a=Math.sin(e),r=this.w/2,n=this.h/2,o=(Math.abs(s)*this.w+Math.abs(a)*this.h)/2;i=this.ctx.createLinearGradient(r-s*o,n-a*o,r+s*o,n+a*o)}return s.forEach(t=>i.addColorStop(Math.min(1,Math.max(0,t.offset)),t.color)),this._gradientKey=e,this._gradientObj=i,this._gradientSource=t,i}
/**
     * Builds (or reuses, cached by a content+size+time key) the Canvas 2D
     * `CanvasGradient` for a backdrop's own gradient config — separate cache from
     * {@link asciiam#_getGradient} since the foreground gradient and backdrop
     * gradient are independent and can differ.
     *
     * @private
     * @param {Object|null} g - the backdrop's gradient config (`opts.backdrop.gradient`)
     * @returns {CanvasGradient|null} the backdrop gradient, or `null` if `g` has no stops
     */_getBackdropGradient(t){if(!t||!t.stops)return null;const e=JSON.stringify(t)+`:${this.w}x${this.h}`+(t.animate?`:${Math.floor(20*this._time)}`:"");if(e===this._backdropGradientKey)return this._backdropGradientObj;const s=this._expandGradientStops(t);let i;if("radial"===t.type){const e=this.w*(t.center?t.center[0]:.5),s=this.h*(t.center?t.center[1]:.5),a=Math.max(this.w,this.h)*(t.radius||.75);i=this.ctx.createRadialGradient(e,s,0,e,s,a)}else{const e=((t.angle||0)+(t.animate?20*this._time:0))*Math.PI/180,s=Math.cos(e),a=Math.sin(e),r=this.w/2,n=this.h/2,o=(Math.abs(s)*this.w+Math.abs(a)*this.h)/2;i=this.ctx.createLinearGradient(r-s*o,n-a*o,r+s*o,n+a*o)}return s.forEach(t=>i.addColorStop(Math.min(1,Math.max(0,t.offset)),t.color)),this._backdropGradientKey=e,this._backdropGradientObj=i,i}
/**
     * Expands a gradient config into concrete `{offset, color}` stops. Explicit
     * object stops (with their own `offset`) pass through sorted by offset;
     * a plain color-string array instead generates `steps` evenly-spaced stops,
     * interpolated between the given colors (smoothstep-eased for `type: "cubic"`).
     *
     * @private
     * @param {Object} gradient - `opts.gradient` or a backdrop's gradient config
     * @param {(string|{offset?: number, color: string})[]} [gradient.stops] - explicit stops, or plain colors to interpolate between; defaults to a blue-to-purple pair
     * @param {number} [gradient.steps=2] - stop count when `stops` are plain colors, 1-6
     * @param {"linear"|"cubic"} [gradient.type] - `"cubic"` eases the interpolation between plain-color stops
     * @returns {{offset: number, color: string}[]} expanded, offset-sorted stops
     */_expandGradientStops(t){const e=t.stops||["#4FA8FF","#C04FFF"];if(e.some(t=>"object"==typeof t&&null!==t)){const t=Math.max(1,e.length-1);return e.map((e,s)=>({offset:Math.min(1,Math.max(0,"object"==typeof e&&void 0!==e.offset?e.offset:s/t)),color:"string"==typeof e?e:e.color})).sort((t,e)=>t.offset-e.offset)}const s=e.map(t=>"string"==typeof t?t:t.color),i=Math.max(1,Math.min(6,Math.round(t.steps||2))),a=[];for(let e=0;e<i;e++){const r=1===i?0:e/(i-1),n=r*Math.max(0,s.length-1),o=Math.min(s.length-1,Math.floor(n)),h=Math.min(s.length-1,o+1),l=n-o,c="cubic"===t.type?l*l*(3-2*l):l;a.push({offset:r,color:this._lerpColor(s[o],s[h],c)})}return a}
// ---- animated color: one calculation per frame, never per cell ----
/**
     * Resolves `opts.colorAnimation` into `this._animatedColor` once per frame —
     * `"hueRotate"` produces an HSL string that cycles hue over time, `"breathe"`
     * lerps between two colors on a sine wave. Sets `null` (no override) when no
     * animation is configured or the type is unrecognized.
     *
     * @private
     * @returns {void}
     */
_updateAnimatedColor(){var t,e,s;const i=this.opts.colorAnimation;if(i)if("hueRotate"===i.type){const s=((null!=(t=i.baseHue)?t:200)+this._time*(null!=(e=i.speed)?e:30))%360,a=null===i.saturation||void 0===i.saturation?80:i.saturation,r=null===i.lightness||void 0===i.lightness?60:i.lightness;this._animatedColor=`hsl(${s}, ${a}%, ${r}%)`}else if("breathe"===i.type){const t=(Math.sin(this._time*(null!=(s=i.speed)?s:1))+1)/2;this._animatedColor=this._lerpColor(i.colorA||"#4FA8FF",i.colorB||"#C04FFF",t)}else this._animatedColor=null;else this._animatedColor=null}
/**
     * Linearly interpolates between two 6-digit hex colors.
     *
     * @private
     * @param {string} a - starting hex color (`#rrggbb`)
     * @param {string} b - ending hex color (`#rrggbb`)
     * @param {number} t - interpolation factor, typically 0-1
     * @returns {string} an `rgb(r,g,b)` string, or `a` unchanged if either input isn't a valid 6-digit hex color (a 3-digit `#rgb` shorthand is *not* accepted by {@link asciiam#_hexToRgb})
     */_lerpColor(t,e,s){const i=this._hexToRgb(t),a=this._hexToRgb(e);if(!i||!a)return t;return`rgb(${Math.round(i[0]+(a[0]-i[0])*s)},${Math.round(i[1]+(a[1]-i[1])*s)},${Math.round(i[2]+(a[2]-i[2])*s)})`}
/**
     * Parses a 6-digit hex color string into RGB components. Does not accept the
     * 3-digit `#rgb` shorthand.
     *
     * @private
     * @param {string} hex - a `#rrggbb` (or `rrggbb`, without `#`) hex color string
     * @returns {number[]|null} `[r, g, b]` (0-255 each), or `null` if `hex` doesn't match the 6-digit format
     */_hexToRgb(t){const e=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t);return e?[parseInt(e[1],16),parseInt(e[2],16),parseInt(e[3],16)]:null}
// ---- image sampling ----
/**
     * Rasterizes the current image/video/frame source into `this._imageGrid` — a
     * `cols*rows` grid of glyph characters, per-cell colors, and an optional
     * animation range-mask. Applies fit/scale/rotation/flip geometry, brightness and
     * contrast tone mapping, and auto or explicit luminance inversion. No-op if there
     * is no source image or the grid has zero size. Degrades to a no-op (after
     * warning once) instead of throwing if the sample canvas is tainted by a
     * cross-origin source without CORS headers.
     *
     * @returns {void}
     */
_resampleImage(){var e,s;const i=this._sourceImage;if(!i||!this.cols||!this.rows)return;const a=this.cols,r=this.rows;this._imageSampleCanvas||(this._imageSampleCanvas=document.createElement("canvas"),this._imageSampleContext=this._imageSampleCanvas.getContext("2d",{alpha:!0,willReadFrequently:!0}));const n=this._imageSampleCanvas;n.width!==a&&(n.width=a),n.height!==r&&(n.height=r);const o=this._imageSampleContext;if(!o)return;o.clearRect(0,0,a,r);const h=i.naturalWidth||i.videoWidth||i.displayWidth||i.codedWidth||i.width,l=i.naturalHeight||i.videoHeight||i.displayHeight||i.codedHeight||i.height;if(!h||!l)return;const c=h/l,d=this.charW||this.w/a||1,u=this.charH||this.h/r||1,m=a*d/(r*u);let p,_,g,f,y=0,v=0,w=a,M=r;"cover"===this.opts.fit?c>m?(f=l,g=f*m,_=0,p=(h-g)/2):(g=h,f=g/m,p=0,_=(l-f)/2):(p=0,_=0,g=h,f=l,c>m?(M=a*d/(c*u),v=(r-M)/2):(w=r*u*c/d,y=(a-w)/2));const b=Math.max(.1,this.opts.imageScale||1)/Math.max(.1,this.opts.imageFov||1);if(1!==b){const t=g/b,e=f/b;p+=(g-t)/2,_+=(f-e)/2,g=t,f=e}const x=Math.max(.1,Number(this.opts.imageScaleX)||1),S=Math.max(.1,Number(this.opts.imageScaleY)||1);if(1!==x||1!==S){const t=w*x,e=M*S;y+=(w-t)/2,v+=(M-e)/2,w=t,M=e}o.drawImage(i,p,_,g,f,y,v,w,M);const C=(Number(this.opts.imageRotation)||0)%360*Math.PI/180,A=this.opts.imageFlipX?-1:1,F=this.opts.imageFlipY?-1:1;let R,T=o;if(C||A<0||F<0){this._imageOrientCanvas||(this._imageOrientCanvas=document.createElement("canvas"),this._imageOrientContext=this._imageOrientCanvas.getContext("2d",{alpha:!0,willReadFrequently:!0}));const t=this._imageOrientCanvas;t.width!==a&&(t.width=a),t.height!==r&&(t.height=r);const e=this._imageOrientContext;if(e){const t=Math.abs(Math.cos(C)),s=Math.abs(Math.sin(C)),i=t*a+s*r,o=s*a+t*r,h=Math.min(a/i,r/o);e.clearRect(0,0,a,r),e.save(),e.translate(.5*a,.5*r),e.scale(A*h,F*h),e.rotate(C),e.drawImage(n,.5*-a,.5*-r,a,r),e.restore(),T=e}}try{R=T.getImageData(0,0,a,r).data}catch(t){return void(this._warnedTaintedImage||(console.warn("asciiam: could not sample the image source (tainted canvas — the image likely needs CORS headers or crossOrigin set).",t),this._warnedTaintedImage=!0))}const O=new Array(a*r),E=new Array(a*r),I=this.opts.imageChars||this.opts.charSet||t.CHARACTER_SETS.density,L=this.opts.imageAnimationRange,P=L&&this._hexToRgb(L.min),k=L&&this._hexToRgb(L.max),q=P&&k?new Uint8Array(a*r):null,B=q?Math.min(P[0],k[0]):0,D=q?Math.max(P[0],k[0]):255,G=q?Math.min(P[1],k[1]):0,z=q?Math.max(P[1],k[1]):255,U=q?Math.min(P[2],k[2]):0,W=q?Math.max(P[2],k[2]):255;let N=0,j=0,V=0;for(let t=0;t<a*r;t++){R[4*t+3]<20?j++:(N++,V+=(.299*R[4*t]+.587*R[4*t+1]+.114*R[4*t+2])/255)}const X=this.opts.imageLuminance||"auto",$="invert"===X||"auto"===X&&j>0&&N>0&&V/N<.45,Y=Math.max(0,Number(null!=(e=this.opts.imageBrightness)?e:1)),H=Math.max(0,Number(null!=(s=this.opts.imageContrast)?s:1)),K=1!==Y||1!==H;for(let t=0;t<a*r;t++){let e=R[4*t],s=R[4*t+1],i=R[4*t+2];const a=R[4*t+3];K&&a>=20&&(e=Math.min(255,Math.max(0,Math.round(((e-128)*H+128)*Y))),s=Math.min(255,Math.max(0,Math.round(((s-128)*H+128)*Y))),i=Math.min(255,Math.max(0,Math.round(((i-128)*H+128)*Y))));const r=(.299*e+.587*s+.114*i)/255,n=$?1-r:r,o=a<20?0:Math.min(I.length-1,Math.floor(n*(I.length-1)));O[t]=I[o],E[t]=a<20||$?null:`rgb(${e},${s},${i})`,q&&(q[t]=a>=20&&e>=B&&e<=D&&s>=G&&s<=z&&i>=U&&i<=W?1:0)}const Q=this._imageAtlasRamp!==I;this._imageAtlasRamp=I,this._imageGrid={cols:a,rows:r,chars:O,colors:E,animationMask:q,invertedLuminance:$},this._activeGlyphAtlas=null,Q&&(this._glyphAtlas=null,this._webglAtlas=null),this._waveBaseLayer=null}
// ---- sparse mode state ----
/**
     * (Re)builds the falling-column state for `matrix` mode, one column per grid
     * column, with randomized fall speed and trail length.
     *
     * @returns {void}
     */
_initMatrix(){this._matrix=[];for(let t=0;t<this.cols;t++)this._matrix.push({y:-Math.random()*this.rows,speed:8+14*Math.random(),length:6+Math.floor(10*Math.random())})}
/**
     * (Re)builds the drifting flake state for `snow` mode. Particle count scales
     * with grid area and `opts.snowDensity`.
     *
     * @returns {void}
     */_initSnow(){const t=Math.max(1,Math.round(this.cols*this.rows*this.opts.snowDensity));this._snow=[];for(let e=0;e<t;e++)this._snow.push({col:Math.floor(Math.random()*this.cols),y:Math.random()*this.rows,speed:2+5*Math.random(),phase:Math.random()*Math.PI*2,drift:.3+.6*Math.random()})}
/**
     * (Re)builds the twinkling-point state for `sparkle` mode. Particle count
     * scales with grid area and `opts.sparkleDensity`.
     *
     * @returns {void}
     */_initSparkle(){const t=Math.max(1,Math.round(this.cols*this.rows*this.opts.sparkleDensity));this._sparkle=[];for(let e=0;e<t;e++)this._sparkle.push({col:Math.floor(Math.random()*this.cols),row:Math.floor(Math.random()*this.rows),phase:Math.random()*Math.PI*2,speed:.6+1.4*Math.random()})}
/**
     * (Re)builds the rising-ember state for `fire` mode. Particle count scales
     * with grid area and `opts.fireDensity`; each starts pre-distributed across
     * its life cycle via `_resetFireParticle(particle, true)` so the effect
     * doesn't visibly "start from zero" on mode entry.
     *
     * @returns {void}
     */_initFire(){const t=Math.max(1,Math.round(this.cols*this.rows*this.opts.fireDensity));this._fire=[];for(let e=0;e<t;e++)this._resetFireParticle({},!0)}
/**
     * Respawns one fire particle in place (or appends it to `this._fire` if not
     * already tracked), randomizing its column, speed, phase, drift, and remaining
     * life. Called both for initial population and whenever a particle burns out.
     *
     * @param {Object} particle - particle object to mutate in place
     * @param {boolean} [distribute=false] - start partway up its rise (initial population) instead of at the bottom (a respawn)
     * @returns {void}
     */_resetFireParticle(t,e=!1){t.col=Math.random()*this.cols,t.y=e?this.rows*(.58+.48*Math.random()):this.rows+2*Math.random(),t.speed=5+9*Math.random(),t.phase=Math.random()*Math.PI*2,t.drift=.7+1.4*Math.random(),t.life=.45+.55*Math.random(),this._fire.includes(t)||this._fire.push(t)}
/**
     * (Re)builds the depth-star state for `starfield` mode. Particle count scales
     * with grid area and `opts.starfieldDensity`; each starts pre-distributed
     * across its depth range via `_resetStar(star, true)`.
     *
     * @returns {void}
     */_initStarfield(){const t=Math.max(1,Math.round(this.cols*this.rows*this.opts.starfieldDensity));this._starfield=[];for(let e=0;e<t;e++)this._resetStar({},!0)}
/**
     * Respawns one star in place (or appends it to `this._starfield` if not
     * already tracked) at a random position in normalized `[-1, 1]` space.
     *
     * @param {Object} star - star object to mutate in place
     * @param {boolean} [distribute=false] - start at a random depth (initial population) instead of at the far plane (a respawn)
     * @returns {void}
     */_resetStar(t,e=!1){t.x=2*Math.random()-1,t.y=2*Math.random()-1,t.z=e?.08+.92*Math.random():1,t.speed=.22+.42*Math.random(),this._starfield.includes(t)||this._starfield.push(t)}
/**
     * (Re)builds the orbiting-point state for `orbit` mode. Particle count scales
     * with grid area and `opts.orbitDensity`; orbit radius is bounded by the
     * smaller of the stage's half-width or half-height.
     *
     * @returns {void}
     */_initOrbit(){const t=Math.max(1,Math.round(this.cols*this.rows*this.opts.orbitDensity)),e=Math.max(this.charW,.5*Math.min(this.w,this.h));this._orbit=[];for(let s=0;s<t;s++)this._orbit.push({angle:Math.random()*Math.PI*2,radius:e*(.12+.82*Math.random()),speed:(.28+.7*Math.random())*(Math.random()>.2?1:-1),phase:Math.random()*Math.PI*2})}
// ---- main draw loop ----
/**
     * Renders one frame. Delegates to `_drawWebGL(dt)` when a WebGL2/WebGPU
     * renderer is active (returning immediately while a WebGPU device is still
     * being asynchronously acquired, to avoid per-frame CPU work during startup).
     * Otherwise renders through the Canvas 2D backend directly: fills or clears
     * the background (or composites the trail-persistence overlay), draws the
     * backdrop if placed behind content, dispatches to the dense, sparse, mesh,
     * or image-backed draw path per the active mode (or per layer, for a
     * `setLayers()` composite), and draws the backdrop again if placed over
     * content.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds
     * @returns {void}
     */
_draw(t){var e,s,i,a,r,n,o;if("webgpu"===this._renderer&&!(null==(e=this._webgl)?void 0:e.device))return;if(this._webgl)return void this._drawWebGL(t);const h=this.ctx;if(this.opts.trail>0?(h.save(),h.globalAlpha=this.opts.trail,h.fillStyle=this.opts.trailColor,h.fillRect(0,0,this.w,this.h),h.restore()):(h.clearRect(0,0,this.w,this.h),this.opts.background&&"transparent"!==this.opts.background&&(h.fillStyle=this.opts.background,h.fillRect(0,0,this.w,this.h))),(null==(s=this.opts.backdrop)?void 0:s.enabled)&&"over"!==this.opts.backdrop.placement&&this._drawCanvasBackdrop(),this._layers&&this._layers.length>0){const e=this.opts.mode;let s=0;for(let e=0;e<this._layers.length;e++){const r=this._layers[e];h.save(),h.globalAlpha=null!=(i=r.opacity)?i:1,r.blendMode&&(h.globalCompositeOperation=r.blendMode);const n=this._applyLayerOptions(r);this._applyLayerMedia(r),this.opts.mode=r.mode,this._prepareModeFrame(),h.textBaseline="alphabetic",this._lastFillStyle=null,this._lastFont=null,this._lastAlpha=-1,this._pulseFactor=this.opts.pulse?Math.max(0,1+this.opts.pulse.amplitude*Math.sin(this._time*(null!=(a=this.opts.pulse.speed)?a:1))):1,this._updateAnimatedColor();const o=this.opts.gradient&&!this.opts.colorFromImage?this._getGradient():null;this._activeGlyphAtlas=this._getGlyphAtlas();const l="wave"===r.mode?this._getWaveBaseLayer():null;l&&h.drawImage(l.canvas,0,0,l.canvas.width,l.canvas.height,0,0,this.w,this.h),this._drawFillStyle=o;let c=0;"mesh"===r.mode?c=this._drawMesh(o):l?c=this._drawCachedHorizontalWave(l,o):D.has(r.mode)?(this._imageGrid&&(c+=this._drawImageSourceBase(o)),c+=this._drawSparse(t,o)):c=this._drawDense(o),s+=c,this._restoreLayerOptions(n),this._restoreLayerMedia(),h.restore()}return(null==(r=this.opts.backdrop)?void 0:r.enabled)&&"over"===this.opts.backdrop.placement&&this._drawCanvasBackdrop(),h.globalAlpha=1,h.globalCompositeOperation="source-over",this.opts.mode=e,void(this._lastDrawnCount=s)}this._prepareModeFrame(),h.textBaseline="alphabetic",this._lastFillStyle=null,this._lastFont=null,this._lastAlpha=-1,this._pulseFactor=this.opts.pulse?Math.max(0,1+this.opts.pulse.amplitude*Math.sin(this._time*(null!=(n=this.opts.pulse.speed)?n:1))):1,this._updateAnimatedColor();const l=this.opts.gradient&&!this.opts.colorFromImage?this._getGradient():null;this._activeGlyphAtlas=this._getGlyphAtlas();const c="wave"===this.opts.mode?this._getWaveBaseLayer():null;c&&h.drawImage(c.canvas,0,0,c.canvas.width,c.canvas.height,0,0,this.w,this.h),this._drawFillStyle=l;let d=0;"mesh"===this.opts.mode?d=this._drawMesh(l):c?d=this._drawCachedHorizontalWave(c,l):D.has(this.opts.mode)?(this._imageGrid&&(d+=this._drawImageSourceBase(l)),d+=this._drawSparse(t,l)):d=this._drawDense(l),this._mesh&&this._meshRasterizer&&"mesh"!==this.opts.mode&&(d+=this._drawMesh(l)),(null==(o=this.opts.backdrop)?void 0:o.enabled)&&"over"===this.opts.backdrop.placement&&this._drawCanvasBackdrop(),h.globalAlpha=1,this._lastDrawnCount=d}
/**
     * Fills the full Canvas 2D surface with the configured backdrop color or
     * gradient, at its opacity clamped to `[0, 1]`. Called before or after the
     * mode's own draw pass depending on `backdrop.placement`.
     *
     * @returns {void}
     */_drawCanvasBackdrop(){var t,e,s;const i=this.opts.backdrop,a=this.ctx;a.save(),a.globalAlpha=Math.max(0,Math.min(1,null!=(t=i.opacity)?t:.5)),(null==(s=null==(e=i.gradient)?void 0:e.stops)?void 0:s.length)?a.fillStyle=this._getBackdropGradient(i.gradient)||i.color||"#0a0c10":a.fillStyle=i.color||"#0a0c10",a.fillRect(0,0,this.w,this.h),a.restore()}
/**
     * Precomputes per-frame trigonometry and sweep position shared by every cell
     * of the active mode this frame (`wave`, `current`, `ripple`, `vortex`,
     * `plasma`, `image`), so each per-cell compute function does zero
     * `Math.sin`/`Math.cos` calls of its own — a fixed, small number of
     * transcendental calls per frame instead of one (or several) per cell.
     * No-op for modes that don't precompute shared per-frame state.
     *
     * @returns {void}
     */_prepareModeFrame(){if("wave"===this.opts.mode){const t="diagonal"===this.opts.direction?this.w+this.h:"vertical"===this.opts.direction?this.h:this.w,e="diagonal"===this.opts.direction?160:140;this._wavePosition=this._time*e%(t+300)-150,this._waveBand=t*this.opts.bandWidth}else if("current"===this.opts.mode)this._currentTimeSinX=Math.sin(1.1*this._time),this._currentTimeCosX=Math.cos(1.1*this._time),this._currentTimeSinY=Math.sin(.8*-this._time),this._currentTimeCosY=Math.cos(.8*-this._time),this._currentTimeSinXY=Math.sin(1.6*this._time),this._currentTimeCosXY=Math.cos(1.6*this._time);else if("ripple"===this.opts.mode)this._rippleTimeSin=Math.sin(2.4*-this._time),this._rippleTimeCos=Math.cos(2.4*-this._time);else if("vortex"===this.opts.mode)this._vortexTimeSin=Math.sin(2*-this._time),this._vortexTimeCos=Math.cos(2*-this._time);else if("plasma"===this.opts.mode)this._plasmaTimeSinA=Math.sin(.9*this._time),this._plasmaTimeCosA=Math.cos(.9*this._time),this._plasmaTimeSinB=Math.sin(1.3*-this._time),this._plasmaTimeCosB=Math.cos(1.3*-this._time),this._plasmaTimeSinC=Math.sin(.55*this._time),this._plasmaTimeCosC=Math.cos(.55*this._time);else if("image"===this.opts.mode){const t=2.2*-this._time;this._imageRippleTimeSin=Math.sin(t),this._imageRippleTimeCos=Math.cos(t)}}
/**
     * Renders one frame through the WebGL2 or WebGPU backend (both implement the
     * same `begin`/`surface`/`push`/`flush` interface behind `this._webgl`, so
     * this one method drives either). Begins the GPU pass (preserving the prior
     * frame's contents instead of clearing when `trail > 0`, then compositing the
     * trail-persistence overlay), draws the backdrop if placed behind content,
     * dispatches to the mesh, sparse, or dense draw path per the active mode (or
     * per layer, for a `setLayers()` composite), flushes the accumulated glyph
     * instances in one draw call, and draws the backdrop again if placed over
     * content.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds
     * @returns {void}
     */_drawWebGL(t){var e,s,i,a,r;const n=this._colorToRgba("transparent"===this.opts.background?"transparent":this.opts.background),o=this.opts.trail>0;if(this._webgl.begin(n,o),o){const t=this._colorToRgba(this.opts.trailColor),e=[t[0],t[1],t[2],this.opts.trail];this._webgl.surface(e)}if((null==(e=this.opts.backdrop)?void 0:e.enabled)&&"over"!==this.opts.backdrop.placement&&this._drawWebGLBackdrop(),this._layers&&this._layers.length>0){const e=this.opts.mode;let a=0;for(let e=0;e<this._layers.length;e++){const i=this._layers[e],r=this._applyLayerOptions(i);this._applyLayerMedia(i),this.opts.mode=i.mode,this._prepareModeFrame(),this._pulseFactor=this.opts.pulse?Math.max(0,1+this.opts.pulse.amplitude*Math.sin(this._time*(null!=(s=this.opts.pulse.speed)?s:1))):1,this._updateAnimatedColor();const n=this._getWebGLAtlas();this._webgl.setAtlas(n.canvas,n.key),this._activeWebGLAtlas=n,this._webglGradient=this.opts.gradient&&!this.opts.colorFromImage?this._prepareWebGLGradient(this.opts.gradient):null;let o=0;"mesh"===i.mode?o=this._drawMesh(null):D.has(i.mode)?(this._imageGrid&&(o+=this._drawImageSourceBase(null)),o+=this._drawSparse(t,null)):o=this._drawDense(null),a+=o,this._restoreLayerOptions(r),this._restoreLayerMedia()}return this._webgl.flush(this.w,this.h,this._webglGradient),(null==(i=this.opts.backdrop)?void 0:i.enabled)&&"over"===this.opts.backdrop.placement&&this._drawWebGLBackdrop(),this.opts.mode=e,this._lastDrawnCount=a,this._activeWebGLAtlas=null,void(this._webglGradient=null)}this._prepareModeFrame(),this._pulseFactor=this.opts.pulse?Math.max(0,1+this.opts.pulse.amplitude*Math.sin(this._time*(null!=(a=this.opts.pulse.speed)?a:1))):1,this._updateAnimatedColor();const h=this._getWebGLAtlas();this._webgl.setAtlas(h.canvas,h.key),this._activeWebGLAtlas=h,this._webglGradient=this.opts.gradient&&!this.opts.colorFromImage?this._prepareWebGLGradient(this.opts.gradient):null;let l=0;"mesh"===this.opts.mode?l=this._drawMesh(null):D.has(this.opts.mode)?(this._imageGrid&&(l+=this._drawImageSourceBase(null)),l+=this._drawSparse(t,null)):l=this._drawDense(null),this._mesh&&this._meshRasterizer&&"mesh"!==this.opts.mode&&(l+=this._drawMesh(null)),this._webgl.flush(this.w,this.h,this._webglGradient),(null==(r=this.opts.backdrop)?void 0:r.enabled)&&"over"===this.opts.backdrop.placement&&this._drawWebGLBackdrop(),this._lastDrawnCount=l,this._activeWebGLAtlas=null,this._webglGradient=null}
/**
     * Draws the configured backdrop as a fullscreen colored (and optionally
     * gradient-textured) quad via the active WebGL2/WebGPU renderer's `surface()`
     * draw call, before or after glyph instances depending on
     * `backdrop.placement`.
     *
     * @returns {void}
     */_drawWebGLBackdrop(){var t;const e=this.opts.backdrop,s=this._colorToRgba(e.color||"#0a0c10"),i=Math.max(0,Math.min(1,null!=(t=e.opacity)?t:.5)),a=[s[0],s[1],s[2],i],r=e.gradient?this._prepareWebGLGradient(e.gradient):null;this._webgl.surface(a,r)}
/**
     * Builds the character set a glyph atlas must include to render chart mode:
     * the fixed box-drawing/block/digit/punctuation ramp chart cells draw from,
     * plus the literal characters of the configured chart title and any
     * data-item labels/names (so a chart with, say, Cyrillic labels still gets
     * those glyphs rasterized into the atlas).
     *
     * @returns {string} characters to fold into the active glyph atlas
     */_getChartCharacters(){let t=" ▂▃▄▅▆▇█▏▎▍▌▋▊▉░▒▓┌└│─┘╱╲0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:;%+-*·/\\_~!?()[]{}#@$^&=<>|'\"`";this.opts.chartTitle&&(t+=this.opts.chartTitle);const e=this.opts.chartData;if(Array.isArray(e))for(let s=0;s<e.length;s++){const i=e[s];i&&"object"==typeof i&&(i.label&&(t+=String(i.label)),i.name&&(t+=String(i.name)))}return t}
/**
     * Returns the WebGL2/WebGPU glyph atlas for the current character set, font,
     * and cell height — an offscreen canvas with one white-on-transparent tile
     * per (bold × font-level × character) combination, plus UV rects into it, an
     * `Uint16`-free UV `Float32Array`, and a `character -> tile index` map.
     * Cached per instance (`this._webglAtlas`) and only rebuilt when the
     * content-derived cache key changes; unlike `_getGlyphAtlas()`'s Canvas 2D
     * counterpart, this atlas is not shared across instances (tiles are tinted
     * per-cell via the instance color attribute, not the atlas pixels
     * themselves, so there's no cross-instance color coupling to avoid).
     *
     * @returns {{canvas: HTMLCanvasElement, key: string, characterIndex: Map<string, number>, characters: number, uv: Float32Array, tileWidth: number, tileHeight: number, padding: number, baseline: number}} the (possibly cached) atlas
     */_getWebGLAtlas(){var t;const e=this._computeAtlasCharacterSet(),s=JSON.stringify([e.join(""),this._fontRegular,this._fontBold,this.charH]);if((null==(t=this._webglAtlas)?void 0:t.key)===s)return this._webglAtlas;const i=Math.max(4,Math.ceil(1.5*this._effectiveFontSize+4)),a=Math.max(6,Math.ceil(this.charH+4)),r=Math.max(1,Math.floor(2048/i)),n=e.length*this._fontRegular.length*2,o=document.createElement("canvas");o.width=r*i,o.height=Math.ceil(n/r)*a;const h=o.getContext("2d",{alpha:!0,willReadFrequently:!1});h.textBaseline="alphabetic",h.fillStyle="#ffffff";const l=a-2,c=new Map(e.map((t,e)=>[t,e])),d=new Float32Array(4*n);for(let t=0;t<2;t++){const s=t?this._fontBold:this._fontRegular;for(let n=0;n<s.length;n++){h.font=s[n];const c=t*s.length+n;for(let t=0;t<e.length;t++){const s=c*e.length+t,n=s%r*i,u=Math.floor(s/r)*a;h.fillText(e[t],n+2,u+l),d.set([n/o.width,u/o.height,(n+i)/o.width,(u+a)/o.height],4*s)}}}return this._webglAtlas={canvas:o,key:s,characterIndex:c,characters:e.length,uv:d,tileWidth:i,tileHeight:a,padding:2,baseline:l},this._webglAtlas}
/**
     * Resolves a gradient config into a 256×1 gradient strip texture (uploading it
     * to the active WebGL2/WebGPU renderer if not already cached under its
     * content-derived key) and returns a copy of the gradient annotated with that
     * `textureKey` and, for `gradient.animate`, a time-advanced `angle`. An
     * animated gradient's cache key changes roughly every 50ms, so its texture
     * (and stale-view/bind-group state referencing it) is expected to churn
     * through the renderer's own bounded eviction rather than accumulate.
     *
     * @param {Object} gradient - gradient config (`type`, `stops`, `angle`, `animate`, etc.)
     * @returns {Object} the gradient, shallow-copied with `textureKey` (and, if animated, an advanced `angle`) added
     */_prepareWebGLGradient(t){const e=this._expandGradientStops(t),s=JSON.stringify(e)+(t.animate?Math.floor(20*this._time):"");if(!this._webgl.hasGradient(s)){const t=document.createElement("canvas");t.width=256,t.height=1;const i=t.getContext("2d"),a=i.createLinearGradient(0,0,256,0);e.forEach(t=>a.addColorStop(Math.min(1,Math.max(0,t.offset)),t.color)),i.fillStyle=a,i.fillRect(0,0,256,1),this._webgl.setGradient(t,s)}return h(o({},t),{textureKey:s,angle:(t.angle||0)+(t.animate?20*this._time:0)})}
/**
     * Parses a CSS color string (`#rgb`/`#rrggbb`, `rgb()`/`rgba()`, or any other
     * CSS color the browser understands, resolved via an offscreen 2D context as
     * a last resort) into a normalized `[r, g, b, a]` array with each channel in
     * `[0, 1]` — the format WebGL2/WebGPU uniforms expect. Results are cached per
     * color string (cleared once the cache exceeds 512 entries) since this runs
     * on the per-cell hot path. Falls back to a mid-blue placeholder color for
     * anything unparseable rather than returning `null`/throwing.
     *
     * @param {string} color - any CSS color string, or `"transparent"`/falsy for fully transparent
     * @returns {number[]} `[r, g, b, a]`, each channel in `[0, 1]`
     */_colorToRgba(t){this._rgbaCache||(this._rgbaCache=new Map);const e=this._rgbaCache.get(t);if(e)return e;let s;t&&"transparent"!==t||(s=[0,0,0,0]);const i=this._hexToRgb(t);!s&&i&&(s=[i[0]/255,i[1]/255,i[2]/255,1]);const a=/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(t);if(!s&&a&&(s=[Number(a[1])/255,Number(a[2])/255,Number(a[3])/255,void 0===a[4]?1:Number(a[4])]),s||this._colorParser||(this._colorParser=document.createElement("canvas").getContext("2d")),!s&&this._colorParser){this._colorParser.fillStyle="#000000",this._colorParser.fillStyle=t;const e=this._colorParser.fillStyle,i=this._hexToRgb(e);i&&(s=[i[0]/255,i[1]/255,i[2]/255,1])}return s||(s=[.31,.66,1,1]),this._rgbaCache.size>512&&this._rgbaCache.clear(),this._rgbaCache.set(t,s),s}
/**
     * `cacheStaticWave` optimization for the `ultra` quality tier: horizontal
     * `wave` mode's cell pattern only depends on `x` (not `y`), so most of a frame
     * is redundant identical rows. When every disqualifying condition is absent
     * (no image, no trail, no backdrop/gradient/pulse/cursor/animated color, only
     * `direction: 'horizontal'`), returns a full-canvas pre-rendered static wave
     * field — reused across frames via an instance-level identity check, and
     * across *instances* with identical size/charSet/color/font via a small
     * shared, class-level cache (`asciiam._waveBaseLayers`) — so
     * `_drawCachedHorizontalWave()` only needs to blit it and redraw the moving
     * band on top. Returns `null` if any disqualifying condition applies, in
     * which case the caller falls back to the normal per-cell dense draw.
     *
     * @returns {{canvas: HTMLCanvasElement}|null} the cached static wave field, or `null` if the current config can't use it
     */_getWaveBaseLayer(){var e;if("wave"!==this.opts.mode||this._imageGrid||!this.opts.cacheStaticWave||"horizontal"!==this.opts.direction||this.opts.trail>0||this.opts.background&&"transparent"!==this.opts.background||this.opts.backdrop||this.opts.gradient||this.opts.colorAnimation||this.opts.pulse||(null==(e=this.opts.cursor)?void 0:e.enabled)&&this._cursor)return null;if(this._waveBaseLayer&&this._waveBaseCharSet===this.opts.charSet&&this._waveBaseColor===this.opts.color&&this._waveBaseAmbient===this.opts.ambient&&this._waveBaseMinOpacity===this.opts.minOpacity&&this._waveBaseMaxOpacity===this.opts.maxOpacity&&this._waveBaseBold===this.opts.boldOnPeak&&this._waveBaseAlphaLevels===this.opts.alphaLevels&&this._waveBaseSeedCache===this._seedCache&&this._waveBaseEdgeCache===this._edgeFadeCache&&this._waveBaseAtlas===this._activeGlyphAtlas)return this._waveBaseLayer;const s=JSON.stringify([this.canvas.width,this.canvas.height,this.opts.charSet,this.opts.color,this.opts.ambient,this.opts.minOpacity,this.opts.maxOpacity,this.opts.boldOnPeak,this.opts.alphaLevels,this.opts.edgeFade,this._fontRegular,this._fontBold]),i=t._waveBaseLayers.get(s);if(i)return t._waveBaseLayers.delete(s),t._waveBaseLayers.set(s,i),this._setWaveBaseLayer(i),i;const a=document.createElement("canvas");a.width=this.canvas.width,a.height=this.canvas.height;const r=a.getContext("2d",{alpha:!0,willReadFrequently:!1});if(!r)return null;r.setTransform(this._dpr,0,0,this._dpr,0,0),r.textBaseline="alphabetic",r.fillStyle=this.opts.color;let n=-1,o=null,h=0;const l=this._activeGlyphAtlas,c=this.opts.fontLevels-1,d=this.opts.charSet;for(let t=0;t<this.rows;t++){const e=this._rowBaseline[t],s=t*this.cols;for(let t=0;t<this.cols;t++){const i=s+t,a=Math.min(1,this._seedCache[i]*this.opts.ambient),u=d[Math.floor(a*(d.length-1))]||" ";if(" "===u)continue;let m=this.opts.minOpacity+(this.opts.maxOpacity-this.opts.minOpacity)*a;if(this._edgeFadeCache&&(m*=this._edgeFadeCache[i]),m=Math.round(m*this.opts.alphaLevels)/this.opts.alphaLevels,m<=0)continue;m!==n&&(r.globalAlpha=m,n=m);const p=Math.max(0,Math.min(c,Math.round(a*c))),_=this.opts.boldOnPeak&&a>.55,g=null==l?void 0:l.characterIndex.get(u);if(void 0!==g){const s=((_?this._fontRegular.length:0)+p)*l.characters+g;r.drawImage(l.canvas,l.sourceX[s],l.sourceY[s],l.tileWidth,l.tileHeight,this._columnX[t]-l.padding,e-l.baseline,l.tileWidth,l.tileHeight)}else{const s=(_?this._fontBold:this._fontRegular)[p];s!==o&&(r.font=s,o=s),r.fillText(u,this._columnX[t],e)}h++}}return this._waveBaseLayer={canvas:a,drawn:h},t._waveBaseLayers.set(s,this._waveBaseLayer),t._waveBaseLayers.size>t._waveBaseLayerLimit&&t._waveBaseLayers.delete(t._waveBaseLayers.keys().next().value),this._setWaveBaseLayer(this._waveBaseLayer),this._waveBaseLayer}
/**
     * Records `layer` as the active static wave field and snapshots every option
     * `_getWaveBaseLayer()`'s cache-validity check compares against next frame, so
     * a later config change (color, charSet, ambient, etc.) is detected and
     * triggers a rebuild instead of silently reusing a now-stale field.
     *
     * @param {{canvas: HTMLCanvasElement}} layer - the static wave field to adopt as current
     * @returns {void}
     */_setWaveBaseLayer(t){this._waveBaseLayer=t,this._waveBaseCharSet=this.opts.charSet,this._waveBaseColor=this.opts.color,this._waveBaseAmbient=this.opts.ambient,this._waveBaseMinOpacity=this.opts.minOpacity,this._waveBaseMaxOpacity=this.opts.maxOpacity,this._waveBaseBold=this.opts.boldOnPeak,this._waveBaseAlphaLevels=this.opts.alphaLevels,this._waveBaseSeedCache=this._seedCache,this._waveBaseEdgeCache=this._edgeFadeCache,this._waveBaseAtlas=this._activeGlyphAtlas}
/**
     * Blits the pre-rendered static wave field, then clears and redraws only the
     * narrow moving band around the current sweep position (plus a small margin)
     * with the real per-cell `_waveCell()` computation — the only part of a
     * horizontal wave frame that actually changes frame to frame under the
     * `cacheStaticWave` optimization.
     *
     * @param {{canvas: HTMLCanvasElement, drawn: number}} base - the static field from `_getWaveBaseLayer()`
     * @param {Object|null} globalGradient - resolved gradient for this frame, or `null`
     * @returns {number} cells drawn this frame (the static field's count plus the dynamic band's)
     */_drawCachedHorizontalWave(t,e){const s=2*this.charW,i=Math.max(0,this._wavePosition-this._waveBand-s),a=Math.min(this.w,this._wavePosition+this._waveBand+s);if(a<=i)return t.drawn;this.ctx.clearRect(i,0,a-i,this.h);const r=Math.max(0,Math.floor(i/this.charW)),n=Math.min(this.cols-1,Math.ceil(a/this.charW));let o=0;for(let t=0;t<this.rows;t++){const s=this._rowY[t];for(let i=r;i<=n;i++){const a=this._columnX[i],r=this._waveCell(i,t,a,s);this._paintCell(r,i,t,a,s,e,this._rowBaseline[t])&&o++}}return o+1}
/**
     * Full `cols*rows` scan: computes and paints every cell via `_computeCell()`
     * / `_paintCell()`. The default draw path for any mode not in
     * `SPARSE_MODES` and not `mesh`.
     *
     * @param {Object|null} globalGradient - resolved gradient for this frame, or `null`
     * @returns {number} cells actually painted (a cell can compute to fully transparent/blank and not count)
     */_drawDense(t){let e=0;const s=this._columnX,i=this._rowY;for(let a=0;a<this.rows;a++){const r=i[a];for(let i=0;i<this.cols;i++){const n=s[i],o=this._computeCell(i,a,n,r);this._paintCell(o,i,a,n,r,t,this._rowBaseline[a])&&e++}}return e}
/**
     * Rasterizes the retained 3D mesh (`this._mesh`, via `this._meshRasterizer`)
     * into a `cols*rows` grid once this frame — applying auto-rotation if
     * enabled and the active mode isn't static — then paints only the occupied
     * cells that grid reports. A no-op if there's no mesh/rasterizer, or if
     * `meshEnabled` is explicitly `false`.
     *
     * @param {Object|null} globalGradient - resolved gradient for this frame, or `null`
     * @returns {number} cells painted (0 if meshEnabled is false or there's nothing to rasterize)
     */_drawMesh(t){var e;if(!this._mesh||!this._meshRasterizer)return 0;if(!1===this.opts.meshEnabled)return 0;this._meshRasterOptions.style=this.opts.meshStyle,this._meshRasterOptions.projection=this.opts.meshProjection,this._meshRasterOptions.camera=this.opts.meshCamera,this._meshRasterOptions.light=this.opts.meshLight;const s="none"===this.opts.mode||"static"===this.opts.mode||"plain"===this.opts.mode;for(let t=0;t<3;t++){const i=Number(null==(e=this.opts.meshRotationSpeed)?void 0:e[t]);this._meshRotation[t]=this._meshBaseRotation[t]+(this.opts.meshAutoRotate&&!s&&Number.isFinite(i)?this._time*i:0)}const i=this._meshRasterizer.rasterize(this._mesh,this._meshRasterOptions),a=this.opts.charSet,r=Math.max(0,a.length-1);let n=0;for(let e=0;e<this.rows;e++){const s=e*this.cols;for(let o=0;o<this.cols;o++){const h=s+o;if(!i.occupied[h])continue;const l=i.intensity[h],c=a[Math.round(l*r)]||a[r]||"#",d=this.opts.minOpacity+l*(this.opts.maxOpacity-this.opts.minOpacity),u=this._setCell(c,d,l,this.opts.boldOnPeak&&l>.72);this._paintCell(u,o,e,this._columnX[o],this._rowY[e],t,this._rowBaseline[e],!1)&&n++}}return n}
/**
     * Paints the resampled image/video source as a full-grid base layer,
     * `applyImageSource: false` so its own resolved character/color are used
     * verbatim instead of being re-resolved from the active mode's cell
     * function. Used when a sparse particle mode (`matrix`, `snow`, `fire`, …) is
     * composited *over* an image, so the image renders first as the backdrop.
     *
     * @param {Object|null} globalGradient - resolved gradient for this frame, or `null` (unused when `colorFromImage` supplies per-cell color)
     * @returns {number} cells painted
     */_drawImageSourceBase(t){const e=this._imageGrid;let s=0;for(let i=0;i<this.rows;i++){const a=this._rowY[i];for(let r=0;r<this.cols;r++){const n=i*e.cols+r,o=e.chars[n];if(!o||" "===o)continue;const h=(!e.animationMask||1===e.animationMask[n])&&this.opts.animateImageMask?this.opts.minOpacity:this.opts.maxOpacity,l=this._setCell(o,h,.5,!1);l.color=this.opts.colorFromImage?e.colors[n]:null,this._paintCell(l,r,i,this._columnX[r],a,t,this._rowBaseline[i],!1)&&s++}}return s}
/**
     * Advances and paints the active sparse particle mode (`matrix`, `snow`,
     * `sparkle`, `fire`, `starfield`, `orbit`) — lazily initializing particle
     * state on first use — by iterating each mode's own particle list instead of
     * scanning every grid cell, so cost scales with active particle count rather
     * than grid size.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds
     * @param {Object|null} globalGradient - resolved gradient for this frame, or `null`
     * @returns {number} cells painted
     */_drawSparse(t,e){let s=0;const i=this.opts.mode;if("matrix"===i){this._matrix||this._initMatrix(),this._advanceMatrix(t);for(let t=0;t<this._matrix.length;t++){const i=this._matrix[t],a=Math.max(0,Math.floor(i.y-i.length)),r=Math.min(this.rows-1,Math.floor(i.y));for(let n=a;n<=r;n++){const a=this._matrixCellAt(t,n,i),r=t*this.charW,o=n*this.charH;this._paintCell(a,t,n,r,o,e)&&s++}}}else if("snow"===i){this._snow||this._initSnow(),this._advanceSnow(t);for(let t=0;t<this._snow.length;t++){const i=this._snow[t],a=Math.floor(i.y);if(a<0||a>=this.rows)continue;const r=Math.sin(this._time*i.drift+i.phase)*this.charW*1.5,n=i.col*this.charW+r,o=a*this.charH,h=this._setCell("*",.8*this.opts.maxOpacity,.15,!1);this._paintCell(h,i.col,a,n,o,e)&&s++}}else if("sparkle"===i){this._sparkle||this._initSparkle();for(let t=0;t<this._sparkle.length;t++){const i=this._sparkle[t],a=Math.max(0,Math.sin(this._time*i.speed+i.phase));if(a<=.02)continue;const r=Math.floor(a*(this.opts.charSet.length-1)),n=i.col*this.charW,o=i.row*this.charH,h=this._setCell(this.opts.charSet[r]||"*",a*this.opts.maxOpacity,a,a>.85);this._paintCell(h,i.col,i.row,n,o,e)&&s++}}else if("fire"===i){this._fire||this._initFire(),this._advanceFire(t);const i=Math.max(1,Math.ceil(.26*this.rows)),a=this.rows-i,r=Math.floor(9*this._time);for(let t=a;t<this.rows;t++){const n=(t-a+1)/i;for(let i=0;i<this.cols;i++){const a=n*(.34+.66*this._seed(i+r,t-r));if(a<.24)continue;const o=Math.floor(a*(this.opts.charSet.length-1)),h=this._setCell(this.opts.charSet[o]||"·",a*this.opts.maxOpacity,a,a>.76);this._paintCell(h,i,t,i*this.charW,t*this.charH,e)&&s++}}for(let t=0;t<this._fire.length;t++){const i=this._fire[t],a=Math.floor(i.y),r=Math.max(0,Math.min(this.cols-1,Math.floor(i.col)));if(a<0||a>=this.rows)continue;const n=1-a/Math.max(1,this.rows-1),o=Math.max(.08,i.life*(1-.72*n)),h=Math.floor(o*(this.opts.charSet.length-1)),l=i.col*this.charW+Math.sin(this._time*i.drift+i.phase)*this.charW*1.4,c=this._setCell(this.opts.charSet[h]||"·",o*this.opts.maxOpacity,o,o>.72);this._paintCell(c,r,a,l,a*this.charH,e)&&s++}}else if("starfield"===i){this._starfield||this._initStarfield(),this._advanceStarfield(t);for(let t=0;t<this._starfield.length;t++){const i=this._starfield[t],a=this._originX+i.x/i.z*this.w*.42,r=this._originY+i.y/i.z*this.h*.42;if(a<0||a>=this.w||r<0||r>=this.h)continue;const n=Math.max(0,Math.min(this.cols-1,Math.floor(a/this.charW))),o=Math.max(0,Math.min(this.rows-1,Math.floor(r/this.charH))),h=Math.max(.12,Math.min(1,1-i.z)),l=Math.floor(h*(this.opts.charSet.length-1)),c=this._setCell(this.opts.charSet[l]||"·",h*this.opts.maxOpacity,h,h>.78);this._paintCell(c,n,o,a,r,e)&&s++}}else if("orbit"===i){this._orbit||this._initOrbit(),this._advanceOrbit(t);for(let t=0;t<this._orbit.length;t++){const i=this._orbit[t],a=this._originX+Math.cos(i.angle)*i.radius,r=this._originY+Math.sin(i.angle)*i.radius*.58;if(a<0||a>=this.w||r<0||r>=this.h)continue;const n=Math.max(0,Math.min(this.cols-1,Math.floor(a/this.charW))),o=Math.max(0,Math.min(this.rows-1,Math.floor(r/this.charH))),h=.45+.35*Math.sin(i.angle+i.phase),l=Math.floor(h*(this.opts.charSet.length-1)),c=this._setCell(this.opts.charSet[l]||"·",h*this.opts.maxOpacity,h,h>.68);this._paintCell(c,n,o,a,r,e)&&s++}}return s}
/**
     * Applies shared opacity and cursor modifiers, then emits one glyph through
     * the active backend while minimizing repeated Canvas state changes.
     */_paintCell(t,e,s,i,a,r,n,o=!0){var h;return o&&this._imageGrid&&"image"!==this.opts.mode&&"chart"!==this.opts.mode&&(t=this._applyImageSource(t,e,s)),t&&" "===t.char&&(t=null),"morph"===(null==(h=this._morph)?void 0:h.kind)&&this._morph.progress<1&&!this._morphRecording?this._paintMorphCell(t,e,s,i,a,r,n):!!t&&this._paintResolvedCell(t,e,s,i,a,r,n)}
/**
     * Real per-cell morph dispatch (reached only while a `'morph'`-kind transition is
     * in progress). Reuses the same per-cell staggered-wavefront math as
     * `assemble`/`breakApart`/`_dissolveCell` (`this._seedCache`/`_revealProgress()`)
     * so cells cross the wavefront at a deterministic, varied moment rather than all
     * at once — no new noise/state needed. Outside the thin `feather` band around the
     * wavefront, this costs exactly one paint call, identical to normal rendering;
     * only cells currently inside that band do the (bounded, temporary) extra work
     * each style requires.
     */_paintMorphCell(t,e,s,i,a,r,n){const o=this._morph,h=s*this.cols+e,l=this._readMorphCell(o.capture,h,this._morphBeforeScratch),c=.72*(this._seedCache?this._seedCache[h]:0)+.28*this._revealProgress(e,s),d=o.feather,u=Math.max(0,Math.min(1,(o.progress-c+d)/d));if(u<=0)return!!l&&this._paintResolvedCell(l,e,s,i,a,r,n);if(u>=1)return!!t&&this._paintResolvedCell(t,e,s,i,a,r,n);if("scramble"===o.style){const o=this._scrambleMorphCell(l,t,e,s,u);return!!o&&this._paintResolvedCell(o,e,s,i,a,r,n)}if("flow"===o.style){const n=o.matches?o.matches[h]:-1;if(n>=0&&t){const h=n%o.capture.cols,l=n/o.capture.cols|0,c=this._columnX[h],d=this._rowY[l],m=c+(i-c)*u,p=d+(a-d)*u;return this._paintResolvedCell(t,e,s,m,p,r,void 0)}}let m=!1;return l&&(m=this._paintResolvedCell(l,e,s,i,a,r,n,1-u)||m),t&&(m=this._paintResolvedCell(t,e,s,i,a,r,n,u)||m),m}
/**
     * Synthesizes a "decoding" cell for the 'scramble' morph style: a character
     * picked deterministically from `opts.charSet` via the same `_seed()` hash other
     * modes already use for flicker/noise (fire mode, etc.), varying by a coarse
     * quantization of the cell's local transition progress so it visibly steps
     * through a few glyphs rather than re-rolling every single frame. Pure function
     * of (col, row, local) — no per-cell mutable state, no RNG calls.
     */_scrambleMorphCell(t,e,s,i,a){var r,n,o,h,l,c;const d=this.opts.charSet;if(!d||0===d.length)return e||t||null;const u=this._morphScrambleScratch,m=Math.min(3,Math.floor(4*a)),p=Math.floor(this._seed(s+17*m,i-11*m)*d.length);u.char=d[p]||(null==e?void 0:e.char)||(null==t?void 0:t.char)||" ";const _=t?t.opacity:0,g=e?e.opacity:0;u.opacity=_+(g-_)*a;const f=a>=.5;return u.level=null!=(o=null!=(n=null!=(r=f?null==e?void 0:e.level:null==t?void 0:t.level)?r:null==e?void 0:e.level)?n:null==t?void 0:t.level)?o:0,u.bold=!!(f?null==e?void 0:e.bold:null==t?void 0:t.bold),u.color=null!=(c=null!=(l=null!=(h=f?null==e?void 0:e.color:null==t?void 0:t.color)?h:null==e?void 0:e.color)?l:null==t?void 0:t.color)?c:null,u}
/**
     * Shared drawing body for both normal painting and morph playback. `alphaMul`
     * lets the 'dissolve' morph style paint the same cell twice at complementary
     * partial opacities (before fading out, after fading in) without duplicating the
     * opacity/atlas/fillText logic. When `this._morphRecording` is set (a one-time
     * capture pass, never during normal rendering), records the fully-resolved
     * char/opacity/level/bold/color into that buffer instead of drawing pixels — no
     * canvas or GPU readback involved.
     */_paintResolvedCell(t,e,s,i,a,r,n,o=1){const h=this.ctx;let l=t.opacity*this._pulseFactor*o;this._edgeFadeCache&&(l*=this._edgeFadeCache[s*this.cols+e]);const c=this.opts.cursor;if(c&&c.enabled&&this._cursor){const t=i-this._cursor.x,e=a-this._cursor.y,s=Math.sqrt(t*t+e*e),r=c.radius||140;if(s<r){const t=1-s/r;l=Math.min(1,l+(c.strength||.6)*t)}}if(l<=.01)return!1;const d=this.opts.alphaLevels;if(d>1&&(l=Math.round(l*d)/d),l<=0)return!1;if(this._morphRecording){let i=t.color;!i&&this.opts.colorFromImage&&this._imageGrid&&"chart"!==this.opts.mode&&(i=this._imageGrid.colors[s*this.cols+e]),i||(i=r||this._animatedColor||this.opts.color);const a=s*this.cols+e,n=this._morphRecording;return n.chars[a]=t.char,n.colors[a]=i,n.opacity[a]=l,n.level[a]=t.level,n.bold[a]=t.bold?1:0,!0}if(this._webgl&&this._activeWebGLAtlas){const r=this._activeWebGLAtlas,o=r.characterIndex.get(t.char);if(void 0===o)return!1;const h=((t.bold?this._fontRegular.length:0)+t.level)*r.characters+o;let c=t.color;!c&&this.opts.colorFromImage&&this._imageGrid&&"chart"!==this.opts.mode&&(c=this._imageGrid.colors[s*this.cols+e]),c||(c=this._animatedColor||this.opts.color);const d=this._colorToRgba(c),u=4*h;return this._webgl.push(i-r.padding,(null!=n?n:a+.78*this.charH)-r.baseline,r.tileWidth,r.tileHeight,r.uv,u,d,l),!0}const u=this._activeGlyphAtlas,m=null==u?void 0:u.characterIndex.get(t.char);if(void 0!==m){l!==this._lastAlpha&&(h.globalAlpha=l,this._lastAlpha=l);const e=((t.bold?this._fontRegular.length:0)+t.level)*u.characters+m,s=(null!=n?n:a+.78*this.charH)-u.baseline;return h.drawImage(u.canvas,u.sourceX[e],u.sourceY[e],u.tileWidth,u.tileHeight,i-u.padding,s,u.tileWidth,u.tileHeight),!0}let p=t.color;if(!p&&this.opts.colorFromImage&&this._imageGrid&&"chart"!==this.opts.mode){const t=this._imageGrid.colors[s*this.cols+e];t&&(p=t)}p||(p=r||this._animatedColor||this.opts.color),p!==this._lastFillStyle&&(h.fillStyle=p,this._lastFillStyle=p),l!==this._lastAlpha&&(h.globalAlpha=l,this._lastAlpha=l);const _=(t.bold?this._fontBold:this._fontRegular)[t.level];return _!==this._lastFont&&(h.font=_,this._lastFont=_),h.fillText(t.char,i,null!=n?n:a+.78*this.charH),!0}
/**
     * Advances every `matrix` column's fall position by `dt`, respawning a
     * column (new start position, speed, and trail length) once it fully
     * scrolls past the bottom row.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds (clamped to a 0.1s step internally)
     * @returns {void}
     */_advanceMatrix(t){const e=Math.min(.1,t/1e3);for(let t=0;t<this._matrix.length;t++){const s=this._matrix[t];s.y+=s.speed*e,s.y-s.length>this.rows&&(s.y=10*-Math.random(),s.speed=8+14*Math.random(),s.length=6+Math.floor(10*Math.random()))}}
/**
     * Advances every `snow` flake's fall position by `dt`, respawning a flake
     * (new column and speed, back to the top) once it scrolls past the bottom row.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds (clamped to a 0.1s step internally)
     * @returns {void}
     */_advanceSnow(t){const e=Math.min(.1,t/1e3);for(let t=0;t<this._snow.length;t++){const s=this._snow[t];s.y+=s.speed*e,s.y>this.rows+1&&(s.y=-1,s.col=Math.floor(Math.random()*this.cols),s.speed=2+5*Math.random())}}
/**
     * Advances every `fire` particle's rise and remaining life by `dt`,
     * respawning a particle via `_resetFireParticle()` once it scrolls past the
     * top row or burns out.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds (clamped to a 0.1s step internally)
     * @returns {void}
     */_advanceFire(t){const e=Math.min(.1,t/1e3);for(let t=0;t<this._fire.length;t++){const s=this._fire[t];s.y-=s.speed*e,s.life-=.22*e,(s.y<-1||s.life<=0)&&this._resetFireParticle(s)}}
/**
     * Advances every `starfield` star's depth (`z`, toward the viewer) by `dt`,
     * respawning a star via `_resetStar()` once it passes the near clip
     * threshold.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds (clamped to a 0.1s step internally)
     * @returns {void}
     */_advanceStarfield(t){const e=Math.min(.1,t/1e3);for(let t=0;t<this._starfield.length;t++){const s=this._starfield[t];s.z-=s.speed*e,s.z<=.035&&this._resetStar(s)}}
/**
     * Advances every `orbit` point's angle by `dt` — orbit points don't respawn,
     * they simply keep circling indefinitely at their own radius and speed
     * (positive or negative, set once in `_initOrbit()`).
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds (clamped to a 0.1s step internally)
     * @returns {void}
     */_advanceOrbit(t){const e=Math.min(.1,t/1e3);for(let t=0;t<this._orbit.length;t++)this._orbit[t].angle+=this._orbit[t].speed*e}
/**
     * Resolves one dense-mode grid cell to its character/opacity/color/bold state.
     * If `opts.chartData` is set and the active mode isn't already `chart`, a
     * chart cell is computed first and wins outright whenever it's non-blank
     * (overlaying chart content on top of any base animation mode); otherwise
     * dispatches on `opts.mode` — first to `opts.customCell` for `mode: 'custom'`,
     * then to a plugin mode registered via `asciiam.registerMode()`, then to the
     * matching built-in per-mode cell function, falling back to `_waveCell()` for
     * an unrecognized mode.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell's left edge
     * @param {number} y - pixel y-coordinate of the cell's top edge
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: (string|null)}} the resolved cell (the shared pooled `this._cell` object — copy fields out before the next call if retaining them)
     */_computeCell(e,s,i,a){const r=this.opts.mode;if(this.opts.chartData&&"chart"!==r){const t=this._chartCell(e,s,i,a);if(t&&" "!==t.char&&t.opacity>.02)return t}if("custom"===r&&"function"==typeof this.opts.customCell)return this._callCustom(this.opts.customCell,e,s,i,a);if(t._registry[r])return this._callCustom(t._registry[r],e,s,i,a);switch(r){case"none":case"static":case"plain":return this._imageGrid?this._imageCell(e,s,i,a):this._setCell(this.opts.charSet[0]||" ",this.opts.maxOpacity,.5,!1);case"wave":default:return this._waveCell(e,s,i,a);case"current":return this._currentCell(e,s,i,a);case"ripple":return this._rippleCell(e,s,i,a);case"vortex":return this._vortexCell(e,s,i,a);case"plasma":return this._plasmaCell(e,s,i,a);case"glitch":return this._glitchCell(e,s,i,a);case"typewriter":return this._typewriterCell(e,s,i,a);case"fadeIn":return this._fadeInCell(e,s,i,a);case"fadeOut":return this._fadeOutCell(e,s,i,a);case"irisIn":return this._irisCell(e,s,i,a,!1);case"irisOut":return this._irisCell(e,s,i,a,!0);case"dissolveIn":return this._dissolveCell(e,s,!1);case"dissolveOut":return this._dissolveCell(e,s,!0);case"assemble":return this._assembleCell(e,s);case"breakApart":return this._breakApartCell(e,s);case"lumaFold":return this._lumaFoldCell(e,s,i,a);case"riftLace":return this._riftLaceCell(e,s,i,a);case"echoBloom":return this._echoBloomCell(e,s,i,a);case"hoverZone":return this._hoverZoneCell(e,s,i,a);case"clickZone":return this._clickZoneCell(e,s,i,a);case"image":return this._imageCell(e,s,i,a);case"chart":return this._chartCell(e,s,i,a)}}
/**
     * Invokes a `customCell`-shaped callback (the `mode: 'custom'` handler, or a
     * plugin mode registered via `asciiam.registerMode()`) with a populated,
     * reused API object (`this._api`) exposing the current cell's coordinates,
     * clock, grid size, and stage size, plus `seed()`/`set()` helpers. Accepts
     * either return convention: the callback can call `api.set(char, opacity,
     * intensity, bold)` and return that same pooled cell object directly, or
     * return a plain `{char, opacity, intensity, bold}` object.
     *
     * @param {Function} fn - the custom cell callback (`opts.customCell`, or a registered mode's function)
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell's left edge
     * @param {number} y - pixel y-coordinate of the cell's top edge
     * @returns {{char: string, opacity: number, level: number, bold: boolean}|null} the resolved cell, or `null` if the callback returned a falsy value
     */_callCustom(t,e,s,i,a){const r=this._api;r.col=e,r.row=s,r.x=i,r.y=a,r.time=this._time,r.cols=this.cols,r.rows=this.rows,r.w=this.w,r.h=this.h,r.charSet=this.opts.charSet;const n=t.call(this,r);return n?n===this._cell?n:this._setCell(n.char,n.opacity,n.intensity||0,!!n.bold):null}
/**
     * Writes a resolved cell's fields into the single pooled `this._cell` object
     * and returns it — the allocation-free sink every per-mode cell function
     * funnels through. `intensity` is quantized to a discrete `level` in
     * `[0, fontLevels - 1]` here, which is what selects the glyph atlas
     * bold/weight tile a painted cell actually uses.
     *
     * @param {string} char - the glyph to render for this cell
     * @param {number} opacity - cell opacity, typically `[0, 1]`
     * @param {number} intensity - normalized brightness/peak value, `[0, 1]`, quantized into `level`
     * @param {boolean} bold - whether to use the bold font variant
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the shared pooled cell object
     */_setCell(t,e,s,i){const a=this._cell;return a.char=t,a.opacity=e,a.bold=i,a.color=null,a.level=Math.max(0,Math.min(this.opts.fontLevels-1,Math.round(s*(this.opts.fontLevels-1)))),a}
/**
     * `wave` mode's per-cell function: a soft-edged band (smoothstepped) sweeping
     * along `direction` (`horizontal`/`vertical`/`diagonal`) at `_wavePosition`,
     * blended with per-cell ambient noise from `_seedCache`.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_waveCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o,direction:h,ambient:l,bandWidth:c}=this.opts;let d,u;"vertical"===h?(d=i,u=this.h):"diagonal"===h?(d=s+i,u=this.w+this.h):(d=s,u=this.w);const m=Math.abs(d-this._wavePosition),p=this._waveBand||u*c;let _=Math.max(0,1-m/p);_=_*_*(3-2*_);const g=this._seedCache[e*this.cols+t]*l,f=Math.min(1,g+_),y=Math.floor(f*(a.length-1));return this._setCell(a[y]||" ",r+(n-r)*f,_,o&&_>.55)}
/**
     * `current` mode's per-cell function: three superimposed sinusoidal fields at
     * different weights/frequencies, precomputed per-cell in `_buildCurrentCache()`
     * and combined with the current frame's shared trig terms from
     * `_prepareModeFrame()` — no per-cell `Math.sin`/`Math.cos` calls.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_currentCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o}=this.opts,h=e*this.cols+t,l=(.5*(this._currentSinX[h]*this._currentTimeCosX+this._currentCosX[h]*this._currentTimeSinX)+.3*(this._currentSinY[h]*this._currentTimeCosY+this._currentCosY[h]*this._currentTimeSinY)+.2*(this._currentSinXY[h]*this._currentTimeCosXY+this._currentCosXY[h]*this._currentTimeSinXY)+1)/2,c=Math.floor(l*(a.length-1));return this._setCell(a[c]||" ",r+(n-r)*l,l,o&&l>.72)}
/**
     * `ripple` mode's per-cell function: a radial sinusoidal wave from cached
     * per-cell distance terms, shaped by a precomputed radial falloff so it fades
     * out toward the edges.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_rippleCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o}=this.opts,h=e*this.cols+t,l=(this._rippleSin[h]*this._rippleTimeCos+this._rippleCos[h]*this._rippleTimeSin+1)/2*this._rippleFalloff[h],c=Math.floor(l*(a.length-1));return this._setCell(a[c]||" ",r+(n-r)*l,l,o&&l>.6)}
/**
     * `vortex` mode's per-cell function: a rotating spiral-arm sinusoid, shaped
     * by the same precomputed radial falloff `ripple` uses plus a touch of
     * ambient noise so the arms don't look perfectly clean.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_vortexCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o}=this.opts,h=e*this.cols+t,l=.5*(this._vortexSin[h]*this._vortexTimeCos+this._vortexCos[h]*this._vortexTimeSin+1),c=.25+.75*this._rippleFalloff[h],d=Math.min(1,l*c+.08*this._seedCache[h]),u=Math.floor(d*(a.length-1));return this._setCell(a[u]||" ",r+(n-r)*d,d,o&&d>.7)}
/**
     * `plasma` mode's per-cell function: three superimposed sinusoidal layers at
     * different frequencies, averaged and normalized into `[0, 1]` — the classic
     * "plasma effect" pattern, built entirely from cached per-cell terms and this
     * frame's shared trig values.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_plasmaCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o}=this.opts,h=e*this.cols+t,l=this._plasmaSinA[h]*this._plasmaTimeCosA+this._plasmaCosA[h]*this._plasmaTimeSinA,c=this._plasmaSinB[h]*this._plasmaTimeCosB+this._plasmaCosB[h]*this._plasmaTimeSinB,d=this._plasmaSinC[h]*this._plasmaTimeCosC+this._plasmaCosC[h]*this._plasmaTimeSinC,u=Math.max(0,Math.min(1,(l+c+d+3)/6)),m=Math.floor(u*(a.length-1));return this._setCell(a[m]||" ",r+(n-r)*u,u,o&&u>.72)}
/**
     * `glitch` mode's per-cell function: a scanning "active band" of rows (driven
     * by a coarse, quantized frame clock so the glitch reads as discrete bursts
     * rather than smooth motion) that horizontally displaces sampled cell content
     * by a noise-derived offset; rows outside the active band show dim ambient
     * noise instead.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_glitchCell(t,e,s,i){const{charSet:a,minOpacity:r,maxOpacity:n,boldOnPeak:o}=this.opts,h=Math.floor(12*this._time),l=this._seed(e,h),c=h%Math.max(1,this.rows),d=Math.abs(e-c)<=1||l>1-this.opts.glitchIntensity,u=(t+(d?Math.floor((l-.5)*this.cols*.18):0)+this.cols)%this.cols,m=e*this.cols+u,p=this._seedCache[m],_=d?Math.max(.35,this._seed(t+h,e)):.42*p,g=Math.floor(_*(a.length-1));return this._setCell(a[g]||" ",r+(n-r)*_,_,o&&d&&_>.7)}
/**
     * `typewriter` mode's per-cell function: reveals cells in raster order (row
     * by row, left to right) up to a progress-driven cursor index, rendering a
     * blinking-style `_` cursor glyph at the current position and `null` (fully
     * unrevealed, not even a blank space) for cells past it. Loops on a
     * duration-plus-pause cycle when `opts.loop` is set.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {({char: string, opacity: number, level: number, bold: boolean, color: null}|null)} the resolved cell, or `null` for a cell not yet reached by the cursor
     */_typewriterCell(t,e,s,i){const{charSet:a,maxOpacity:r}=this.opts,n=Math.max(1,this.cols*this.rows),o=Math.max(.1,this.opts.typewriterDuration),h=this.opts.loop?this._time%(o+1.2):Math.min(this._time,o),l=Math.min(1,h/o),c=e*this.cols+t,d=Math.min(n-1,Math.floor(l*n));if(c>d)return null;const u=this._seedCache[c],m=1+Math.floor(u*Math.max(1,a.length-1)),p=c===d&&l<1;return this._setCell(p?"_":a[m]||"0",p?1:r,p?1:u,p)}
/**
     * `fadeIn` mode's per-cell function: each cell eases its opacity from 0 to
     * `maxOpacity` on a per-cell-delayed timeline, where the delay is driven by
     * `_revealProgress()` (honoring `opts.revealDirection`/`delayCurve`) plus a
     * small per-cell jitter so the sweep front isn't perfectly straight. A subtle
     * per-cell shimmer varies peak brightness slightly.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_fadeInCell(t,e,s,i){const{charSet:a,maxOpacity:r}=this.opts,n=Math.max(.1,Number(this.opts.sweepDuration||this.opts.revealDuration)||2.2),o=this.opts.loop?this._time%(n+1.2):Math.min(this._time,n+.6),h=e*this.cols+t,l=this._revealProgress(t,e)*n*.8+.4*this._seedCache[h],c=Math.max(0,Math.min(1,(o-l)/.6)),d=c*c*(3-2*c),u=.85+.15*this._seedNextRowCache[h],m=Math.floor(d*(a.length-1));return this._setCell(a[m]||" ",d*r*u,0,!1)}
/**
     * `fadeOut` mode's per-cell function: the mirror of `_fadeInCell()` — each
     * cell eases its opacity from `maxOpacity` down to 0 on the same
     * `_revealProgress()`-delayed, per-cell-jittered timeline and shimmer.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_fadeOutCell(t,e,s,i){const{charSet:a,maxOpacity:r}=this.opts,n=Math.max(.1,Number(this.opts.sweepDuration||this.opts.revealDuration)||2.2),o=this.opts.loop?this._time%(n+1.2):Math.min(this._time,n+.6),h=e*this.cols+t,l=this._revealProgress(t,e)*n*.8+.4*this._seedCache[h],c=Math.max(0,Math.min(1,(o-l)/.6)),d=1-c*c*(3-2*c),u=.85+.15*this._seedNextRowCache[h],m=Math.floor(d*(a.length-1));return this._setCell(a[m]||" ",d*r*u,0,!1)}
/**
     * Converts a cell's grid position into a normalized `[0, 1]` "when should
     * this cell reveal" progress value, per `opts.revealDirection`
     * (`left-to-right`/`right-to-left`/`top-to-bottom`/`bottom-to-top`/`diagonal`/
     * `edges`/center-out default) and then reshaped by `opts.delayCurve`
     * (`easeIn`/`easeOut`/`easeInOut`/`stagger`/linear default). Shared by every
     * directional reveal mode (`fadeIn`/`fadeOut`/`assemble`/`breakApart`) as the
     * deterministic per-cell delay/threshold term.
     *
     * @param {number} col - zero-based grid column
     * @param {number} [row=0] - zero-based grid row
     * @returns {number} reveal progress in `[0, 1]`, before the curve can push it slightly outside that range for `stagger`
     */_revealProgress(t,e=0){const s=t/Math.max(1,this.cols-1),i=e/Math.max(1,this.rows-1);let a=0;a="left-to-right"===this.opts.revealDirection?s:"right-to-left"===this.opts.revealDirection?1-s:"top-to-bottom"===this.opts.revealDirection?i:"bottom-to-top"===this.opts.revealDirection?1-i:"diagonal"===this.opts.revealDirection?.5*(s+i):"edges"===this.opts.revealDirection?1-Math.min(1,2*Math.abs(s-.5)):Math.min(1,2*Math.abs(s-.5));const r=this.opts.delayCurve;return"easeIn"===r?a*a:"easeOut"===r?a*(2-a):"easeInOut"===r?a<.5?2*a*a:(4-2*a)*a-1:"stagger"===r?Math.max(0,Math.min(1,a+.08*Math.sin(a*Math.PI*4))):a}
/**
     * `irisIn`/`irisOut` mode's per-cell function: a circular wavefront
     * (feathered edge, like a camera iris) expanding outward from
     * `(this._originX, this._originY)`, reaching cells in order of their
     * distance from that origin.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @param {boolean} reverse - `true` for `irisOut` (closing/hiding), `false` for `irisIn` (opening/revealing)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_irisCell(t,e,s,i,a){const r=Math.max(.1,Number(this.opts.revealDuration)||2.2),n=this.opts.loop?this._time%(r+1.1):Math.min(this._time,r),o=Math.min(1,n/r),h=Math.max(1,Math.hypot(this.w,this.h)),l=Math.hypot(s-this._originX,i-this._originY)/h;let c=Math.max(0,Math.min(1,(o-l+.14)/.14));a&&(c=1-c);const d=e*this.cols+t,u=c*(.82+.18*this._seedCache[d]),m=Math.floor(u*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[m]||" ",u*this.opts.maxOpacity,u,u>.74)}
/**
     * `dissolveIn`/`dissolveOut` mode's per-cell function: a staggered wavefront
     * (per-cell threshold blending `_seedCache` noise with directional progress
     * from `_revealProgress()`) that reveals or hides cells in a scattered,
     * noise-driven order rather than a clean geometric sweep.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {boolean} reverse - `true` for `dissolveOut` (hiding), `false` for `dissolveIn` (revealing)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_dissolveCell(t,e,s){const i=Math.max(.1,Number(this.opts.revealDuration)||2.2),a=this.opts.loop?this._time%(i+1.1):Math.min(this._time,i),r=Math.min(1,a/i),n=e*this.cols+t,o=.72*this._seedCache[n]+.28*this._revealProgress(t,e);let h=Math.max(0,Math.min(1,(r-o+.12)/.12));s&&(h=1-h);const l=Math.floor((.25+.75*this._seedNextRowCache[n])*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[l]||" ",h*this.opts.maxOpacity,h,h>.82)}
/**
     * `assemble` mode's per-cell function: fragments fly in and settle using the
     * same staggered-threshold wavefront `_dissolveCell()` uses, but additionally
     * lets each fragment's own noise value blend its character and brightness as
     * it locks into place, for a "coalescing" look rather than a flat crossfade.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_assembleCell(t,e){const s=Math.max(.1,Number(this.opts.revealDuration)||2.2),i=this.opts.loop?this._time%(s+1.1):Math.min(this._time,s),a=Math.min(1,i/s),r=e*this.cols+t,n=.72*this._seedCache[r]+.28*this._revealProgress(t,e),o=Math.max(0,Math.min(1,(a-n+.16)/.16)),h=this._seedNextRowCache[r],l=o*(.58+.42*h),c=Math.floor((.72*o+.28*h)*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[c]||" ",l*this.opts.maxOpacity,l,l>.78)}
/**
     * `breakApart` mode's per-cell function: the exit mirror of `_assembleCell()`
     * — fragments break away and fade using the same staggered-threshold
     * wavefront, with each fragment's noise value blending its character and
     * brightness as it dissolves out.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_breakApartCell(t,e){const s=Math.max(.1,Number(this.opts.revealDuration)||2.2),i=this.opts.loop?this._time%(s+1.1):Math.min(this._time,s),a=Math.min(1,i/s),r=e*this.cols+t,n=.72*this._seedCache[r]+.28*this._revealProgress(t,e),o=1-Math.max(0,Math.min(1,(a-n+.16)/.16)),h=this._seedNextRowCache[r],l=o*(.45+.55*h),c=Math.floor((.65*h+.35*o)*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[c]||" ",l*this.opts.maxOpacity,l,l>.8)}
/**
     * `lumaFold` mode's per-cell function: a diagonal sinusoidal "fold" pattern
     * sharpened into a ridge (via a power curve on `1 - fold`) for a faceted,
     * luminance-creased look rather than a smooth wave.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_lumaFoldCell(t,e,s,i){const a=s/Math.max(1,this.w),r=i/Math.max(1,this.h),n=Math.abs(Math.sin((3.2*a+1.4*r)*Math.PI+1.7*this._time)),o=Math.pow(1-n,2.4),h=Math.min(1,.12+.42*n+.78*o),l=Math.floor(h*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[l]||" ",this.opts.minOpacity+h*(this.opts.maxOpacity-this.opts.minOpacity),h,o>.58)}
/**
     * `riftLace` mode's per-cell function: two independent diagonal sinusoids
     * whose *difference* is sharpened into a thin, lace-like "seam" wherever they
     * nearly cancel out, blended with a touch of ambient noise.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_riftLaceCell(t,e,s,i){const a=Math.sin(.037*s+.018*i+2.1*this._time),r=Math.sin(.052*i-.013*s-1.45*this._time),n=Math.pow(Math.max(0,1-Math.abs(a-r)),3),o=e*this.cols+t,h=Math.min(1,.9*n+.16*this._seedCache[o]),l=Math.floor(h*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[l]||" ",this.opts.minOpacity+h*(this.opts.maxOpacity-this.opts.minOpacity),h,n>.72)}
/**
     * `echoBloom` mode's per-cell function: three concentric ring pulses expanding
     * outward from `(this._originX, this._originY)` at different speeds and
     * strengths, combined by taking the strongest one at each point and cubing it
     * for a sharp "bloom" falloff rather than a soft ripple.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_echoBloomCell(t,e,s,i){const a=.055*Math.hypot(s-this._originX,i-this._originY)-3.1*this._time,r=Math.max(0,Math.cos(a)),n=.62*Math.max(0,Math.cos(.67*a-2.1)),o=.38*Math.max(0,Math.cos(.43*a-4.2)),h=Math.min(1,Math.pow(Math.max(r,n,o),3)),l=Math.floor(h*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[l]||" ",this.opts.minOpacity+h*(this.opts.maxOpacity-this.opts.minOpacity),h,h>.76)}
/**
     * `hoverZone` mode's per-cell function: a soft-edged glow radius following
     * the live pointer position (`this._cursor`), with a subtle expanding ripple
     * layered on top. Falls back to a dim ambient shimmer when no pointer is
     * currently hovering.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_hoverZoneCell(t,e,s,i){const a=e*this.cols+t,r=this._cursor;if(!r){const t=.18*this._seedCache[a],e=Math.floor(t*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[e]||" ",this.opts.minOpacity,t,!1)}const n=Math.max(1,Number(this.opts.interactionRadius)||180),o=Math.hypot(s-r.x,i-r.y),h=Math.max(0,1-o/n),l=h*h*(3-2*h),c=.72+.28*Math.sin(.085*o-4.2*this._time),d=Math.max(0,Math.min(1,l*c)),u=Math.floor(d*(this.opts.charSet.length-1)),m=this.opts.minOpacity+d*(this.opts.maxOpacity-this.opts.minOpacity);return this._setCell(this.opts.charSet[u]||" ",m,d,d>.72)}
/**
     * `clickZone` mode's per-cell function: an expanding ring pulse plus a
     * fading center glow triggered by `triggerInteraction()`/a click, timed
     * against `this._interaction.elapsed` over `opts.interactionDuration`. Falls
     * back to a dim ambient shimmer when no interaction is currently active.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_clickZoneCell(t,e,s,i){const a=e*this.cols+t,r=this._interaction;if(!r){const t=.16*this._seedCache[a],e=Math.floor(t*(this.opts.charSet.length-1));return this._setCell(this.opts.charSet[e]||" ",this.opts.minOpacity,t,!1)}const n=Math.max(.05,Number(this.opts.interactionDuration)||1.1),o=Math.max(0,Math.min(1,r.elapsed/n)),h=Math.max(1,Number(this.opts.interactionRadius)||180),l=Math.hypot(s-r.x,i-r.y),c=o*h,d=Math.max(2*this.charW,.16*h),u=Math.max(0,1-Math.abs(l-c)/d),m=Math.max(0,1-l/h)*(1-o),p=Math.max(0,Math.min(1,Math.max(u,m)*(1-.25*o))),_=Math.floor(p*(this.opts.charSet.length-1)),g=this.opts.minOpacity+p*(this.opts.maxOpacity-this.opts.minOpacity);return this._setCell(this.opts.charSet[_]||" ",g,p,p>.72)}
/**
     * `mode: 'image'`'s per-cell function (legacy — images are normally composed
     * as media layers, not a standalone mode). Returns `null` if there's no image
     * grid, `imageEnabled` is `false`, or the sampled character is blank.
     * When `opts.animateImageMask` is set, reveals/pulses the image through one
     * of several mask sweep patterns (`waveSweep` default, `scanlinePass`,
     * `radialRipple`, `thermalNoise`, `halftonePulse`, or `fullStatic`) instead of
     * showing it at flat full opacity.
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} x - pixel x-coordinate of the cell
     * @param {number} y - pixel y-coordinate of the cell
     * @returns {({char: string, opacity: number, level: number, bold: boolean, color: (string|null)}|null)} the resolved cell, or `null` if there's nothing to show at this cell
     */_imageCell(t,e,s,i){if(!this._imageGrid)return null;if(!1===this.opts.imageEnabled)return null;const a=this._imageGrid,r=e*a.cols+t,n=a.chars[r];if(!n||" "===n)return null;let o=this.opts.maxOpacity,h=!1,l=.5;const c=!a.animationMask||1===a.animationMask[r];if(this.opts.animateImageMask&&c){const a=this.opts.imageMaskMode||"waveSweep",n=this._time;if("fullStatic"===a||"static"===a)o=this.opts.maxOpacity,h=!1,l=.5;else if("scanlinePass"===a||"scanline"===a){const t=180*n%(this.h+200)-100,e=Math.abs(i-t),s=Math.max(0,1-e/(.12*this.h)),a=.35+s*s*.65;o=this.opts.minOpacity+(this.opts.maxOpacity-this.opts.minOpacity)*a,h=s>.6,l=s}else if("radialRipple"===a||"ripple"===a){const t=(this._imageRippleSin[r]*this._imageRippleTimeCos+this._imageRippleCos[r]*this._imageRippleTimeSin+1)/2;o=Math.max(this.opts.minOpacity,t*this.opts.maxOpacity),l=t,h=t>.7}else if("thermalNoise"===a||"noise"===a){const s=this._seed(t,e+Math.floor(8*n)),i=.55+.45*s;o=this.opts.maxOpacity*i,l=s}else if("halftonePulse"===a||"halftone"===a){const t=.65+.35*Math.sin(1.6*n+.02*(s+i));o=this.opts.maxOpacity*t,l=t,h=t>.85}else{const a=this._waveCell(t,e,s,i);o=Math.max(.18,a.opacity),h=a.bold,l=a.level/(this.opts.fontLevels-1)}}const d=this._setCell(n,o,l,h);return d.color=this.opts.colorFromImage?a.colors[r]:null,d}
/**
     * Overlays sampled image glyph and color data onto an already-computed
     * effect cell, without replacing that mode's own opacity/timing/particle
     * geometry — used when a sparse or dense animation mode is composited over
     * an image source. For a cell the animation mask excludes from animating,
     * ignores `effectCell` entirely and returns a flat full-opacity image cell
     * instead. Returns `null` if there's no image grid, the position is out of
     * the image grid's bounds, or the sampled character is blank.
     *
     * @param {({char: string, opacity: number, level: number, bold: boolean}|null)} effectCell - the active mode's own resolved cell to overlay onto, or `null`
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @returns {({char: string, opacity: number, level: number, bold: boolean, color: (string|null)}|null)} the overlaid cell, or `null` if there's nothing to show
     */_applyImageSource(t,e,s){const i=this._imageGrid;if(!i||e<0||s<0||e>=i.cols||s>=i.rows)return null;const a=s*i.cols+e,r=i.chars[a];if(!r||" "===r)return null;const n=!i.animationMask||1===i.animationMask[a]?t:this._setCell(r,this.opts.maxOpacity,.5,!1);return n?(n.char=r,n.color=this.opts.colorFromImage?i.colors[a]:null,n):null}
/**
     * `matrix` mode's per-cell function. Called only for rows within one
     * column's active falling-trail range (see `_drawSparse()`'s matrix branch),
     * never scanned across the full grid — cost scales with active trail length,
     * not grid size. The leading ("head") row of a column is rendered bold; the
     * character is re-randomized per frame for a flickering-glyph effect.
     *
     * @param {number} col - zero-based grid column (matches the falling column's index)
     * @param {number} row - zero-based grid row within the column's active trail
     * @param {Object} d - the column's particle state from `_matrix` (`{y, speed, length}`)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: null}} the resolved cell
     */_matrixCellAt(t,e,s){const i=s.y-e,a=Math.max(0,1-i/s.length),{charSet:r,maxOpacity:n}=this.opts,o=this._seed(t,e+Math.floor(6*this._time)),h=Math.floor(o*(r.length-1)),l=i<1;return this._setCell(r[h]||"0",a*n,a,l)}
/**
     * ASCII chart mode's per-cell function — renders one cell of whichever chart
     * `opts.chartType` selects (`bar`, `horizontalBar`, `line`, `sparkline`,
     * `heatmap`, `donut`), including axis guides, scale labels, title, legend,
     * per-item value labels, and per-series/per-item staggered reveal animation
     * when `opts.chartAnimateItems` is set. Returns a blank cell (not `null`) when
     * charting is disabled or there's no data, so callers that composite chart
     * cells over another mode's own cell (`_computeCell()`) can distinguish "blank
     * chart cell" from "no chart active."
     *
     * @param {number} col - zero-based grid column
     * @param {number} row - zero-based grid row
     * @param {number} _x - unused (signature kept consistent with other cell functions)
     * @param {number} _y - unused (signature kept consistent with other cell functions)
     * @returns {{char: string, opacity: number, level: number, bold: boolean, color: (string|null)}} the resolved cell
     */_chartCell(t,e,s,i){var a,r;if(!1===this.opts.chartEnabled)return this._setCell(" ",0,0,!1);const n=this.opts.chartData;if(!n&&"chart"!==this.opts.mode)return this._setCell(" ",0,0,!1);const o=this.opts.chartType||"bar",{cols:h,rows:l}=this;let c=[],d=[],u=[];Array.isArray(n)&&("number"==typeof n[0]?c=n:"object"==typeof n[0]&&null!==n[0]&&(c=n.map(t=>{var e,s;return Number(null!=(s=null!=(e=t.value)?e:t.val)?s:t.v)||0}),d=n.map(t=>{var e,s,i;return String(null!=(i=null!=(s=null!=(e=t.label)?e:t.name)?s:t.title)?i:"")}),u=n.map(t=>t.color||null))),0===c.length&&(c=[12,45,78,34,90,60,85,40]);const m=this.opts.chartTitle;if(m&&0===e){const e=t-Math.max(0,Math.floor((h-m.length)/2));if(e>=0&&e<m.length)return this._setCell(m[e],this.opts.maxOpacity,1,!0,this.opts.color)}const p=!1!==this.opts.chartShowAxes,_=!1!==this.opts.chartShowLegend&&d.length>0,g=m?2:1,f=_&&"donut"!==o?1:0,y=(p?2:1)+f,v=Math.max(1,l-g-y),w=h-2,M=Math.max(1,w-3-1),b=l-y,x=null!=(a=this.opts.chartScaleMin)?a:0,S=null!=(r=this.opts.chartScaleMax)?r:Math.max(1,...c),C=Math.max(1,S-x),A=Array.isArray(this.opts.chartColors)?this.opts.chartColors:null,F=t=>u[t]||A&&A[t%A.length]||this.opts.color,R=this.opts.chartAnimateItems,T=this._time||0,O=(t,e)=>{if(!R)return 1;const s=t/Math.max(1,e)*1.2;return Math.min(1,Math.max(0,(T-s)/.6))};if(p&&"donut"!==o&&t<3){const s=String(Math.round(S)).slice(0,2),i=String(Math.round(x+C/2)).slice(0,2),a=Math.floor(g+v/2);if(e===g){const e=t-(3-s.length);if(e>=0&&e<s.length)return this._setCell(s[e],.55*this.opts.maxOpacity,.4,!1,this.opts.color)}if(e===a&&v>4){const e=t-(3-i.length);if(e>=0&&e<i.length)return this._setCell(i[e],.4*this.opts.maxOpacity,.3,!1,this.opts.color)}return this._setCell(" ",0,0,!1)}if("bar"===o){const s=Math.max(1,Math.floor(M/c.length)),i=t-4;if(i>=0){const t=Math.floor(i/s),a=i%s,r=s>=3?s-1:s;if(t>=0&&t<c.length&&a<r){const s=O(t,c.length),i=c[t],n=Math.max(0,Math.min(1,(i-x)/C))*s,o=n*v,h=b-e,l=F(t);if(!1!==this.opts.chartShowValues&&s>=1&&h===Math.ceil(o)+1){const t=String(Math.round(i)),e=a-Math.max(0,Math.floor((r-t.length)/2));if(e>=0&&e<t.length)return this._setCell(t[e],.95*this.opts.maxOpacity,.95,!0,l)}if(h>0&&h<=Math.ceil(o)&&o>0){if(h===Math.ceil(o)){const t=o-Math.floor(o),e=0===t?1:t,s=["▂","▃","▄","▅","▆","▇","█"],i=Math.min(6,Math.floor(7*e));return this._setCell(s[i],this.opts.maxOpacity,n,e>.7,l)}return this._setCell("█",this.opts.maxOpacity,n,!0,l)}if(_&&d[t]&&e===b+f){const e=d[t].slice(0,r),s=a-Math.floor((r-e.length)/2);if(s>=0&&s<e.length)return this._setCell(e[s],.75*this.opts.maxOpacity,.6,!0,l)}}}}else if("horizontalBar"===o){const s=Math.max(1,Math.floor(v/c.length)),i=e-g,a=Math.floor(i/s),r=i%s,n=s>=3?s-1:s;if(a>=0&&a<c.length&&r<n){const e=O(a,c.length),s=c[a],i=Math.max(0,Math.min(1,(s-x)/C))*e,o=i*M,h=t-4,l=F(a);if(t<3&&d[a]&&r===Math.floor(n/2)){const e=d[a].slice(0,3),s=t-(3-e.length);if(s>=0&&s<e.length)return this._setCell(e[s],.8*this.opts.maxOpacity,.6,!0,l)}if(h>=0&&h<=Math.ceil(o)&&o>0){if(h===Math.ceil(o)){const t=o-Math.floor(o),e=0===t?1:t,s=["▏","▎","▍","▌","▋","▊","▉","█"],a=Math.min(7,Math.floor(8*e));return this._setCell(s[a],this.opts.maxOpacity,i,e>.7,l)}return this._setCell("█",this.opts.maxOpacity,i,!0,l)}if(!1!==this.opts.chartShowValues&&e>=1&&h===Math.ceil(o)+1){const e=` ${Math.round(s)}`,i=t-(4+Math.ceil(o));if(i>=0&&i<e.length)return this._setCell(e[i],.95*this.opts.maxOpacity,.95,!0,l)}}}else if("line"===o||"sparkline"===o){const s=(t-3)/Math.max(1,M);if(t>=3&&t<=3+M){const i=Math.max(0,Math.min(c.length-1,s*(c.length-1))),a=Math.floor(i),r=Math.min(c.length-1,a+1),n=i-a,o=c[a]*(1-n)+c[r]*n,h=Math.max(0,Math.min(1,(o-x)/C)),l=R?Math.min(1,Math.max(0,1.2*T-.6*s)):1,u=h*l,m=Math.round(b-1-u*(v-1)),p=F(a),g=Math.abs(i-Math.round(i))<.5/Math.max(1,M),y=Math.round(i);if(!1!==this.opts.chartShowValues&&g&&e===m-1&&l>=1){const e=String(Math.round(c[y]||0)),s=t-(Math.round(3+y/Math.max(1,c.length-1)*M)-Math.floor(e.length/2));if(s>=0&&s<e.length)return this._setCell(e[s],.9*this.opts.maxOpacity,.9,!0,F(y))}if(e===m&&l>0){if(g)return this._setCell("●",this.opts.maxOpacity,1,!0,F(y));const t=a>0?c[a-1]:c[a],e=(r<c.length-1?c[r+1]:c[r])-t,s=e>2?"╱":e<-2?"╲":"─";return this._setCell(s,this.opts.maxOpacity,u,!0,p)}if(e>m&&e<=b&&l>0){const t=(b-e)/Math.max(1,b-m),s=["░","▒","▓","█"],i=Math.min(3,Math.floor(4*t)),a=Math.max(.2,.8*t)*this.opts.maxOpacity;return this._setCell(s[i],a,u*t,!1,p)}if(_&&e===b+f&&g&&d[y]){const e=d[y].slice(0,4),s=t-(Math.round(3+y/Math.max(1,c.length-1)*M)-Math.floor(e.length/2));if(s>=0&&s<e.length)return this._setCell(e[s],.75*this.opts.maxOpacity,.6,!0,F(y))}}}else if("heatmap"===o){const s=(t-3)/Math.max(1,M);if(t>=3&&t<=3+M&&e>=g&&e<=b){const t=Math.floor(s*c.length),i=c[t%c.length]||0,a=Math.max(0,Math.min(1,(i-x)/C)),r=a*O(t,c.length)*v,n=b-e,o=F(t);if(n>=0&&n<=Math.ceil(r)){const t=(n+1)/Math.max(1,r),e=["░","▒","▓","█"],s=Math.min(3,Math.floor(4*t));return this._setCell(e[s],this.opts.maxOpacity*t,a,t>.8,o)}}}else if("donut"===o){const s=h/2,i=l/2,a=1.6*(t-s),r=e-i,n=Math.hypot(a,r),o=.38*Math.min(h,l);if(n>=.45*o&&n<=o){const t=(Math.atan2(r,a)+Math.PI)/(2*Math.PI),e=Math.floor(t*c.length),s=c[e%c.length]||0,i=Math.max(0,Math.min(1,(s-x)/C)),n=R?Math.min(1,Math.max(0,1.5*T-.8*t)):1,o=F(e);if(n>0){const t=["░","▒","▓","█"],e=Math.min(3,Math.floor(4*i));return this._setCell(t[e],this.opts.maxOpacity*n,i,i>.7,o)}}if(n<.4*o&&e===Math.floor(i)){const e=m||"DONUT",i=t-Math.floor(s-e.length/2);if(i>=0&&i<e.length)return this._setCell(e[i],this.opts.maxOpacity,1,!0,this.opts.color)}if(_&&d.length>0&&n<.35*o){if(e===Math.floor(i)+2){const e=d.slice(0,4).join(" · "),i=t-Math.floor(s-e.length/2);if(i>=0&&i<e.length)return this._setCell(e[i],.75*this.opts.maxOpacity,.6,!0,this.opts.color)}}}if(p&&"donut"!==o){if(3===t&&e>=g&&e<=b){const t=e===g?"┌":e===b?"└":"│";return this._setCell(t,.5*this.opts.maxOpacity,.4,!1,this.opts.color)}if(e===b&&t>=3&&t<=w){const e=3===t?"└":t===w?"┘":"─";return this._setCell(e,.5*this.opts.maxOpacity,.4,!1,this.opts.color)}}return this._setCell(" ",0,0,!1)}
/**
     * Lazily allocates and returns the extended-diagnostics history state
     * (rolling frame-work-time and occupancy sample buffers), only the first
     * time it's actually needed — a compact-stats instance never pays this
     * allocation.
     *
     * @returns {Object} the extended-stats accumulator/history state
     */_ensureExtendedStats(){return this._extendedStats||(this._extendedStats={refreshInterval:0,frameWorkAccum:0,frameWorkSamples:0,frameWorkMs:0,frameHistory:new Float32Array(24),occupancyHistory:new Float32Array(24),historyCount:0,historyCursor:0}),this._extendedStats}
/**
     * Estimates the display's actual refresh cadence from raw animation-frame
     * intervals, exponentially smoothed. Only samples plausible vsync-driven
     * deltas (`4`-`50` ms, i.e. roughly 20-250 Hz) so an interval stretched by a
     * dropped frame or a background tab doesn't skew the estimate.
     *
     * @param {number} dt - elapsed time since the previous frame, in milliseconds
     * @returns {void}
     */_sampleDisplayRefresh(t){if(!(t>=4&&t<=50))return;const e=this._ensureExtendedStats();e.refreshInterval=e.refreshInterval?.9*e.refreshInterval+.1*t:t}
/**
     * Finalizes the current stats window's averaged CPU frame-work time and
     * records both it and cell occupancy into the rolling ring-buffer history
     * used to render the extended-diagnostics sparkline charts.
     *
     * @param {number} occupancy - fraction of the grid actually drawn this window, `[0, 1]`
     * @returns {void}
     */_pushExtendedStats(t){const e=this._ensureExtendedStats();e.frameWorkMs=e.frameWorkAccum/e.frameWorkSamples,e.frameWorkAccum=0,e.frameWorkSamples=0,e.frameHistory[e.historyCursor]=e.frameWorkMs,e.occupancyHistory[e.historyCursor]=t,e.historyCursor=(e.historyCursor+1)%24,e.historyCount=Math.min(24,e.historyCount+1)}
/**
     * Returns a read-only diagnostic snapshot of the instance's current
     * performance and renderer state — FPS, estimated display refresh rate, CPU
     * frame-work time (when extended stats are enabled), grid occupancy,
     * resolved renderer/adapter info, quality tier, DPR, and mesh/model status.
     * Safe to call at any time; never starts an observer or allocates history on
     * its own (that's `_ensureExtendedStats()`'s job, driven by `opts.showStats`).
     *
     * @returns {Object} the diagnostic snapshot
     */getStats(){var t,e;const s=this.cols*this.rows,i=s?Math.min(1,this._lastDrawnCount/s):0,a=this._extendedStats,r=this.getRendererInfo(),n=("webgl2"===r.backend||"webgpu"===r.backend)&&(null==(t=this._webgl)?void 0:t.getAdapterInfo())||null;return{fps:this._fps,estimatedRefreshRate:(null==a?void 0:a.refreshInterval)?1e3/a.refreshInterval:null,frameWorkMs:null!=(e=null==a?void 0:a.frameWorkMs)?e:null,cells:s,drawn:this._lastDrawnCount,occupancy:i,renderer:h(o({},r),{adapter:n}),quality:this.opts.quality,dpr:this._dpr||1,targetFPS:this.opts.targetFPS,reducedMotion:this._reduced,mesh:this.getMeshInfo(),modelLoaded:!!this.opts.model}}
/**
     * Formats a `getStats()` snapshot plus rolling history into the multi-line
     * extended-diagnostics overlay text: FPS/grid/drawn summary, display
     * refresh/backend/quality/DPR line, CPU frame-work time with an inline
     * sparkline, fill-rate percentage with an inline sparkline, and (when
     * present) a GPU adapter line and a 3D mesh/model summary line.
     *
     * @param {Object} snapshot - a `getStats()` result
     * @returns {string} the formatted, newline-joined diagnostics text
     */_formatExtendedStats(t){const e=this._extendedStats,s=t.estimatedRefreshRate?`~${Math.round(t.estimatedRefreshRate)} Hz`:"measuring",i=null===t.frameWorkMs?"measuring":`${t.frameWorkMs.toFixed(2)} ms`,a=Math.max(1,1e3/(t.estimatedRefreshRate||t.targetFPS||60)),r=U(e.frameHistory,e.historyCount,e.historyCursor,a),n=U(e.occupancyHistory,e.historyCount,e.historyCursor,1),o="webgpu"===t.renderer.backend?"WebGPU":"webgl2"===t.renderer.backend?"WebGL2":"Canvas 2D",h="webgpu"===t.renderer.backend?"WebGPU batch fill":"webgl2"===t.renderer.backend?"GPU batch fill":"Canvas fill",l=[`${t.fps} fps · ${this.cols}×${this.rows} cells · ${t.drawn} drawn`,`display ${s} · ${o} · ${t.quality} · DPR ${t.dpr.toFixed(2)}`,`CPU frame ${i}${r?`  ${r}`:""}`,`${h} ${(100*t.occupancy).toFixed(1)}%${n?`  ${n}`:""}`];if(t.renderer.adapter){const e=t.renderer.adapter.renderer.replace(/\s+/g," ").slice(0,80);l.push(`GPU ${e}`)}if(t.mesh.loaded){const e=t.modelLoaded?"model":this.opts.meshPrimitive||"mesh";l.push(`3D ${e} · ${t.mesh.vertexCount} vertices · ${t.mesh.primitiveCount} ${t.mesh.primitive} · ${t.mesh.style}`)}return l.join("\n")}
/**
     * Accumulates per-frame CPU work time (when extended stats are enabled) and,
     * once every ~500ms window, recomputes FPS and refreshes the attached stats
     * element's text — compact one-line summary normally, or the full
     * `_formatExtendedStats()` multi-line overlay when `opts.extendedStats` is
     * set. A no-op past frame counting if no stats element is attached.
     *
     * @param {number} timestamp - current frame timestamp (same clock as `requestAnimationFrame`)
     * @param {number} frameWorkMs - this frame's measured CPU work time in milliseconds (`0` if not measured)
     * @returns {void}
     */_updateStats(t,e){if(this._frames++,this.opts.extendedStats){const t=this._ensureExtendedStats();t.frameWorkAccum+=e,t.frameWorkSamples++}null===this._statsWindowStart&&(this._statsWindowStart=t);const s=t-this._statsWindowStart;if(s>=500&&(this._fps=Math.round(1e3*this._frames/s),this._frames=0,this._statsWindowStart=t,this._statsEl)){const t=this.cols*this.rows,e=t?Math.min(1,this._lastDrawnCount/t):0;this.opts.extendedStats?(this._pushExtendedStats(e),this._statsEl.textContent=this._formatExtendedStats(this.getStats())):this._statsEl.textContent=`${this._fps} fps · ${this.cols}×${this.rows} cells · ${this._lastDrawnCount} drawn`}}
/**
     * Selects the DOM element `_updateStats()` writes its diagnostics text into.
     * Pass `null` to detach (stats keep computing internally, just stop being
     * written anywhere).
     *
     * @param {(Element|null)} el - element to receive the diagnostics text, or `null` to detach
     * @returns {void}
     */attachStats(t){this._statsEl=t}
/**
     * Captures and exports the rendered ASCII art frame as a PNG, JPG, or WebP image.
     * Accepts format, quality, multiplier scale (e.g. 1x, 2x, 4x for high-res prints), and optional auto-download.
     */exportImage(){return c(this,arguments,function*(t={}){const e=(t.format||"png").toLowerCase().replace("jpeg","jpg"),s=Math.min(1,Math.max(.1,Number(t.quality)||.92)),i=Math.min(8,Math.max(1,Number(t.scale)||1)),a=(t.filename||"ascii-art").replace(/\.[^/.]+$/,""),r="jpg"===e?"image/jpeg":"webp"===e?"image/webp":"image/png";this._running&&this._lastT&&this._draw(16.7);const n=this.canvas;let o=n;if(1!==i){const t=document.createElement("canvas");t.width=n.width*i,t.height=n.height*i;const e=t.getContext("2d");e&&(e.imageSmoothingEnabled=!1,e.drawImage(n,0,0,t.width,t.height),o=t)}let h="";try{if("function"==typeof o.toDataURL){const t=o.toDataURL(r,s);t&&"string"==typeof t&&t.startsWith("data:")&&(h=t)}}catch(t){h=""}h||(h=`data:${r};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`);let l=null;if(!l)try{const t=h.split(",");if(t.length>1&&t[1]){const e=atob(t[1]),s=new Uint8Array(e.length);for(let t=0;t<e.length;t++)s[t]=e.charCodeAt(t);l=new Blob([s],{type:r})}else l=new Blob([],{type:r})}catch(t){l=new Blob([],{type:r})}const c={dataURL:h,blob:l,filename:`${a}.${"jpg"===e?"jpg":"webp"===e?"webp":"png"}`,width:o.width,height:o.height,format:e};if(t.download){const t=document.createElement("a");t.href=h,t.download=c.filename,document.body.appendChild(t),t.click(),document.body.removeChild(t)}return c})}
/**
     * Convenience shortcut to download current frame snapshot immediately.
     */downloadSnapshot(t="png",e="ascii-art",s=1){return this.exportImage({format:t,filename:e,scale:s,download:!0})}
/**
     * Installs chart data and enables ASCII chart rendering — the primary entry
     * point for chart mode, independent of `setMode('chart')` (chart cells
     * composite over the active animation mode automatically once data is
     * present, per `_computeCell()`). Any option omitted from `options` keeps its
     * current value rather than being reset, so repeated calls can update just
     * the data or just a single display option.
     *
     * @param {(number[]|Object[])} data - flat numeric values, or objects with `value`/`label`/`color` fields (shape accepted depends on `opts.chartType`)
     * @param {Object} [options={}]
     * @param {boolean} [options.enabled] - explicitly enable/disable chart rendering (default: enabled)
     * @param {string} [options.type] - chart type (`'bar'`, `'horizontalBar'`, `'line'`, `'sparkline'`, `'heatmap'`, `'donut'`)
     * @param {string} [options.title] - chart title text
     * @param {boolean} [options.showValues] - show per-item value labels
     * @param {boolean} [options.showAxes] - show axis guides and scale labels
     * @param {boolean} [options.showLegend] - show the legend
     * @param {string[]} [options.colors] - per-item/per-series color palette
     * @param {number} [options.scaleMin] - explicit Y-axis minimum (auto if omitted)
     * @param {number} [options.scaleMax] - explicit Y-axis maximum (auto if omitted)
     * @param {boolean} [options.animateItems] - stagger-reveal items on entry
     * @returns {asciiam} `this`, for chaining
     *
     * @example
     * anim.setChartData([12, 34, 8, 21], { type: "bar", title: "Requests/min" });
     */setChartData(t,e={}){return this.opts.chartData=t,this.opts.chartEnabled=void 0===e.enabled||e.enabled,e.type&&(this.opts.chartType=e.type),void 0!==e.title&&(this.opts.chartTitle=e.title),void 0!==e.showValues&&(this.opts.chartShowValues=e.showValues),void 0!==e.showAxes&&(this.opts.chartShowAxes=e.showAxes),void 0!==e.showLegend&&(this.opts.chartShowLegend=e.showLegend),void 0!==e.colors&&(this.opts.chartColors=e.colors),void 0!==e.scaleMin&&(this.opts.chartScaleMin=e.scaleMin),void 0!==e.scaleMax&&(this.opts.chartScaleMax=e.scaleMax),void 0!==e.animateItems&&(this.opts.chartAnimateItems=e.animateItems),this}
/**
     * Clears active chart data, disables chart rendering, and — if `opts.mode`
     * was explicitly set to `'chart'` — switches back to `'wave'`. Data set via
     * `setChartData()` while composited over a different mode is simply removed
     * without changing that mode.
     *
     * @returns {asciiam} `this`, for chaining
     */clearChart(){return this.opts.chartData=null,this.opts.chartEnabled=!1,this.opts.chartTitle="",this.opts.chartAnimateItems=!1,"chart"===this.opts.mode&&this.setMode("wave"),this}
/**
     * Returns a read-only metadata snapshot of the active ASCII chart —
     * whether it's active/enabled, its type, data length, title, legend/color
     * flags, resolved scale bounds, and whether item animation is on.
     *
     * @returns {{active: boolean, enabled: boolean, type: string, dataLength: number, title: string, showLegend: boolean, hasColors: boolean, scaleMin: (number|null), scaleMax: (number|null), animateItems: boolean}} the chart metadata snapshot
     */getChartInfo(){var t,e;const s=this.opts.chartData,i=Array.isArray(s);return{active:!1!==this.opts.chartEnabled&&!!s||"chart"===this.opts.mode,enabled:!1!==this.opts.chartEnabled&&!!s,type:this.opts.chartType||"bar",dataLength:i?s.length:0,title:this.opts.chartTitle||"",showLegend:!1!==this.opts.chartShowLegend,hasColors:Array.isArray(this.opts.chartColors),scaleMin:null!=(t=this.opts.chartScaleMin)?t:null,scaleMax:null!=(e=this.opts.chartScaleMax)?e:null,animateItems:!0===this.opts.chartAnimateItems}}};l($,"QUALITY",{high:{maxDPR:3,density:.9,targetFPS:null,fontLevels:6,alphaLevels:64,useGlyphAtlas:!1,cacheStaticWave:!1},balanced:{maxDPR:2,density:1,targetFPS:null,fontLevels:5,alphaLevels:32,useGlyphAtlas:!1,cacheStaticWave:!1},performance:{maxDPR:1.5,density:1.4,targetFPS:null,fontLevels:4,alphaLevels:16,useGlyphAtlas:!0,cacheStaticWave:!1},ultra:{maxDPR:1,density:2.4,targetFPS:null,fontLevels:2,alphaLevels:8,useGlyphAtlas:!0,cacheStaticWave:!0}}),
/** Canonical inventory used by documentation and integration tooling. */
l($,"BUILT_IN_MODES",Object.freeze(["none","wave","current","ripple","vortex","plasma","fadeIn","fadeOut","irisIn","irisOut","dissolveIn","dissolveOut","assemble","breakApart","lumaFold","riftLace","echoBloom","matrix","snow","sparkle","fire","starfield","glitch","typewriter","orbit","hoverZone","clickZone","image","custom","mesh","static","plain","chart"])),l($,"CHARACTER_SETS",{density:" .:-=+*#%@",ascii:Array.from({length:95},(t,e)=>String.fromCharCode(e+32)).join(""),asciiExtended:Array.from({length:95},(t,e)=>String.fromCharCode(e+32)).join("")+Array.from({length:95},(t,e)=>String.fromCharCode(e+161)).join(""),extended:"  .'`,^:\";~+_(){}[]<>!?ilI|/\\\\tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",alphanumeric:" 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",uppercase:" ABCDEFGHIJKLMNOPQRSTUVWXYZ",lowercase:" abcdefghijklmnopqrstuvwxyz",symbols:" !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",boxDrawing:" ─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬░▒▓█",arrows:" ←↑→↓↖↗↘↙↔↕⇐⇑⇒⇓⇔",math:" ±×÷=≠≈∞√∑∏∫∆∇∂∈∉⊂⊃≤≥",blocks:" ░▒▓█",minimal:" .oO@",technical:" .·:+=*#%@",geometric:" ·•○●□■△▲◇◆",circuit:" ·-+=oO0#@",waves:" ~≈≋∿",terminal:" 01<>/\\|[]{}#@",binary:" 01",binaryWide:" 001101",braille:"⠀⠂⠒⠲⠶⠷⠿⣿",japanese:" 01アイウエオカキクケコ",punctuation:" .,:;irsXA253hMHGS#9B&@"}),l($,"presets",{heroWave:{mode:"wave",color:"#4FA8FF",speed:1,edgeFade:.25},subtleCurrent:{mode:"current",color:"#4FA8FF",speed:.6,minOpacity:.03,maxOpacity:.45},matrixRain:{mode:"matrix",color:"#3CF07A",speed:1,charSet:" 01アイウエオ"},softRipple:{mode:"ripple",color:"#4FA8FF",speed:.8,edgeFade:.4},vortexFlow:{mode:"vortex",color:"#C04FFF",speed:.65,edgeFade:.2,gradient:{type:"radial",center:[.5,.5],radius:.9,stops:["#4FA8FF","#C04FFF"],steps:2}},plasmaField:{mode:"plasma",color:"#72F1B8",speed:.55,minOpacity:.04,maxOpacity:.68,gradient:{type:"linear",angle:25,stops:["#72F1B8","#4FA8FF","#C04FFF"],steps:3}},introReveal:{mode:"fadeIn",color:"#4FA8FF",speed:1,loop:!1,revealDirection:"left-to-right"},outroFade:{mode:"fadeOut",color:"#4FA8FF",speed:1,loop:!1,revealDirection:"right-to-left"},scanline:{mode:"wave",color:"#4FA8FF",speed:1.4,ambient:0,bandWidth:.04,edgeFade:.2},snowfall:{mode:"snow",color:"#E8EEF7",speed:.5,snowDensity:.025},sparkleField:{mode:"sparkle",color:"#4FA8FF",speed:.8,sparkleDensity:.04},pulseGlow:{mode:"current",color:"#4FA8FF",speed:.5,pulse:{amplitude:.4,speed:.6}},cursorGlow:{mode:"current",color:"#4FA8FF",speed:.4,minOpacity:.03,maxOpacity:.4,cursor:{enabled:!0,radius:160,strength:.7}},hoverField:{mode:"hoverZone",color:"#72F1B8",charSet:" .·:+=*#%@",interactionRadius:180,minOpacity:.025,maxOpacity:.9},clickPulse:{mode:"clickZone",color:"#C04FFF",charSet:" ·•○●□■△▲◇◆",interactionRadius:220,interactionDuration:1.1,minOpacity:.02,maxOpacity:.95},auroraCurrent:{mode:"current",color:"#72F1B8",speed:.45,minOpacity:.04,maxOpacity:.5,gradient:{type:"linear",angle:25,stops:["#72F1B8","#4FA8FF","#C04FFF"],steps:3}},terminalMatrix:{mode:"matrix",color:"#3CF07A",speed:1.1,charSet:" 01アイウエオカキクケコ",maxOpacity:.75},blueprintWave:{mode:"wave",color:"#78B7FF",speed:.8,charSet:" ░▒▓█",edgeFade:.3,gradient:{type:"linear",angle:90,stops:["#173A63","#78B7FF"],steps:2}},deepRipple:{mode:"ripple",color:"#C04FFF",speed:.55,edgeFade:.5,gradient:{type:"radial",center:[.5,.5],radius:.9,stops:["#4FA8FF","#C04FFF","#0A0C10"],steps:3}},snowDrift:{mode:"snow",color:"#E8EEF7",speed:.35,snowDensity:.035,charSet:" ·*❄"},emberSparkle:{mode:"sparkle",color:"#FF9D5C",speed:.65,sparkleDensity:.06,charSet:" .·+*#"},risingEmbers:{mode:"fire",color:"#FF9D5C",speed:.7,fireDensity:.035,trail:.18,trailColor:"#070809",charSet:" .·+*#",gradient:{type:"linear",angle:90,stops:["#FFDF8A","#FF9D5C","#C04F32"],steps:3}},deepSpace:{mode:"starfield",color:"#E8EEF7",speed:.65,starfieldDensity:.018,charSet:" ·+*"},signalGlitch:{mode:"glitch",color:"#72F1B8",speed:.8,charSet:" 01<>/\\|#@",glitchIntensity:.32},terminalType:{mode:"typewriter",color:"#72F1B8",speed:1,loop:!0,typewriterDuration:4.5,charSet:" 01ABCDEFGHIJKLMNOPQRSTUVWXYZ"},orbitalFlow:{mode:"orbit",color:"#C04FFF",speed:.55,orbitDensity:.014,trail:.12,trailColor:"#070809",charSet:" ·+*#"},imageReveal:{mode:"image",imageEnabled:!0,
// Site-root-absolute so this resolves identically from the gallery, the
// docs splash, and the Web Utility playground alike — see the
// sharedImageNames convention in scripts/generate-asset-manifest.js.
image:"/images/vilkasss-ai-generated-9599760.jpg",color:"#4FA8FF",imageScale:1,imageScaleX:1,imageScaleY:1,imageFov:1,fit:"cover",colorFromImage:!0,animateImageMask:!0},telemetryChart:{mode:"chart",chartEnabled:!0,color:"#4FA8FF",chartType:"bar",chartTitle:"System Telemetry",chartData:[12,45,78,34,90,60,85,40]}}),
// Registry for user-defined named modes: asciiam.registerMode('name', fn)
l($,"_registry",{}),
// A currently-running instance keeps its built atlas/wave-layer alive via its own
// direct reference regardless of this shared cache's eviction, so a small limit
// never forces a running instance to rebuild every frame — it only determines
// whether a *newly (re)created* instance with a previously-seen configuration can
// reuse an already-built one instead of rebuilding from scratch. A limit of 2 was
// narrower than real concurrent-instance pages actually need: the gallery runs up
// to 6 distinctly-configured instances at once (`maximumActive` in gallery.js) and
// destroys/recreates them as cards scroll in and out of view, so revisiting a card
// was a near-guaranteed cache miss under the old limit.
l($,"_glyphAtlases",new Map),l($,"_glyphAtlasLimit",8),l($,"_waveBaseLayers",new Map),l($,"_waveBaseLayerLimit",8),l($,"_activeInstances",new Set),l($,"_schedulerRaf",null);let Y=$;return Y});
//# sourceMappingURL=asciiam.js.map
