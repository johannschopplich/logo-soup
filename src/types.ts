export interface Metrics {
  contentRatio: number
  pixelDensity: number
  visualCenterX: number
  visualCenterY: number
}

export interface NormalizedDimensions {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export interface AnalyzeOptions {
  /** Maximum dimension for the resampled image used during analysis. */
  sampleMaxSize?: number
  /** Minimum contrast threshold to consider a pixel as content. */
  contrastThreshold?: number
}

export interface NormalizeOptions {
  /** Base size in pixels for the normalized output. */
  baseSize?: number
  /** Aspect ratio normalization factor (0–1). */
  scaleFactor?: number
  /** Density compensation factor (0–1). */
  densityFactor?: number
  /** Dampening exponent for density compensation. */
  densityDampening?: number
  /** Reference density value for compensation scaling. */
  referenceDensity?: number
}

export interface AnalyzeDirectoryOptions extends AnalyzeOptions {
  /** File extensions to include (without dots). */
  extensions?: string[]
}

export interface ContentBox {
  x: number
  y: number
  width: number
  height: number
}

export interface RGB {
  r: number
  g: number
  b: number
}
