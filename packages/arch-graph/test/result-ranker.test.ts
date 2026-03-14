import { describe, expect, it } from 'vitest'
import { rerankRetrievedItems } from '../src/services/retrieval/result-ranker'

describe('result-ranker', () => {
  it('keeps strong exact matches above semantic-only matches', () => {
    const ranked = rerankRetrievedItems([
      {
        id: 'symbol:exact',
        kind: 'symbol',
        name: 'AuthService',
        path: 'src/auth/AuthService.ts',
        nodeIds: ['symbol:exact'],
        score: 0,
        deterministicScore: 100,
        scoreBreakdown: {
          exactScore: 100,
          featureScore: 0,
          graphScore: 0,
          lexicalScore: 0,
          semanticScore: 0,
          totalScore: 0,
        },
        evidence: [
          {
            type: 'exact_symbol_match',
            value: 'AuthService',
            score: 100,
            source: 'deterministic',
          },
        ],
      },
      {
        id: 'file:semantic',
        kind: 'file',
        name: 'src/auth/LoginController.ts',
        path: 'src/auth/LoginController.ts',
        nodeIds: ['file:semantic'],
        score: 0,
        deterministicScore: 0,
        scoreBreakdown: {
          exactScore: 0,
          featureScore: 0,
          graphScore: 0,
          lexicalScore: 0,
          semanticScore: 95,
          totalScore: 0,
        },
        evidence: [
          {
            type: 'semantic_match',
            value: 'cosine=0.950',
            score: 95,
            source: 'semantic',
          },
        ],
      },
    ])

    expect(ranked[0].id).toBe('symbol:exact')
  })
})
