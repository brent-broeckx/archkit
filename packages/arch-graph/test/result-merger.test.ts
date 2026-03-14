import { describe, expect, it } from 'vitest'
import { mergeRetrievalResults } from '../src/services/retrieval/result-merger'

describe('result-merger', () => {
  it('merges semantic results into deterministic results and dedupes evidence/nodeIds', () => {
    const merged = mergeRetrievalResults(
      [
        {
          id: 'a',
          kind: 'symbol',
          name: 'A',
          path: 'src/a.ts',
          nodeIds: ['a', 'a'],
          score: 50,
          deterministicScore: 50,
          scoreBreakdown: {
            exactScore: 50,
            featureScore: 0,
            graphScore: 0,
            lexicalScore: 0,
            semanticScore: 0,
            totalScore: 50,
          },
          evidence: [
            { type: 'exact_symbol_match', value: 'A', score: 50, source: 'deterministic' as const },
          ],
        },
      ],
      [
        {
          id: 'a',
          kind: 'symbol',
          name: 'A',
          path: 'src/a.ts',
          nodeIds: ['a', 'b'],
          score: 20,
          deterministicScore: 0,
          scoreBreakdown: {
            exactScore: 0,
            featureScore: 0,
            graphScore: 0,
            lexicalScore: 0,
            semanticScore: 20,
            totalScore: 20,
          },
          evidence: [
            { type: 'semantic_match', value: 'cos=0.2', score: 20, source: 'semantic' as const },
            { type: 'semantic_match', value: 'cos=0.2', score: 10, source: 'semantic' as const },
          ],
        },
        {
          id: 'c',
          kind: 'file',
          name: 'C',
          path: 'src/c.ts',
          nodeIds: ['c'],
          score: 30,
          deterministicScore: 0,
          scoreBreakdown: {
            exactScore: 0,
            featureScore: 0,
            graphScore: 0,
            lexicalScore: 0,
            semanticScore: 30,
            totalScore: 30,
          },
          evidence: [
            { type: 'semantic_match', value: 'cos=0.3', score: 30, source: 'semantic' as const },
          ],
        },
      ],
    )

    const a = merged.find((item) => item.id === 'a')
    const c = merged.find((item) => item.id === 'c')

    expect(a?.scoreBreakdown.semanticScore).toBe(20)
    expect(a?.nodeIds).toEqual(['a', 'b'])
    expect(c?.id).toBe('c')
  })
})
