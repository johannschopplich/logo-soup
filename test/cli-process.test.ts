import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { version } from '../package.json' with { type: 'json' }
import { runCliProcess, useTemporaryDirectories } from './utils.ts'

const createDirectory = useTemporaryDirectories()

const SQUARE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" fill="black"/>
</svg>
`

// In-process runs observe neither citty's builtin flags, which `runMain` owns,
// nor the exit code the shell sees.
describe('logo-soup CLI as a child process', () => {
  it('prints its version', async () => {
    const { stdout, exitCode } = await runCliProcess(['--version'])

    expect(stdout).toBe(`${version}\n`)
    expect(exitCode).toBe(0)
  })

  it('leaves stdout empty because the JSON file is the only result', async () => {
    const directory = createDirectory({ 'square.svg': SQUARE_SVG })

    const { stdout, stderr, exitCode } = await runCliProcess(['.', '--output', 'metrics.json'], { cwd: directory })
    const written = JSON.parse(readFileSync(path.join(directory, 'metrics.json'), 'utf-8')) as Record<string, unknown>

    expect(exitCode).toBe(0)
    expect(stdout).toBe('')
    expect(Object.keys(written)).toEqual(['square.svg'])
    expect(stderr).toContain('square.svg')
  })

  it('exits with a failure status for a directory that does not exist', async () => {
    const directory = createDirectory()

    const { stdout, stderr, exitCode } = await runCliProcess(['missing'], { cwd: directory })

    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('missing')
  })
})
