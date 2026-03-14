import type { ArchEdge, ArchNode } from '@archkit/core'
import {
  executeHybridRetrieval,
  loadFeatureMapping,
  readPersistedEdges,
  readPersistedNodes,
  resolveFeatureForNodes,
} from '@archkit/graph'
import type {
  CompileContextOptions,
  ContextBundle,
  ContextLimits,
  ContextResolution,
  ContextSnippet,
  RankedNode,
} from '../models/context-types'

const CONTEXT_LIMITS: ContextLimits = {
  maxSnippets: 20,
  maxFiles: 12,
  maxLines: 1200,
  maxDepth: 3,
  maxEntrypoints: 5,
  maxPaths: 80,
}

const FEATURE_CONTEXT_LIMITS: ContextLimits = {
  maxSnippets: 30,
  maxFiles: 18,
  maxLines: 1800,
  maxDepth: 3,
  maxEntrypoints: 8,
  maxPaths: 120,
}

const UNBOUNDED_CONTEXT_LIMITS: ContextLimits = {
  maxSnippets: Number.MAX_SAFE_INTEGER,
  maxFiles: Number.MAX_SAFE_INTEGER,
  maxLines: Number.MAX_SAFE_INTEGER,
  maxDepth: Number.MAX_SAFE_INTEGER,
  maxEntrypoints: Number.MAX_SAFE_INTEGER,
  maxPaths: Number.MAX_SAFE_INTEGER,
}

export class ContextCompiler {
  public async compile(rootDir: string, options: CompileContextOptions): Promise<ContextBundle> {
    const query = options.query.trim()
    const mode = options.mode ?? 'hybrid'
    const limitsEnabled = options.limits ?? true
    const [nodes, edges, featureMapping] = await Promise.all([
      readPersistedNodes(rootDir),
      readPersistedEdges(rootDir),
      loadFeatureMapping(rootDir),
    ])

    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const featureResolution = resolveFeatureForNodes(featureMapping, query, nodes)

    let rankedNodeIds: string[]
    let resolution: ContextResolution
    let retrievalMetadata: ContextBundle['retrievalMetadata']
    let retrievalResults: ContextBundle['retrievalResults']
    let limits = limitsEnabled ? CONTEXT_LIMITS : UNBOUNDED_CONTEXT_LIMITS
    if (featureResolution) {
      resolution = {
        kind: 'feature',
        feature: featureResolution.feature,
      }

      limits = limitsEnabled ? FEATURE_CONTEXT_LIMITS : UNBOUNDED_CONTEXT_LIMITS

      rankedNodeIds = rankFeatureNodes(featureResolution.matchedNodes, nodeMap)
      retrievalMetadata = {
        query,
        mode,
        queryType: 'conceptual',
        deterministicConfidence: 1,
        lexicalUsed: false,
        semanticUsed: false,
        reason: ['feature mapping exact match'],
      }
      retrievalResults = rankedNodeIds
        .map((nodeId) => nodeMap.get(nodeId))
        .filter((node): node is ArchNode => node !== undefined)
        .map((node) => ({
          id: node.id,
          kind: node.type === 'file' ? 'file' : 'symbol',
          name: node.name,
          path: node.filePath,
          nodeIds: [node.id],
          score: 100,
          deterministicScore: 100,
          scoreBreakdown: {
            exactScore: 0,
            featureScore: 100,
            graphScore: 0,
            lexicalScore: 0,
            semanticScore: 0,
            totalScore: 100,
          },
          evidence: [
            {
              type: 'feature_match',
              value: featureResolution.feature,
              score: 90,
              source: 'deterministic',
            },
          ],
        }))
    } else {
      resolution = {
        kind: 'query',
      }

      const retrieval = await executeHybridRetrieval(rootDir, query, { mode })
      retrievalMetadata = retrieval.retrievalMetadata
      retrievalResults = retrieval.results
      rankedNodeIds = retrieval.results
        .flatMap((result) => result.nodeIds)
        .filter((nodeId, index, values) => values.indexOf(nodeId) === index)
        .filter((nodeId) => nodeMap.has(nodeId))
    }

    const evidenceByNodeId = new Map<string, string[]>()
    ;(retrievalResults ?? []).forEach((result) => {
      const labels = result.evidence.map((evidence) => evidence.type)
      result.nodeIds.forEach((nodeId) => {
        const existing = evidenceByNodeId.get(nodeId) ?? []
        evidenceByNodeId.set(nodeId, [...new Set([...existing, ...labels])])
      })
    })

    const entrypointIds = rankedNodeIds.slice(0, limits.maxEntrypoints)
    const paths = expandPaths(entrypointIds, edges, nodeMap, limits)
    const snippets = selectSnippets(entrypointIds, paths, nodeMap, limits, evidenceByNodeId)
    const files = collectFiles(entrypointIds, paths, snippets, nodeMap, limits)

    return {
      query,
      mode,
      resolution,
      retrievalMetadata,
      retrievalResults,
      entrypoints: entrypointIds.map((nodeId) => toNodeLabel(nodeMap.get(nodeId))).filter(Boolean),
      files,
      paths: paths.map((pathIds) =>
        pathIds.map((nodeId) => toNodeLabel(nodeMap.get(nodeId))).filter(Boolean),
      ),
      snippets,
    }
  }
}

