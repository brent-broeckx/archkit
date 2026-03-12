import { ContextCompiler } from '@archkit/context'
import { FeatureMappingConfigError, type RetrievalMode } from '@archkit/graph'
import { formatContextResult } from '../formatters/context'
import type { ContextCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'
import { COMMAND_DEFAULT_RETRIEVAL_MODE, resolveRetrievalMode } from '../utils/retrieval-mode'

export interface ContextOutputOptions extends OutputOptions {
  limits?: boolean
  mode?: string
}

export async function executeContextCommand(
  query: string | undefined,
  cwd: string = process.cwd(),
  limits: boolean = false,
  mode: RetrievalMode = COMMAND_DEFAULT_RETRIEVAL_MODE.context,
): Promise<ContextCommandResult> {
  const queryInput = query?.trim()

  if (!queryInput) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a query. Usage: `arch context <query>`.')
  }

  try {
    const compiler = new ContextCompiler()
    return await compiler.compile(cwd, { query: queryInput, limits, mode })
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
    const retrievalMode = resolveRetrievalMode(
      outputOptions.mode,
      COMMAND_DEFAULT_RETRIEVAL_MODE.context,
    )
    const result = await executeContextCommand(
      query,
      process.cwd(),
      Boolean(outputOptions.limits),
      retrievalMode,
    )
    writeFormattedOutput(formatContextResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
