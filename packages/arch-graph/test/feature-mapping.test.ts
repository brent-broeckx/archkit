import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import {
  FeatureMappingConfigError,
  assignFeaturePattern,
  findFeatureByQuery,
  getFeatureDetails,
  listFeatureSummaries,
  listUnmappedFiles,
  loadFeatureMapping,
  resolveFeatureForNodes,
  resolveFeaturesForFilePath,
  suggestFeatureMappings,
} from '../src/services/feature-mapping'

describe('feature-mapping', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('loads normalized mapping config and resolves file matches', async () => {
    const rootDir = await createTempDir('feature-mapping-load')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, '.arch'), { recursive: true })
    await writeFile(
      path.join(rootDir, '.arch', 'features.json'),
      JSON.stringify(
        {
          Authentication: ['src/app/features/auth/**', './libs/auth/**'],
          billing: ['packages/billing/**'],
        },
        null,
        2,
      ),
      'utf-8',
    )

    const mapping = await loadFeatureMapping(rootDir)
    expect(mapping.hasConfig).toBe(true)
    expect(Object.keys(mapping.features)).toEqual(['authentication', 'billing'])
    expect(resolveFeaturesForFilePath(mapping, 'src/app/features/auth/login.ts')).toEqual([
      'authentication',
    ])
    expect(resolveFeaturesForFilePath(mapping, 'libs/auth/token.ts')).toEqual(['authentication'])
    expect(resolveFeaturesForFilePath(mapping, 'packages/billing/index.ts')).toEqual(['billing'])
    expect(findFeatureByQuery(mapping, 'AUTHENTICATION')).toBe('authentication')
  })

  it('returns empty mapping when config is missing', async () => {
    const rootDir = await createTempDir('feature-mapping-missing')
    tempDirs.push(rootDir)

    const mapping = await loadFeatureMapping(rootDir)
    expect(mapping.hasConfig).toBe(false)
    expect(mapping.features).toEqual({})
  })

  it('throws on invalid config structure', async () => {
    const rootDir = await createTempDir('feature-mapping-invalid')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, '.arch'), { recursive: true })
    await writeFile(path.join(rootDir, '.arch', 'features.json'), '{"auth":123}', 'utf-8')

    await expect(loadFeatureMapping(rootDir)).rejects.toBeInstanceOf(FeatureMappingConfigError)
  })

  it('assigns feature patterns deterministically and avoids duplicates', async () => {
    const rootDir = await createTempDir('feature-mapping-assign')
    tempDirs.push(rootDir)

    const first = await assignFeaturePattern(rootDir, 'Authentication', 'src/app/features/auth/**')
    const duplicate = await assignFeaturePattern(rootDir, 'authentication', './src/app/features/auth/**')
    const second = await assignFeaturePattern(rootDir, 'billing', 'packages/billing/**')

    expect(first.created).toBe(true)
    expect(duplicate.duplicate).toBe(true)
    expect(second.feature).toBe('billing')

    const mapping = await loadFeatureMapping(rootDir)
    expect(Object.keys(mapping.features)).toEqual(['authentication', 'billing'])
    expect(mapping.features.authentication).toEqual(['src/app/features/auth/**'])
  })

  it('computes summaries/details/unmapped and conservative suggestions from files index', async () => {
    const rootDir = await createTempDir('feature-mapping-queries')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, '.arch', 'index'), { recursive: true })
    await writeFile(
      path.join(rootDir, '.arch', 'index', 'files.json'),
      JSON.stringify(
        [
          'src/app/features/auth/login.ts',
          'src/app/features/auth/logout.ts',
          'packages/billing/charge.ts',
          'src/shared/date.ts',
        ],
        null,
        2,
      ),
      'utf-8',
    )

    await assignFeaturePattern(rootDir, 'authentication', 'src/app/features/auth/**')
    await assignFeaturePattern(rootDir, 'billing', 'packages/billing/**')

    const summaries = await listFeatureSummaries(rootDir)
    expect(summaries).toEqual([
      {
        feature: 'authentication',
        patterns: ['src/app/features/auth/**'],
        fileCount: 2,
      },
      {
        feature: 'billing',
        patterns: ['packages/billing/**'],
        fileCount: 1,
      },
    ])

    const details = await getFeatureDetails(rootDir, 'Authentication')
    expect(details).toEqual({
      feature: 'authentication',
      patterns: ['src/app/features/auth/**'],
      files: ['src/app/features/auth/login.ts', 'src/app/features/auth/logout.ts'],
    })

    const unmapped = await listUnmappedFiles(rootDir)
    expect(unmapped).toEqual({
      unmappedFiles: ['src/shared/date.ts'],
    })

    const suggestions = await suggestFeatureMappings(rootDir)
    expect(suggestions.suggestions.map((entry) => entry.feature)).toContain('auth')
    expect(suggestions.suggestions.map((entry) => entry.feature)).toContain('billing')
  })

  it('resolves matching nodes for a feature', async () => {
    const rootDir = await createTempDir('feature-mapping-nodes')
    tempDirs.push(rootDir)

    await assignFeaturePattern(rootDir, 'authentication', 'src/auth/**')
    const mapping = await loadFeatureMapping(rootDir)

    const nodes: ArchNode[] = [
      {
        id: 'function:src/auth/a.ts#login',
        type: 'function',
        name: 'login',
        filePath: 'src/auth/a.ts',
        loc: { startLine: 1, endLine: 5 },
      },
      {
        id: 'function:src/billing/a.ts#charge',
        type: 'function',
        name: 'charge',
        filePath: 'src/billing/a.ts',
        loc: { startLine: 1, endLine: 5 },
      },
    ]

    const resolved = resolveFeatureForNodes(mapping, 'AUTHENTICATION', nodes)
    expect(resolved?.feature).toBe('authentication')
    expect(resolved?.matchedNodes.map((node) => node.id)).toEqual(['function:src/auth/a.ts#login'])
  })
})
