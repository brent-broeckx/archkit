import type { NextActionAmbiguity, RetrievedItem } from '../../models/retrieval-types'
import type { BuildNextActionsInput, NextActionCandidate } from './next-action-types'
import { clamp01, getDirectory } from './next-action-types'

export interface HeuristicOutput {
  candidates: NextActionCandidate[]
  ambiguities: NextActionAmbiguity[]
}

export function buildHeuristicCandidates(input: BuildNextActionsInput): HeuristicOutput {
  const top = input.results.slice(0, 8)
  const candidates: NextActionCandidate[] = []
  const ambiguities: NextActionAmbiguity[] = []
  const deterministicConfidence = input.retrievalMetadata.deterministicConfidence

  const bestEntrypoint = top[0]
  if (bestEntrypoint) {
    const bestTarget = toResolvableTarget(bestEntrypoint)
    const bestRankSignal = rankSignal(0)

    candidates.push({
      action: {
        tool: 'arch_show',
        args: { target: bestTarget },
        reason: `Highest-ranked ${bestEntrypoint.kind} for the primary result set`,
        confidence: scoreConfidence(bestEntrypoint, bestRankSignal, deterministicConfidence, 0.15),
        expectedValue: 'Inspect implementation details of the strongest entrypoint',
        sourceResultId: bestEntrypoint.id,
      },
      score: 0.78 + bestRankSignal * 0.1,
    })
  }

  const centralSymbol = findCentralSymbol(top)
  if (centralSymbol) {
    candidates.push({
      action: {
        tool: 'arch_deps',
        args: { target: toResolvableTarget(centralSymbol) },
        reason: 'Most central symbol by graph connectivity among top results',
        confidence: scoreConfidence(
          centralSymbol,
          rankSignal(top.findIndex((item) => item.id === centralSymbol.id)),
          deterministicConfidence,
          0.1,
        ),
        expectedValue: 'Map callers/callees to expand investigation quickly',
        sourceResultId: centralSymbol.id,
      },
      score: 0.68 + clamp01(centralSymbol.scoreBreakdown.graphScore / 100) * 0.2,
    })
  }

  const clusterRepresentatives = findClusterRepresentatives(top)
  if (clusterRepresentatives.length > 1) {
    ambiguities.push({
      type: 'multiple_candidate_clusters',
      message: `Results span ${clusterRepresentatives.length} distinct directories`,
    })
  }

  clusterRepresentatives.slice(0, 3).forEach(({ item }, index) => {
    const target = toResolvableTarget(item)
    candidates.push({
      action: {
        tool: 'arch_show',
        args: { target },
        reason:
          index === 0
            ? 'Representative entrypoint for the primary result cluster'
            : 'Representative entrypoint for a secondary result cluster',
        confidence: scoreConfidence(item, rankSignal(index), deterministicConfidence, 0.05),
        expectedValue: 'Validate whether this cluster is the intended feature slice',
        sourceResultId: item.id,
      },
      score: 0.5 - index * 0.04,
    })
  })

  const lowConfidence = deterministicConfidence < 0.55
  if (lowConfidence) {
    ambiguities.push({
      type: 'low_confidence_results',
      message: 'Retrieval confidence is low; broader exploration is recommended',
    })

    candidates.push({
      action: {
        tool: 'arch_context',
        args: { query: input.query },
        reason: 'Low retrieval confidence suggests broader topic exploration',
        confidence: clamp01(0.45 + deterministicConfidence * 0.3),
        expectedValue: 'Broaden structural context before drilling into symbols',
      },
      score: 0.62,
    })

    const refinedQuery = buildRefinedQuery(input.query, top)
    candidates.push({
      action: {
        tool: 'arch_query',
        args: { query: refinedQuery },
        reason: 'Refined query can reduce ambiguity in low-confidence result sets',
        confidence: clamp01(0.4 + deterministicConfidence * 0.25),
        expectedValue: 'Narrow candidate set to a stronger exact match',
      },
      score: 0.58,
    })
  }

  return { candidates, ambiguities }
}

function toResolvableTarget(item: RetrievedItem): string {
  if (item.kind === 'file') {
    return item.path
  }

  if (item.kind === 'symbol') {
    return item.name
  }

  return item.name || item.path
}

function rankSignal(rank: number): number {
  if (rank < 0) {
    return 0
  }

  return 1 / (rank + 1)
}

function scoreConfidence(
  item: RetrievedItem,
  rank: number,
  deterministicConfidence: number,
  representativeness: number,
): number {
  const scoreSignal = clamp01(item.score / 150)
  const graphSignal = clamp01(item.scoreBreakdown.graphScore / 100)
  return clamp01(
    scoreSignal * 0.45 +
      graphSignal * 0.2 +
      deterministicConfidence * 0.25 +
      rank * 0.05 +
      representativeness * 0.05,
  )
}

function findCentralSymbol(items: RetrievedItem[]): RetrievedItem | undefined {
  return items
    .filter((item) => item.kind === 'symbol')
    .slice()
    .sort((left, right) => {
      if (right.scoreBreakdown.graphScore !== left.scoreBreakdown.graphScore) {
        return right.scoreBreakdown.graphScore - left.scoreBreakdown.graphScore
      }

      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.id.localeCompare(right.id)
    })[0]
}

function findClusterRepresentatives(
  items: RetrievedItem[],
): Array<{ directory: string; item: RetrievedItem }> {
  const firstByDirectory = new Map<string, RetrievedItem>()

  items.forEach((item) => {
    const directory = getDirectory(item.path)
    if (!firstByDirectory.has(directory)) {
      firstByDirectory.set(directory, item)
    }
  })

  return [...firstByDirectory.entries()]
    .map(([directory, item]) => ({ directory, item }))
    .sort((left, right) => {
      if (right.item.score !== left.item.score) {
        return right.item.score - left.item.score
      }

      return left.directory.localeCompare(right.directory)
    })
}

function buildRefinedQuery(query: string, items: RetrievedItem[]): string {
  const hints = items
    .flatMap((item) => item.evidence)
    .map((evidence) => evidence.value)
    .join(' ')
    .toLocaleLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)

  const queryTokens = new Set(
    query
      .toLocaleLowerCase()
      .split(/[^a-z0-9_./-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  )

  const extraToken = hints.find((token) => !queryTokens.has(token))
  return extraToken ? `${query} ${extraToken}` : `${query} details`
}
