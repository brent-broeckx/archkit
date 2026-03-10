import { describe, expect, it } from 'vitest'
import {
  normalizeAddInput,
  normalizeFeature,
  normalizeTags,
  parseKnowledgeEntry,
  serializeKnowledgeEntry,
  toCreatedAtDate,
  toEntryRelativeFile,
  toKnowledgeId,
} from '../src/utils/knowledge-utils'

describe('knowledge-utils', () => {
  it('normalizes feature values into stable slugs', () => {
    expect(normalizeFeature(' Authentication Flow ')).toBe('authentication-flow')
    expect(normalizeFeature('***')).toBe('general')
  })

  it('normalizes tags by slugging, deduping and sorting', () => {
    expect(normalizeTags([' API ', 'api', 'Auth Flow', ''])).toEqual(['api', 'auth-flow'])
  })

  it('creates deterministic ids from titles', () => {
    expect(toKnowledgeId('OIDC clock skew issue')).toBe('oidc-clock-skew-issue')
  })

  it('returns provided date when format is valid', () => {
    expect(toCreatedAtDate('2026-03-10')).toBe('2026-03-10')
  })

  it('returns current-date format when date is invalid', () => {
    expect(toCreatedAtDate('invalid')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('builds entry relative file path', () => {
    expect(toEntryRelativeFile('auth', '2026-03-10', 'entry-id')).toBe('entries/auth/2026-03-10_entry-id.md')
  })

  it('serializes and parses an entry round-trip', () => {
    const input = {
      id: 'entry-id',
      title: 'Entry',
      type: 'note' as const,
      feature: 'auth',
      tags: ['a-tag', 'z-tag'],
      createdAt: '2026-03-10',
      file: 'entries/auth/2026-03-10_entry-id.md',
      body: 'Body text',
    }

    const parsed = parseKnowledgeEntry(serializeKnowledgeEntry(input), input.file)
    expect(parsed).toEqual(input)
  })

  it('normalizes add input', () => {
    const normalized = normalizeAddInput({
      type: 'decision',
      title: '  Keep deterministic order  ',
      body: '  because reproducibility  ',
      feature: ' Core Graph ',
      tags: [' Ordering ', 'ordering', 'Graph'],
      createdAt: '2026-01-01',
    })

    expect(normalized).toEqual({
      id: 'keep-deterministic-order',
      type: 'decision',
      title: 'Keep deterministic order',
      body: 'because reproducibility',
      feature: 'core-graph',
      tags: ['graph', 'ordering'],
      createdAt: '2026-01-01',
    })
  })
})
