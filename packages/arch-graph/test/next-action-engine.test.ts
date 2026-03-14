import { describe, expect, it } from 'vitest'
import { buildNextActions } from '../src/services/retrieval/next-action-engine'
import type { RetrievedItem } from '../src/models/retrieval-types'

function makeItem(overrides: Partial<RetrievedItem> & Pick<RetrievedItem, 'id' | 'kind' | 'name' | 'path'>): RetrievedItem {
  return {
    id: overrides.id,
    kind: overrides.kind,
    name: overrides.name,
    path: overrides.path,
    nodeIds: overrides.nodeIds ?? [overrides.id],
    score: overrides.score ?? 80,
    deterministicScore: overrides.deterministicScore ?? 80,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      exactScore: 20,
      featureScore: 0,
      graphScore: 0,
      lexicalScore: 60,
      semanticScore: 0,
      totalScore: 80,
    },
    evidence: overrides.evidence ?? [],
  }
}

describe('next-action-engine', () => {
  it('prioritizes top file as best show entrypoint', () => {
    const output = buildNextActions({
      query: 'authentication',
      command: 'context',
      retrievalMetadata: {
        query: 'authentication',
        mode: 'hybrid',
        queryType: 'conceptual',
        deterministicConfidence: 0.91,
        lexicalUsed: false,
        semanticUsed: false,
        reason: [],
      },
      results: [
        makeItem({ id: 'file:src/auth/AuthGuard.ts', kind: 'file', name: 'src/auth/AuthGuard.ts', path: 'src/auth/AuthGuard.ts', score: 120 }),
        makeItem({ id: 'symbol:AuthGuard', kind: 'symbol', name: 'AuthGuard', path: 'src/auth/AuthGuard.ts', score: 100 }),
      ],
    })

    expect(output.nextActions[0]).toMatchObject({
      tool: 'arch_show',
      args: { target: 'src/auth/AuthGuard.ts' },
      priority: 1,
    })
  })

  it('recommends deps for graph-central symbol', () => {
    const output = buildNextActions({
      query: 'roles',
      command: 'query',
      retrievalMetadata: {
        query: 'roles',
        mode: 'hybrid',
        queryType: 'mixed',
        deterministicConfidence: 0.84,
        lexicalUsed: true,
        semanticUsed: false,
        reason: [],
      },
      results: [
        makeItem({
          id: 'symbol:RoleGuard',
          kind: 'symbol',
          name: 'RoleGuard',
          path: 'src/auth/RoleGuard.ts',
          scoreBreakdown: {
            exactScore: 20,
            featureScore: 0,
            graphScore: 80,
            lexicalScore: 10,
            semanticScore: 0,
            totalScore: 110,
          },
          score: 110,
        }),
      ],
    })

    expect(output.nextActions.some((action) => action.tool === 'arch_deps' && action.args.target === 'RoleGuard')).toBe(true)
  })

  it('adds ambiguity and cluster representatives for multi-directory results', () => {
    const output = buildNextActions({
      query: 'auth',
      command: 'context',
      retrievalMetadata: {
        query: 'auth',
        mode: 'hybrid',
        queryType: 'conceptual',
        deterministicConfidence: 0.62,
        lexicalUsed: true,
        semanticUsed: false,
        reason: ['result clustering below threshold'],
      },
      results: [
        makeItem({ id: 'file:src/auth/A.ts', kind: 'file', name: 'src/auth/A.ts', path: 'src/auth/A.ts', score: 100 }),
        makeItem({ id: 'file:src/roles/B.ts', kind: 'file', name: 'src/roles/B.ts', path: 'src/roles/B.ts', score: 95 }),
        makeItem({ id: 'file:src/security/C.ts', kind: 'file', name: 'src/security/C.ts', path: 'src/security/C.ts', score: 90 }),
      ],
    })

    expect(output.ambiguities.some((item) => item.type === 'multiple_candidate_clusters')).toBe(true)
    expect(output.nextActions.filter((action) => action.tool === 'arch_show').length).toBeGreaterThanOrEqual(2)
  })

  it('adds broader context and refined query under low confidence', () => {
    const output = buildNextActions({
      query: 'where are roles checked',
      command: 'query',
      retrievalMetadata: {
        query: 'where are roles checked',
        mode: 'hybrid',
        queryType: 'conceptual',
        deterministicConfidence: 0.31,
        lexicalUsed: true,
        semanticUsed: true,
        reason: ['top deterministic score below threshold'],
      },
      results: [
        makeItem({ id: 'symbol:A', kind: 'symbol', name: 'A', path: 'src/a.ts', score: 55 }),
      ],
    })

    expect(output.nextActions.some((action) => action.tool === 'arch_context')).toBe(true)
    expect(output.nextActions.some((action) => action.tool === 'arch_query')).toBe(true)
    expect(output.ambiguities.some((item) => item.type === 'low_confidence_results')).toBe(true)
  })

  it('deduplicates identical recommendations and keeps stable priorities', () => {
    const output = buildNextActions({
      query: 'AuthGuard',
      command: 'query',
      retrievalMetadata: {
        query: 'AuthGuard',
        mode: 'hybrid',
        queryType: 'symbol',
        deterministicConfidence: 0.9,
        lexicalUsed: false,
        semanticUsed: false,
        reason: [],
      },
      results: [
        makeItem({ id: 'symbol:AuthGuard', kind: 'symbol', name: 'AuthGuard', path: 'src/auth/AuthGuard.ts', score: 120 }),
        makeItem({ id: 'symbol:AuthGuardDuplicate', kind: 'symbol', name: 'AuthGuard', path: 'src/auth/AuthGuard.ts', score: 119 }),
      ],
      maxActions: 5,
    })

    const uniqueCommands = new Set(output.nextActions.map((action) => `${action.tool}:${JSON.stringify(action.args)}`))
    expect(uniqueCommands.size).toBe(output.nextActions.length)
    expect(output.nextActions.map((action) => action.priority)).toEqual(
      output.nextActions.map((_, index) => index + 1),
    )
  })
})
