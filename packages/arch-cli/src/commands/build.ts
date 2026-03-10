import path from 'node:path'
import { TypeScriptParser } from '@archkit/parser-ts'
import { persistGraph } from '@archkit/graph'
import { formatBuildResult } from '../formatters/build'
import type { BuildCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeBuildCommand(
  repoPath: string,
  cwd: string = process.cwd(),
): Promise<BuildCommandResult> {
  const rootDir = path.resolve(cwd, repoPath)
  const parser = new TypeScriptParser()

  const graphData = parser.parseRepository({ rootDir })
  const result = await persistGraph(rootDir, graphData)

  return {
    repoPath,
    meta: result.meta,
  }
}

export async function runBuildCommand(
  repoPath: string,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeBuildCommand(repoPath)
    writeFormattedOutput(formatBuildResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
