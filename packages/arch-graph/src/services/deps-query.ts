import type { ArchEdge, ArchNode } from '@archkit/core'
import type { DepsResult } from '../models/deps-types'
import { readPersistedEdges, readPersistedNodes } from './persisted-read'

export async function queryDependencies(
  rootDir: string,
  input: string,
  selectedNodes: ArchNode[],
): Promise<DepsResult> {
  const [allNodes, allEdges] = await Promise.all([
    readPersistedNodes(rootDir),
    readPersistedEdges(rootDir),
  ])

  const scopedNodes = expandScopedNodes(selectedNodes, allNodes)
  const scopedNodeIds = new Set(scopedNodes.map((node) => node.id))
  const scopedFiles = new Set(scopedNodes.map((node) => node.filePath))
  const nodeMap = new Map(allNodes.map((node) => [node.id, node]))

  const imports = resolveImports(allEdges, scopedFiles, nodeMap)
  const calls = resolveCalls(allEdges, scopedNodeIds, nodeMap)
  const callers = resolveCallers(allEdges, scopedNodeIds, nodeMap)

  return {
    input,
    resolvedNodeIds: [...scopedNodeIds].sort((left, right) => left.localeCompare(right)),
    imports,
    calls,
    callers,
  }
}

function expandScopedNodes(selectedNodes: ArchNode[], allNodes: ArchNode[]): ArchNode[] {
  const classNodes = selectedNodes.filter((node) => node.type === 'class')
  if (classNodes.length === 0) {
    return selectedNodes
  }

  const expanded = new Map(selectedNodes.map((node) => [node.id, node]))

  classNodes.forEach((classNode) => {
    const classMethodPrefix = `${classNode.name}.`

    allNodes
      .filter(
        (node) =>
          node.type === 'method' &&
          node.filePath === classNode.filePath &&
          node.name.startsWith(classMethodPrefix),
      )
      .forEach((methodNode) => {
        expanded.set(methodNode.id, methodNode)
      })
  })

  return [...expanded.values()].sort((left, right) => left.id.localeCompare(right.id))
}

function resolveImports(
  edges: ArchEdge[],
  scopedFiles: Set<string>,
  nodeMap: Map<string, ArchNode>,
): string[] {
  const importedFiles = new Set<string>()

  edges
    .filter((edge) => edge.type === 'imports' && edge.filePath && scopedFiles.has(edge.filePath))
    .forEach((edge) => {
      const targetNode = nodeMap.get(edge.to)
      if (targetNode?.type === 'file') {
        importedFiles.add(targetNode.filePath)
      }
    })

  return [...importedFiles].sort((left, right) => left.localeCompare(right))
}

function resolveCalls(
  edges: ArchEdge[],
  scopedNodeIds: Set<string>,
  nodeMap: Map<string, ArchNode>,
): string[] {
  const callTargets = new Set<string>()

  edges
    .filter((edge) => edge.type === 'calls' && scopedNodeIds.has(edge.from))
    .forEach((edge) => {
      const targetNode = nodeMap.get(edge.to)
      if (targetNode && (targetNode.type === 'method' || targetNode.type === 'function')) {
        callTargets.add(targetNode.name)
      }
    })

  return [...callTargets].sort((left, right) => left.localeCompare(right))
}

function resolveCallers(
  edges: ArchEdge[],
  scopedNodeIds: Set<string>,
  nodeMap: Map<string, ArchNode>,
): string[] {
  const callerNames = new Set<string>()

  edges
    .filter((edge) => edge.type === 'calls' && scopedNodeIds.has(edge.to))
    .forEach((edge) => {
      const sourceNode = nodeMap.get(edge.from)
      if (sourceNode && (sourceNode.type === 'method' || sourceNode.type === 'function')) {
        callerNames.add(sourceNode.name)
      }
    })

  return [...callerNames].sort((left, right) => left.localeCompare(right))
}
