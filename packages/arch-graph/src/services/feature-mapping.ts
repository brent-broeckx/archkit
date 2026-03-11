import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@archkit/core'
import type {
  FeatureAssignResult,
  FeatureDetails,
  FeatureMappingConfig,
  FeatureMatchResult,
  FeatureResolution,
  FeatureSuggestion,
  FeatureSuggestionsResult,
  FeatureSummary,
  NormalizedFeatureMapping,
  UnmappedResult,
} from '../models/feature-types'
import { readPersistedFilesIndex } from './persisted-read'
import { matchesPattern, normalizeFeatureName, normalizeFilePath, normalizePattern } from '../utils/feature-utils'

const FEATURES_RELATIVE_PATH = path.join('.arch', 'features.json')

export class FeatureMappingConfigError extends Error {
  public constructor(message: string) {
    super(message)
  }
}

export async function loadFeatureMapping(rootDir: string): Promise<NormalizedFeatureMapping> {
  const configPath = path.join(rootDir, FEATURES_RELATIVE_PATH)
  const relativeConfigPath = FEATURES_RELATIVE_PATH.replaceAll('\\', '/')

  try {
    const content = await readFile(configPath, 'utf-8')
    const parsed = parseAndValidate(content, relativeConfigPath)
    return {
      hasConfig: true,
      configPath: relativeConfigPath,
      features: parsed,
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        hasConfig: false,
        configPath: relativeConfigPath,
        features: {},
      }
    }

    throw error
  }
}

export function findFeatureByQuery(
  mapping: NormalizedFeatureMapping,
  query: string,
): string | undefined {
  const normalizedQuery = normalizeFeatureName(query)
  return Object.prototype.hasOwnProperty.call(mapping.features, normalizedQuery)
    ? normalizedQuery
    : undefined
}

export function resolveFeaturesForFilePath(
  mapping: NormalizedFeatureMapping,
  filePath: string,
): string[] {
  const normalizedFilePath = normalizeFilePath(filePath)
  const matches = Object.keys(mapping.features).filter((feature) => {
    const patterns = mapping.features[feature] ?? []
    return patterns.some((pattern) => matchesPattern(normalizedFilePath, pattern))
  })

  return matches.sort((left, right) => left.localeCompare(right))
}

export function resolveFeatureMatchesForFiles(
  mapping: NormalizedFeatureMapping,
  filePaths: string[],
): FeatureMatchResult[] {
  return filePaths
    .map((filePath) => {
      const normalized = normalizeFilePath(filePath)
      return {
        filePath: normalized,
        features: resolveFeaturesForFilePath(mapping, normalized),
      }
    })
    .sort((left, right) => left.filePath.localeCompare(right.filePath))
}

export function resolveFeatureForNodes(
  mapping: NormalizedFeatureMapping,
  feature: string,
  nodes: ArchNode[],
): FeatureResolution | undefined {
  const normalizedFeature = findFeatureByQuery(mapping, feature)
  if (!normalizedFeature) {
    return undefined
  }

  const matchedNodes = nodes
    .filter((node) => resolveFeaturesForFilePath(mapping, node.filePath).includes(normalizedFeature))
    .sort((left, right) => left.id.localeCompare(right.id))

  const matchedFilePaths = [...new Set(matchedNodes.map((node) => normalizeFilePath(node.filePath)))]
    .sort((left, right) => left.localeCompare(right))

  return {
    feature: normalizedFeature,
    matchedFilePaths,
    matchedNodes,
  }
}

export async function listFeatureSummaries(rootDir: string): Promise<FeatureSummary[]> {
  const mapping = await loadFeatureMapping(rootDir)
  const files = await readFilesIndexOrEmpty(rootDir)
  const matches = resolveFeatureMatchesForFiles(mapping, files)
  const fileCountByFeature = new Map<string, number>()

  matches.forEach((match) => {
    match.features.forEach((feature) => {
      fileCountByFeature.set(feature, (fileCountByFeature.get(feature) ?? 0) + 1)
    })
  })

  return Object.keys(mapping.features)
    .sort((left, right) => left.localeCompare(right))
    .map((feature) => ({
      feature,
      patterns: [...(mapping.features[feature] ?? [])],
      fileCount: fileCountByFeature.get(feature) ?? 0,
    }))
}

