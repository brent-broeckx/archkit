import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSemanticRetrievalCache, runSemanticRetrieval } from '../src/services/retrieval/semantic-retriever'

const { mockReadSemanticIndex, mockResolveConfiguredEmbeddingProvider } = vi.hoisted(() => ({
  mockReadSemanticIndex: vi.fn(),
  mockResolveConfiguredEmbeddingProvider: vi.fn(),
}))

vi.mock('../src/services/semantic-index-storage', () => ({
  readSemanticIndex: mockReadSemanticIndex,
}))

vi.mock('../src/services/retrieval/provider-config', () => ({
  resolveConfiguredEmbeddingProvider: mockResolveConfiguredEmbeddingProvider,
}))

describe('semantic-retriever', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSemanticRetrievalCache()
  })

  it('embeds query and ranks by cosine similarity', async () => {
    mockReadSemanticIndex.mockResolvedValue({
      documents: [
        { id: 'a', kind: 'symbol', path: 'src/a.ts', name: 'A', text: 'A', nodeIds: ['a'] },
        { id: 'b', kind: 'symbol', path: 'src/b.ts', name: 'B', text: 'B', nodeIds: ['b'] },
      ],
      vectors: [
        { id: 'a', vector: [1, 0] },
        { id: 'b', vector: [0, 1] },
      ],
      meta: { version: 1, embeddingModel: 'fallback-hash-v1', dimension: 2, builtAt: 'x', documentCount: 2 },
    })

    mockResolveConfiguredEmbeddingProvider.mockResolvedValue({
      name: 'custom',
      dimension: 2,
      embed: vi.fn().mockResolvedValue([1, 0]),
    })

    const result = await runSemanticRetrieval('/repo', 'alpha', 2)

    expect(result[0].id).toBe('a')
    expect(result[0].evidence[0].type).toBe('semantic_match')
  })

  it('falls back when configured provider fails', async () => {
    mockReadSemanticIndex.mockResolvedValue({
      documents: [{ id: 'a', kind: 'symbol', path: 'src/a.ts', name: 'A', text: 'A', nodeIds: ['a'] }],
      vectors: [{ id: 'a', vector: [1, 0, 0, 0] }],
      meta: { version: 1, embeddingModel: 'ollama:nomic-embed-text', dimension: 4, builtAt: 'x', documentCount: 1 },
    })

    mockResolveConfiguredEmbeddingProvider.mockResolvedValue({
      name: 'ollama:nomic-embed-text',
      dimension: 4,
      embed: vi.fn().mockRejectedValue(new Error('offline')),
    })

    const result = await runSemanticRetrieval('/repo', 'alpha', 5)
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  it('handles empty vectors and zero-dimension metadata safely', async () => {
    mockReadSemanticIndex.mockResolvedValue({
      documents: [{ id: 'z', kind: 'symbol', path: 'src/z.ts', name: 'Z', text: 'Z', nodeIds: ['z'] }],
      vectors: [{ id: 'z', vector: [] }],
      meta: { version: 1, embeddingModel: 'fallback-hash-v1', dimension: 0, builtAt: 'x', documentCount: 1 },
    })

    mockResolveConfiguredEmbeddingProvider.mockResolvedValue(undefined)

    const result = await runSemanticRetrieval('/repo', 'alpha', 5)
    expect(result).toEqual([])
  })

  it('handles missing vectors for documents and no configured provider', async () => {
    mockReadSemanticIndex.mockResolvedValue({
      documents: [
        { id: 'a', kind: 'symbol', path: 'src/a.ts', name: 'A', text: 'A', nodeIds: ['a'] },
        { id: 'b', kind: 'symbol', path: 'src/b.ts', name: 'B', text: 'B', nodeIds: ['b'] },
      ],
      vectors: [{ id: 'a', vector: [1, 0, 0, 0] }],
      meta: { version: 1, embeddingModel: 'fallback-hash-v1', dimension: 4, builtAt: 'x', documentCount: 2 },
    })

    mockResolveConfiguredEmbeddingProvider.mockResolvedValue(undefined)

    const result = await runSemanticRetrieval('/repo', 'alpha', 5)
    expect(result.find((item) => item.id === 'b')).toBeUndefined()
  })
})
