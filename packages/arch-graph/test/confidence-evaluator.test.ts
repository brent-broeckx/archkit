import { describe, expect, it } from 'vitest'
import { evaluateDeterministicConfidence } from '../src/services/retrieval/confidence-evaluator'

describe('confidence-evaluator', () => {
  it('marks strong confidence when top score is high', () => {
    const result = evaluateDeterministicConfidence(
      {
        query: 'AuthService',
        queryType: 'symbol',
        hasExactSymbolMatch: true,
        clusterScore: 0.8,
        results: [
          {
            id: 'a',
            kind: 'symbol',
            name: 'AuthService',
            path: 'src/auth/service.ts',
            nodeIds: ['a'],
            score: 100,
            deterministicScore: 100,
            scoreBreakdown: {
              exactScore: 100,
              featureScore: 0,
              graphScore: 0,
              lexicalScore: 0,
              semanticScore: 0,
              totalScore: 100,
            },
            evidence: [],
          },
        ],
      },
      'symbol',
    )

    expect(result.strongConfidence).toBe(true)
    expect(result.deterministicConfidence).toBeGreaterThan(0.7)
  })

  it('marks weak confidence for sparse low-score matches', () => {
    const result = evaluateDeterministicConfidence(
      {
        query: 'authentication',
        queryType: 'conceptual',
        hasExactSymbolMatch: false,
        clusterScore: 0.2,
        results: [
          {
            id: 'a',
            kind: 'symbol',
            name: 'x',
            path: 'src/x.ts',
            nodeIds: ['a'],
            score: 40,
            deterministicScore: 40,
            scoreBreakdown: {
              exactScore: 0,
              featureScore: 0,
              graphScore: 0,
              lexicalScore: 40,
              semanticScore: 0,
              totalScore: 40,
            },
            evidence: [],
          },
        ],
      },
      'conceptual',
    )

    expect(result.weakConfidence).toBe(true)
    expect(result.clusterScore).toBe(0.2)
  })

  it('uses mixed query type signal and can remain non-weak', () => {
    const result = evaluateDeterministicConfidence(
      {
        query: 'auth token',
        queryType: 'mixed',
        hasExactSymbolMatch: false,
        clusterScore: 0.7,
        results: [
          {
            id: 'a',
            kind: 'symbol',
            name: 'AuthService.login',
            path: 'src/auth/service.ts',
            nodeIds: ['a'],
            score: 75,
            deterministicScore: 75,
            scoreBreakdown: {
              exactScore: 0,
              featureScore: 20,
              graphScore: 15,
              lexicalScore: 40,
              semanticScore: 0,
              totalScore: 75,
            },
            evidence: [],
          },
          {
            id: 'b',
            kind: 'symbol',
            name: 'TokenService.issue',
            path: 'src/auth/token.ts',
            nodeIds: ['b'],
            score: 65,
            deterministicScore: 65,
            scoreBreakdown: {
              exactScore: 0,
              featureScore: 15,
              graphScore: 10,
              lexicalScore: 40,
              semanticScore: 0,
              totalScore: 65,
            },
            evidence: [],
          },
          {
            id: 'c',
            kind: 'symbol',
            name: 'AuthController.login',
            path: 'src/auth/controller.ts',
            nodeIds: ['c'],
            score: 60,
            deterministicScore: 60,
            scoreBreakdown: {
              exactScore: 0,
              featureScore: 15,
              graphScore: 5,
              lexicalScore: 40,
              semanticScore: 0,
              totalScore: 60,
            },
            evidence: [],
          },
        ],
      },
      'mixed',
    )

    expect(result.weakConfidence).toBe(false)
    expect(result.strongConfidence).toBe(true)
  })
})
