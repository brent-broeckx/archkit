import type {
  QueryRetrievalMetadata,
  RetrievedItem,
  RetrievalMode,
} from '@archkit/graph'

export interface ContextSnippet {
  file: string
  symbol: string
  startLine: number
  endLine: number
  evidence?: string[]
}

export interface ContextResolution {
  kind: 'feature' | 'query'
  feature?: string
}

export interface ContextBundle {
  query: string
  mode?: RetrievalMode
  resolution: ContextResolution
  retrievalMetadata?: QueryRetrievalMetadata
  retrievalResults?: RetrievedItem[]
  entrypoints: string[]
  files: string[]
  paths: string[][]
  snippets: ContextSnippet[]
}

export interface CompileContextOptions {
  query: string
  mode?: RetrievalMode
  limits?: boolean
}

export interface RankedNode {
  nodeId: string
  score: number
}

export interface ContextLimits {
  maxSnippets: number
  maxFiles: number
  maxLines: number
  maxDepth: number
  maxEntrypoints: number
  maxPaths: number
}
