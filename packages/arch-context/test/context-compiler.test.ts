import type { ArchEdge, ArchNode } from '@arch/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextCompiler } from '../src/services/context-compiler'

const { mockReadPersistedNodes, mockReadPersistedEdges, mockResolveSymbolInput, mockQuerySymbols } = vi.hoisted(() => ({
  mockReadPersistedNodes: vi.fn(),
  mockReadPersistedEdges: vi.fn(),
  mockResolveSymbolInput: vi.fn(),
  mockQuerySymbols: vi.fn(),
}))

vi.mock('@arch/graph', () => ({
  readPersistedNodes: mockReadPersistedNodes,
  readPersistedEdges: mockReadPersistedEdges,
  resolveSymbolInput: mockResolveSymbolInput,
  querySymbols: mockQuerySymbols,
}))

describe('context-compiler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compiles deterministic context bundles', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'function:src/a.ts#entry',
        type: 'function',
        name: 'entry',
        filePath: 'src/a.ts',
        loc: { startLine: 1, endLine: 4 },
      },
      {
        id: 'function:src/b.ts#next',
        type: 'function',
        name: 'next',
        filePath: 'src/b.ts',
        loc: { startLine: 2, endLine: 7 },
      },
    ]

    const edges: ArchEdge[] = [
      {
        from: 'function:src/a.ts#entry',
        to: 'function:src/b.ts#next',
        type: 'calls',
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue(edges)
    mockResolveSymbolInput.mockResolvedValue({ input: 'entry', nodes: [nodes[0]] })
    mockQuerySymbols.mockResolvedValue({
      term: 'entry',
      matches: [{ name: 'entry', nodeIds: [nodes[0].id] }],
    })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: ' entry ' })

    expect(result.query).toBe('entry')
    expect(result.entrypoints).toEqual(['entry'])
    expect(result.paths).toEqual([['entry', 'next']])
    expect(result.files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(result.snippets).toEqual([
      { file: 'src/a.ts', symbol: 'entry', startLine: 1, endLine: 4 },
      { file: 'src/b.ts', symbol: 'next', startLine: 2, endLine: 7 },
    ])
  })

  it('returns empty sections when no candidates exist', async () => {
    mockReadPersistedNodes.mockResolvedValue([])
    mockReadPersistedEdges.mockResolvedValue([])
    mockResolveSymbolInput.mockResolvedValue({ input: 'x', nodes: [] })
    mockQuerySymbols.mockResolvedValue({ term: 'x', matches: [] })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: 'x' })

    expect(result).toEqual({
      query: 'x',
      entrypoints: [],
      files: [],
      paths: [],
      snippets: [],
    })
  })
})
