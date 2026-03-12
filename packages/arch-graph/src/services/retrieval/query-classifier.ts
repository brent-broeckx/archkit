import type { QueryType } from '../../models/retrieval-types'

const CONCEPTUAL_VERBS = new Set([
  'handle',
  'check',
  'create',
  'build',
  'validate',
  'process',
  'authenticate',
  'authorize',
])

export function classifyQuery(query: string): QueryType {
  const normalized = query.trim()
  if (!normalized) {
    return 'conceptual'
  }

  const lower = normalized.toLocaleLowerCase()
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean)

  const looksPath =
    normalized.includes('/') ||
    normalized.includes('\\') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../') ||
    /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(normalized)

  const hasPascalCase = /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/.test(normalized)
  const hasCamelCase = /\b[a-z]+(?:[A-Z][a-z0-9]+)+\b/.test(normalized)
  const hasNamespaceLike = /[#.:]/.test(normalized)
  const isSingleToken = tokens.length <= 1

  const looksSymbol = hasPascalCase || hasCamelCase || hasNamespaceLike
  const looksConceptual =
    tokens.length > 1 ||
    tokens.some((token) => CONCEPTUAL_VERBS.has(token)) ||
    (tokens.length === 1 && tokens[0] === lower && tokens[0] === tokens[0].toLocaleLowerCase())

  if (looksPath && !looksSymbol) {
    return 'path'
  }

  if (looksSymbol && isSingleToken && !looksConceptual) {
    return 'symbol'
  }

  if (looksPath && looksSymbol) {
    return 'mixed'
  }

  if (looksSymbol && looksConceptual) {
    return 'mixed'
  }

  return 'conceptual'
}
