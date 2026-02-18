import type { AnalyzeDirectoryOptions, AnalyzeOptions, ContentBox, Metrics, RGB } from './types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import sharp from 'sharp'
import { CONTRAST_THRESHOLD, DEFAULT_EXTENSIONS, SAMPLE_MAX_SIZE } from './defaults.ts'

export async function analyze(
  filePath: string,
  options: AnalyzeOptions = {},
): Promise<Metrics | undefined> {
  const {
    sampleMaxSize = SAMPLE_MAX_SIZE,
    contrastThreshold = CONTRAST_THRESHOLD,
  } = options

  const { pixels, width, height, alphaOnly, bg } = await extractPixels(filePath, sampleMaxSize)

  const contentBox = detectContentBoundingBox(
    pixels,
    width,
    height,
    contrastThreshold,
    alphaOnly,
    bg,
  )

  if (contentBox.width === 0 || contentBox.height === 0)
    return

  const visualCenter = calculateVisualCenter(
    pixels,
    width,
    contentBox,
    contrastThreshold,
    alphaOnly,
    bg,
  )

  const density = measurePixelDensity(
    pixels,
    width,
    contentBox,
    contrastThreshold,
    alphaOnly,
  )

  return {
    contentRatio: contentBox.width / contentBox.height,
    pixelDensity: density,
    visualCenterX: visualCenter.offsetX / contentBox.width,
    visualCenterY: visualCenter.offsetY / contentBox.height,
  }
}

export async function analyzeDirectory(
  dirPath: string,
  options: AnalyzeDirectoryOptions = {},
): Promise<Map<string, Metrics>> {
  const {
    extensions = DEFAULT_EXTENSIONS,
    ...analyzeOptions
  } = options

  const files = (await fsp.readdir(dirPath))
    .filter(entry => extensions.includes(
      path.extname(entry).slice(1).toLowerCase(),
    ))

  const results = new Map<string, Metrics>()

  for (const file of files) {
    const absolutePath = path.resolve(dirPath, file)

    try {
      const metrics = await analyze(absolutePath, analyzeOptions)

      if (metrics) {
        results.set(file, metrics)
      }
    }
    catch {
      // Skip files that cannot be analyzed (corrupt, unreadable, etc.)
    }
  }

  return results
}

async function extractPixels(filePath: string, sampleMaxSize: number) {
  const buffer = await fsp.readFile(filePath)
  const isSvg = filePath.endsWith('.svg')

  let image = sharp(buffer, {
    ...(isSvg && { density: 96 }),
  }).ensureAlpha()

  image = image.resize(sampleMaxSize, sampleMaxSize, {
    fit: 'inside',
    withoutEnlargement: false,
  })

  const { data: pixels, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info

  let hasTransparency = false
  const totalPixels = width * height

  for (let i = 0; i < totalPixels; i++) {
    if (pixels[i * 4 + 3]! < 250) {
      hasTransparency = true
      break
    }
  }

  let bg: RGB = { r: 255, g: 255, b: 255 }

  if (!hasTransparency) {
    const corners = [
      0,
      (width - 1) * 4,
      (height - 1) * width * 4,
      ((height - 1) * width + width - 1) * 4,
    ]

    let sumR = 0
    let sumG = 0
    let sumB = 0

    for (const offset of corners) {
      sumR += pixels[offset]!
      sumG += pixels[offset + 1]!
      sumB += pixels[offset + 2]!
    }

    bg = {
      r: Math.round(sumR / 4),
      g: Math.round(sumG / 4),
      b: Math.round(sumB / 4),
    }
  }

  return { pixels, width, height, alphaOnly: hasTransparency, bg }
}

function detectContentBoundingBox(
  pixels: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  alphaOnly: boolean,
  bg: RGB,
): ContentBox {
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      const a = pixels[i + 3]!

      if (isContentPixel(r, g, b, a, threshold, alphaOnly, bg)) {
        if (x < minX)
          minX = x
        if (y < minY)
          minY = y
        if (x > maxX)
          maxX = x
        if (y > maxY)
          maxY = y
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, width, height }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function calculateVisualCenter(
  pixels: Uint8Array,
  width: number,
  contentBox: ContentBox,
  threshold: number,
  alphaOnly: boolean,
  bg: RGB,
): { offsetX: number, offsetY: number } {
  let totalWeight = 0
  let weightedX = 0
  let weightedY = 0

  const { x: bx, y: by, width: bw, height: bh } = contentBox

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = ((by + y) * width + (bx + x)) * 4
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      const a = pixels[i + 3]!

      if (!isContentPixel(r, g, b, a, threshold, alphaOnly, bg)) {
        continue
      }

      let weight: number

      if (alphaOnly) {
        weight = a / 255
      }
      else {
        const dr = r - bg.r
        const dg = g - bg.g
        const db = b - bg.b
        const colorDistance = Math.sqrt(dr * dr + dg * dg + db * db)
        weight = Math.sqrt(colorDistance) * (a / 255)
      }

      totalWeight += weight
      weightedX += (x + 0.5) * weight
      weightedY += (y + 0.5) * weight
    }
  }

  if (totalWeight === 0) {
    return { offsetX: 0, offsetY: 0 }
  }

  return {
    offsetX: weightedX / totalWeight - bw / 2,
    offsetY: weightedY / totalWeight - bh / 2,
  }
}

function measurePixelDensity(
  pixels: Uint8Array,
  width: number,
  contentBox: ContentBox,
  threshold: number,
  alphaOnly: boolean,
): number {
  const { x: bx, y: by, width: bw, height: bh } = contentBox
  const totalPixels = bw * bh

  if (totalPixels === 0)
    return 0.5

  let filledPixels = 0
  let totalOpacity = 0

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = ((by + y) * width + (bx + x)) * 4
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      const a = pixels[i + 3]!

      if (
        isContentPixel(r, g, b, a, threshold, alphaOnly, {
          r: 255,
          g: 255,
          b: 255,
        })
      ) {
        filledPixels++
        totalOpacity += a / 255
      }
    }
  }

  if (filledPixels === 0)
    return 0

  return (filledPixels / totalPixels) * (totalOpacity / filledPixels)
}

function isContentPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  threshold: number,
  alphaOnly: boolean,
  bg: RGB,
): boolean {
  if (alphaOnly)
    return a > threshold

  return (
    a > threshold
    && (Math.abs(r - bg.r) > threshold
      || Math.abs(g - bg.g) > threshold
      || Math.abs(b - bg.b) > threshold)
  )
}