export async function getFeatureDetails(
  rootDir: string,
  featureName: string,
): Promise<FeatureDetails | undefined> {
  const mapping = await loadFeatureMapping(rootDir)
  const feature = findFeatureByQuery(mapping, featureName)
  if (!feature) {
    return undefined
  }

  const files = await readFilesIndexOrEmpty(rootDir)
  const matchedFiles = files
    .map((file) => normalizeFilePath(file))
    .filter((filePath) => resolveFeaturesForFilePath(mapping, filePath).includes(feature))
    .sort((left, right) => left.localeCompare(right))

  return {
    feature,
    patterns: [...(mapping.features[feature] ?? [])],
    files: matchedFiles,
  }
}

export async function assignFeaturePattern(
  rootDir: string,
  featureName: string,
  pattern: string,
): Promise<FeatureAssignResult> {
  const normalizedFeature = normalizeFeatureName(featureName)
  const normalizedPattern = normalizePattern(pattern)

  if (normalizedPattern.length === 0) {
    throw new FeatureMappingConfigError('Feature pattern must be a non-empty path pattern.')
  }

  const current = await loadFeatureMapping(rootDir)
  const existing = current.features[normalizedFeature] ?? []
  const duplicate = existing.includes(normalizedPattern)
  const nextPatterns = duplicate
    ? [...existing]
    : [...existing, normalizedPattern].sort((left, right) => left.localeCompare(right))

  const nextFeatures: Record<string, string[]> = {
    ...current.features,
    [normalizedFeature]: nextPatterns,
  }

  const sortedFeatures = sortFeatures(nextFeatures)
  await writeFeatureMapping(rootDir, sortedFeatures)

  return {
    configPath: FEATURES_RELATIVE_PATH.replaceAll('\\', '/'),
    feature: normalizedFeature,
    pattern: normalizedPattern,
    patterns: sortedFeatures[normalizedFeature] ?? [],
    created: !current.hasConfig,
    duplicate,
  }
}

export async function listUnmappedFiles(rootDir: string): Promise<UnmappedResult> {
  const mapping = await loadFeatureMapping(rootDir)
  const files = await readPersistedFilesIndex(rootDir)
  const unmappedFiles = files
    .map((filePath) => normalizeFilePath(filePath))
    .filter((filePath) => resolveFeaturesForFilePath(mapping, filePath).length === 0)
    .sort((left, right) => left.localeCompare(right))

  return {
    unmappedFiles,
  }
}

export async function suggestFeatureMappings(rootDir: string): Promise<FeatureSuggestionsResult> {
  const files = await readPersistedFilesIndex(rootDir)
  const normalizedFiles = files
    .map((filePath) => normalizeFilePath(filePath))
    .sort((left, right) => left.localeCompare(right))

  const clusterCount = new Map<string, number>()
  normalizedFiles.forEach((filePath) => {
    const cluster = toSuggestionCluster(filePath)
    if (!cluster) {
      return
    }

    clusterCount.set(cluster, (clusterCount.get(cluster) ?? 0) + 1)
  })

  const suggestions: FeatureSuggestion[] = [...clusterCount.entries()]
    .filter(([, count]) => count > 0)
    .map(([cluster, count]) => {
      const segments = cluster.split('/')
      const feature = normalizeFeatureName(segments[segments.length - 1] ?? cluster)

      return {
        feature,
        patterns: [`${cluster}/**`],
        fileCount: count,
      }
    })
    .sort((left, right) => {
      if (right.fileCount !== left.fileCount) {
        return right.fileCount - left.fileCount
      }

      return left.feature.localeCompare(right.feature)
    })

  const deduped = new Map<string, FeatureSuggestion>()
  suggestions.forEach((suggestion) => {
    const existing = deduped.get(suggestion.feature)
    if (!existing) {
      deduped.set(suggestion.feature, suggestion)
      return
    }

    if (suggestion.fileCount > existing.fileCount) {
      deduped.set(suggestion.feature, suggestion)
    }
  })

  return {
    suggestions: [...deduped.values()].sort((left, right) => left.feature.localeCompare(right.feature)),
  }
}

