import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { resolveConfiguredEmbeddingProvider } from '../src/services/retrieval/provider-config'

describe('provider-config', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('returns undefined when arch.conf is missing', async () => {
    const rootDir = await createTempDir('provider-config-missing')
    tempDirs.push(rootDir)

    await expect(resolveConfiguredEmbeddingProvider(rootDir)).resolves.toBeUndefined()
  })

  it('loads ollama provider from arch.conf', async () => {
    const rootDir = await createTempDir('provider-config-ollama')
    tempDirs.push(rootDir)

    const archDir = path.join(rootDir, '.arch')
    await mkdir(archDir, { recursive: true })
    await writeFile(
      path.join(archDir, 'arch.conf'),
      JSON.stringify(
        {
          semantic: {
            provider: 'ollama',
            model: 'nomic-embed-text',
            baseUrl: 'http://127.0.0.1:11434',
          },
        },
        null,
        2,
      ),
      'utf-8',
    )

    const provider = await resolveConfiguredEmbeddingProvider(rootDir)
    expect(provider?.name).toBe('ollama:nomic-embed-text')
  })

  it('falls back to fallback provider type when config provider is fallback', async () => {
    const rootDir = await createTempDir('provider-config-fallback')
    tempDirs.push(rootDir)

    const archDir = path.join(rootDir, '.arch')
    await mkdir(archDir, { recursive: true })
    await writeFile(
      path.join(archDir, 'arch.conf'),
      JSON.stringify(
        {
          semantic: {
            provider: 'fallback',
            dimension: 32,
          },
        },
        null,
        2,
      ),
      'utf-8',
    )

    const provider = await resolveConfiguredEmbeddingProvider(rootDir)
    expect(provider?.name).toBe('fallback-hash-v1')
    expect(provider?.dimension).toBe(32)
  })
})
