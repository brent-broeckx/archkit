export type RetrievalMode = 'exact' | 'lexical' | 'hybrid' | 'semantic'

export type QueryType = 'symbol' | 'path' | 'conceptual' | 'mixed'

export type RetrievalItemKind = 'file' | 'symbol' | 'module'

export type RetrievalSource = 'deterministic' | 'lexical' | 'semantic'

export type LexicalEntryKind = 'file' | 'symbol' | 'feature' | 'readme' | 'doc'

export interface LexicalIndexMeta {
  version: number
  builtAt: string
  documentCount: number
}

export interface LexicalSearchResult {
  kind: 'file' | 'symbol' | 'feature'
  path: string
  symbol?: string
  score: number
  entryId: string
  nodeIds: string[]
  evidence: RetrievalEvidence[]
}

export interface RetrievalEvidence {
  type:
    | 'exact_symbol_match'
    | 'exact_path_match'
    | 'feature_match'
    | 'alias_match'
    | 'substring_match'
    | 'token_match'
    | 'doc_comment_match'
    | 'bm25_match'
    | 'graph_proximity'
    | 'semantic_match'
  value: string
  score: number
  source: RetrievalSource
  field?: 'path' | 'file_name' | 'symbol_name' | 'symbol_kind' | 'feature_name' | 'content'
}

export interface ScoreBreakdown {
  exactScore: number
  featureScore: number
  graphScore: number
  lexicalScore: number
  semanticScore: number
  totalScore: number
}

export interface RetrievedItem {
  id: string
  kind: RetrievalItemKind
  name: string
  path: string
  nodeIds: string[]
  score: number
  deterministicScore: number
  scoreBreakdown: ScoreBreakdown
  evidence: RetrievalEvidence[]
}

export interface DeterministicCandidate {
  id: string
  kind: RetrievalItemKind
  name: string
  path: string
  nodeIds: string[]
  evidence: RetrievalEvidence[]
}

export interface DeterministicRetrievalResult {
  query: string
  queryType: QueryType
  results: RetrievedItem[]
  hasExactSymbolMatch: boolean
  clusterScore: number
}

export interface QueryRetrievalMetadata {
  query: string
  mode: RetrievalMode
  queryType: QueryType
  deterministicConfidence: number
  lexicalUsed: boolean
  semanticUsed: boolean
  reason: string[]
}

export interface HybridRetrievalResult {
  query: string
  mode: RetrievalMode
  retrievalMetadata: QueryRetrievalMetadata
  results: RetrievedItem[]
}

export interface ConfidenceEvaluation {
  deterministicConfidence: number
  clusterScore: number
  strongConfidence: boolean
  weakConfidence: boolean
}

export interface SemanticDocument {
  id: string
  kind: RetrievalItemKind | 'readme'
  path: string
  name: string
  text: string
  nodeIds: string[]
}

export interface SemanticVector {
  id: string
  vector: number[]
}

export interface SemanticIndexMeta {
  version: number
  embeddingModel: string
  dimension: number
  builtAt: string
  documentCount: number
}

export interface SemanticIndexData {
  documents: SemanticDocument[]
  vectors: SemanticVector[]
  meta: SemanticIndexMeta
}

export interface RetrievalOptions {
  mode?: RetrievalMode
  topK?: number
}