function parseAndValidate(content: string, configPath: string): Record<string, string[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new FeatureMappingConfigError(
      `Invalid JSON in ${configPath}. Ensure it is valid JSON object syntax.`,
    )
  }

  if (!isObjectRecord(parsed)) {
    throw new FeatureMappingConfigError(
      `Invalid feature mapping in ${configPath}. Expected an object of string arrays.`,
    )
  }

  const featureToPatterns = new Map<string, Set<string>>()

  Object.entries(parsed).forEach(([rawFeature, rawPatterns]) => {
    if (!Array.isArray(rawPatterns) || rawPatterns.some((value) => typeof value !== 'string')) {
      throw new FeatureMappingConfigError(
        `Invalid feature mapping for "${rawFeature}" in ${configPath}. Expected an array of strings.`,
      )
    }

    const feature = normalizeFeatureName(rawFeature)
    const existingPatterns = featureToPatterns.get(feature) ?? new Set<string>()
    rawPatterns.forEach((value) => {
      const pattern = normalizePattern(value)
      if (pattern.length > 0) {
        existingPatterns.add(pattern)
      }
    })

    featureToPatterns.set(feature, existingPatterns)
  })

  return sortFeatures(
    [...featureToPatterns.entries()].reduce<Record<string, string[]>>((accumulator, [feature, patterns]) => {
      accumulator[feature] = [...patterns]
      return accumulator
    }, {}),
  )
}

async function writeFeatureMapping(
  rootDir: string,
  features: Record<string, string[]>,
): Promise<void> {
  const configPath = path.join(rootDir, FEATURES_RELATIVE_PATH)
  await mkdir(path.dirname(configPath), { recursive: true })

  const config: FeatureMappingConfig = {}
  Object.keys(features)
    .sort((left, right) => left.localeCompare(right))
    .forEach((feature) => {
      config[feature] = [...(features[feature] ?? [])].sort((left, right) => left.localeCompare(right))
    })

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
}

function sortFeatures(features: Record<string, string[]>): Record<string, string[]> {
  return Object.keys(features)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string[]>>((accumulator, feature) => {
      accumulator[feature] = [...(features[feature] ?? [])].sort((left, right) => left.localeCompare(right))
      return accumulator
    }, {})
}

function toSuggestionCluster(filePath: string): string | undefined {
  const segments = filePath.split('/').filter((segment) => segment.length > 0)
  if (segments.length < 2) {
    return undefined
  }

  if (isIgnoredRootSegment(segments[0] ?? '')) {
    return undefined
  }

  if (segments[0] === 'src' && segments.length >= 3) {
    if (segments[1] === 'features') {
      return `src/features/${segments[2]}`
    }

    if (segments[1] === 'app' && segments[2] === 'features' && segments.length >= 4) {
      return `src/app/features/${segments[3]}`
    }
  }

  if ((segments[0] === 'packages' || segments[0] === 'libs') && segments.length >= 2) {
    const candidate = segments[1]
    if (!isIgnoredFeatureSegment(candidate)) {
      return `${segments[0]}/${candidate}`
    }
  }

  if (segments.length >= 2 && !isIgnoredFeatureSegment(segments[0] ?? '') && !isIgnoredFeatureSegment(segments[1] ?? '')) {
    return `${segments[0]}/${segments[1]}`
  }

  return undefined
}

function isIgnoredRootSegment(segment: string): boolean {
  return segment === '.arch' || segment === 'node_modules' || segment === 'dist' || segment === 'coverage'
}

function isIgnoredFeatureSegment(segment: string): boolean {
  return (
    segment === 'src'
    || segment === 'app'
    || segment === 'test'
    || segment === 'tests'
    || segment === 'utils'
    || segment === 'shared'
    || segment === 'common'
  )
}

async function readFilesIndexOrEmpty(rootDir: string): Promise<string[]> {
  try {
    const files = await readPersistedFilesIndex(rootDir)
    return [...files].sort((left, right) => left.localeCompare(right))
  } catch (error) {
    if (isMissingFileError(error)) {
      return []
    }

    throw error
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMissingFileError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const withCode = error as { code?: unknown }
  return withCode.code === 'ENOENT'
}
