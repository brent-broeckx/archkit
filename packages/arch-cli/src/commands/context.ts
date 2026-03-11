import { ContextCompiler } from '@archkit/context'
import { FeatureMappingConfigError } from '@archkit/graph'
import { formatContextResult } from '../formatters/context'
import type { ContextCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export interface ContextOutputOptions extends OutputOptions {
  limits?: boolean
}

export async function executeContextCommand(
  query: string | undefined,
  cwd: string = process.cwd(),
  limits: boolean = false,
): Promise<ContextCommandResult> {
  const queryInput = query?.trim()

  if (!queryInput) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a query. Usage: `arch context <query>`.')
  }

  try {
    const compiler = new ContextCompiler()
    return await compiler.compile(cwd, { query: queryInput, limits })
  } catch (error) {
    if (error instanceof FeatureMappingConfigError) {
      throw new CliCommandError('INVALID_INPUT', error.message)
    }

    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
  }
}

export async function runContextCommand(
  query: string | undefined,
  outputOptions: ContextOutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeContextCommand(query, process.cwd(), Boolean(outputOptions.limits))
    writeFormattedOutput(formatContextResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
