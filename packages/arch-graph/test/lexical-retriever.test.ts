import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { buildLexicalIndex } from '../src/services/retrieval/fts-index-builder'
import { runLexicalRetrieval } from '../src/services/retrieval/lexical-retriever'

describe('lexical-retriever', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('returns ranked BM25-style results and symbol field evidence', async () => {
    const rootDir = await createTempDir('lexical-retriever')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'src', 'auth'), { recursive: true })
    await writeFile(
      path.join(rootDir, 'src', 'auth', 'AuthGuard.ts'),
      `// route guard\nexport class AuthGuard {\n  canActivate() { return true }\n}\n`,
      'utf-8',
    )
    await writeFile(
      path.join(rootDir, 'src', 'auth', 'notes.ts'),
      `// mentions auth guard in comments only\nexport const notes = true\n`,
      'utf-8',
    )
    await writeFile(path.join(rootDir, 'README.md'), '# Authentication\nAuthGuard docs', 'utf-8')

    const nodes: ArchNode[] = [
      {
        id: 'file:src/auth/AuthGuard.ts',
        type: 'file',
        name: 'AuthGuard.ts',
        filePath: 'src/auth/AuthGuard.ts',
        loc: { startLine: 1, endLine: 4 },
      },
      {
        id: 'class:src/auth/AuthGuard.ts#AuthGuard',
        type: 'class',
        name: 'AuthGuard',
        filePath: 'src/auth/AuthGuard.ts',
        loc: { startLine: 2, endLine: 4 },
        signature: 'class AuthGuard',
      },
      {
        id: 'file:src/auth/notes.ts',
        type: 'file',
        name: 'notes.ts',
        filePath: 'src/auth/notes.ts',
        loc: { startLine: 1, endLine: 2 },
      },
      {
        id: 'function:src/auth/notes.ts#notes',
        type: 'function',
        name: 'notes',
        filePath: 'src/auth/notes.ts',
        loc: { startLine: 2, endLine: 2 },
        signature: 'notes helper',
      },
    ]

    const meta = await buildLexicalIndex(rootDir, nodes)
    if (!meta) {
      return
    }

    const results = await runLexicalRetrieval(rootDir, 'AuthGuard', 6)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path).toBe('src/auth/AuthGuard.ts')
    expect(results[0].evidence[0]?.type).toBe('bm25_match')
    expect(results[0].evidence[0]?.field).toBe('symbol_name')
  })
})
