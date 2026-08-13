export type asciiamMode =
  | 'wave'
  | 'current'
  | 'ripple'
  | 'vortex'
  | 'plasma'
  | 'fadeIn'
  | 'fadeOut'
  | 'irisIn'
  | 'irisOut'
  | 'dissolveIn'
  | 'dissolveOut'
  | 'lumaFold'
  | 'riftLace'
  | 'echoBloom'
  | 'matrix'
  | 'snow'
  | 'sparkle'
  | 'fire'
  | 'starfield'
  | 'glitch'
  | 'typewriter'
  | 'orbit'
  | 'hoverZone'
  | 'clickZone'
  | 'image'
  | 'mesh'
  | 'custom'
  | (string & {});

export type asciiamEvent =
  | 'ready'
  | 'resize'
  | 'frame'
  | 'sequenceStart'
  | 'sequenceResume'
  | 'sequencePause'
  | 'sequenceStop'
  | 'sequenceLoop'
  | 'sequenceComplete'
  | 'sequenceInterrupt'
  | 'sequenceStepStart'
  | 'sequenceStepComplete'
  | 'sequenceStepInterrupt'
  | 'sequenceStepError'
  | 'sequenceMorphStart'
  | 'sequenceMorphComplete'
  | 'rendererChange'
  | 'rendererFallback'
  | 'imageFramesReady'
  | 'meshReady'
  | 'meshClear'
  | 'modelLoadStart'
  | 'modelProgress'
  | 'modelReady'
  | 'modelError'
  | 'modelClear'
  | (string & {});

export interface asciiamMeshData {
  positions: Float32Array | Float64Array;
  indices?: Uint8Array | Uint16Array | Uint32Array | null;
  normals?: Float32Array | null;
  colors?: Float32Array | null;
  primitive?: 'points' | 'lines' | 'triangles';
}

export type asciiamModelSource = string | Blob | ArrayBuffer | ArrayBufferView | Record<string, unknown>;
export type asciiamModelResource = string | Blob | ArrayBuffer | ArrayBufferView;

export interface asciiamModelLoadOptions {
  baseUrl?: string;
  scene?: number;
  signal?: AbortSignal;
  limits?: { maxVertices?: number; maxPrimitives?: number };
  /** Maps an external glTF URI to a selected File, byte buffer, or alternate URL. */
  resolveUri?: (
    uri: string,
    context: { kind: 'buffer'; index: number; baseUrl: string | null }
  ) => asciiamModelResource | null | undefined | Promise<asciiamModelResource | null | undefined>;
  onProgress?: (progress: { loaded: number; total: number | null; buffer?: number }) => void;
}

export interface asciiamMeshCamera {
  position?: [number, number, number] | readonly number[];
  target?: [number, number, number] | readonly number[];
  up?: [number, number, number] | readonly number[];
  fov?: number;
  near?: number;
  far?: number;
  orthographicScale?: number;
}

export interface asciiamMeshTransform {
  position?: [number, number, number] | readonly number[];
  /** Euler rotation in radians, ordered X, Y, then Z. */
  rotation?: [number, number, number] | readonly number[];
  scale?: [number, number, number] | readonly number[];
}

export interface asciiamMeshLight {
  direction?: [number, number, number] | readonly number[];
  ambient?: number;
  intensity?: number;
}

export interface asciiamMeshInfo {
  loaded: boolean;
  vertexCount: number;
  primitiveCount: number;
  primitive: 'points' | 'lines' | 'triangles' | null;
  style?: 'points' | 'wireframe' | 'solid';
  projection?: 'perspective' | 'orthographic';
}

export interface asciiamStats {
  fps: number;
  /** Estimated from active requestAnimationFrame cadence; not a hardware guarantee. */
  estimatedRefreshRate: number | null;
  /** Mean CPU-side asciiam frame work for the latest reporting interval. */
  frameWorkMs: number | null;
  cells: number;
  drawn: number;
  /** Drawn cells divided by total cells; not GPU utilization. */
  occupancy: number;
  renderer: {
    requested: 'auto' | 'webgl2' | 'canvas2d';
    backend: 'webgl2' | 'canvas2d';
    gpuPreferred: boolean;
    acceleration: 'gpu-api-preferred' | 'browser-managed' | 'not-requested';
    desynchronized: boolean;
    willReadFrequently: boolean;
    adapter: { vendor: string; renderer: string } | null;
  };
  quality: 'high' | 'balanced' | 'performance' | 'ultra' | null;
  dpr: number;
  targetFPS: number | null;
  reducedMotion: boolean;
  mesh: asciiamMeshInfo;
  modelLoaded: boolean;
}

export interface asciiamSequenceDetail {
  index: number;
  length: number;
  loop: boolean;
  elapsed: number;
  step: asciiamSequenceStep | null;
  reason?: 'complete' | 'pause' | 'stop' | 'seek' | 'skip' | 'mode-change' | 'reconfigure' | string;
}

