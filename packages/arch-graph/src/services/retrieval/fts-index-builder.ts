import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import type { LexicalEntryKind, LexicalIndexMeta } from '../../models/retrieval-types'
import { loadFeatureMapping, resolveFeaturesForFilePath } from '../feature-mapping'
import { getLexicalIndexPath } from '../persisted-read'

const LEXICAL_INDEX_VERSION = 1
const LEXICAL_META_FILE = 'lexical-meta.json'

interface LexicalRow {
  entryId: string
  entryKind: LexicalEntryKind
  nodeIds: string[]
  path: string
  fileName: string
  symbolName: string
  symbolKind: string
  featureName: string
  content: string
}

export async function buildLexicalIndex(rootDir: string, nodes: ArchNode[]): Promise<LexicalIndexMeta | undefined> {
  const dbPath = getLexicalIndexPath(rootDir)

  type MinimalDatabase = {
    exec: (sql: string) => void
    prepare: (sql: string) => {
      run: (...params: unknown[]) => unknown
    }
    close: () => void
  }

  let DatabaseSyncCtor: (new (path: string) => MinimalDatabase) | undefined

  try {
    const sqliteModule = await import('node:sqlite') as typeof import('node:sqlite')
    DatabaseSyncCtor = sqliteModule.DatabaseSync as unknown as typeof DatabaseSyncCtor
  } catch {
    return undefined
  }

  if (!DatabaseSyncCtor) {
    return undefined
  }

  await mkdir(path.dirname(dbPath), { recursive: true })
  await rm(dbPath, { force: true })

  const rows = await createLexicalRows(rootDir, nodes)

  const database = new DatabaseSyncCtor(dbPath)
  try {
    database.exec('PRAGMA journal_mode = WAL;')
    database.exec('PRAGMA synchronous = NORMAL;')
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS lexical_index USING fts5(
        entry_id UNINDEXED,
        entry_kind UNINDEXED,
        node_ids UNINDEXED,
        path,
        file_name,
        symbol_name,
        symbol_kind,
        feature_name,
        content,
        tokenize = "porter"
      );
    `)

    database.exec('DELETE FROM lexical_index;')

    const insert = database.prepare(`
      INSERT INTO lexical_index (
        entry_id,
        entry_kind,
        node_ids,
        path,
        file_name,
        symbol_name,
        symbol_kind,
        feature_name,
        content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    rows.forEach((row) => {
      insert.run(
        row.entryId,
        row.entryKind,
        JSON.stringify(row.nodeIds),
        row.path,
        row.fileName,
        row.symbolName,
        row.symbolKind,
        row.featureName,
        row.content,
      )
    })
  } finally {
    database.close()
  }

  const meta: LexicalIndexMeta = {
    version: LEXICAL_INDEX_VERSION,
    builtAt: new Date().toISOString(),
    documentCount: rows.length,
  }

  await writeFile(
    path.join(rootDir, '.arch', 'index', LEXICAL_META_FILE),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf-8',
  )

  return meta
}

async function createLexicalRows(rootDir: string, nodes: ArchNode[]): Promise<LexicalRow[]> {
  const rows: LexicalRow[] = []
  const featureMapping = await loadFeatureMapping(rootDir)
  const fileNodes = nodes
    .filter((node) => node.type === 'file')
    .sort((left, right) => left.filePath.localeCompare(right.filePath))
  const symbolNodesByPath = groupByPath(
    nodes.filter((node) => node.type !== 'file').sort((left, right) => left.id.localeCompare(right.id)),
  )

  for (const fileNode of fileNodes) {
    const filePath = fileNode.filePath
    const fileName = basename(filePath)
    const features = resolveFeaturesForFilePath(featureMapping, filePath)
    const sourceText = await readProjectFile(rootDir, filePath)
    const commentText = extractComments(sourceText)
    const symbolNodes = symbolNodesByPath.get(filePath) ?? []

    rows.push({
      entryId: `file:${filePath}`,
      entryKind: 'file',
      nodeIds: [fileNode.id],
      path: filePath,
      fileName,
      symbolName: symbolNodes.map((node) => node.name).join(' '),
      symbolKind: symbolNodes.map((node) => node.type).join(' '),
      featureName: features.join(' '),
      content: [commentText, sourceText.slice(0, 4000), symbolNodes.map((node) => node.signature ?? '').join(' ')].filter(Boolean).join(' '),
    })

    for (const symbolNode of symbolNodes) {
      rows.push({
        entryId: symbolNode.id,
        entryKind: 'symbol',
        nodeIds: [symbolNode.id],
        path: symbolNode.filePath,
        fileName,
        symbolName: symbolNode.name,
        symbolKind: symbolNode.type,
        featureName: features.join(' '),
        content: `${symbolNode.signature ?? ''} ${commentText}`.trim(),
      })
    }

    for (const feature of features) {
      rows.push({
        entryId: `feature:${feature}:${filePath}`,
        entryKind: 'feature',
        nodeIds: symbolNodes.map((node) => node.id),
        path: filePath,
        fileName,
        symbolName: '',
        symbolKind: '',
        featureName: feature,
        content: [feature, filePath, commentText].filter(Boolean).join(' '),
      })
    }
  }

  const docs = await readDocumentationRows(rootDir)
  rows.push(...docs)

  return rows.sort((left, right) => left.entryId.localeCompare(right.entryId))
}

function groupByPath(nodes: ArchNode[]): Map<string, ArchNode[]> {
  return nodes.reduce((map, node) => {
    const existing = map.get(node.filePath)
    if (existing) {
      existing.push(node)
    } else {
      map.set(node.filePath, [node])
    }
    return map
  }, new Map<string, ArchNode[]>())
}

async function readDocumentationRows(rootDir: string): Promise<LexicalRow[]> {
  const candidates = await collectDocumentationPaths(rootDir)
  const rows: LexicalRow[] = []

  for (const relativePath of candidates.sort((left, right) => left.localeCompare(right))) {
    const content = await readProjectFile(rootDir, relativePath)
    if (!content) {
      continue
    }

    rows.push({
      entryId: `doc:${relativePath}`,
      entryKind: relativePath === 'README.md' ? 'readme' : 'doc',
      nodeIds: [],
      path: relativePath,
      fileName: basename(relativePath),
      symbolName: '',
      symbolKind: '',
      featureName: '',
      content: content.slice(0, 6000),
    })
  }

  return rows
}

async function collectDocumentationPaths(rootDir: string): Promise<string[]> {
  const docs = new Set<string>()

  docs.add('README.md')

  try {
    const rootEntries = await readdir(rootDir, { withFileTypes: true })
    rootEntries.forEach((entry) => {
      if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith('.md')) {
        docs.add(entry.name)
      }
    })
  } catch {
    return [...docs]
  }

  const docsDir = path.join(rootDir, 'docs')
  try {
    const entries = await readdir(docsDir, { withFileTypes: true })
    entries.forEach((entry) => {
      if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith('.md')) {
        docs.add(path.posix.join('docs', entry.name))
      }
    })
  } catch {
    // optional docs directory
  }

  return [...docs]
}

async function readProjectFile(rootDir: string, relativePath: string): Promise<string> {
  try {
    const filePath = path.join(rootDir, relativePath)
    return await readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

function extractComments(content: string): string {
  if (!content) {
    return ''
  }

  const matches = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm)
  return matches ? matches.join(' ').slice(0, 4000) : ''
}

function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return slash >= 0 ? normalized.slice(slash + 1) : normalized
}
