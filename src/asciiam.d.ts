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
  | 'image'
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
  | 'sequenceMorphStart'
  | 'sequenceMorphComplete'
  | 'rendererChange'
  | 'rendererFallback'
  | 'imageFramesReady'
  | (string & {});

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
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface asciiamSequenceStep {
  id?: string;
  label?: string;
  mode: asciiamMode;
  duration?: number;
  delay?: number;
  options?: Record<string, unknown>;
  transition?: asciiamSequenceTransition;
  onStart?: asciiamSequenceCallback | null;
  onComplete?: asciiamSequenceCallback | null;
  onInterrupt?: asciiamSequenceCallback | null;
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
  index: number;
  length: number;
  loop: boolean;
  elapsed: number;
  waiting: boolean;
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
  color?: string;
  gradient?: Record<string, unknown> | null;
  background?: string;
  backdrop?: {
    enabled?: boolean;
    opacity?: number;
    color?: string;
    gradient?: Record<string, unknown> | null;
  } | null;
  speed?: number;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  revealDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'diagonal' | 'center' | 'edges';
  align?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
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
  sequence?: asciiamSequenceStep[] | null;
  sequenceOptions?: asciiamSequenceOptions | null;
  ambient?: number;
  bandWidth?: number;
  trail?: number;
  trailColor?: string;
  pulse?: { amplitude?: number; speed?: number } | null;
  colorAnimation?: Record<string, unknown> | null;
  cursor?: { enabled?: boolean; radius?: number; strength?: number } | null;
  snowDensity?: number;
  sparkleDensity?: number;
  fireDensity?: number;
  starfieldDensity?: number;
  orbitDensity?: number;
  glitchIntensity?: number;
  typewriterDuration?: number;
  customCell?: ((api: Record<string, unknown>) => unknown) | null;
  [key: string]: unknown;
}

export default class asciiam {
  static readonly QUALITY: Record<string, Record<string, number | boolean | null>>;
  static readonly CHARACTER_SETS: Record<string, string>;
  static readonly presets: Record<string, asciiamOptions>;
  static isSupported(): boolean;
  static registerMode(name: string, fn: (api: Record<string, unknown>) => unknown): void;
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
  setCursor(x: number | null, y?: number): void;
  attachStats(element: HTMLElement): void;
}
