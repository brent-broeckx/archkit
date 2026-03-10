import type { ArchEdge, ArchNode } from '@archkit/core'

export interface ParseRepositoryOptions {
  rootDir: string
  tsConfigFilePath?: string
}

export interface ParseState {
  rootDir: string
  nodes: ArchNode[]
  edges: ArchEdge[]
  nodeIds: Set<string>
  edgeIds: Set<string>
  discoveredFilesSet: Set<string>
}
