# 🍜 logo-soup

> [!NOTE]
> Inspired by [React Logo Soup](https://github.com/sanity-labs/react-logo-soup) by [Sanity](https://github.com/sanity-labs). logo-soup is a framework-agnostic Node.js port using `sharp` for server-side analysis.

Logos come in all shapes – wide wordmarks, dense icons, tall monograms – and displaying them at the same CSS size makes some look huge while others nearly vanish.

logo-soup analyzes SVG/PNG images with `sharp` and computes a width and height for each, so that every logo feels perceptually balanced. Transparency is not required – an opaque logo works as long as its corners show the background color.

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

```text
logo-soup <dir> [options]

Options:
  --output, -o        Output JSON file path (default: "logo-metrics.json")
  --base-size         Base size for normalization in px (default: 64)
  --scale-factor      Aspect ratio normalization 0-1 (default: 0.5)
  --density-factor    Density compensation 0-1 (default: 0.5)
  --extensions, -e    Comma-separated file extensions (default: "svg,png")
  --verbose           Print the stack trace on failure
```

## Usage

Running the CLI produces a JSON file mapping each filename to its normalized dimensions. The keys carry no directory, so you can prepend your own base path:

```json
{
  "acme-wordmark.svg": { "width": 143, "height": 28, "offsetX": 0, "offsetY": 0.5 },
  "globex-icon.svg": { "width": 64, "height": 64, "offsetX": 0, "offsetY": 0 },
  "initech-monogram.svg": { "width": 52, "height": 79, "offsetX": -0.4, "offsetY": 0 }
}
```

`width` and `height` are pixel dimensions normalized so every logo feels the same visual size – use them directly as `width`/`height` attributes. Both describe the logo's content bounding box, not the file's canvas, so crop each file to its logo. `offsetX`/`offsetY` are optional sub-pixel corrections (see [Visual Center Offsets](#visual-center-offsets)).

### Logo Strip

In a "trusted by" row or partner logo strip, each logo takes its `width` and `height` from the JSON:

```html
<div class="flex flex-wrap items-center justify-center gap-8">
  <img src="/logos/acme-wordmark.svg" width="143" height="28" alt="Acme">
  <img src="/logos/globex-icon.svg" width="64" height="64" alt="Globex">
  <img src="/logos/initech-monogram.svg" width="52" height="79" alt="Initech">
</div>
```

The default `baseSize` is 64px. For a different base, pass `--base-size <n>` to the CLI (or `{ baseSize }` to `normalize()`), or scale uniformly with CSS – the proportions stay correct either way.

### Visual Center Offsets

Some logos have visual weight that does not match their geometric center – a play button or an arrow, for instance. `offsetX`/`offsetY` correct for this by nudging the logo toward its optical center.

These offsets are typically small (< 2px) and `width`/`height` alone handle most of the balancing. For pixel-perfect alignment, apply them as CSS transforms:

```html
<img src="/logos/acme-wordmark.svg" width="143" height="28" style="transform: translate(0px, 0.5px)">
```

In a horizontal strip, where only vertical alignment matters, `translateY(0.5px)` alone is enough.

## Programmatic API

```ts
import { analyze, analyzeDirectory, normalize } from 'logo-soup'

// Single file
const metrics = await analyze('./logo.svg')
const dimensions = normalize(metrics)
console.log(dimensions) // { width, height, offsetX, offsetY }

// Batch
const results = await analyzeDirectory('./logos', { extensions: ['svg', 'png'] })
for (const [file, metrics] of results) {
  const dimensions = normalize(metrics)
  console.log(file, dimensions)
}
```

### `analyze`

Analyzes a single logo image and returns its metrics. An image without content returns the metrics of its whole canvas. Throws on I/O or decode errors.

```ts
function analyze(filePath: string, options?: AnalyzeOptions): Promise<Metrics>

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

Analyzes all matching images in a directory. Returns a `Map<string, Metrics>` where keys are filenames. Files that fail to decode are skipped instead of failing the whole batch.

```ts
function analyzeDirectory(dirPath: string, options?: AnalyzeDirectoryOptions): Promise<Map<string, Metrics>>

interface AnalyzeDirectoryOptions extends AnalyzeOptions {
  /** File extensions to include, without dots (default: ["svg", "png"]) */
  extensions?: string[]
}
```

### `normalize`

Converts raw metrics into display dimensions using aspect ratio normalization with density compensation.

```ts
function normalize(metrics: Metrics, options?: NormalizeOptions): NormalizedDimensions

interface NormalizeOptions {
  /** Base size in pixels (default: 64) */
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
