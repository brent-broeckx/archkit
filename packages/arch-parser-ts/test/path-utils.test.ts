import { describe, expect, it } from 'vitest'
import { createFileNodeId, normalizeToPosixPath, toRelativePath } from '../src/utils/path-utils'

describe('path-utils', () => {
  it('normalizes platform separators to posix separators', () => {
    expect(normalizeToPosixPath(`a${'\\'}b${'\\'}c.ts`)).toBe('a/b/c.ts')
  })

  it('creates a relative path from root', () => {
    expect(toRelativePath('/repo/src/file.ts', '/repo')).toBe('src/file.ts')
  })

  it('creates file node id from file path', () => {
    expect(createFileNodeId('src/main.ts')).toBe('file:src/main.ts')
  })
})
