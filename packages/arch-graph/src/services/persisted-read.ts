import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchEdge, ArchNode } from '@archkit/core'

function parseJsonl<T>(content: string): T[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T)
}

export async function readPersistedNodes(rootDir: string): Promise<ArchNode[]> {
  const nodesPath = path.join(rootDir, '.arch', 'graph', 'nodes.jsonl')
  const content = await readFile(nodesPath, 'utf-8')
  return parseJsonl<ArchNode>(content)
}

export async function readPersistedEdges(rootDir: string): Promise<ArchEdge[]> {
  const edgesPath = path.join(rootDir, '.arch', 'graph', 'edges.jsonl')
  const content = await readFile(edgesPath, 'utf-8')
  return parseJsonl<ArchEdge>(content)
}

export async function readPersistedSymbolsIndex(
  rootDir: string,
): Promise<Record<string, string[]>> {
  const symbolsPath = path.join(rootDir, '.arch', 'index', 'symbols.json')
  const content = await readFile(symbolsPath, 'utf-8')
  return JSON.parse(content) as Record<string, string[]>
}

export async function readPersistedFilesIndex(rootDir: string): Promise<string[]> {
  const filesPath = path.join(rootDir, '.arch', 'index', 'files.json')
  const content = await readFile(filesPath, 'utf-8')
  return JSON.parse(content) as string[]
}