export type asciiamSequenceCallback = (detail: asciiamSequenceDetail, animation: asciiam) => void;

export interface asciiamSequenceTransition {
  type?: 'cut' | 'morph';
  duration?: number;
  source?: unknown;
  loaded?: number;
  total?: number | null;
  buffer?: number;
  error?: unknown;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface asciiamSequenceStep {
  id?: string;
  label?: string;
  mode: asciiamMode;
  duration?: number;
  delay?: number;
  /** Repeats a finite mode timeline within this step. Defaults to false. */
  repeat?: boolean;
  /** New source to decode before the step starts; null clears the current image. */
  image?: string | null;
  imageOptions?: { animated?: boolean } & Record<string, unknown>;
  /** New glTF/GLB source to decode before the step starts; null clears retained geometry. */
  model?: asciiamModelSource | null;
  modelOptions?: asciiamModelLoadOptions;
  options?: Record<string, unknown>;
  transition?: asciiamSequenceTransition;
  onStart?: asciiamSequenceCallback | null;
  onComplete?: asciiamSequenceCallback | null;
  onInterrupt?: asciiamSequenceCallback | null;
  onError?: asciiamSequenceCallback | null;
}

export interface asciiamSequenceOptions {
  loop?: boolean;
  autoplay?: boolean;
  onStepStart?: asciiamSequenceCallback | null;
  onStepComplete?: asciiamSequenceCallback | null;
  onStepInterrupt?: asciiamSequenceCallback | null;
  onComplete?: asciiamSequenceCallback | null;
}

export interface asciiamSequenceState {
  configured: boolean;
  running: boolean;
  completed: boolean;
  index: number;
  length: number;
  loop: boolean;
  elapsed: number;
  waiting: boolean;
  loading: boolean;
  morphing: boolean;
  morphProgress: number;
}

export interface asciiamEventDetail {
  width?: number;
  height?: number;
  cols?: number;
  rows?: number;
  time?: number;
  delta?: number;
  drawn?: number;
  index?: number;
  length?: number;
  loop?: boolean;
  elapsed?: number;
  step?: asciiamSequenceStep | null;
  reason?: string;
  requested?: 'auto' | 'webgl2' | 'canvas2d';
  backend?: 'webgl2' | 'canvas2d';
  gpuPreferred?: boolean;
  acceleration?: 'gpu-api-preferred' | 'browser-managed' | 'not-requested';
  desynchronized?: boolean;
  willReadFrequently?: boolean;
  frameCount?: number;
  duration?: number;
}

export interface asciiamOptions {
  mode?: asciiamMode;
  quality?: 'high' | 'balanced' | 'performance' | 'ultra';
  charSet?: string;
  fontFamily?: string;
  fontSize?: number;
  density?: number;
  /** Logical grid-detail multiplier. Clamped to 0.5–2; 1 retains automatic sizing. */
  resolutionScale?: number;
  color?: string;
  gradient?: Record<string, unknown> | null;
  background?: string;
  backdrop?: {
    enabled?: boolean;
    opacity?: number;
    color?: string;
    placement?: 'behind' | 'over';
    gradient?: Record<string, unknown> | null;
  } | null;
  speed?: number;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  revealDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'diagonal' | 'center' | 'edges';
  align?: 'center' | 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right';
  minOpacity?: number;
  maxOpacity?: number;
  boldOnPeak?: boolean;
  loop?: boolean;
  image?: string | null;
  imageChars?: string;
  fit?: 'cover' | 'contain';
  imageScale?: number;
  imageScaleX?: number;
  imageScaleY?: number;
  imageFov?: number;
  /** Clockwise source rotation in degrees, applied during image sampling. */
  imageRotation?: number;
  imageFlipX?: boolean;
  imageFlipY?: boolean;
  imageLuminance?: 'auto' | 'normal' | 'invert';
  colorFromImage?: boolean;
  animateImageMask?: boolean;
  /** @deprecated Use the global `mode` option; retained for legacy `mode: 'image'` configurations. */
  imageMaskMode?: 'waveSweep' | 'radialRipple' | 'scanlinePass' | 'thermalNoise' | 'halftonePulse' | 'fullStatic';
  imageAnimationRange?: { min: string; max: string } | null;
  animateImageFrames?: boolean;
  /** Fallback sampling rate when exact WebCodecs GIF frame capture is unavailable. */
  imageFrameRate?: number;
  edgeFade?: number;
  maxDPR?: number;
  targetFPS?: number | null;
  showStats?: boolean;
  /** Enables opt-in diagnostic sampling and text sparklines when showStats is active. */
  extendedStats?: boolean;
  fontLevels?: number;
  alphaLevels?: number;
  useGlyphAtlas?: boolean;
  cacheStaticWave?: boolean;
  preferGPU?: boolean;
  desynchronized?: boolean;
  renderer?: 'auto' | 'webgl2' | 'canvas2d';
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  respectReducedMotion?: boolean;
  onReady?: ((animation: asciiam) => void) | null;
  onImageError?: ((error: Event) => void) | null;
  onModelError?: ((error: unknown) => void) | null;
  sequence?: asciiamSequenceStep[] | null;
  sequenceOptions?: asciiamSequenceOptions | null;
  ambient?: number;
  bandWidth?: number;
  trail?: number;
  trailColor?: string;
  pulse?: { amplitude?: number; speed?: number } | null;
  colorAnimation?: Record<string, unknown> | null;
  cursor?: { enabled?: boolean; radius?: number; strength?: number } | null;
  interactionRadius?: number;
  interactionDuration?: number;
  snowDensity?: number;
  sparkleDensity?: number;
  fireDensity?: number;
  starfieldDensity?: number;
  orbitDensity?: number;
  glitchIntensity?: number;
  typewriterDuration?: number;
  mesh?: asciiamMeshData | null;
  meshPrimitive?: 'cube' | 'plane' | 'icosphere' | 'torus' | null;
  meshStyle?: 'points' | 'wireframe' | 'solid';
  meshProjection?: 'perspective' | 'orthographic';
  meshCamera?: asciiamMeshCamera | null;
  meshTransform?: asciiamMeshTransform | null;
  meshLight?: asciiamMeshLight | null;
  meshAutoRotate?: boolean;
  meshRotationSpeed?: [number, number, number] | readonly number[];
  meshMaxVertices?: number;
  meshMaxPrimitives?: number;
  model?: asciiamModelSource | null;
  customCell?: ((api: Record<string, unknown>) => unknown) | null;
  [key: string]: unknown;
}

export default class asciiam {
  static readonly QUALITY: Record<string, Record<string, number | boolean | null>>;
  /** Canonical names of modes implemented by the library. */
  static readonly BUILT_IN_MODES: readonly asciiamMode[];
  static readonly CHARACTER_SETS: Record<string, string>;
  static readonly presets: Record<string, asciiamOptions>;
  static isSupported(): boolean;
  static registerMode(name: string, fn: (api: Record<string, unknown>) => unknown): void;
  static createMeshPrimitive(name: 'cube' | 'plane' | 'icosphere' | 'torus', options?: Record<string, number>): asciiamMeshData;
  static loadModel(source: asciiamModelSource, options?: asciiamModelLoadOptions): Promise<asciiamMeshData>;
  constructor(target: string | HTMLCanvasElement | HTMLElement, options?: asciiamOptions);
  start(): void;
  stop(): void;
  destroy(): void;
  on(event: asciiamEvent, listener: (detail: asciiamEventDetail, animation: asciiam) => void): () => void;
  off(event: asciiamEvent, listener: (detail: asciiamEventDetail, animation: asciiam) => void): void;
  setMode(mode: asciiamMode): void;
  setOption(key: string, value: unknown): void;
  setTarget(target: string | HTMLElement): void;
  setSequence(steps: asciiamSequenceStep[], options?: asciiamSequenceOptions): this;
  playSequence(startIndex?: number): this;
  pauseSequence(reason?: string): this;
  stopSequence(): this;
  clearSequence(): this;
  seekSequence(index: number): this;
  nextSequenceStep(): this;
  getSequenceState(): asciiamSequenceState;
  getRendererInfo(): {
    requested: 'auto' | 'webgl2' | 'canvas2d';
    backend: 'webgl2' | 'canvas2d';
    gpuPreferred: boolean;
    acceleration: 'gpu-api-preferred' | 'browser-managed' | 'not-requested';
    desynchronized: boolean;
    willReadFrequently: boolean;
  };
  setRenderer(renderer: 'auto' | 'webgl2' | 'canvas2d'): 'webgl2' | 'canvas2d';
  /** Decodes and samples an image. Animated GIFs capture every frame when ImageDecoder is available. */
  setImage(source: string, options?: { animated?: boolean }): Promise<HTMLImageElement | null>;
  clearImage(): this;
  setMesh(mesh: asciiamMeshData): this;
  clearMesh(): this;
  getMeshInfo(): asciiamMeshInfo;
  setModel(source: asciiamModelSource | null, options?: asciiamModelLoadOptions): Promise<asciiamMeshData | null>;
  clearModel(): this;
  setCursor(x: number | null, y?: number): void;
  /** Starts a click-zone pulse at supplied coordinates or the configured alignment origin. */
  triggerInteraction(x?: number, y?: number): void;
  getStats(): asciiamStats;
  attachStats(element: HTMLElement): void;
}
