import type { ArchNode } from '@archkit/core'

export interface FeatureMappingConfig {
  [featureName: string]: string[]
}

export interface NormalizedFeatureMapping {
  hasConfig: boolean
  configPath: string
  features: Record<string, string[]>
}

export interface FeatureMatchResult {
  filePath: string
  features: string[]
}

export interface FeatureSuggestion {
  feature: string
  patterns: string[]
  fileCount: number
}

export interface FeatureSummary {
  feature: string
  patterns: string[]
  fileCount: number
}

export interface FeatureDetails {
  feature: string
  patterns: string[]
  files: string[]
}

export interface FeatureAssignResult {
  configPath: string
  feature: string
  pattern: string
  patterns: string[]
  created: boolean
  duplicate: boolean
}

export interface FeatureSuggestionsResult {
  suggestions: FeatureSuggestion[]
}

export interface UnmappedResult {
  unmappedFiles: string[]
}

export interface FeatureResolution {
  feature: string
  matchedFilePaths: string[]
  matchedNodes: ArchNode[]
}
