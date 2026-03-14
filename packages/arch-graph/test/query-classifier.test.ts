import { describe, expect, it } from 'vitest'
import { classifyQuery } from '../src/services/retrieval/query-classifier'

describe('query-classifier', () => {
  it('classifies symbol-like and mixed symbol/conceptual queries', () => {
    expect(classifyQuery('AuthService')).toBe('mixed')
    expect(classifyQuery('LoginController.handle')).toBe('mixed')
    expect(classifyQuery('::')).toBe('symbol')
  })

  it('classifies path-like queries', () => {
    expect(classifyQuery('src/auth/token')).toBe('path')
    expect(classifyQuery('src/auth/token.ts')).toBe('mixed')
  })

  it('classifies conceptual queries', () => {
    expect(classifyQuery('authentication')).toBe('conceptual')
    expect(classifyQuery('error handling')).toBe('conceptual')
    expect(classifyQuery('auth token refresh')).toBe('conceptual')
  })
})
