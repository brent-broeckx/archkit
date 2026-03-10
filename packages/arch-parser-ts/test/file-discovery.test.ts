import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { discoverSourceFiles } from '../src/utils/file-discovery'

describe('file-discovery', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('discovers supported source files and ignores unsupported/ignored directories', async () => {
    const rootDir = await createTempDir('file-discovery')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'src', 'nested'), { recursive: true })
    await mkdir(path.join(rootDir, 'node_modules', 'pkg'), { recursive: true })
    await mkdir(path.join(rootDir, '.arch', 'graph'), { recursive: true })

    await writeFile(path.join(rootDir, 'src', 'a.ts'), 'export const a = 1\n', 'utf-8')
    await writeFile(path.join(rootDir, 'src', 'nested', 'b.tsx'), 'export const b = 2\n', 'utf-8')
    await writeFile(path.join(rootDir, 'src', 'c.md'), '# doc\n', 'utf-8')
    await writeFile(path.join(rootDir, 'node_modules', 'pkg', 'x.ts'), 'export const x = 1\n', 'utf-8')
    await writeFile(path.join(rootDir, '.arch', 'graph', 'nodes.jsonl'), '', 'utf-8')

    const files = discoverSourceFiles(rootDir)

    expect(files).toEqual(['src/a.ts', 'src/nested/b.tsx'])
  })
})
