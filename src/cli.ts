import type { NormalizedDimensions } from './types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { consola } from 'consola'
import pkg from '../package.json' with { type: 'json' }
import { analyzeDirectory } from './analyze.ts'
import { BASE_SIZE, DEFAULT_EXTENSIONS, DENSITY_FACTOR, SCALE_FACTOR } from './defaults.ts'
import { normalize } from './normalize.ts'

const command = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  args: {
    'dir': {
      type: 'positional',
      description: 'Directory containing logo images',
      required: true,
    },
    'output': {
      type: 'string',
      alias: 'o',
      description: 'Output JSON file path',
      default: 'logo-metrics.json',
    },
    'base-size': {
      type: 'string',
      description: `Base size for normalization in px (default: ${BASE_SIZE})`,
    },
    'scale-factor': {
      type: 'string',
      description: `Aspect ratio normalization 0-1 (default: ${SCALE_FACTOR})`,
    },
    'density-factor': {
      type: 'string',
      description: `Density compensation 0-1 (default: ${DENSITY_FACTOR})`,
    },
    'extensions': {
      type: 'string',
      alias: 'e',
      description: `Comma-separated file extensions (default: "${DEFAULT_EXTENSIONS.join(',')}")`,
    },
  },
  async run({ args }) {
    const dirPath = path.resolve(args.dir)

    // Validate directory exists
    try {
      const stat = await fsp.stat(dirPath)
      if (!stat.isDirectory()) {
        consola.error(`Not a directory: ${dirPath}`)
        process.exit(1)
      }
    }
    catch {
      consola.error(`Directory not found: ${dirPath}`)
      process.exit(1)
    }

    // Parse numeric options
    const baseSize = parseNumericArg(args['base-size'], 'base-size', BASE_SIZE)
    const scaleFactor = parseNumericArg(args['scale-factor'], 'scale-factor', SCALE_FACTOR)
    const densityFactor = parseNumericArg(args['density-factor'], 'density-factor', DENSITY_FACTOR)

    // Parse extensions
    const extensions = args.extensions
      ? args.extensions.split(',').map(ext => ext.trim().toLowerCase())
      : DEFAULT_EXTENSIONS

    consola.start(`Analyzing logos in ${dirPath}`)

    const metricsMap = await analyzeDirectory(dirPath, { extensions })
    const results: Record<string, NormalizedDimensions> = {}

    for (const [file, metrics] of metricsMap) {
      const dimensions = normalize(metrics, { baseSize, scaleFactor, densityFactor })
      results[file] = dimensions
      consola.log(`  ${file} → ${dimensions.width}×${dimensions.height}px`)
    }

    const outputPath = path.resolve(args.output)
    await fsp.mkdir(path.dirname(outputPath), { recursive: true })
    await fsp.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`)

    consola.success(`Wrote ${Object.keys(results).length} entries to ${outputPath}`)
  },
})

function parseNumericArg(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined)
    return fallback

  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    consola.error(`Invalid value for --${name}: "${value}" (expected a number)`)
    process.exit(1)
  }

  return parsed
}

runMain(command)
