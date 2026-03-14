import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { RetrievedItem } from '../../models/retrieval-types'
import type { NormalizedFeatureMapping } from '../../models/feature-types'
import { getLexicalIndexPath, lexicalIndexExists } from '../persisted-read'
import { normalizeRetrievalQuery } from './query-normalizer'

const lexicalCache = new Map<string, RetrievedItem[]>()
const LEXICAL_META_FILE = 'lexical-meta.json'

export async function runLexicalRetrieval(
  rootDir: string,
  query: string,
  topK: number,
  featureMapping?: NormalizedFeatureMapping,
): Promise<RetrievedItem[]> {
  const normalized = normalizeRetrievalQuery(query, featureMapping)
  if (normalized.sqliteMatch.length === 0) {
    return []
  }

  const hasIndex = await lexicalIndexExists(rootDir)
  if (!hasIndex) {
    return []
  }

  const cacheKey = `${rootDir}|${topK}|${normalized.sqliteMatch}|${await readLexicalFingerprint(rootDir)}`
  const cached = lexicalCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const sqliteModule = await import('node:sqlite') as typeof import('node:sqlite')
  const db = new sqliteModule.DatabaseSync(getLexicalIndexPath(rootDir))

  try {
    const statement = db.prepare(`
      SELECT
        entry_id,
        entry_kind,
        node_ids,
        path,
        file_name,
        symbol_name,
        symbol_kind,
        feature_name,
        bm25(lexical_index, 7.0, 6.0, 10.0, 5.0, 8.0, 1.0) AS bm25_score
      FROM lexical_index
      WHERE lexical_index MATCH ?
      ORDER BY bm25_score
      LIMIT ?
    `)

    const rows = statement.all(normalized.sqliteMatch, topK * 3) as Array<{
      entry_id: string
      entry_kind: string
      node_ids: string
      path: string
      file_name: string
      symbol_name: string
      symbol_kind: string
      feature_name: string
      bm25_score: number
    }>

    const mapped = rows
      .map((row) => toRetrievedItem(normalized.expandedTokens, row))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }

        return left.id.localeCompare(right.id)
      })
      .slice(0, topK)

    lexicalCache.set(cacheKey, mapped)
    return mapped
  } finally {
    db.close()
  }
}

export function clearLexicalRetrievalCache(): void {
  lexicalCache.clear()
}

function toRetrievedItem(
  queryTokens: string[],
  row: {
    entry_id: string
    entry_kind: string
    node_ids: string
    path: string
    file_name: string
    symbol_name: string
    symbol_kind: string
    feature_name: string
    bm25_score: number
  },
): RetrievedItem {
  const normalizedBm25 = normalizeBm25(row.bm25_score)
  const weightedScore = applyFieldBoosts(queryTokens, row, normalizedBm25)

  const evidenceField = pickEvidenceField(queryTokens, row)
  const evidenceValue = evidenceField ? (row[evidenceField] ?? row.path) : row.path
  const nodeIds = toNodeIds(row.node_ids, row.entry_id)
  const lexicalScore = Math.round(weightedScore * 1000) / 1000

  return {
    id: row.entry_id,
    kind: row.entry_kind === 'feature' ? 'module' : row.entry_kind === 'file' ? 'file' : 'symbol',
    name: row.symbol_name || row.feature_name || row.file_name || row.path,
    path: row.path,
    nodeIds,
    score: lexicalScore,
    deterministicScore: 0,
    scoreBreakdown: {
      exactScore: 0,
      featureScore: 0,
      graphScore: 0,
      lexicalScore,
      semanticScore: 0,
      totalScore: lexicalScore,
    },
    evidence: [
      {
        type: 'bm25_match',
        value: evidenceValue,
        score: lexicalScore,
        source: 'lexical',
        field: evidenceField ?? 'content',
      },
    ],
  }
}

function normalizeBm25(value: number): number {
  const abs = Math.abs(value)
  return Math.max(0, Math.min(100, 100 / (1 + abs)))
}

function applyFieldBoosts(
  queryTokens: string[],
  row: {
    path: string
    file_name: string
    symbol_name: string
    symbol_kind: string
    feature_name: string
  },
  score: number,
): number {
  const boosts: Array<{ field: keyof typeof row; weight: number }> = [
    { field: 'symbol_name', weight: 1.45 },
    { field: 'feature_name', weight: 1.35 },
    { field: 'file_name', weight: 1.2 },
    { field: 'path', weight: 1.1 },
    { field: 'symbol_kind', weight: 1.05 },
  ]

  const matched = boosts.find(({ field }) => hasTokenOverlap(queryTokens, row[field]))
  if (!matched) {
    return score
  }

  return Math.min(100, score * matched.weight)
}

function pickEvidenceField(
  queryTokens: string[],
  row: {
    path: string
    file_name: string
    symbol_name: string
    symbol_kind: string
    feature_name: string
  },
): 'path' | 'file_name' | 'symbol_name' | 'symbol_kind' | 'feature_name' | undefined {
  const orderedFields: Array<'symbol_name' | 'feature_name' | 'file_name' | 'path' | 'symbol_kind'> = [
    'symbol_name',
    'feature_name',
    'file_name',
    'path',
    'symbol_kind',
  ]

  return orderedFields.find((field) => hasTokenOverlap(queryTokens, row[field]))
}

function hasTokenOverlap(queryTokens: string[], content: string): boolean {
  if (!content) {
    return false
  }

  const lower = content.toLocaleLowerCase()
  return queryTokens.some((token) => lower.includes(token))
}

function toNodeIds(nodeIdsJson: string, fallbackId: string): string[] {
  try {
    const parsed = JSON.parse(nodeIdsJson) as string[]
    if (parsed.length > 0) {
      return [...new Set(parsed)].sort((left, right) => left.localeCompare(right))
    }
  } catch {
    // fallback below
  }

  return [fallbackId]
}

async function readLexicalFingerprint(rootDir: string): Promise<string> {
  try {
    const metaPath = path.join(rootDir, '.arch', 'index', LEXICAL_META_FILE)
    const content = await readFile(metaPath, 'utf-8')
    const parsed = JSON.parse(content) as { builtAt?: string; documentCount?: number }
    return `${parsed.builtAt ?? 'na'}:${parsed.documentCount ?? 0}`
  } catch {
    return 'na:0'
  }
}