function rankFeatureNodes(
  matchedNodes: ArchNode[],
  nodeMap: Map<string, ArchNode>,
): string[] {
  const symbolNodes = matchedNodes.filter((node) => node.type !== 'file')
  const selectedNodes = symbolNodes.length > 0 ? symbolNodes : matchedNodes

  const byFilePath = selectedNodes.reduce<Map<string, string[]>>((accumulator, node) => {
    if (!nodeMap.has(node.id)) {
      return accumulator
    }

    const existing = accumulator.get(node.filePath)
    if (existing) {
      existing.push(node.id)
    } else {
      accumulator.set(node.filePath, [node.id])
    }

    return accumulator
  }, new Map<string, string[]>())

  const filePaths = [...byFilePath.keys()].sort((left, right) => left.localeCompare(right))
  const queues = filePaths.map((filePath) => ({
    filePath,
    nodeIds: [...(byFilePath.get(filePath) ?? [])].sort((left, right) => left.localeCompare(right)),
  }))

  const rankedNodeIds: string[] = []
  let hasPending = true
  while (hasPending) {
    hasPending = false

    queues.forEach((queue) => {
      const next = queue.nodeIds.shift()
      if (!next) {
        return
      }

      rankedNodeIds.push(next)
      hasPending = true
    })
  }

  return rankedNodeIds
}

function rankNodes(
  query: string,
  exactNodes: ArchNode[],
  queryMatches: Array<{ name: string; nodeIds: string[] }>,
): RankedNode[] {
  const lowerQuery = query.toLocaleLowerCase()
  const scoreByNodeId = new Map<string, number>()

  exactNodes.forEach((node) => {
    scoreByNodeId.set(node.id, (scoreByNodeId.get(node.id) ?? 0) + 1000)
  })

  queryMatches.forEach((match) => {
    const lowerName = match.name.toLocaleLowerCase()
    const baseScore =
      lowerName === lowerQuery ? 500 : lowerName.startsWith(lowerQuery) ? 300 : 150

    match.nodeIds.forEach((nodeId) => {
      scoreByNodeId.set(nodeId, (scoreByNodeId.get(nodeId) ?? 0) + baseScore)
    })
  })

  return [...scoreByNodeId.entries()]
    .map(([nodeId, score]) => ({ nodeId, score }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }
      return left.nodeId.localeCompare(right.nodeId)
    })
}

