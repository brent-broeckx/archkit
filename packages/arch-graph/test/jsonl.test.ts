import { describe, expect, it } from 'vitest'
import { toJsonl } from '../src/utils/jsonl'

describe('jsonl', () => {
  it('returns empty string for empty input', () => {
    expect(toJsonl([])).toBe('')
  })

  it('serializes one object per line with trailing newline', () => {
    const result = toJsonl([{ id: 1 }, { id: 2 }])
    expect(result).toBe('{"id":1}\n{"id":2}\n')
  })
})
