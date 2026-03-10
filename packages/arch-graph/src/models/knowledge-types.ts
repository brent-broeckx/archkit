export const KNOWLEDGE_TYPES = [
  'decision',
  'workaround',
  'caveat',
  'note',
  'migration',
] as const

export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number]

export interface KnowledgeEntrySummary {
  id: string
  title: string
  type: KnowledgeType
  feature: string
  tags: string[]
  createdAt: string
  file: string
}

export interface KnowledgeEntry extends KnowledgeEntrySummary {
  body: string
}

export interface KnowledgeIndex {
  entries: KnowledgeEntrySummary[]
}

export interface AddKnowledgeInput {
  type: KnowledgeType
  title: string
  body: string
  feature?: string
  tags?: string[]
  createdAt?: string
}
