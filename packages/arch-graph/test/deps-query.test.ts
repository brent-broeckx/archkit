import type { ArchEdge, ArchNode } from '@arch/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryDependencies } from '../src/services/deps-query'

const { mockReadPersistedNodes, mockReadPersistedEdges } = vi.hoisted(() => ({
  mockReadPersistedNodes: vi.fn(),
  mockReadPersistedEdges: vi.fn(),
}))

vi.mock('../src/services/persisted-read', () => ({
  readPersistedNodes: mockReadPersistedNodes,
  readPersistedEdges: mockReadPersistedEdges,
}))

describe('deps-query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expands class methods and resolves imports calls callers', async () => {
    const allNodes: ArchNode[] = [
      {
        id: 'file:src/a.ts',
        type: 'file',
        name: 'a.ts',
        filePath: 'src/a.ts',
        loc: { startLine: 1, endLine: 20 },
      },
      {
        id: 'file:src/lib.ts',
        type: 'file',
        name: 'lib.ts',
        filePath: 'src/lib.ts',
        loc: { startLine: 1, endLine: 10 },
      },
      {
        id: 'class:src/a.ts#AuthService',
        type: 'class',
        name: 'AuthService',
        filePath: 'src/a.ts',
        loc: { startLine: 2, endLine: 15 },
      },
      {
        id: 'method:src/a.ts#AuthService.login',
        type: 'method',
        name: 'AuthService.login',
        filePath: 'src/a.ts',
        loc: { startLine: 5, endLine: 8 },
      },
      {
        id: 'function:src/lib.ts#generateToken',
        type: 'function',
        name: 'generateToken',
        filePath: 'src/lib.ts',
        loc: { startLine: 1, endLine: 3 },
      },
      {
        id: 'function:src/b.ts#entry',
        type: 'function',
        name: 'entry',
        filePath: 'src/b.ts',
        loc: { startLine: 1, endLine: 3 },
      },
    ]

    const allEdges: ArchEdge[] = [
      {
        from: 'file:src/a.ts',
        to: 'file:src/lib.ts',
        type: 'imports',
        filePath: 'src/a.ts',
      },
      {
        from: 'method:src/a.ts#AuthService.login',
        to: 'function:src/lib.ts#generateToken',
        type: 'calls',
      },
      {
        from: 'function:src/b.ts#entry',
        to: 'method:src/a.ts#AuthService.login',
        type: 'calls',
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(allNodes)
    mockReadPersistedEdges.mockResolvedValue(allEdges)

    const selectedNodes: ArchNode[] = [allNodes[2]]
    const result = await queryDependencies('/repo', 'AuthService', selectedNodes)

    expect(result.resolvedNodeIds).toEqual([
      'class:src/a.ts#AuthService',
      'method:src/a.ts#AuthService.login',
    ])
    expect(result.imports).toEqual(['src/lib.ts'])
    expect(result.calls).toEqual(['generateToken'])
    expect(result.callers).toEqual(['entry'])
  })

  it('returns empty dependency sections for unmatched edges', async () => {
    const node: ArchNode = {
      id: 'function:src/a.ts#noop',
      type: 'function',
      name: 'noop',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 1 },
    }

    mockReadPersistedNodes.mockResolvedValue([node])
    mockReadPersistedEdges.mockResolvedValue([])

    const result = await queryDependencies('/repo', 'noop', [node])
    expect(result).toEqual({
      input: 'noop',
      resolvedNodeIds: ['function:src/a.ts#noop'],
      imports: [],
      calls: [],
      callers: [],
    })
  })
})
