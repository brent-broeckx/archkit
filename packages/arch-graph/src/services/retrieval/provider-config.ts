import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { EmbeddingProvider, EmbeddingProviderConfig } from './embedding-provider'
import { createEmbeddingProviderFromConfig } from './embedding-provider'

export interface ArchConfig {
  semantic?: EmbeddingProviderConfig
}

const ARCH_CONF_FILE = path.join('.arch', 'arch.conf')

export async function readArchConfig(rootDir: string): Promise<ArchConfig | undefined> {
  const configPath = path.join(rootDir, ARCH_CONF_FILE)

  try {
    const content = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content) as ArchConfig

    if (!parsed || typeof parsed !== 'object') {
      return undefined
    }

    return parsed
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined
    }

    return undefined
  }
}

export async function resolveConfiguredEmbeddingProvider(
  rootDir: string,
  options: {
    preferredDimension?: number
    preferredModel?: string
  } = {},
): Promise<EmbeddingProvider | undefined> {
  const config = await readArchConfig(rootDir)
  const semantic = config?.semantic
  if (!semantic) {
    return undefined
  }

  return createEmbeddingProviderFromConfig(semantic, options)
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
