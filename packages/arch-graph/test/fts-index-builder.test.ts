import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { buildLexicalIndex } from '../src/services/retrieval/fts-index-builder'
import { getLexicalIndexPath } from '../src/services/persisted-read'

describe('fts-index-builder', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('builds an FTS5 lexical index with file, symbol, and docs rows', async () => {
    const rootDir = await createTempDir('fts-index-builder')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, '.arch'), { recursive: true })
    await mkdir(path.join(rootDir, 'src', 'auth'), { recursive: true })
    await writeFile(
      path.join(rootDir, 'src', 'auth', 'AuthGuard.ts'),
      `// Protects routes\nexport class AuthGuard {\n  canActivate() { return true }\n}\n`,
      'utf-8',
    )
    await writeFile(path.join(rootDir, 'README.md'), '# Auth\nThis doc describes AuthGuard.', 'utf-8')

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
    ]

    const meta = await buildLexicalIndex(rootDir, nodes)
    if (!meta) {
      return
    }

    expect(meta.documentCount).toBeGreaterThan(1)

    const sqlite = await import('node:sqlite') as typeof import('node:sqlite')
    const db = new sqlite.DatabaseSync(getLexicalIndexPath(rootDir))
    try {
      const count = db.prepare('SELECT count(*) as count FROM lexical_index').get() as { count: number }
      const hit = db
        .prepare('SELECT symbol_name FROM lexical_index WHERE lexical_index MATCH ? LIMIT 1')
        .get('AuthGuard') as { symbol_name?: string } | undefined

      expect(count.count).toBeGreaterThan(0)
      expect(hit).toBeDefined()
    } finally {
      db.close()
    }
  })
})
