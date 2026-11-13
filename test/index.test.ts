import type { Metrics } from '../src/index.ts'
import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyze, analyzeDirectory, normalize } from '../src/index.ts'
import { useTemporaryDirectories } from './utils.ts'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')
const createDirectory = useTemporaryDirectories()

function makeMetrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    contentRatio: 1,
    pixelDensity: 0.35,
    visualCenterX: 0,
    visualCenterY: 0,
    ...overrides,
  }
}

describe('normalize', () => {
  it('returns integer width and height', () => {
    const result = normalize(makeMetrics({ contentRatio: 2 }))
    expect(Number.isInteger(result.width)).toBe(true)
    expect(Number.isInteger(result.height)).toBe(true)
  })

  it('produces wider output for wide content ratios', () => {
    const wideResult = normalize(makeMetrics({ contentRatio: 4 }))
    const squareResult = normalize(makeMetrics())
    expect(wideResult.width).toBeGreaterThan(squareResult.width)
  })

  it('respects custom baseSize', () => {
    const metrics = makeMetrics()
    const small = normalize(metrics, { baseSize: 24 })
    const large = normalize(metrics, { baseSize: 96 })
    expect(large.width).toBeGreaterThan(small.width)
  })

  it('offsets are inverse of visual center displacement', () => {
    const result = normalize(makeMetrics({ visualCenterX: 0.1, visualCenterY: -0.05 }))
    expect(result.offsetX).toBeLessThan(0)
    expect(result.offsetY).toBeGreaterThan(0)
  })

  it('scales down dense logos', () => {
    const denseResult = normalize(makeMetrics({ pixelDensity: 0.7 }))
    const sparseResult = normalize(makeMetrics({ pixelDensity: 0.1 }))
    expect(denseResult.width).toBeLessThan(sparseResult.width)
  })
})

describe('analyze', () => {
  it('returns near-unit content ratio for square SVGs', async () => {
    const result = await analyze(path.join(fixturesDir, 'square.svg'))

    expect(result).toBeDefined()
    expect(result!.contentRatio).toBeCloseTo(1, 0)
    expect(result!.pixelDensity).toBeGreaterThan(0)
  })

  it('returns high content ratio for wide SVGs', async () => {
    const result = await analyze(path.join(fixturesDir, 'wide.svg'))

    expect(result).toBeDefined()
    expect(result!.contentRatio).toBeGreaterThan(2)
  })

  it('returns metrics with zero density for an empty SVG', async () => {
    const result = await analyze(path.join(fixturesDir, 'empty.svg'))

    expect(result).toBeDefined()
    expect(result!.pixelDensity).toBe(0)
  })

  it('returns a pixelDensity of 1 for white content on an opaque black background', async () => {
    const directory = createDirectory({
      'inverted.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <rect width="200" height="100" fill="black"/>
  <rect x="50" y="25" width="100" height="50" fill="white"/>
</svg>
`,
    })

    const result = await analyze(path.join(directory, 'inverted.svg'))

    expect(result!.pixelDensity).toBe(1)
  })

  it('rasterizes LOGO.SVG like its lowercase counterpart', async () => {
    const squarePath = path.join(fixturesDir, 'square.svg')
    const directory = createDirectory({ 'LOGO.SVG': readFileSync(squarePath, 'utf-8') })

    const result = await analyze(path.join(directory, 'LOGO.SVG'))

    expect(result).toEqual(await analyze(squarePath))
  })

  it('throws for a non-existent file', async () => {
    await expect(analyze(path.join(fixturesDir, 'nope.svg'))).rejects.toThrow()
  })
})

describe('analyzeDirectory', () => {
  it('uses bare filenames as keys', async () => {
    const results = await analyzeDirectory(fixturesDir, {
      extensions: ['svg'],
    })

    expect(results.size).toBeGreaterThanOrEqual(2)

    for (const key of results.keys()) {
      expect(key).not.toContain('/')
      expect(key).toMatch(/\.svg$/)
    }
  })

  it('filters by extensions', async () => {
    const results = await analyzeDirectory(fixturesDir, {
      extensions: ['png'],
    })

    expect(results.size).toBe(0)
  })
})
