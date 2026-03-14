import type { RetrievedItem } from '../../models/retrieval-types'

export function rerankRetrievedItems(items: RetrievedItem[]): RetrievedItem[] {
  const ranked = items.map((item) => {
    const weighted =
      item.scoreBreakdown.exactScore * 1.0 +
      item.scoreBreakdown.featureScore * 0.9 +
      item.scoreBreakdown.graphScore * 0.7 +
      item.scoreBreakdown.lexicalScore * 0.6 +
      item.scoreBreakdown.semanticScore * 0.35

    const exactStrong = item.scoreBreakdown.exactScore >= 90
    const penalty = exactStrong ? 0 : 0

    return {
      ...item,
      score: Math.round((weighted - penalty) * 1000) / 1000,
      scoreBreakdown: {
        ...item.scoreBreakdown,
        totalScore: Math.round((weighted - penalty) * 1000) / 1000,
      },
    }
  })

  return ranked.sort((left, right) => {
    const leftStrongExact = left.scoreBreakdown.exactScore >= 90
    const rightStrongExact = right.scoreBreakdown.exactScore >= 90

    if (leftStrongExact !== rightStrongExact) {
      return rightStrongExact ? 1 : -1
    }

    if (right.score !== left.score) {
      return right.score - left.score
    }

    return left.id.localeCompare(right.id)
  })
}
