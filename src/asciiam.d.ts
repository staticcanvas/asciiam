export type asciiamMode =
  | 'wave'
  | 'current'
  | 'ripple'
  | 'fadeIn'
  | 'matrix'
  | 'snow'
  | 'sparkle'
  | 'image'
  | 'custom'
  | (string & {});

export type asciiamEvent = 'ready' | 'resize' | 'frame' | (string & {});

export interface asciiamEventDetail {
  width?: number;
  height?: number;
  cols?: number;
  rows?: number;
  time?: number;
  delta?: number;
  drawn?: number;
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
  speed?: number;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  minOpacity?: number;
  maxOpacity?: number;
  boldOnPeak?: boolean;
  loop?: boolean;
  image?: string | null;
  imageChars?: string;
  fit?: 'cover' | 'contain';
  imageScale?: number;
  imageFov?: number;
  colorFromImage?: boolean;
  animateImageMask?: boolean;
  edgeFade?: number;
  maxDPR?: number;
  targetFPS?: number | null;
  showStats?: boolean;
  fontLevels?: number;
  respectReducedMotion?: boolean;
  onReady?: ((animation: asciiam) => void) | null;
  onImageError?: ((error: Event) => void) | null;
  ambient?: number;
  bandWidth?: number;
  trail?: number;
  trailColor?: string;
  pulse?: { amplitude?: number; speed?: number } | null;
  colorAnimation?: Record<string, unknown> | null;
  cursor?: { enabled?: boolean; radius?: number; strength?: number } | null;
  snowDensity?: number;
  sparkleDensity?: number;
  customCell?: ((api: Record<string, unknown>) => unknown) | null;
  [key: string]: unknown;
}

export default class asciiam {
  static readonly QUALITY: Record<string, Record<string, number | null>>;
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
  setImage(source: string): Promise<HTMLImageElement | null>;
  setCursor(x: number | null, y?: number): void;
  attachStats(element: HTMLElement): void;
}
