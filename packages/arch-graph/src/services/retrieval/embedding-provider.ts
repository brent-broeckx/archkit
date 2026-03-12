import type { SemanticDocument } from '../../models/retrieval-types'

export interface EmbeddingProvider {
  name: string
  dimension: number
  embed(text: string): Promise<number[]>
}

export type EmbeddingProviderType = 'fallback' | 'ollama' | 'openai'

export interface EmbeddingProviderConfig {
  provider?: EmbeddingProviderType
  model?: string
  dimension?: number
  baseUrl?: string
  endpoint?: string
  apiKeyEnv?: string
  timeoutMs?: number
  headers?: Record<string, string>
}

export function createFallbackEmbeddingProvider(dimension: number = 64): EmbeddingProvider {
  return {
    name: 'fallback-hash-v1',
    dimension,
    async embed(text: string): Promise<number[]> {
      return embedWithHash(text, dimension)
    },
  }
}

export function createEmbeddingProviderFromConfig(
  config: EmbeddingProviderConfig,
  options: {
    preferredDimension?: number
    preferredModel?: string
  } = {},
): EmbeddingProvider {
  const providerType = config.provider ?? 'fallback'
  const dimension = config.dimension ?? options.preferredDimension ?? 64
  const model = config.model ?? options.preferredModel

  if (providerType === 'ollama') {
    return createOllamaEmbeddingProvider({
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      model,
      dimension,
      timeoutMs: config.timeoutMs,
      headers: config.headers,
    })
  }

  if (providerType === 'openai') {
    return createOpenAiEmbeddingProvider({
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      model,
      dimension,
      apiKeyEnv: config.apiKeyEnv,
      timeoutMs: config.timeoutMs,
      headers: config.headers,
    })
  }

  return createFallbackEmbeddingProvider(dimension)
}

export async function embedDocuments(
  documents: SemanticDocument[],
  provider: EmbeddingProvider,
): Promise<Array<{ id: string; vector: number[] }>> {
  const vectors: Array<{ id: string; vector: number[] }> = []

  for (const document of documents) {
    vectors.push({
      id: document.id,
      vector: await provider.embed(document.text),
    })
  }

  return vectors.sort((left, right) => left.id.localeCompare(right.id))
}

export function createOllamaEmbeddingProvider(options: {
  baseUrl?: string
  endpoint?: string
  model?: string
  dimension?: number
  timeoutMs?: number
  headers?: Record<string, string>
}): EmbeddingProvider {
  const baseUrl = options.baseUrl ?? 'http://127.0.0.1:11434'
  const endpoint = options.endpoint ?? `${baseUrl.replace(/\/$/, '')}/api/embeddings`
  const model = options.model ?? 'nomic-embed-text'
  const dimension = options.dimension ?? 1024
  const timeoutMs = options.timeoutMs ?? 15000

  return {
    name: `ollama:${model}`,
    dimension,
    async embed(text: string): Promise<number[]> {
      const response = await postJson<{ embedding?: number[] }>(
        endpoint,
        {
          model,
          prompt: text,
        },
        {
          timeoutMs,
          headers: options.headers,
        },
      )

      const embedding = response.embedding
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Ollama embedding provider returned an invalid embedding vector.')
      }

      return embedding
    },
  }
}

export function createOpenAiEmbeddingProvider(options: {
  baseUrl?: string
  endpoint?: string
  model?: string
  dimension?: number
  apiKeyEnv?: string
  timeoutMs?: number
  headers?: Record<string, string>
}): EmbeddingProvider {
  const baseUrl = options.baseUrl ?? 'https://api.openai.com/v1'
  const endpoint = options.endpoint ?? `${baseUrl.replace(/\/$/, '')}/embeddings`
  const model = options.model ?? 'text-embedding-3-small'
  const dimension = options.dimension ?? 1536
  const timeoutMs = options.timeoutMs ?? 15000
  const apiKeyEnv = options.apiKeyEnv ?? 'OPENAI_API_KEY'

  return {
    name: `openai:${model}`,
    dimension,
    async embed(text: string): Promise<number[]> {
      const apiKey = process.env[apiKeyEnv]
      if (!apiKey) {
        throw new Error(`OpenAI embedding provider requires environment variable: ${apiKeyEnv}`)
      }

      const response = await postJson<{ data?: Array<{ embedding?: number[] }> }>(
        endpoint,
        {
          model,
          input: text,
        },
        {
          timeoutMs,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...(options.headers ?? {}),
          },
        },
      )

      const embedding = response.data?.[0]?.embedding
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('OpenAI embedding provider returned an invalid embedding vector.')
      }

      return embedding
    },
  }
}

async function postJson<T>(
  url: string,
  body: unknown,
  options: {
    timeoutMs: number
    headers?: Record<string, string>
  },
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Embedding provider request failed (${response.status}): ${text}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

function embedWithHash(text: string, dimension: number): number[] {
  const vector = new Array<number>(dimension).fill(0)
  const tokens = text
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1)

  if (tokens.length === 0) {
    return vector
  }

  tokens.forEach((token) => {
    const bucket = stableHash(token) % dimension
    vector[bucket] += 1
  })

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (norm <= 0) {
    return vector
  }

  return vector.map((value) => value / norm)
}

function stableHash(token: string): number {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash)
}
