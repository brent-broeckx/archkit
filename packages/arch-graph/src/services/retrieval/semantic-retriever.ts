import type { RetrievalEvidence, RetrievedItem } from '../../models/retrieval-types'
import type { EmbeddingProvider } from './embedding-provider'
import { createFallbackEmbeddingProvider } from './embedding-provider'
import { readSemanticIndex } from '../semantic-index-storage'

const semanticCache = new Map<string, Awaited<ReturnType<typeof readSemanticIndex>>>()

export async function runSemanticRetrieval(
  rootDir: string,
  query: string,
  topK: number,
  provider?: EmbeddingProvider,
): Promise<RetrievedItem[]> {
  const index = await readSemanticIndexCached(rootDir)
  const selectedProvider = provider ?? createFallbackEmbeddingProvider(index.meta.dimension)
  const queryVector = await selectedProvider.embed(query)
  const vectorById = new Map(index.vectors.map((item) => [item.id, item.vector]))

  const results = index.documents
    .map((document) => {
      const vector = vectorById.get(document.id)
      if (!vector) {
        return undefined
      }

      const similarity = cosineSimilarity(queryVector, vector)
      if (similarity <= 0) {
        return undefined
      }

      const semanticScore = Math.round(similarity * 100)
      const evidence: RetrievalEvidence = {
        type: 'semantic_match',
        value: `cosine=${similarity.toFixed(3)}`,
        score: semanticScore,
        source: 'semantic',
      }

      return {
        id: document.id,
        kind: document.kind === 'readme' ? 'module' : document.kind,
        name: document.name,
        path: document.path,
        nodeIds: document.nodeIds,
        score: semanticScore,
        deterministicScore: 0,
        scoreBreakdown: {
          exactScore: 0,
          featureScore: 0,
          graphScore: 0,
          lexicalScore: 0,
          semanticScore,
          totalScore: semanticScore,
        },
        evidence: [evidence],
      } satisfies RetrievedItem
    })
    .filter((item): item is RetrievedItem => item !== undefined)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.id.localeCompare(right.id)
    })

  return results.slice(0, topK)
}

export function clearSemanticRetrievalCache(): void {
  semanticCache.clear()
}

async function readSemanticIndexCached(rootDir: string): Promise<Awaited<ReturnType<typeof readSemanticIndex>>> {
  const cached = semanticCache.get(rootDir)
  if (cached) {
    return cached
  }

  const loaded = await readSemanticIndex(rootDir)
  semanticCache.set(rootDir, loaded)
  return loaded
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) {
    return 0
  }

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}
