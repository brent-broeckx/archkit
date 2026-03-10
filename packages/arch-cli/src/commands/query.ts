import { querySymbols, readPersistedNodes } from '@archkit/graph'
import { formatQueryResult } from '../formatters/query'
import type { QueryCommandResult } from '../models/command-results'
import type { OutputOptions } from '../models/output-mode'
import { CliCommandError, handleCommandError, resolveOutputMode, writeFormattedOutput } from '../utils/command-output'

export async function executeQueryCommand(
  term: string | undefined,
  cwd: string = process.cwd(),
): Promise<QueryCommandResult> {
  const queryTerm = term?.trim()

  if (!queryTerm) {
    throw new CliCommandError('INVALID_INPUT', 'Provide a query term. Usage: `arch query <term>`.')
  }

  try {
    const [queryResult, nodes] = await Promise.all([
      querySymbols(cwd, queryTerm),
      readPersistedNodes(cwd),
    ])
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const matches = queryResult.matches
      .flatMap((match) => match.nodeIds)
      .map((nodeId) => {
        const node = nodeMap.get(nodeId)
        if (!node) {
          return undefined
        }

        return {
          nodeId: node.id,
          type: node.type,
          name: node.name,
          file: node.filePath,
        }
      })
      .filter((match): match is NonNullable<typeof match> => match !== undefined)

    const dedupedMatches = [...new Map(matches.map((match) => [match.nodeId, match])).values()]
      .sort((left, right) => {
        const leftKey = `${left.type}:${left.name}:${left.file}:${left.nodeId}`
        const rightKey = `${right.type}:${right.name}:${right.file}:${right.nodeId}`
        return leftKey.localeCompare(rightKey)
      })

    return {
      term: queryResult.term,
      matches: dedupedMatches,
    }
  } catch {
    throw new CliCommandError('GRAPH_NOT_FOUND', 'No graph index found. Run `arch build` first.')
  }
}

export async function runQueryCommand(
  term: string | undefined,
  outputOptions: OutputOptions,
): Promise<void> {
  try {
    const mode = resolveOutputMode(outputOptions, true)
    const result = await executeQueryCommand(term)
    writeFormattedOutput(formatQueryResult(result, mode))
  } catch (error) {
    handleCommandError(error, outputOptions)
  }
}
