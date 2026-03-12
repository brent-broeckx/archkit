import type { ContextBundle } from '@archkit/context'
import type { ArchNode, GraphMeta, NodeType } from '@archkit/core'
import type {
  DepsResult,
  FeatureAssignResult,
  FeatureDetails,
  FeatureSuggestion,
  FeatureSummary,
  KnowledgeEntry,
  KnowledgeEntrySummary,
  QueryRetrievalMetadata,
  RetrievedItem,
  RetrievalMode,
} from '@archkit/graph'

export interface BuildCommandResult {
  repoPath: string
  meta: GraphMeta
}

export interface InitCommandResult {
  repoPath: string
  archDir: string
  archIgnorePath: string
  createdArchDir: boolean
  createdArchIgnore: boolean
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
  mode?: RetrievalMode
  retrievalMetadata?: QueryRetrievalMetadata
  results?: RetrievedItem[]
  matches: QueryCommandMatch[]
}

export interface ShowCommandResult {
  input: string
  node: ArchNode
  snippet: string
}

export interface DeadCodeCommandResult {
  functions: string[]
  methods: string[]
  classes: string[]
  files: string[]
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

export interface FeaturesListCommandResult {
  action: 'list'
  hasConfig: boolean
  configPath: string
  features: FeatureSummary[]
}

export interface FeaturesSuggestCommandResult {
  action: 'suggest'
  suggestions: FeatureSuggestion[]
}

export interface FeatureShowCommandResult {
  action: 'show'
  hasConfig: boolean
  configPath: string
  feature: FeatureDetails
}

export interface FeatureAssignCommandResult {
  action: 'assign'
  assignment: FeatureAssignResult
}

export interface FeatureUnmappedCommandResult {
  action: 'unmapped'
  hasConfig: boolean
  configPath: string
  unmappedFiles: string[]
}

export type FeatureCommandResult =
  | FeaturesListCommandResult
  | FeaturesSuggestCommandResult
  | FeatureShowCommandResult
  | FeatureAssignCommandResult
  | FeatureUnmappedCommandResult

export type KnowledgeCommandResult =
  | KnowledgeAddCommandResult
  | KnowledgeListCommandResult
  | KnowledgeShowCommandResult
  | KnowledgeSearchCommandResult

export type DepsCommandResult = DepsResult
export type ContextCommandResult = ContextBundle
