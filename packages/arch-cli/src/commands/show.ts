import { extractSnippetForNode, resolveSymbolInput } from '@archkit/graph'
import { formatShowResult } from '../formatters/show'
import type { ShowCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeShowCommand(
  symbol: string | undefined,
  cwd: string = process.cwd(),
): Promise<ShowCommandResult> {
  const symbolInput = symbol?.trim()

  if (!symbolInput) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a symbol. Usage: `arch show <symbol>`.')
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

    const selectedNode = resolved.nodes[0]
    const snippet = await extractSnippetForNode(cwd, selectedNode)
    return {
      input: symbolInput,
      node: selectedNode,
      snippet,
    }
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error
    }

    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph data found. Run `arch build` first.')
  }
}

export async function runShowCommand(
  symbol: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeShowCommand(symbol)
    writeFormattedOutput(formatShowResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
