import type { GraphMeta } from '@archkit/core'
import type { SemanticIndexMeta } from './retrieval-types'

export interface PersistGraphResult {
  graphDir: string
  indexDir: string
  meta: GraphMeta
  semanticIndexMeta?: SemanticIndexMeta
}
