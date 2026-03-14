import type { ArchNode } from '@archkit/core'
import type { QueryRetrievalMetadata, RetrievedItem, RetrievalMode } from './retrieval-types'

export interface SymbolQueryMatch {
  name: string
  nodeIds: string[]
}

export interface SymbolQueryResult {
  term: string
  matches: SymbolQueryMatch[]
}

export interface ResolvedSymbol {
  input: string
  nodes: ArchNode[]
}

export interface HybridQueryResult {
  query: string
  mode: RetrievalMode
  retrievalMetadata: QueryRetrievalMetadata
  results: RetrievedItem[]
}