function expandPaths(
  entrypointIds: string[],
  edges: ArchEdge[],
  nodeMap: Map<string, ArchNode>,
  limits: ContextLimits,
): string[][] {
  const outgoingByNodeId = new Map<string, string[]>()

  edges
    .filter((edge) => edge.type === 'calls' || edge.type === 'imports')
    .forEach((edge) => {
      if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
        return
      }

      const existing = outgoingByNodeId.get(edge.from)
      if (existing) {
        existing.push(edge.to)
      } else {
        outgoingByNodeId.set(edge.from, [edge.to])
      }
    })

  const stableOutgoingByNodeId = new Map<string, string[]>()
  outgoingByNodeId.forEach((targets, from) => {
    stableOutgoingByNodeId.set(
      from,
      [...new Set(targets)].sort((left, right) => left.localeCompare(right)),
    )
  })

  const paths: string[][] = []

  entrypointIds.forEach((entrypointId) => {
    const queue: Array<{ path: string[]; depth: number }> = [{ path: [entrypointId], depth: 0 }]

    while (queue.length > 0 && paths.length < limits.maxPaths) {
      const current = queue.shift()
      if (!current) {
        continue
      }

      if (current.path.length > 1) {
        paths.push(current.path)
      }

      if (current.depth >= limits.maxDepth) {
        continue
      }

      const lastNodeId = current.path[current.path.length - 1]
      const targets = stableOutgoingByNodeId.get(lastNodeId) ?? []

      targets.forEach((targetNodeId) => {
        if (current.path.includes(targetNodeId)) {
          return
        }

        queue.push({
          path: [...current.path, targetNodeId],
          depth: current.depth + 1,
        })
      })
    }
  })

  return paths
    .map((pathIds) => [...pathIds])
    .sort((left, right) => left.join('>').localeCompare(right.join('>')))
}

function selectSnippets(
  entrypointIds: string[],
  paths: string[][],
  nodeMap: Map<string, ArchNode>,
  limits: ContextLimits,
  evidenceByNodeId?: Map<string, string[]>,
): ContextSnippet[] {
  const candidateNodeIds = orderedUniqueNodeIds(entrypointIds, paths)
  const snippets: ContextSnippet[] = []
  const selectedFiles = new Set<string>()
  let totalLines = 0

  for (const nodeId of candidateNodeIds) {
    if (snippets.length >= limits.maxSnippets) {
      break
    }

    const node = nodeMap.get(nodeId)
    if (!node || node.type === 'file') {
      continue
    }

    const lineCount = node.loc.endLine - node.loc.startLine + 1
    if (lineCount <= 0) {
      continue
    }

    const isNewFile = !selectedFiles.has(node.filePath)
    if (isNewFile && selectedFiles.size >= limits.maxFiles) {
      continue
    }

    if (totalLines + lineCount > limits.maxLines) {
      continue
    }

    snippets.push({
      file: node.filePath,
      symbol: node.name,
      startLine: node.loc.startLine,
      endLine: node.loc.endLine,
      evidence: evidenceByNodeId?.get(node.id),
    })

    selectedFiles.add(node.filePath)
    totalLines += lineCount
  }

  return snippets.sort((left, right) => {
    const leftKey = `${left.file}:${left.startLine}:${left.symbol}`
    const rightKey = `${right.file}:${right.startLine}:${right.symbol}`
    return leftKey.localeCompare(rightKey)
  })
}

function collectFiles(
  entrypointIds: string[],
  paths: string[][],
  snippets: ContextSnippet[],
  nodeMap: Map<string, ArchNode>,
  limits: ContextLimits,
): string[] {
  const files = new Set<string>()

  snippets.forEach((snippet) => {
    if (files.size < limits.maxFiles) {
      files.add(snippet.file)
    }
  })

  const candidateNodeIds = orderedUniqueNodeIds(entrypointIds, paths)
  for (const nodeId of candidateNodeIds) {
    if (files.size >= limits.maxFiles) {
      break
    }

    const node = nodeMap.get(nodeId)
    if (!node) {
      continue
    }

    files.add(node.filePath)
  }

  return [...files].sort((left, right) => left.localeCompare(right))
}

function orderedUniqueNodeIds(entrypointIds: string[], paths: string[][]): string[] {
  const nodeIds: string[] = []
  const seen = new Set<string>()

  entrypointIds.forEach((nodeId) => {
    if (!seen.has(nodeId)) {
      nodeIds.push(nodeId)
      seen.add(nodeId)
    }
  })

  paths.forEach((pathIds) => {
    pathIds.forEach((nodeId) => {
      if (!seen.has(nodeId)) {
        nodeIds.push(nodeId)
        seen.add(nodeId)
      }
    })
  })

  return nodeIds
}

function toNodeLabel(node: ArchNode | undefined): string {
  if (!node) {
    return ''
  }

  if (node.type === 'file') {
    return node.filePath
  }

  return node.name
}
