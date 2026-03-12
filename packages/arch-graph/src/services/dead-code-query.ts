import type { ArchEdge, ArchNode, EdgeType, NodeType } from '@archkit/core'
import type { DeadCodeResult } from '../models/dead-code-types'
import { readPersistedEdges, readPersistedNodes } from './persisted-read'

const DEAD_SYMBOL_TYPES: NodeType[] = ['function', 'method', 'class']
const SYMBOL_INCOMING_EDGE_TYPES: EdgeType[] = ['calls', 'references', 'extends', 'implements']
const FILE_INCOMING_EDGE_TYPES: EdgeType[] = ['imports', 'references']

export async function queryDeadCode(rootDir: string): Promise<DeadCodeResult> {
  const [nodes, edges] = await Promise.all([
    readPersistedNodes(rootDir),
    readPersistedEdges(rootDir),
  ])
  const incomingSymbolCounts = buildIncomingCounts(edges, SYMBOL_INCOMING_EDGE_TYPES)
  const deadSymbolIds = new Set<string>()

  const functions: string[] = []
  const methods: string[] = []
  const classes: string[] = []

  nodes
    .filter((node) => isDeadCodeCandidate(node))
    .forEach((node) => {
      const incomingCount = incomingSymbolCounts.get(node.id) ?? 0
      if (incomingCount !== 0) {
        return
      }

      deadSymbolIds.add(node.id)

      if (node.type === 'function') {
        functions.push(node.name)
        return
      }

      if (node.type === 'method') {
        methods.push(node.name)
        return
      }

      classes.push(node.name)
    })

  const files = resolveDeadFiles(nodes, edges, deadSymbolIds)

  return {
    functions: sortValues(functions),
    methods: sortValues(methods),
    classes: sortValues(classes),
    files,
  }
}

function buildIncomingCounts(edges: ArchEdge[], types: EdgeType[]): Map<string, number> {
  const allowedTypes = new Set(types)
  const counts = new Map<string, number>()

  edges
    .filter((edge) => allowedTypes.has(edge.type))
    .forEach((edge) => {
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1)
    })

  return counts
}

function isDeadCodeCandidate(node: ArchNode): boolean {
  return DEAD_SYMBOL_TYPES.includes(node.type) && !node.exported && node.type !== 'route'
}

function resolveDeadFiles(
  nodes: ArchNode[],
  edges: ArchEdge[],
  deadSymbolIds: Set<string>,
): string[] {
  const incomingFileCounts = buildIncomingCounts(edges, FILE_INCOMING_EDGE_TYPES)
  const fileNodes = nodes.filter((node) => node.type === 'file')

  const symbolNodesByFile = new Map<string, ArchNode[]>()
  const hasExportedOrRouteNodeByFile = new Map<string, boolean>()

  nodes.forEach((node) => {
    if (node.type === 'file') {
      return
    }

    if (DEAD_SYMBOL_TYPES.includes(node.type)) {
      const existing = symbolNodesByFile.get(node.filePath)
      if (existing) {
        existing.push(node)
      } else {
        symbolNodesByFile.set(node.filePath, [node])
      }
    }

    if (node.exported || node.type === 'route') {
      hasExportedOrRouteNodeByFile.set(node.filePath, true)
    }
  })

  const deadFiles = fileNodes
    .filter((fileNode) => {
      if ((incomingFileCounts.get(fileNode.id) ?? 0) > 0) {
        return false
      }

      if (hasExportedOrRouteNodeByFile.get(fileNode.filePath) === true) {
        return false
      }

      const symbolNodes = symbolNodesByFile.get(fileNode.filePath) ?? []
      if (symbolNodes.length === 0) {
        return true
      }

      return symbolNodes.every((symbolNode) => {
        if (!isDeadCodeCandidate(symbolNode)) {
          return false
        }

        return deadSymbolIds.has(symbolNode.id)
      })
    })
    .map((fileNode) => fileNode.filePath)

  return sortValues(deduplicate(deadFiles))
}

function deduplicate(values: string[]): string[] {
  return [...new Set(values)]
}

function sortValues(values: string[]): string[] {
  return values.slice().sort((left, right) => left.localeCompare(right))
}

export const deadCodeInternals = {
  buildIncomingCounts,
  resolveDeadFiles,
}
