import type {
  HybridRetrievalResult,
  QueryRetrievalMetadata,
  RetrievalMode,
  RetrievalOptions,
} from '../../models/retrieval-types'
import { evaluateDeterministicConfidence } from './confidence-evaluator'
import { runDeterministicRetrieval } from './deterministic-retriever'
import { classifyQuery } from './query-classifier'
import { mergeRetrievalResults } from './result-merger'
import { rerankRetrievedItems } from './result-ranker'
import { runSemanticRetrieval } from './semantic-retriever'

export async function executeHybridRetrieval(
  rootDir: string,
  query: string,
  options: RetrievalOptions = {},
): Promise<HybridRetrievalResult> {
  const mode = options.mode ?? 'hybrid'
  const topK = options.topK ?? 40
  const queryType = classifyQuery(query)

  const deterministic = await runDeterministicRetrieval(rootDir, query, queryType)
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

  const shouldUseSemantic = shouldRunSemantic(mode, {
    hasExactSymbolMatch: deterministic.hasExactSymbolMatch,
    queryType,
    topScore: deterministic.results[0]?.deterministicScore ?? 0,
    resultCount: deterministic.results.length,
    clusterScore: confidence.clusterScore,
    weakConfidence: confidence.weakConfidence,
  })

  let semanticUsed = false
  let merged = deterministic.results

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
    semanticUsed,
    reason: semanticUsed ? reasons : reasons.filter((reason) => !reason.startsWith('semantic index unavailable')),
  }

  return {
    query,
    mode,
    retrievalMetadata,
    results: ranked,
  }
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
