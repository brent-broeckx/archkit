import type { RetrievedItem, RetrievalEvidence } from '../../models/retrieval-types'

export function mergeRetrievalResults(
  deterministicResults: RetrievedItem[],
  semanticResults: RetrievedItem[],
): RetrievedItem[] {
  const merged = new Map<string, RetrievedItem>()

  deterministicResults.forEach((item) => {
    merged.set(item.id, {
      ...item,
      evidence: dedupeEvidence(item.evidence),
      nodeIds: [...new Set(item.nodeIds)].sort((left, right) => left.localeCompare(right)),
    })
  })

  semanticResults.forEach((item) => {
    const existing = merged.get(item.id)
    if (!existing) {
      merged.set(item.id, {
        ...item,
        evidence: dedupeEvidence(item.evidence),
        nodeIds: [...new Set(item.nodeIds)].sort((left, right) => left.localeCompare(right)),
      })
      return
    }

    existing.scoreBreakdown.semanticScore = Math.max(
      existing.scoreBreakdown.semanticScore,
      item.scoreBreakdown.semanticScore,
    )
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
