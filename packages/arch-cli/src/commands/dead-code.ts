import { queryDeadCode } from '@archkit/graph'
import { formatDeadCodeResult } from '../formatters/dead-code'
import type { DeadCodeCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import {
  CliCommandError,
  handleCommandError,
  resolveOutputMode,
  writeFormattedOutput,
} from '../utils/command-output'

export async function executeDeadCodeCommand(
  cwd: string = process.cwd(),
): Promise<DeadCodeCommandResult> {
  try {
    return await queryDeadCode(cwd)
  } catch {
    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
  }
}

export async function runDeadCodeCommand(outputOptions: OutputOptions): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeDeadCodeCommand()
    writeFormattedOutput(formatDeadCodeResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
