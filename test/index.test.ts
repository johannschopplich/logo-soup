import type { Metrics } from '../src/index.ts'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyze, analyzeDirectory, normalize } from '../src/index.ts'

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures')

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
