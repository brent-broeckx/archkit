export { ArchitectureGraph, createArchitectureGraph } from './models/architecture-graph'
export type { DepsResult } from './models/deps-types'
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
	addKnowledgeEntry,
	getKnowledgeEntry,
	listKnowledgeEntries,
	searchKnowledgeEntries,
} from './services/knowledge-storage'
export { persistGraph, readGraphMeta } from './services/graph-storage'
export { queryDependencies } from './services/deps-query'
export { readPersistedEdges, readPersistedNodes, readPersistedSymbolsIndex } from './services/persisted-read'
export { extractSnippetForNode } from './services/snippet'
export { querySymbols, resolveSymbolInput } from './services/symbol-query'
