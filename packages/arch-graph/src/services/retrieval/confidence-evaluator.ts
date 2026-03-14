import type {
  ConfidenceEvaluation,
  DeterministicRetrievalResult,
  QueryType,
} from '../../models/retrieval-types'

export function evaluateDeterministicConfidence(
  retrieval: DeterministicRetrievalResult,
  queryType: QueryType,
): ConfidenceEvaluation {
  const topScore = retrieval.results[0]?.deterministicScore ?? 0
  const strongHitCount = retrieval.results.filter((item) => item.deterministicScore >= 60).length
  const clusterScore = retrieval.clusterScore

  const topSignal = Math.min(1, topScore / 100)
  const countSignal = Math.min(1, strongHitCount / 3)
  const queryTypeSignal = queryType === 'conceptual' ? 0.45 : queryType === 'mixed' ? 0.6 : 0.8

  const deterministicConfidence =
    topSignal * 0.45 + countSignal * 0.3 + clusterScore * 0.15 + queryTypeSignal * 0.1

  const strongConfidence = topScore >= 90 || strongHitCount >= 3
  const weakConfidence =
    topScore < 60 ||
    retrieval.results.length < 3 ||
    clusterScore < 0.45 ||
    deterministicConfidence < 0.55

  return {
    deterministicConfidence: round3(deterministicConfidence),
    clusterScore: round3(clusterScore),
    strongConfidence,
    weakConfidence,
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}
