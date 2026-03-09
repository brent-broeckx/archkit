export type NodeType =
  | 'file'
  | 'class'
  | 'method'
  | 'function'
  | 'interface'
  | 'type'
  | 'route'

export type EdgeType =
  | 'contains'
  | 'imports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'references'

export interface SourceLoc {
  startLine: number
  endLine: number
  startOffset?: number
  endOffset?: number
}

export interface ArchNode {
  id: string
  type: NodeType
  name: string
  filePath: string
  loc: SourceLoc
  exported?: boolean
  signature?: string
}

export interface ArchEdge {
  from: string
  to: string
  type: EdgeType
  filePath?: string
  loc?: SourceLoc
}

export interface GraphData {
  nodes: ArchNode[]
  edges: ArchEdge[]
}

export interface GraphMeta {
  files: number
  symbols: number
  edges: number
  nodeTypeCounts: Record<NodeType, number>
}
