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
export type { ResolvedSymbol, SymbolQueryMatch, SymbolQueryResult } from './models/query-types'
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
	readPersistedEdges,
	readPersistedFilesIndex,
	readPersistedNodes,
	readPersistedSymbolsIndex,
} from './services/persisted-read'
export { extractSnippetForNode } from './services/snippet'
export { querySymbols, resolveSymbolInput } from './services/symbol-query'
