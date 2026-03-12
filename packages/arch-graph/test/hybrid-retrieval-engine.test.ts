import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeHybridRetrieval } from '../src/services/retrieval/hybrid-retrieval-engine'

const {
  mockClassifyQuery,
  mockRunDeterministicRetrieval,
  mockEvaluateDeterministicConfidence,
  mockRunSemanticRetrieval,
} = vi.hoisted(() => ({
  mockClassifyQuery: vi.fn(),
  mockRunDeterministicRetrieval: vi.fn(),
  mockEvaluateDeterministicConfidence: vi.fn(),
  mockRunSemanticRetrieval: vi.fn(),
}))

vi.mock('../src/services/retrieval/query-classifier', () => ({
  classifyQuery: mockClassifyQuery,
}))

vi.mock('../src/services/retrieval/deterministic-retriever', () => ({
  runDeterministicRetrieval: mockRunDeterministicRetrieval,
}))

vi.mock('../src/services/retrieval/confidence-evaluator', () => ({
  evaluateDeterministicConfidence: mockEvaluateDeterministicConfidence,
}))

vi.mock('../src/services/retrieval/semantic-retriever', () => ({
  runSemanticRetrieval: mockRunSemanticRetrieval,
}))

describe('hybrid-retrieval-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs semantic retrieval in hybrid mode when deterministic confidence is weak', async () => {
    mockClassifyQuery.mockReturnValue('conceptual')
    mockRunDeterministicRetrieval.mockResolvedValue({
      query: 'authentication',
      queryType: 'conceptual',
      hasExactSymbolMatch: false,
      clusterScore: 0.2,
      results: [
        {
          id: 'symbol:a',
          kind: 'symbol',
          name: 'A',
          path: 'src/a.ts',
          nodeIds: ['symbol:a'],
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
    })
    mockEvaluateDeterministicConfidence.mockReturnValue({
      deterministicConfidence: 0.2,
      clusterScore: 0.2,
      strongConfidence: false,
      weakConfidence: true,
    })
    mockRunSemanticRetrieval.mockResolvedValue([
      {
        id: 'file:b',
        kind: 'file',
        name: 'src/b.ts',
        path: 'src/b.ts',
        nodeIds: ['file:b'],
        score: 70,
        deterministicScore: 0,
        scoreBreakdown: {
          exactScore: 0,
          featureScore: 0,
          graphScore: 0,
          lexicalScore: 0,
          semanticScore: 70,
          totalScore: 70,
        },
        evidence: [{ type: 'semantic_match', value: 'cosine=0.700', score: 70, source: 'semantic' }],
      },
    ])

    const result = await executeHybridRetrieval('/repo', 'authentication', { mode: 'hybrid' })

    expect(mockRunSemanticRetrieval).toHaveBeenCalledTimes(1)
    expect(result.retrievalMetadata.semanticUsed).toBe(true)
  })

  it('skips semantic retrieval in exact mode', async () => {
    mockClassifyQuery.mockReturnValue('symbol')
    mockRunDeterministicRetrieval.mockResolvedValue({
      query: 'AuthService',
      queryType: 'symbol',
      hasExactSymbolMatch: true,
      clusterScore: 1,
      results: [],
    })
    mockEvaluateDeterministicConfidence.mockReturnValue({
      deterministicConfidence: 1,
      clusterScore: 1,
      strongConfidence: true,
      weakConfidence: false,
    })

    const result = await executeHybridRetrieval('/repo', 'AuthService', { mode: 'exact' })

    expect(mockRunSemanticRetrieval).not.toHaveBeenCalled()
    expect(result.retrievalMetadata.semanticUsed).toBe(false)
  })
})
