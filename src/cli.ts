import type { CommandDef } from 'utilful/cli'
import type { NormalizedDimensions } from './types.ts'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import { styleText } from 'node:util'
import { CliError, defineCommand, log } from 'utilful/cli'
import pkg from '../package.json' with { type: 'json' }
import { analyzeDirectory } from './analyze.ts'
import { BASE_SIZE, DEFAULT_EXTENSIONS, DENSITY_FACTOR, SCALE_FACTOR } from './defaults.ts'
import { normalize } from './normalize.ts'

function color(style: Parameters<typeof styleText>[0], text: string): string {
  return styleText(style, text, { stream: process.stderr })
}

// The exported command's type refers to this literal, and `isolatedDeclarations`
// cannot infer a computed value inside it, so each one asserts its type.
const analyzeArgs = {
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
    description: 'Base size for normalization in px',
    default: String(BASE_SIZE) as string,
  },
  'scale-factor': {
    type: 'string',
    description: 'Aspect ratio normalization 0-1',
    default: String(SCALE_FACTOR) as string,
  },
  'density-factor': {
    type: 'string',
    description: 'Density compensation 0-1',
    default: String(DENSITY_FACTOR) as string,
  },
  'extensions': {
    type: 'string',
    alias: 'e',
    description: 'Comma-separated file extensions',
    default: DEFAULT_EXTENSIONS.join(',') as string,
  },
} as const

export const mainCommand: CommandDef<typeof analyzeArgs> = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  args: analyzeArgs,
  async run({ args }) {
    const dirPath = path.resolve(args.dir)
    await assertDirectory(dirPath)

    const baseSize = parseNumericArg(args['base-size'], 'base-size')
    const scaleFactor = parseNumericArg(args['scale-factor'], 'scale-factor')
    const densityFactor = parseNumericArg(args['density-factor'], 'density-factor')

    const extensions = args.extensions
      ? args.extensions.split(',').map(ext => ext.trim().toLowerCase())
      : DEFAULT_EXTENSIONS

    const metricsMap = await analyzeDirectory(dirPath, { extensions })
    const results: Record<string, NormalizedDimensions> = {}
    const entries: [string, NormalizedDimensions][] = []

    for (const [file, metrics] of metricsMap) {
      const dimensions = normalize(metrics, { baseSize, scaleFactor, densityFactor })
      results[file] = dimensions
      entries.push([file, dimensions])
    }

    // The report shares stderr with the log helpers, so the JSON file stays the
    // only thing a caller has to parse.
    log.info(`${color('bold', pkg.name)} ${color('dim', `v${pkg.version}`)}`)
    log.blankLine()

    const maxEntryLength = Math.max(...entries.map(([entry]) => entry.length))
    const total = entries.length

    for (const [i, [file, dimensions]] of entries.entries()) {
      const isLast = i === total - 1
      const branch = isLast ? '└─' : '├─'
      const dimensionLabel = `${dimensions.width}${color('dim', '×')}${dimensions.height}`
      const padding = ' '.repeat(maxEntryLength - file.length + 2)
      process.stderr.write(`  ${color('dim', branch)} ${color('cyan', file)}${padding}${dimensionLabel}\n`)
    }

    const outputPath = path.resolve(args.output)
    await fsp.mkdir(path.dirname(outputPath), { recursive: true })
    await fsp.writeFile(outputPath, `${JSON.stringify(results, undefined, 2)}\n`)

    const relativeOutput = path.relative(process.cwd(), outputPath)

    log.blankLine()
    log.success(`Wrote ${color('bold', String(total))} entries to ${color('cyan', relativeOutput)}`)
  },
})

async function assertDirectory(dirPath: string): Promise<void> {
  const stat = await fsp.stat(dirPath).catch(() => {
    throw new CliError(`Directory not found: ${dirPath}`)
  })

  if (!stat.isDirectory())
    throw new CliError(`Not a directory: ${dirPath}`)
}

function parseNumericArg(value: string, name: string): number {
  const parsedNumber = Number(value)

  if (Number.isNaN(parsedNumber))
    throw new CliError(`Invalid value for --${name}: "${value}" (expected a number)`)

  return parsedNumber
}
