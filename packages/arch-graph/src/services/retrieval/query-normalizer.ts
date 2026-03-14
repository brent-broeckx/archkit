import type { NormalizedFeatureMapping } from '../../models/feature-types'
import { RETRIEVAL_ALIASES } from './query-aliases'

export interface NormalizedQuery {
  original: string
  normalized: string
  tokens: string[]
  expandedTokens: string[]
  sqliteMatch: string
}

export function normalizeRetrievalQuery(
  query: string,
  featureMapping?: NormalizedFeatureMapping,
): NormalizedQuery {
  const normalized = query.trim().toLocaleLowerCase()
  const tokens = tokenize(normalized)
  const expanded = new Set<string>(tokens)

  tokens.forEach((token) => {
    ;(RETRIEVAL_ALIASES[token] ?? []).forEach((alias) => {
      tokenize(alias).forEach((part) => expanded.add(part))
    })
  })

  if (featureMapping) {
    const aliasesByFeature = new Map<string, string[]>()
    Object.entries(featureMapping.features).forEach(([featureName, patterns]) => {
      const featureTokens = tokenize(featureName)
      featureTokens.forEach((token) => {
        const existing = aliasesByFeature.get(token)
        const patternTokens = patterns.flatMap((pattern) => tokenize(pattern))
        aliasesByFeature.set(token, [...(existing ?? []), ...featureTokens, ...patternTokens])
      })
    })

    tokens.forEach((token) => {
      ;(aliasesByFeature.get(token) ?? []).forEach((alias) => {
        tokenize(alias).forEach((part) => expanded.add(part))
      })
    })
  }

  const expandedTokens = [...expanded].sort((left, right) => left.localeCompare(right))
  return {
    original: query,
    normalized,
    tokens,
    expandedTokens,
    sqliteMatch: toSqliteMatch(expandedTokens),
  }
}

function tokenize(value: string): string[] {
  return value
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function toSqliteMatch(tokens: string[]): string {
  if (tokens.length === 0) {
    return ''
  }

  return tokens.map((token) => `${escapeToken(token)}*`).join(' OR ')
}

function escapeToken(token: string): string {
  return token.replace(/"/g, '""')
}
