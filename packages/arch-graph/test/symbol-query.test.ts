import type { ArchNode } from '@arch/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { querySymbols, resolveSymbolInput } from '../src/services/symbol-query'

const { mockReadPersistedSymbolsIndex, mockReadPersistedNodes } = vi.hoisted(() => ({
  mockReadPersistedSymbolsIndex: vi.fn(),
  mockReadPersistedNodes: vi.fn(),
}))

vi.mock('../src/services/persisted-read', () => ({
  readPersistedSymbolsIndex: mockReadPersistedSymbolsIndex,
  readPersistedNodes: mockReadPersistedNodes,
}))

describe('symbol-query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries symbols by case-insensitive substring with sorted ids', async () => {
    mockReadPersistedSymbolsIndex.mockResolvedValue({
      ParseState: ['class:src/a.ts#ParseState', 'class:src/b.ts#ParseState'],
      parserFactory: ['function:src/a.ts#parserFactory'],
      ignored: ['function:src/c.ts#ignored'],
    })

    const result = await querySymbols('/repo', 'parsE')

    expect(result).toEqual({
      term: 'parsE',
      matches: [
        {
          name: 'parserFactory',
          nodeIds: ['function:src/a.ts#parserFactory'],
        },
        {
          name: 'ParseState',
          nodeIds: ['class:src/a.ts#ParseState', 'class:src/b.ts#ParseState'],
        },
      ],
    })
  })

  it('resolves exact node id first', async () => {
    const node: ArchNode = {
      id: 'function:src/a.ts#run',
      type: 'function',
      name: 'run',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 4 },
    }

    mockReadPersistedSymbolsIndex.mockResolvedValue({ run: ['function:src/a.ts#run'] })
    mockReadPersistedNodes.mockResolvedValue([node])

    const resolved = await resolveSymbolInput('/repo', 'function:src/a.ts#run')

    expect(resolved.nodes).toEqual([node])
  })

  it('falls back to case-insensitive symbol name lookup', async () => {
    const node: ArchNode = {
      id: 'class:src/a.ts#Parser',
      type: 'class',
      name: 'Parser',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 4 },
    }

    mockReadPersistedSymbolsIndex.mockResolvedValue({ Parser: [node.id] })
    mockReadPersistedNodes.mockResolvedValue([node])

    const resolved = await resolveSymbolInput('/repo', 'parser')

    expect(resolved.nodes).toEqual([node])
  })
})
