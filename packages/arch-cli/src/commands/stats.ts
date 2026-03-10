import path from 'node:path'
import { readGraphMeta } from '@archkit/graph'
import { formatStatsResult } from '../formatters/stats'
import type { StatsCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeStatsCommand(
  repoPath: string,
  cwd: string = process.cwd(),
): Promise<StatsCommandResult> {
  const rootDir = path.resolve(cwd, repoPath)

  try {
    const meta = await readGraphMeta(rootDir)
    return {
      repoPath,
      meta,
    }
  } catch {
    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph metadata found. Run `arch build` first.')
  }
}

export async function runStatsCommand(
  repoPath: string,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, false)
    const result = await executeStatsCommand(repoPath)
    writeFormattedOutput(formatStatsResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
