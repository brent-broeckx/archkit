import type { GraphMeta } from '@archkit/core'
import type { LexicalIndexMeta, SemanticIndexMeta } from './retrieval-types'

export interface PersistGraphResult {
  graphDir: string
  indexDir: string
  meta: GraphMeta
  lexicalIndexMeta?: LexicalIndexMeta
  semanticIndexMeta?: SemanticIndexMeta
}
