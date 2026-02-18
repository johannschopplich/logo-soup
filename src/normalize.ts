import type { Metrics, NormalizedDimensions, NormalizeOptions } from './types.ts'
import { BASE_SIZE, DENSITY_DAMPENING, DENSITY_FACTOR, REFERENCE_DENSITY, SCALE_FACTOR } from './defaults.ts'

export function normalize(
  metrics: Metrics,
  options: NormalizeOptions = {},
): NormalizedDimensions {
  const {
    baseSize = BASE_SIZE,
    scaleFactor = SCALE_FACTOR,
    densityFactor = DENSITY_FACTOR,
    densityDampening = DENSITY_DAMPENING,
    referenceDensity = REFERENCE_DENSITY,
  } = options

  const ratio = metrics.contentRatio

  // Dan Paquette's aspect ratio normalization
  let width = ratio ** scaleFactor * baseSize
  let height = width / ratio

  // Density compensation
  if (densityFactor > 0 && metrics.pixelDensity > 0) {
    const densityRatio = metrics.pixelDensity / referenceDensity
    const densityScale = (1 / densityRatio) ** (densityFactor * densityDampening)
    const clampedScale = Math.max(0.5, Math.min(2.0, densityScale))
    width *= clampedScale
    height *= clampedScale
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round(-(metrics.visualCenterX ?? 0) * width * 10) / 10,
    offsetY: Math.round(-(metrics.visualCenterY ?? 0) * height * 10) / 10,
  }
}
