# 🍜 logo-soup

> [!NOTE]
> Inspired by [React Logo Soup](https://github.com/sanity-labs/react-logo-soup) by [Sanity](https://github.com/sanity-labs). logo-soup is a framework-agnostic Node.js port using `sharp` for server-side analysis.

Logos come in all shapes – wide wordmarks, dense icons, tall monograms – and displaying them at the same CSS size makes some look huge while others nearly vanish.

logo-soup analyzes SVG/PNG images with `sharp`, detects their content bounding box, measures pixel density and visual center, then normalizes dimensions so every logo feels perceptually balanced.

## Installation

```bash
pnpm add -D logo-soup

# Or run directly
npx logo-soup ./logos
```

## CLI

```bash
logo-soup ./public/logos -o logo-metrics.json
```

Output JSON keys are filenames only (e.g. `"logo.svg"`), so consumers can prepend their own base path.

```
logo-soup <dir> [options]

Options:
  --output, -o        Output JSON file path (default: "logo-metrics.json")
  --base-size         Base size for normalization in px (default: 48)
  --scale-factor      Aspect ratio normalization 0-1 (default: 0.5)
  --density-factor    Density compensation 0-1 (default: 0.5)
  --extensions, -e    Comma-separated file extensions (default: "svg,png")
```

## Programmatic API

```ts
import { analyze, analyzeDirectory, normalize } from 'logo-soup'

// Single file
const metrics = await analyze('./logo.svg')
if (metrics) {
  const dimensions = normalize(metrics, { baseSize: 48 })
  console.log(dimensions) // { width, height, offsetX, offsetY }
}

// Batch
const results = await analyzeDirectory('./logos', { extensions: ['svg', 'png'] })
for (const [file, metrics] of results) {
  const dimensions = normalize(metrics)
  console.log(file, dimensions)
}
```

### `analyze`

Analyzes a single logo image and returns its metrics, or `undefined` if no content is detected. Throws on I/O or decode errors.

**Type Declaration:**

```ts
function analyze(filePath: string, options?: AnalyzeOptions): Promise<Metrics | undefined>

interface AnalyzeOptions {
  /** Maximum dimension for the resampled image used during analysis (default: 200) */
  sampleMaxSize?: number
  /** Minimum contrast threshold to consider a pixel as content (default: 10) */
  contrastThreshold?: number
}

interface Metrics {
  contentRatio: number
  pixelDensity: number
  visualCenterX: number
  visualCenterY: number
}
```

### `analyzeDirectory`

Analyzes all matching images in a directory. Returns a `Map<string, Metrics>` where keys are filenames.

**Type Declaration:**

```ts
function analyzeDirectory(dirPath: string, options?: AnalyzeDirectoryOptions): Promise<Map<string, Metrics>>

interface AnalyzeDirectoryOptions extends AnalyzeOptions {
  /** File extensions to include, without dots (default: ["svg", "png"]) */
  extensions?: string[]
}
```

### `normalize`

Converts raw metrics into display dimensions using aspect ratio normalization with density compensation.

**Type Declaration:**

```ts
function normalize(metrics: Metrics, options?: NormalizeOptions): NormalizedDimensions

interface NormalizeOptions {
  /** Base size in pixels (default: 48) */
  baseSize?: number
  /** Aspect ratio normalization factor, 0–1 (default: 0.5) */
  scaleFactor?: number
  /** Density compensation factor, 0–1 (default: 0.5) */
  densityFactor?: number
  /** Dampening exponent for density compensation (default: 0.5) */
  densityDampening?: number
  /** Reference density value for compensation scaling (default: 0.35) */
  referenceDensity?: number
}

interface NormalizedDimensions {
  width: number
  height: number
  offsetX: number
  offsetY: number
}
```

## License

[MIT](./LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
