export { ArchitectureGraph, createArchitectureGraph } from './models/architecture-graph'
export type { DeadCodeResult } from './models/dead-code-types'
export type { DepsResult } from './models/deps-types'
export type {
	FeatureAssignResult,
	FeatureDetails,
	FeatureMappingConfig,
	FeatureMatchResult,
	FeatureResolution,
	FeatureSuggestion,
	FeatureSuggestionsResult,
	FeatureSummary,
	NormalizedFeatureMapping,
	UnmappedResult,
} from './models/feature-types'
export {
	KNOWLEDGE_TYPES,
	type AddKnowledgeInput,
	type KnowledgeEntry,
	type KnowledgeEntrySummary,
	type KnowledgeIndex,
	type KnowledgeType,
} from './models/knowledge-types'
export type { PersistGraphResult } from './models/persist-types'
export type {
	ConfidenceEvaluation,
	DeterministicCandidate,
	DeterministicRetrievalResult,
	HybridRetrievalResult,
	QueryRetrievalMetadata,
	QueryType,
	RetrievedItem,
	RetrievalEvidence,
	RetrievalMode,
	RetrievalOptions,
	ScoreBreakdown,
	SemanticDocument,
	SemanticIndexData,
	SemanticIndexMeta,
	SemanticVector,
} from './models/retrieval-types'
export type {
	HybridQueryResult,
	ResolvedSymbol,
	SymbolQueryMatch,
	SymbolQueryResult,
} from './models/query-types'
export {
	FeatureMappingConfigError,
	assignFeaturePattern,
	findFeatureByQuery,
	getFeatureDetails,
	listFeatureSummaries,
	listUnmappedFiles,
	loadFeatureMapping,
	resolveFeatureForNodes,
	resolveFeatureMatchesForFiles,
	resolveFeaturesForFilePath,
	suggestFeatureMappings,
} from './services/feature-mapping'
export {
	addKnowledgeEntry,
	getKnowledgeEntry,
	listKnowledgeEntries,
	searchKnowledgeEntries,
} from './services/knowledge-storage'
export { persistGraph, readGraphMeta } from './services/graph-storage'
export { queryDeadCode } from './services/dead-code-query'
export { queryDependencies } from './services/deps-query'
export {
	buildSemanticIndex,
	readSemanticIndex,
} from './services/semantic-index-storage'
export {
	readPersistedEdges,
	readPersistedFilesIndex,
	readPersistedNodes,
	readPersistedSymbolsIndex,
} from './services/persisted-read'
export { extractSnippetForNode } from './services/snippet'
export {
	executeHybridRetrieval,
} from './services/retrieval/hybrid-retrieval-engine'
export {
	classifyQuery,
} from './services/retrieval/query-classifier'
export {
	evaluateDeterministicConfidence,
} from './services/retrieval/confidence-evaluator'
export {
	clearSemanticRetrievalCache,
	runSemanticRetrieval,
} from './services/retrieval/semantic-retriever'
export {
	readArchConfig,
	resolveConfiguredEmbeddingProvider,
} from './services/retrieval/provider-config'
export { querySymbols, resolveSymbolInput } from './services/symbol-query'
