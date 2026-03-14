import type { RetrievedItem, RetrievalEvidence } from '../../models/retrieval-types'

export function mergeRetrievalResults(
  primaryResults: RetrievedItem[],
  secondaryResults: RetrievedItem[],
): RetrievedItem[] {
  const merged = new Map<string, RetrievedItem>()

  primaryResults.forEach((item) => {
    merged.set(item.id, {
      ...item,
      evidence: dedupeEvidence(item.evidence),
      nodeIds: [...new Set(item.nodeIds)].sort((left, right) => left.localeCompare(right)),
    })
  })

  secondaryResults.forEach((item) => {
    const existing = merged.get(item.id)
    if (!existing) {
      merged.set(item.id, {
        ...item,
        evidence: dedupeEvidence(item.evidence),
        nodeIds: [...new Set(item.nodeIds)].sort((left, right) => left.localeCompare(right)),
      })
      return
    }

    existing.scoreBreakdown.exactScore = Math.max(
      existing.scoreBreakdown.exactScore,
      item.scoreBreakdown.exactScore,
    )
    existing.scoreBreakdown.featureScore = Math.max(
      existing.scoreBreakdown.featureScore,
      item.scoreBreakdown.featureScore,
    )
    existing.scoreBreakdown.graphScore = Math.max(
      existing.scoreBreakdown.graphScore,
      item.scoreBreakdown.graphScore,
    )
    existing.scoreBreakdown.lexicalScore = Math.max(
      existing.scoreBreakdown.lexicalScore,
      item.scoreBreakdown.lexicalScore,
    )
    existing.scoreBreakdown.semanticScore = Math.max(
      existing.scoreBreakdown.semanticScore,
      item.scoreBreakdown.semanticScore,
    )
    existing.scoreBreakdown.totalScore = Math.max(
      existing.scoreBreakdown.totalScore,
      item.scoreBreakdown.totalScore,
    )

    existing.deterministicScore = Math.max(existing.deterministicScore, item.deterministicScore)
    existing.score = Math.max(existing.score, item.score)
    existing.evidence = dedupeEvidence([...existing.evidence, ...item.evidence])

    existing.nodeIds = [...new Set([...existing.nodeIds, ...item.nodeIds])].sort((left, right) =>
      left.localeCompare(right),
    )
  })

  return [...merged.values()]
}

function dedupeEvidence(evidence: RetrievalEvidence[]): RetrievalEvidence[] {
  const map = new Map<string, RetrievalEvidence>()

  evidence.forEach((item) => {
    const key = `${item.type}:${item.value}:${item.source}`
    const existing = map.get(key)
    if (!existing || item.score > existing.score) {
      map.set(key, item)
    }
  })

  return [...map.values()].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.type.localeCompare(right.type)
  })
}
