import type { ArchNode } from '@arch/core'
import type { ResolvedSymbol, SymbolQueryResult } from '../models/query-types'
import { readPersistedNodes, readPersistedSymbolsIndex } from './persisted-read'

export async function querySymbols(rootDir: string, term: string): Promise<SymbolQueryResult> {
  const normalizedTerm = term.trim().toLocaleLowerCase()
  const symbolsIndex = await readPersistedSymbolsIndex(rootDir)

  const matches = Object.keys(symbolsIndex)
    .filter((name) => name.toLocaleLowerCase().includes(normalizedTerm))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      nodeIds: [...(symbolsIndex[name] ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
    }))

  return {
    term,
    matches,
  }
}

export async function resolveSymbolInput(
  rootDir: string,
  input: string,
): Promise<ResolvedSymbol> {
  const normalizedInput = input.trim()
  const symbolsIndex = await readPersistedSymbolsIndex(rootDir)
  const nodes = await readPersistedNodes(rootDir)
  const nodeMap = createNodeMap(nodes)

  const nodeById = nodeMap.get(normalizedInput)
  if (nodeById) {
    return {
      input,
      nodes: [nodeById],
    }
  }

  const directIds = symbolsIndex[normalizedInput] ?? []
  if (directIds.length > 0) {
    return {
      input,
      nodes: mapIdsToNodes(directIds, nodeMap),
    }
  }

  const caseInsensitiveIds = Object.entries(symbolsIndex)
    .filter(([name]) => name.toLocaleLowerCase() === normalizedInput.toLocaleLowerCase())
    .flatMap(([, nodeIds]) => nodeIds)

  return {
    input,
    nodes: mapIdsToNodes(caseInsensitiveIds, nodeMap),
  }
}

function createNodeMap(nodes: ArchNode[]): Map<string, ArchNode> {
  return new Map(nodes.map((node) => [node.id, node]))
}

function mapIdsToNodes(nodeIds: string[], nodeMap: Map<string, ArchNode>): ArchNode[] {
  return [...new Set(nodeIds)]
    .map((id) => nodeMap.get(id))
    .filter((node): node is ArchNode => node !== undefined)
    .sort((left, right) => left.id.localeCompare(right.id))
}
