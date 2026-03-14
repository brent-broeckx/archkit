import { describe, expect, it } from 'vitest'
import { normalizeRetrievalQuery } from '../src/services/retrieval/query-normalizer'

describe('query-normalizer', () => {
  it('normalizes punctuation and expands aliases', () => {
    const normalized = normalizeRetrievalQuery('Authentication!!! login??')

    expect(normalized.tokens).toEqual(['authentication', 'login'])
    expect(normalized.expandedTokens).toContain('auth')
    expect(normalized.expandedTokens).toContain('jwt')
    expect(normalized.sqliteMatch).toContain('authentication*')
  })

  it('expands using feature mapping patterns', () => {
    const normalized = normalizeRetrievalQuery('payments', {
      hasConfig: true,
      configPath: '.arch/features.json',
      features: {
        payments: ['src/billing/**', 'src/checkout/**'],
      },
    })

    expect(normalized.expandedTokens).toContain('billing')
    expect(normalized.expandedTokens).toContain('checkout')
  })
})
