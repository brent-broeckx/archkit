import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEmbeddingProviderFromConfig,
  createFallbackEmbeddingProvider,
  createOllamaEmbeddingProvider,
  createOpenAiEmbeddingProvider,
  embedDocuments,
} from '../src/services/retrieval/embedding-provider'

describe('embedding-provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('embeds documents with fallback provider', async () => {
    const provider = createFallbackEmbeddingProvider(8)
    const vectors = await embedDocuments(
      [{ id: 'a', kind: 'symbol', path: 'src/a.ts', name: 'A', text: 'hello world', nodeIds: ['a'] }],
      provider,
    )

    expect(vectors[0].vector.length).toBe(8)
  })

  it('creates provider from config', () => {
    const fallback = createEmbeddingProviderFromConfig({ provider: 'fallback', dimension: 16 })
    const ollama = createEmbeddingProviderFromConfig({ provider: 'ollama', model: 'nomic-embed-text' })

    expect(fallback.name).toBe('fallback-hash-v1')
    expect(ollama.name).toContain('ollama:')
  })

  it('calls ollama provider endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createOllamaEmbeddingProvider({ endpoint: 'http://localhost:11434/api/embeddings', model: 'x' })
    const vector = await provider.embed('hello')

    expect(vector).toEqual([0.1, 0.2])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when openai api key is missing', async () => {
    delete process.env.OPENAI_API_KEY
    const provider = createOpenAiEmbeddingProvider({ endpoint: 'https://api.openai.com/v1/embeddings', model: 'x' })

    await expect(provider.embed('hello')).rejects.toThrow('OPENAI_API_KEY')
  })

  it('calls openai provider endpoint', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.3, 0.4, 0.5] }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createOpenAiEmbeddingProvider({ endpoint: 'https://api.openai.com/v1/embeddings', model: 'x' })
    const vector = await provider.embed('hello')

    expect(vector).toEqual([0.3, 0.4, 0.5])
  })
})
