import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@arch/core'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { readPersistedEdges, readPersistedNodes, readPersistedSymbolsIndex } from '../src/services/persisted-read'
import { extractSnippetForNode } from '../src/services/snippet'

describe('snippet + persisted-read', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('reads persisted graph json/jsonl files', async () => {
    const rootDir = await createTempDir('persisted-read')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, '.arch', 'graph'), { recursive: true })
    await mkdir(path.join(rootDir, '.arch', 'index'), { recursive: true })

    await writeFile(
      path.join(rootDir, '.arch', 'graph', 'nodes.jsonl'),
      '{"id":"file:src/a.ts","type":"file","name":"a.ts","filePath":"src/a.ts","loc":{"startLine":1,"endLine":3}}\n',
      'utf-8',
    )
    await writeFile(
      path.join(rootDir, '.arch', 'graph', 'edges.jsonl'),
      '{"from":"file:src/a.ts","to":"function:src/a.ts#run","type":"contains"}\n',
      'utf-8',
    )
    await writeFile(
      path.join(rootDir, '.arch', 'index', 'symbols.json'),
      '{"run":["function:src/a.ts#run"]}',
      'utf-8',
    )

    await expect(readPersistedNodes(rootDir)).resolves.toHaveLength(1)
    await expect(readPersistedEdges(rootDir)).resolves.toHaveLength(1)
    await expect(readPersistedSymbolsIndex(rootDir)).resolves.toEqual({
      run: ['function:src/a.ts#run'],
    })
  })

  it('extracts source snippet by node line range', async () => {
    const rootDir = await createTempDir('snippet')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'src'), { recursive: true })
    await writeFile(
      path.join(rootDir, 'src', 'a.ts'),
      ['line1', 'line2', 'line3', 'line4'].join('\n'),
      'utf-8',
    )

    const node: ArchNode = {
      id: 'function:src/a.ts#x',
      type: 'function',
      name: 'x',
      filePath: 'src/a.ts',
      loc: { startLine: 2, endLine: 3 },
    }

    await expect(extractSnippetForNode(rootDir, node)).resolves.toBe('line2\nline3')
  })
})
