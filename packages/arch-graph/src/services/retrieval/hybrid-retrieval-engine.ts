import type {
  HybridRetrievalResult,
  QueryRetrievalMetadata,
  RetrievedItem,
  RetrievalMode,
  RetrievalOptions,
} from '../../models/retrieval-types'
import { loadFeatureMapping } from '../feature-mapping'
import { evaluateDeterministicConfidence } from './confidence-evaluator'
import { runDeterministicRetrieval } from './deterministic-retriever'
import { classifyQuery } from './query-classifier'
import { runLexicalRetrieval } from './lexical-retriever'
import { mergeRetrievalResults } from './result-merger'
import { rerankRetrievedItems } from './result-ranker'
import { runSemanticRetrieval } from './semantic-retriever'
import { buildNextActions, ensureReasonableActionSet } from './next-action-engine'

export async function executeHybridRetrieval(
  rootDir: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<HybridRetrievalResult> {
  const mode = options.mode ?? 'hybrid'
  const topK = options.topK ?? 40
  const queryType = classifyQuery(query)

  const [deterministic, featureMapping] = await Promise.all([
    runDeterministicRetrieval(rootDir, query, queryType),
    loadFeatureMapping(rootDir),
  ])
  const confidence = evaluateDeterministicConfidence(deterministic, queryType)

  const reasons: string[] = []
  if (!deterministic.hasExactSymbolMatch) {
    reasons.push('no exact symbol match')
  }
  if (queryType === 'conceptual') {
    reasons.push('query classified as conceptual')
  }
  if (deterministic.results[0] && deterministic.results[0].deterministicScore < 60) {
    reasons.push('top deterministic score below threshold')
  }
  if (deterministic.results.length < 3) {
    reasons.push('fewer than 3 deterministic results')
  }
  if (confidence.clusterScore < 0.45) {
    reasons.push('result clustering below threshold')
  }

  const shouldUseLexical = shouldRunLexical(mode, {
    hasExactSymbolMatch: deterministic.hasExactSymbolMatch,
    topScore: deterministic.results[0]?.deterministicScore ?? 0,
    resultCount: deterministic.results.length,
    weakConfidence: confidence.weakConfidence,
  })

  let lexicalUsed = false
  let lexicalMerged = deterministic.results

  if (shouldUseLexical) {
    try {
      lexicalUsed = true
      const lexical = await runLexicalRetrieval(rootDir, query, topK, featureMapping)
      if (lexical.length > 0) {
        lexicalMerged = mergeRetrievalResults(deterministic.results, lexical)
      }
    } catch {
      lexicalUsed = false
      reasons.push('lexical index unavailable; deterministic-only fallback')
    }
  }

  const postLexicalState = computePostLexicalState(lexicalMerged, deterministic.hasExactSymbolMatch)

  const shouldUseSemantic = shouldRunSemantic(mode, {
    hasExactSymbolMatch: deterministic.hasExactSymbolMatch,
    queryType,
    topScore: postLexicalState.topScore,
    resultCount: postLexicalState.resultCount,
    clusterScore: postLexicalState.clusterScore,
    weakConfidence: postLexicalState.weakConfidence,
  })

  let semanticUsed = false
  let merged = lexicalMerged

  if (shouldUseSemantic) {
    try {
      const semantic = await runSemanticRetrieval(rootDir, query, topK)
      merged = mergeRetrievalResults(deterministic.results, semantic)
      semanticUsed = true
    } catch {
      reasons.push('semantic index unavailable; deterministic-only fallback')
    }
  }

  const ranked = rerankRetrievedItems(merged).slice(0, topK)

  const retrievalMetadata: QueryRetrievalMetadata = {
    query,
    mode,
    queryType,
    deterministicConfidence: confidence.deterministicConfidence,
    lexicalUsed,
    semanticUsed,
    reason: (semanticUsed ? reasons : reasons.filter((reason) => !reason.startsWith('semantic index unavailable')))
      .filter((reason) => lexicalUsed || mode === 'lexical' || !reason.startsWith('lexical index unavailable')),
  }

  const recommendations = buildNextActions({
    query,
    command: 'query',
    retrievalMetadata,
    results: ranked,
    maxActions: 4,
  })
  const nextActions = ensureReasonableActionSet(recommendations.nextActions, query)

  return {
    query,
    mode,
    retrievalMetadata,
    results: ranked,
    nextActions,
    ambiguities: recommendations.ambiguities,
  }
}

function shouldRunLexical(
  mode: RetrievalMode,
  state: {
    hasExactSymbolMatch: boolean
    topScore: number
    resultCount: number
    weakConfidence: boolean
  },
): boolean {
  if (mode === 'lexical') {
    return true
  }

  if (mode === 'exact' || mode === 'semantic') {
    return false
  }

  return (
    !state.hasExactSymbolMatch ||
    state.topScore < 60 ||
    state.resultCount < 3 ||
    state.weakConfidence
  )
}

function shouldRunSemantic(
  mode: RetrievalMode,
  state: {
    hasExactSymbolMatch: boolean
    queryType: 'symbol' | 'path' | 'conceptual' | 'mixed'
    topScore: number
    resultCount: number
    clusterScore: number
    weakConfidence: boolean
  },
): boolean {
  if (mode === 'exact' || mode === 'lexical') {
    return false
  }

  if (mode === 'semantic') {
    return true
  }

  return (
    !state.hasExactSymbolMatch ||
    state.queryType === 'conceptual' ||
    state.topScore < 60 ||
    state.resultCount < 3 ||
    state.clusterScore < 0.45 ||
    state.weakConfidence
  )
}

function computePostLexicalState(
  mergedResults: RetrievedItem[],
  hasExactSymbolMatch: boolean,
): {
  hasExactSymbolMatch: boolean
  topScore: number
  resultCount: number
  clusterScore: number
  weakConfidence: boolean
} {
  const ranked = rerankRetrievedItems(mergedResults)
  const topScore = ranked[0]?.score ?? 0
  const resultCount = ranked.length
  const clusterScore = computeClusterScore(ranked)
  const weakConfidence =
    !hasExactSymbolMatch || topScore < 60 || resultCount < 3 || clusterScore < 0.45

  return {
    hasExactSymbolMatch,
    topScore,
    resultCount,
    clusterScore,
    weakConfidence,
  }
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
