import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import {
  addKnowledgeEntry,
  getKnowledgeEntry,
  listKnowledgeEntries,
  searchKnowledgeEntries,
} from '../src/services/knowledge-storage'

describe('knowledge-storage', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('adds, lists, gets, and searches knowledge entries', async () => {
    const rootDir = await createTempDir('knowledge-storage')
    tempDirs.push(rootDir)

    const added = await addKnowledgeEntry(rootDir, {
      type: 'decision',
      title: 'Auth token lifetime',
      body: 'Use short-lived access tokens and refresh flow.',
      feature: 'authentication',
      tags: ['auth', 'security'],
      createdAt: '2026-03-10',
    })

    expect(added.id).toBe('auth-token-lifetime')
    expect(added.file).toContain('entries/authentication/2026-03-10_auth-token-lifetime.md')

    const listed = await listKnowledgeEntries(rootDir)
    expect(listed).toHaveLength(1)
    expect(listed[0].id).toBe('auth-token-lifetime')

    const loaded = await getKnowledgeEntry(rootDir, 'AUTH-TOKEN-LIFETIME')
    expect(loaded?.title).toBe('Auth token lifetime')
    expect(loaded?.body).toContain('refresh flow')

    const byFeature = await searchKnowledgeEntries(rootDir, 'authentication')
    const byBody = await searchKnowledgeEntries(rootDir, 'refresh')
    const byTag = await searchKnowledgeEntries(rootDir, 'security')

    expect(byFeature.map((entry) => entry.id)).toEqual(['auth-token-lifetime'])
    expect(byBody.map((entry) => entry.id)).toEqual(['auth-token-lifetime'])
    expect(byTag.map((entry) => entry.id)).toEqual(['auth-token-lifetime'])
  })

  it('rejects duplicates and handles empty/unknown lookups', async () => {
    const rootDir = await createTempDir('knowledge-duplicate')
    tempDirs.push(rootDir)

    await addKnowledgeEntry(rootDir, {
      type: 'note',
      title: 'Clock skew',
      body: 'Allow 2 minutes.',
      feature: 'auth',
      createdAt: '2026-03-10',
    })

    await expect(
      addKnowledgeEntry(rootDir, {
        type: 'note',
        title: 'Clock skew',
        body: 'Duplicate title should duplicate id',
        feature: 'auth',
        createdAt: '2026-03-10',
      }),
    ).rejects.toThrow('Knowledge entry already exists')

    await expect(getKnowledgeEntry(rootDir, 'missing')).resolves.toBeUndefined()
    await expect(searchKnowledgeEntries(rootDir, '   ')).resolves.toEqual([])
  })

  it('returns empty list when index is missing and validates malformed index errors', async () => {
    const rootDir = await createTempDir('knowledge-index')
    tempDirs.push(rootDir)

    await expect(listKnowledgeEntries(rootDir)).resolves.toEqual([])

    await mkdir(path.join(rootDir, '.arch', 'knowledge'), { recursive: true })
    await writeFile(path.join(rootDir, '.arch', 'knowledge', 'index.json'), '{"entries":{}}', 'utf-8')

    await expect(listKnowledgeEntries(rootDir)).resolves.toEqual([])

    await writeFile(path.join(rootDir, '.arch', 'knowledge', 'index.json'), '{not-valid-json', 'utf-8')
    await expect(listKnowledgeEntries(rootDir)).rejects.toBeInstanceOf(Error)
  })
})
