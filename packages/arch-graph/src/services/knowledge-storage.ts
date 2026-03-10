import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AddKnowledgeInput, KnowledgeEntry, KnowledgeIndex, KnowledgeEntrySummary } from '../models/knowledge-types'
import {
  normalizeAddInput,
  parseKnowledgeEntry,
  serializeKnowledgeEntry,
  toEntryRelativeFile,
  toSummary,
} from '../utils/knowledge-utils'

function sortSummaries(entries: KnowledgeEntrySummary[]): KnowledgeEntrySummary[] {
  return [...entries].sort((left, right) => {
    const leftKey = `${left.feature}:${left.id}`
    const rightKey = `${right.feature}:${right.id}`
    return leftKey.localeCompare(rightKey)
  })
}

function sortEntries(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  return [...entries].sort((left, right) => {
    const leftKey = `${left.feature}:${left.id}`
    const rightKey = `${right.feature}:${right.id}`
    return leftKey.localeCompare(rightKey)
  })
}

function toKnowledgePaths(rootDir: string): {
  knowledgeDir: string
  entriesDir: string
  indexPath: string
} {
  const knowledgeDir = path.join(rootDir, '.arch', 'knowledge')
  return {
    knowledgeDir,
    entriesDir: path.join(knowledgeDir, 'entries'),
    indexPath: path.join(knowledgeDir, 'index.json'),
  }
}

async function readIndexOrEmpty(rootDir: string): Promise<KnowledgeIndex> {
  const { indexPath } = toKnowledgePaths(rootDir)

  try {
    const content = await readFile(indexPath, 'utf-8')
    const parsed = JSON.parse(content) as KnowledgeIndex
    if (!Array.isArray(parsed.entries)) {
      return { entries: [] }
    }

    return { entries: sortSummaries(parsed.entries) }
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error
    }

    return { entries: [] }
  }
}

async function writeIndex(rootDir: string, index: KnowledgeIndex): Promise<void> {
  const { knowledgeDir, indexPath } = toKnowledgePaths(rootDir)
  await mkdir(knowledgeDir, { recursive: true })
  const sorted = {
    entries: sortSummaries(index.entries),
  }

  await writeFile(indexPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8')
}

export async function addKnowledgeEntry(
  rootDir: string,
  input: AddKnowledgeInput,
): Promise<KnowledgeEntry> {
  const normalized = normalizeAddInput(input)
  const index = await readIndexOrEmpty(rootDir)

  if (index.entries.some((entry) => entry.id === normalized.id)) {
    throw new Error(`Knowledge entry already exists: ${normalized.id}`)
  }

  const relativeFile = toEntryRelativeFile(
    normalized.feature,
    normalized.createdAt,
    normalized.id,
  )

  const entry: KnowledgeEntry = {
    ...normalized,
    file: relativeFile,
  }

  const { knowledgeDir, entriesDir } = toKnowledgePaths(rootDir)
  await mkdir(knowledgeDir, { recursive: true })
  await mkdir(path.join(entriesDir, normalized.feature), { recursive: true })

  await writeFile(
    path.join(knowledgeDir, relativeFile),
    serializeKnowledgeEntry(entry),
    'utf-8',
  )

  await writeIndex(rootDir, {
    entries: [...index.entries, toSummary(entry)],
  })

  return entry
}

export async function listKnowledgeEntries(rootDir: string): Promise<KnowledgeEntrySummary[]> {
  const index = await readIndexOrEmpty(rootDir)
  return sortSummaries(index.entries)
}

export async function getKnowledgeEntry(
  rootDir: string,
  id: string,
): Promise<KnowledgeEntry | undefined> {
  const normalizedId = id.trim().toLocaleLowerCase()
  const index = await readIndexOrEmpty(rootDir)
  const found = index.entries.find((entry) => entry.id === normalizedId)

  if (!found) {
    return undefined
  }

  const { knowledgeDir } = toKnowledgePaths(rootDir)
  const content = await readFile(path.join(knowledgeDir, found.file), 'utf-8')
  return parseKnowledgeEntry(content, found.file)
}

export async function searchKnowledgeEntries(
  rootDir: string,
  query: string,
): Promise<KnowledgeEntrySummary[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (normalizedQuery.length === 0) {
    return []
  }

  const index = await readIndexOrEmpty(rootDir)
  const { knowledgeDir } = toKnowledgePaths(rootDir)

  const loadedEntries = await Promise.all(
    index.entries.map(async (summary) => {
      const content = await readFile(path.join(knowledgeDir, summary.file), 'utf-8')
      return parseKnowledgeEntry(content, summary.file)
    }),
  )

  const matches = loadedEntries.filter((entry) => {
    if (entry.id.toLocaleLowerCase().includes(normalizedQuery)) {
      return true
    }

    if (entry.title.toLocaleLowerCase().includes(normalizedQuery)) {
      return true
    }

    if (entry.feature.toLocaleLowerCase().includes(normalizedQuery)) {
      return true
    }

    if (entry.body.toLocaleLowerCase().includes(normalizedQuery)) {
      return true
    }

    return entry.tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))
  })

  return sortEntries(matches).map(toSummary)
}

function isMissingFileError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const withCode = error as { code?: unknown }
  return withCode.code === 'ENOENT'
}
