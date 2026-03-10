import type { ContextBundle } from '@archkit/context'
import type { ArchNode, GraphMeta, NodeType } from '@archkit/core'
import type { DepsResult, KnowledgeEntry, KnowledgeEntrySummary } from '@archkit/graph'

export interface BuildCommandResult {
  repoPath: string
  meta: GraphMeta
}

export interface StatsCommandResult {
  repoPath: string
  meta: GraphMeta
}

export interface QueryCommandMatch {
  nodeId: string
  type: NodeType
  name: string
  file: string
}

export interface QueryCommandResult {
  term: string
  matches: QueryCommandMatch[]
}

export interface ShowCommandResult {
  input: string
  node: ArchNode
  snippet: string
}

export interface KnowledgeAddCommandResult {
  action: 'add'
  entry: KnowledgeEntry
}

export interface KnowledgeListCommandResult {
  action: 'list'
  entries: KnowledgeEntrySummary[]
}

export interface KnowledgeShowCommandResult {
  action: 'show'
  entry: KnowledgeEntry
}

export interface KnowledgeSearchCommandResult {
  action: 'search'
  query: string
  matches: KnowledgeEntrySummary[]
}

export type KnowledgeCommandResult =
  | KnowledgeAddCommandResult
  | KnowledgeListCommandResult
  | KnowledgeShowCommandResult
  | KnowledgeSearchCommandResult

export type DepsCommandResult = DepsResult
export type ContextCommandResult = ContextBundle
