import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { GraphData } from '@arch/core'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { persistGraph, readGraphMeta } from '../src/services/graph-storage'

describe('graph-storage', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('persists sorted graph files and indexes', async () => {
    const rootDir = await createTempDir('graph-storage')
    tempDirs.push(rootDir)

    const graphData: GraphData = {
      nodes: [
        {
          id: 'function:src/z.ts#run',
          type: 'function',
          name: 'run',
          filePath: 'src/z.ts',
          loc: { startLine: 2, endLine: 5 },
        },
        {
          id: 'file:src/z.ts',
          type: 'file',
          name: 'z.ts',
          filePath: 'src/z.ts',
          loc: { startLine: 1, endLine: 7 },
        },
      ],
      edges: [
        {
          from: 'file:src/z.ts',
          to: 'function:src/z.ts#run',
          type: 'contains',
          filePath: 'src/z.ts',
          loc: { startLine: 2, endLine: 2 },
        },
      ],
    }

    const result = await persistGraph(rootDir, graphData)

    expect(result.graphDir).toBe(path.join(rootDir, '.arch', 'graph'))
    expect(result.indexDir).toBe(path.join(rootDir, '.arch', 'index'))
    expect(result.meta.files).toBe(1)
    expect(result.meta.symbols).toBe(1)
    expect(result.meta.edges).toBe(1)

    const nodesJsonl = await readFile(path.join(result.graphDir, 'nodes.jsonl'), 'utf-8')
    const edgesJsonl = await readFile(path.join(result.graphDir, 'edges.jsonl'), 'utf-8')
    const symbols = JSON.parse(await readFile(path.join(result.indexDir, 'symbols.json'), 'utf-8'))
    const files = JSON.parse(await readFile(path.join(result.indexDir, 'files.json'), 'utf-8'))

    expect(nodesJsonl).toContain('file:src/z.ts')
    expect(edgesJsonl).toContain('"type":"contains"')
    expect(symbols).toEqual({ run: ['function:src/z.ts#run'] })
    expect(files).toEqual(['src/z.ts'])
  })

  it('reads graph metadata from persisted file', async () => {
    const rootDir = await createTempDir('graph-meta')
    tempDirs.push(rootDir)

    await persistGraph(rootDir, {
      nodes: [
        {
          id: 'file:src/a.ts',
          type: 'file',
          name: 'a.ts',
          filePath: 'src/a.ts',
          loc: { startLine: 1, endLine: 1 },
        },
      ],
      edges: [],
    })

    const meta = await readGraphMeta(rootDir)
    expect(meta).toEqual({
      files: 1,
      symbols: 0,
      edges: 0,
      nodeTypeCounts: {
        file: 1,
        class: 0,
        method: 0,
        function: 0,
        interface: 0,
        type: 0,
        route: 0,
      },
    })
  })
})
