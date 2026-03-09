import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { GraphData, GraphMeta } from '@arch/core'
import type { PersistGraphResult } from '../models/persist-types'
import { toJsonl } from '../utils/jsonl'
import { sortEdges, sortNodes } from '../utils/sort-utils'
import { createGraphMeta } from './graph-meta'
import { createFilesIndex, createSymbolsIndex } from './indexes'

export async function persistGraph(
  rootDir: string,
  graphData: GraphData,
): Promise<PersistGraphResult> {
  const graphDir = path.join(rootDir, '.arch', 'graph')
  const indexDir = path.join(rootDir, '.arch', 'index')
  const contextsDir = path.join(rootDir, '.arch', 'contexts')

  await mkdir(graphDir, { recursive: true })
  await mkdir(indexDir, { recursive: true })
  await mkdir(contextsDir, { recursive: true })

  const nodes = sortNodes(graphData.nodes)
  const edges = sortEdges(graphData.edges)

  await writeFile(path.join(graphDir, 'nodes.jsonl'), toJsonl(nodes), 'utf-8')
  await writeFile(path.join(graphDir, 'edges.jsonl'), toJsonl(edges), 'utf-8')

  const meta = createGraphMeta({ nodes, edges })
  await writeFile(
    path.join(graphDir, 'graph-meta.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf-8',
  )

  await writeFile(
    path.join(indexDir, 'symbols.json'),
    `${JSON.stringify(createSymbolsIndex(nodes), null, 2)}\n`,
    'utf-8',
  )

  await writeFile(
    path.join(indexDir, 'files.json'),
    `${JSON.stringify(createFilesIndex(nodes), null, 2)}\n`,
    'utf-8',
  )

  return {
    graphDir,
    indexDir,
    meta,
  }
}

export async function readGraphMeta(rootDir: string): Promise<GraphMeta> {
  const metaPath = path.join(rootDir, '.arch', 'graph', 'graph-meta.json')
  const content = await readFile(metaPath, 'utf-8')
  return JSON.parse(content) as GraphMeta
}
