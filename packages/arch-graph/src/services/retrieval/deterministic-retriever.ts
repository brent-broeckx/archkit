import type { ArchEdge, ArchNode } from '@archkit/core'
import {
  loadFeatureMapping,
  resolveFeaturesForFilePath,
} from '../feature-mapping'
import {
  readPersistedEdges,
  readPersistedFilesIndex,
  readPersistedNodes,
  readPersistedSymbolsIndex,
} from '../persisted-read'
import type {
  DeterministicCandidate,
  DeterministicRetrievalResult,
  QueryType,
  RetrievalEvidence,
  RetrievedItem,
} from '../../models/retrieval-types'

const ALIASES: Record<string, string[]> = {
  auth: ['authentication', 'authorization', 'token', 'jwt'],
  authentication: ['auth', 'token', 'jwt'],
  logging: ['logger', 'log'],
  payment: ['payments', 'billing', 'invoice'],
  payments: ['payment', 'billing', 'invoice'],
}

export async function runDeterministicRetrieval(
  rootDir: string,
  query: string,
  queryType: QueryType,
): Promise<DeterministicRetrievalResult> {
  const normalizedQuery = query.trim()
  const lowerQuery = normalizedQuery.toLocaleLowerCase()
  const queryTokens = tokenize(lowerQuery)

  const [nodes, edges, symbolsIndex, filesIndex, featureMapping] = await Promise.all([
    readPersistedNodes(rootDir),
    readPersistedEdges(rootDir),
    readPersistedSymbolsIndex(rootDir),
    readPersistedFilesIndex(rootDir),
    loadFeatureMapping(rootDir),
  ])

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const candidates = new Map<string, DeterministicCandidate>()

  const addCandidateEvidence = (
    key: string,
    candidate: Omit<DeterministicCandidate, 'evidence'>,
    evidence: RetrievalEvidence,
  ) => {
    const existing = candidates.get(key)
    if (existing) {
      existing.evidence.push(evidence)
      return
    }

    candidates.set(key, {
      ...candidate,
      evidence: [evidence],
    })
  }

  Object.entries(symbolsIndex).forEach(([symbolName, nodeIds]) => {
    const lowerName = symbolName.toLocaleLowerCase()
    const symbolTokens = tokenize(lowerName)

    const symbolEvidence: RetrievalEvidence[] = []

    if (lowerName === lowerQuery) {
      symbolEvidence.push({
        type: 'exact_symbol_match',
        value: symbolName,
        score: 100,
        source: 'deterministic',
      })
    }

    if (lowerName.includes(lowerQuery) && lowerName !== lowerQuery) {
      symbolEvidence.push({
        type: 'substring_match',
        value: symbolName,
        score: 50,
        source: 'deterministic',
      })
    }

    const sharedTokenCount = countOverlap(queryTokens, symbolTokens)
    if (sharedTokenCount > 0) {
      symbolEvidence.push({
        type: 'token_match',
        value: `${sharedTokenCount} shared token(s)`,
        score: Math.min(40, 20 + sharedTokenCount * 5),
        source: 'deterministic',
      })
    }

    const aliasEvidence = toAliasEvidence(lowerQuery, lowerName)
    if (aliasEvidence) {
      symbolEvidence.push(aliasEvidence)
    }

    nodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId)
      if (!node) {
        return
      }

      const docEvidence = toDocEvidence(queryTokens, node)
      const key = node.id

      symbolEvidence.forEach((evidence) => {
        addCandidateEvidence(
          key,
          {
            id: node.id,
            kind: node.type === 'file' ? 'file' : 'symbol',
            name: node.name,
            path: node.filePath,
            nodeIds: [node.id],
          },
          evidence,
        )
      })

      if (docEvidence) {
        addCandidateEvidence(
          key,
          {
            id: node.id,
            kind: node.type === 'file' ? 'file' : 'symbol',
            name: node.name,
            path: node.filePath,
            nodeIds: [node.id],
          },
          docEvidence,
        )
      }
    })
  })

  filesIndex.forEach((filePath) => {
    const normalizedPath = filePath.toLocaleLowerCase()
    const tokens = tokenize(normalizedPath)

    if (normalizedPath === lowerQuery || normalizedPath.endsWith(`/${lowerQuery}`)) {
      addCandidateEvidence(
        `file:${filePath}`,
        {
          id: `file:${filePath}`,
          kind: 'file',
          name: filePath,
          path: filePath,
          nodeIds: [toFileNodeId(nodes, filePath)],
        },
        {
          type: 'exact_path_match',
          value: filePath,
          score: 95,
          source: 'deterministic',
        },
      )
    }

    if (normalizedPath.includes(lowerQuery) && normalizedPath !== lowerQuery) {
      addCandidateEvidence(
        `file:${filePath}`,
        {
          id: `file:${filePath}`,
          kind: 'file',
          name: filePath,
          path: filePath,
          nodeIds: [toFileNodeId(nodes, filePath)],
        },
        {
          type: 'substring_match',
          value: filePath,
          score: queryType === 'path' ? 60 : 50,
          source: 'deterministic',
        },
      )
    }

    const sharedTokenCount = countOverlap(queryTokens, tokens)
    if (sharedTokenCount > 0) {
      addCandidateEvidence(
        `file:${filePath}`,
        {
          id: `file:${filePath}`,
          kind: 'file',
          name: filePath,
          path: filePath,
          nodeIds: [toFileNodeId(nodes, filePath)],
        },
        {
          type: 'token_match',
          value: `${sharedTokenCount} shared token(s)`,
          score: Math.min(40, 15 + sharedTokenCount * 5),
          source: 'deterministic',
        },
      )
    }
  })

  const feature = Object.keys(featureMapping.features).find(
    (featureName) => featureName === lowerQuery,
  )
  if (feature) {
    nodes.forEach((node) => {
      const features = resolveFeaturesForFilePath(featureMapping, node.filePath)
      if (!features.includes(feature)) {
        return
      }

      addCandidateEvidence(
        node.id,
        {
          id: node.id,
          kind: node.type === 'file' ? 'file' : 'symbol',
          name: node.name,
          path: node.filePath,
          nodeIds: [node.id],
        },
        {
          type: 'feature_match',
          value: feature,
          score: 90,
          source: 'deterministic',
        },
      )
    })
  }

  applyGraphProximity(candidates, edges, nodeMap)

  const results = [...candidates.values()]
    .map((candidate) => toRetrievedItem(candidate))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.id.localeCompare(right.id)
    })

  const hasExactSymbolMatch = results.some((item) =>
    item.evidence.some((evidence) => evidence.type === 'exact_symbol_match'),
  )

  return {
    query: normalizedQuery,
    queryType,
    results,
    hasExactSymbolMatch,
    clusterScore: computeClusterScore(results),
  }
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function countOverlap(left: string[], right: string[]): number {
  const rightSet = new Set(right)
  return left.reduce((count, token) => count + (rightSet.has(token) ? 1 : 0), 0)
}

