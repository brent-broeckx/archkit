import { queryDependencies, resolveSymbolInput } from '@archkit/graph'
import { formatDepsResult } from '../formatters/deps'
import type { DepsCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeDepsCommand(
  symbol: string | undefined,
  cwd: string = process.cwd(),
): Promise<DepsCommandResult> {
  const symbolInput = symbol?.trim()

  if (!symbolInput) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a symbol. Usage: `arch deps <symbol>`.')
  }

  try {
    const resolved = await resolveSymbolInput(cwd, symbolInput)

    if (resolved.nodes.length === 0) {
      throw new CliCommandError('SYMBOL_NOT_FOUND', `No symbol found for: ${symbolInput}`)
    }

    if (resolved.nodes.length > 1) {
      throw new CliCommandError(
        'SYMBOL_AMBIGUOUS',
        [
          `Ambiguous symbol: ${symbolInput}`,
          '',
          'Matches:',
          ...resolved.nodes
            .slice()
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((node) => `  ${node.id}`),
        ].join('\n'),
      )
    }

    return queryDependencies(cwd, symbolInput, resolved.nodes)
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error
    }

    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
  }
}

export async function runDepsCommand(
  symbol: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeDepsCommand(symbol)
    writeFormattedOutput(formatDepsResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
