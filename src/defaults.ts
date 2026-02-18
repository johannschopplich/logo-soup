/** Maximum dimension for the resampled image used during analysis. */
export const SAMPLE_MAX_SIZE: number = 200

/** Minimum contrast threshold to consider a pixel as content. */
export const CONTRAST_THRESHOLD: number = 10

/** Base size in pixels for the normalized output. */
export const BASE_SIZE: number = 48

/** Aspect ratio normalization factor (0–1). */
export const SCALE_FACTOR: number = 0.5

/** Density compensation factor (0–1). */
export const DENSITY_FACTOR: number = 0.5

/** Dampening exponent for density compensation. */
export const DENSITY_DAMPENING: number = 0.5

/** Reference density value for compensation scaling. */
export const REFERENCE_DENSITY: number = 0.35

/** Default file extensions to scan. */
export const DEFAULT_EXTENSIONS: string[] = ['svg', 'png']
