import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import type { EmbeddingProvider } from './retrieval/embedding-provider'
import { createFallbackEmbeddingProvider, embedDocuments } from './retrieval/embedding-provider'
import type { SemanticDocument, SemanticIndexData, SemanticIndexMeta, SemanticVector } from '../models/retrieval-types'

const SEMANTIC_DOCS_FILE = 'semantic-documents.jsonl'
const SEMANTIC_VECTORS_FILE = 'semantic-vectors.jsonl'
const SEMANTIC_META_FILE = 'semantic-meta.json'
const SEMANTIC_INDEX_VERSION = 1

export async function buildSemanticIndex(
  rootDir: string,
  nodes: ArchNode[],
  provider?: EmbeddingProvider,
): Promise<SemanticIndexMeta> {
  const indexDir = path.join(rootDir, '.arch', 'index')
  await mkdir(indexDir, { recursive: true })

  const selectedProvider = provider ?? createFallbackEmbeddingProvider()
  const documents = await createSemanticDocuments(rootDir, nodes)
  const vectors = await embedDocuments(documents, selectedProvider)

  const meta: SemanticIndexMeta = {
    version: SEMANTIC_INDEX_VERSION,
    embeddingModel: selectedProvider.name,
    dimension: selectedProvider.dimension,
    builtAt: new Date().toISOString(),
    documentCount: documents.length,
  }

  await writeFile(path.join(indexDir, SEMANTIC_DOCS_FILE), toJsonl(documents), 'utf-8')
  await writeFile(path.join(indexDir, SEMANTIC_VECTORS_FILE), toJsonl(vectors), 'utf-8')
  await writeFile(path.join(indexDir, SEMANTIC_META_FILE), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8')

  return meta
}

export async function readSemanticIndex(rootDir: string): Promise<SemanticIndexData> {
  const indexDir = path.join(rootDir, '.arch', 'index')

  const [documentsContent, vectorsContent, metaContent] = await Promise.all([
    readFile(path.join(indexDir, SEMANTIC_DOCS_FILE), 'utf-8'),
    readFile(path.join(indexDir, SEMANTIC_VECTORS_FILE), 'utf-8'),
    readFile(path.join(indexDir, SEMANTIC_META_FILE), 'utf-8'),
  ])

  const documents = parseJsonl<SemanticDocument>(documentsContent)
  const vectors = parseJsonl<SemanticVector>(vectorsContent)
  const meta = JSON.parse(metaContent) as SemanticIndexMeta

  return { documents, vectors, meta }
}

function toJsonl<T>(items: T[]): string {
  if (items.length === 0) {
    return ''
  }

  return `${items.map((item) => JSON.stringify(item)).join('\n')}\n`
}

function parseJsonl<T>(content: string): T[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T)
}

async function createSemanticDocuments(rootDir: string, nodes: ArchNode[]): Promise<SemanticDocument[]> {
  const byFile = new Map<string, ArchNode[]>()

  nodes.forEach((node) => {
    const existing = byFile.get(node.filePath)
    if (existing) {
      existing.push(node)
    } else {
      byFile.set(node.filePath, [node])
    }
  })

  const documents: SemanticDocument[] = []

  byFile.forEach((fileNodes, filePath) => {
    const symbolNodes = fileNodes
      .filter((node) => node.type !== 'file')
      .sort((left, right) => left.id.localeCompare(right.id))

    const summary = symbolNodes
      .map((node) => `${node.type} ${node.name}${node.signature ? ` ${node.signature}` : ''}`)
      .join(' | ')

    documents.push({
      id: `file:${filePath}`,
      kind: 'file',
      path: filePath,
      name: filePath,
      text: `file ${filePath} symbols ${summary}`.trim(),
      nodeIds: fileNodes.map((node) => node.id).sort((left, right) => left.localeCompare(right)),
    })

    symbolNodes.forEach((node) => {
      documents.push({
        id: node.id,
        kind: 'symbol',
        path: node.filePath,
        name: node.name,
        text: `${node.type} ${node.name} in ${node.filePath}${node.signature ? ` ${node.signature}` : ''}`,
        nodeIds: [node.id],
      })
    })
  })

  const readme = await readReadmeSections(rootDir)
  documents.push(...readme)

  return documents.sort((left, right) => left.id.localeCompare(right.id))
}

async function readReadmeSections(rootDir: string): Promise<SemanticDocument[]> {
  const readmePath = path.join(rootDir, 'README.md')
  try {
    const content = await readFile(readmePath, 'utf-8')
    const sections = splitMarkdownSections(content)

    return sections.map((section, index) => ({
      id: `readme:${index + 1}`,
      kind: 'module',
      path: 'README.md',
      name: section.heading,
      text: section.body,
      nodeIds: [],
    }))
  } catch {
    return []
  }
}

function splitMarkdownSections(content: string): Array<{ heading: string; body: string }> {
  const lines = content.split('\n')
  const sections: Array<{ heading: string; body: string }> = []

  let heading = 'README'
  let bodyLines: string[] = []

  lines.forEach((line) => {
    if (line.startsWith('#')) {
      if (bodyLines.length > 0) {
        sections.push({ heading, body: bodyLines.join(' ').trim() })
      }

      heading = line.replace(/^#+\s*/, '').trim() || 'README'
      bodyLines = []
      return
    }

    bodyLines.push(line)
  })

  if (bodyLines.length > 0) {
    sections.push({ heading, body: bodyLines.join(' ').trim() })
  }

  return sections.filter((section) => section.body.length > 0)
}
