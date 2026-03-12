import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ARCHIGNORE_DEFAULT_CONTENT } from '@archkit/parser-ts'
import { formatInitResult } from '../formatters/init'
import type { InitCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeInitCommand(
  repoPath: string,
  cwd: string = process.cwd(),
): Promise<InitCommandResult> {
  const rootDir = path.resolve(cwd, repoPath)
  const archDirAbsolute = path.join(rootDir, '.arch')
  const archIgnoreAbsolute = path.join(archDirAbsolute, '.archignore')
    const archConfAbsolute = path.join(archDirAbsolute, 'arch.conf')

  const archDirExisted = existsSync(archDirAbsolute)
  await mkdir(archDirAbsolute, { recursive: true })

  const archIgnoreExisted = existsSync(archIgnoreAbsolute)
  if (!archIgnoreExisted) {
    await writeFile(archIgnoreAbsolute, ARCHIGNORE_DEFAULT_CONTENT, 'utf-8')
  }

  const archConfExisted = existsSync(archConfAbsolute)
  if (!archConfExisted) {
    await writeFile(
      archConfAbsolute,
      `${JSON.stringify(
        {
          semantic: {
            provider: 'fallback',
            dimension: 64,
          },
        },
        null,
        2,
      )}\n`,
      'utf-8',
    )
  }

  return {
    repoPath,
    archDir: '.arch',
    archIgnorePath: '.arch/.archignore',
    archConfigPath: '.arch/arch.conf',
    createdArchDir: !archDirExisted,
    createdArchIgnore: !archIgnoreExisted,
    createdArchConfig: !archConfExisted,
  }
}

export async function runInitCommand(
  repoPath: string,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeInitCommand(repoPath)
    writeFormattedOutput(formatInitResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