function toAliasEvidence(query: string, candidate: string): RetrievalEvidence | undefined {
  const aliases = ALIASES[query] ?? []
  const matched = aliases.find((alias) => candidate.includes(alias))
  if (!matched) {
    return undefined
  }

  return {
    type: 'alias_match',
    value: `${query} -> ${matched}`,
    score: 70,
    source: 'deterministic',
  }
}

function toDocEvidence(queryTokens: string[], node: ArchNode): RetrievalEvidence | undefined {
  if (!node.signature) {
    return undefined
  }

  const signatureTokens = tokenize(node.signature.toLocaleLowerCase())
  const shared = countOverlap(queryTokens, signatureTokens)
  if (shared === 0) {
    return undefined
  }

  return {
    type: 'doc_comment_match',
    value: `${shared} signature token(s)`,
    score: Math.min(25, 10 + shared * 5),
    source: 'deterministic',
  }
}

function toFileNodeId(nodes: ArchNode[], filePath: string): string {
  const fileNode = nodes.find((node) => node.type === 'file' && node.filePath === filePath)
  return fileNode?.id ?? `file:${filePath}`
}

function applyGraphProximity(
  candidates: Map<string, DeterministicCandidate>,
  edges: ArchEdge[],
  nodeMap: Map<string, ArchNode>,
): void {
  const seededNodeIds = new Set<string>()
  candidates.forEach((candidate) => {
    candidate.nodeIds.forEach((nodeId) => seededNodeIds.add(nodeId))
  })

  edges.forEach((edge) => {
    if (!seededNodeIds.has(edge.from) && !seededNodeIds.has(edge.to)) {
      return
    }

    const neighborNodeId = seededNodeIds.has(edge.from) ? edge.to : edge.from
    const neighborNode = nodeMap.get(neighborNodeId)
    if (!neighborNode) {
      return
    }

    const edgeBonus = edge.type === 'calls' ? 40 : edge.type === 'imports' ? 25 : 10
    const key = neighborNode.id

    const existing = candidates.get(key)
    const evidence: RetrievalEvidence = {
      type: 'graph_proximity',
      value: `${edge.type} via ${edge.from} -> ${edge.to}`,
      score: edgeBonus,
      source: 'deterministic',
    }

    if (existing) {
      existing.evidence.push(evidence)
      return
    }

    candidates.set(key, {
      id: neighborNode.id,
      kind: neighborNode.type === 'file' ? 'file' : 'symbol',
      name: neighborNode.name,
      path: neighborNode.filePath,
      nodeIds: [neighborNode.id],
      evidence: [evidence],
    })
  })
}

function toRetrievedItem(candidate: DeterministicCandidate): RetrievedItem {
  const exactScore = sumEvidence(candidate.evidence, ['exact_symbol_match', 'exact_path_match'])
  const featureScore = sumEvidence(candidate.evidence, ['feature_match'])
  const graphScore = sumEvidence(candidate.evidence, ['graph_proximity'])
  const lexicalScore = sumEvidence(candidate.evidence, [
    'alias_match',
    'substring_match',
    'token_match',
    'doc_comment_match',
  ])

  const total = exactScore + featureScore + graphScore + lexicalScore

  return {
    id: candidate.id,
    kind: candidate.kind,
    name: candidate.name,
    path: candidate.path,
    nodeIds: candidate.nodeIds,
    score: total,
    deterministicScore: total,
    scoreBreakdown: {
      exactScore,
      featureScore,
      graphScore,
      lexicalScore,
      semanticScore: 0,
      totalScore: total,
    },
    evidence: candidate.evidence.slice().sort((left, right) => right.score - left.score),
  }
}

function sumEvidence(
  evidence: RetrievalEvidence[],
  types: RetrievalEvidence['type'][],
): number {
  const selected = new Set(types)
  return evidence.reduce((sum, item) => sum + (selected.has(item.type) ? item.score : 0), 0)
}

function computeClusterScore(results: RetrievedItem[]): number {
  if (results.length === 0) {
    return 0
  }

  const top = results.slice(0, 8)
  const dirCount = new Map<string, number>()

  top.forEach((item) => {
    const lastSlash = item.path.lastIndexOf('/')
    const directory = lastSlash >= 0 ? item.path.slice(0, lastSlash) : item.path
    dirCount.set(directory, (dirCount.get(directory) ?? 0) + 1)
  })

  const maxGroup = Math.max(...dirCount.values())
  return maxGroup / top.length
}
