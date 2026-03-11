export interface ContextSnippet {
  file: string
  symbol: string
  startLine: number
  endLine: number
}

export interface ContextResolution {
  kind: 'feature' | 'query'
  feature?: string
}

export interface ContextBundle {
  query: string
  resolution: ContextResolution
  entrypoints: string[]
  files: string[]
  paths: string[][]
  snippets: ContextSnippet[]
}

export interface CompileContextOptions {
  query: string
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
