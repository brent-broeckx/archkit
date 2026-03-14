import type { NextAction } from '../../models/retrieval-types'
import { buildHeuristicCandidates } from './next-action-heuristics'
import type { BuildNextActionsInput, BuildNextActionsOutput, NextActionCandidate } from './next-action-types'
import { toActionKey } from './next-action-types'

export function buildNextActions(input: BuildNextActionsInput): BuildNextActionsOutput {
  const maxActions = Math.min(5, Math.max(2, input.maxActions ?? 4))
  const heuristic = buildHeuristicCandidates(input)
  const deduped = dedupeCandidates(heuristic.candidates)

  const nextActions = deduped
    .slice(0, maxActions)
    .map((candidate, index) => ({
      ...candidate.action,
      priority: index + 1,
    }))

  return {
    nextActions,
    ambiguities: heuristic.ambiguities,
  }
}

function dedupeCandidates(candidates: NextActionCandidate[]): NextActionCandidate[] {
  const byAction = new Map<string, NextActionCandidate>()

  candidates.forEach((candidate) => {
    const key = toActionKey(candidate.action)
    const existing = byAction.get(key)

    if (!existing || candidate.score > existing.score) {
      byAction.set(key, candidate)
    }
  })

  return [...byAction.values()].sort(compareCandidates)
}

function compareCandidates(left: NextActionCandidate, right: NextActionCandidate): number {
  if (right.score !== left.score) {
    return right.score - left.score
  }

  const leftAction = left.action
  const rightAction = right.action

  if (leftAction.tool !== rightAction.tool) {
    return leftAction.tool.localeCompare(rightAction.tool)
  }

  return JSON.stringify(leftAction.args).localeCompare(JSON.stringify(rightAction.args))
}

export function ensureReasonableActionSet(
  actions: NextAction[],
  fallbackQuery: string,
): NextAction[] {
  if (actions.length > 0) {
    return actions
  }

  return [
    {
      tool: 'arch_context',
      priority: 1,
      args: { query: fallbackQuery },
      reason: 'No strong follow-up action from current result set; broaden with context',
      confidence: 0.35,
      expectedValue: 'Recover additional structural evidence',
    },
    {
      tool: 'arch_query',
      priority: 2,
      args: { query: `${fallbackQuery} details` },
      reason: 'No strong follow-up action from current result set; try a refined query',
      confidence: 0.3,
      expectedValue: 'Narrow toward stronger lexical/deterministic matches',
    },
  ]
}
