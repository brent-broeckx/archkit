import type { ArchEdge, ArchNode } from '@arch/core'
import type { ParseState } from '../models/parser-types'

export function createParseState(rootDir: string, discoveredFiles: string[]): ParseState {
  return {
    rootDir,
    nodes: [],
    edges: [],
    nodeIds: new Set<string>(),
    edgeIds: new Set<string>(),
    discoveredFilesSet: new Set(discoveredFiles),
  }
}

export function addNode(state: ParseState, node: ArchNode): void {
  if (state.nodeIds.has(node.id)) {
    return
  }

  state.nodeIds.add(node.id)
  state.nodes.push(node)
}

export function addEdge(state: ParseState, edge: ArchEdge): void {
  const edgeId = `${edge.type}:${edge.from}:${edge.to}:${edge.filePath ?? ''}:${edge.loc?.startLine ?? 0}`
  if (state.edgeIds.has(edgeId)) {
    return
  }

  state.edgeIds.add(edgeId)
  state.edges.push(edge)
}
