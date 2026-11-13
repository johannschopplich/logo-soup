import { describe, expect, it } from 'vitest'
import { runCli, useTemporaryDirectories } from './utils.ts'

const createDirectory = useTemporaryDirectories()

describe('numeric flags', () => {
  it.each([
    ['--scale-factor', ''],
    ['--base-size', '0'],
    ['--base-size', 'Infinity'],
    ['--scale-factor', '5'],
    ['--density-factor', '-1'],
  ])('rejects %s "%s"', async (flag, value) => {
    const directory = createDirectory()

    const { stderr, exitCode } = await runCli(['.', flag, value], { cwd: directory })

    expect(exitCode).toBe(1)
    expect(stderr).toContain(`Invalid value for ${flag}`)
    expect(stderr).toContain('USAGE')
  })
})
