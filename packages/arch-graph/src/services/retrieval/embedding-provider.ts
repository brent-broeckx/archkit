import type { SemanticDocument } from '../../models/retrieval-types'

export interface EmbeddingProvider {
  name: string
  dimension: number
  embed(text: string): Promise<number[]>
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
