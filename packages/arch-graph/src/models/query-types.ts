import type { ArchNode } from '@archkit/core'

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
