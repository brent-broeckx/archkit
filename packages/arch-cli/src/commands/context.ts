import { ContextCompiler } from '@arch/context'
import { formatContextResult } from '../formatters/context'
import type { ContextCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeContextCommand(
  query: string | undefined,
  cwd: string = process.cwd(),
): Promise<ContextCommandResult> {
  const queryInput = query?.trim()

  if (!queryInput) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a query. Usage: `arch context <query>`.')
  }

  try {
    const compiler = new ContextCompiler()
    return await compiler.compile(cwd, { query: queryInput })
  } catch {
    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
  }
}

export async function runContextCommand(
  query: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeContextCommand(query)
    writeFormattedOutput(formatContextResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
