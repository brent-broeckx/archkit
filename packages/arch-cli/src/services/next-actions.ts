import type { ArchNode } from '@archkit/core'
import type { DepsResult, NextAction } from '@archkit/graph'

export function buildShowNextActions(input: string, node: ArchNode): NextAction[] {
  const actions: NextAction[] = []

  if (node.type !== 'file') {
    actions.push({
      tool: 'arch_deps',
      priority: 1,
      args: { target: node.id },
      reason: 'Shown symbol is best followed by dependency inspection',
      confidence: 0.9,
      expectedValue: 'Reveal callers and callees for deeper traceability',
      sourceResultId: node.id,
    })
  }

  actions.push({
    tool: 'arch_context',
    priority: actions.length + 1,
    args: { query: node.name || input },
    reason: 'Broaden from the current symbol into related architecture context',
    confidence: 0.72,
    expectedValue: 'Identify nearby feature-level entrypoints',
  })

  return actions.slice(0, 4).map((action, index) => ({
    ...action,
    priority: index + 1,
  }))
}

export function buildDepsNextActions(result: DepsResult): NextAction[] {
  const actions: NextAction[] = []
  const topConnected = result.calls[0] ?? result.callers[0]

  if (topConnected) {
    actions.push({
      tool: 'arch_show',
      priority: 1,
      args: { target: topConnected },
      reason: 'Most connected dependency candidate from the current graph neighborhood',
      confidence: 0.84,
      expectedValue: 'Inspect the most relevant connected implementation next',
    })

    actions.push({
      tool: 'arch_deps',
      priority: 2,
      args: { target: topConnected },
      reason: 'Follow dependency chain from the strongest connected node',
      confidence: 0.78,
      expectedValue: 'Continue structural expansion through graph adjacency',
    })
  }

  actions.push({
    tool: 'arch_context',
    priority: actions.length + 1,
    args: { query: result.input },
    reason: 'Dependency graph suggests broader topic exploration around this target',
    confidence: 0.66,
    expectedValue: 'Collect a broader feature-oriented context bundle',
  })

  return actions.slice(0, 4).map((action, index) => ({
    ...action,
    priority: index + 1,
  }))
}
