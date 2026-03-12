import type { ArchEdge, ArchNode } from '@archkit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryDeadCode } from '../src/services/dead-code-query'

const { mockReadPersistedNodes, mockReadPersistedEdges } = vi.hoisted(() => ({
  mockReadPersistedNodes: vi.fn(),
  mockReadPersistedEdges: vi.fn(),
}))

vi.mock('../src/services/persisted-read', () => ({
  readPersistedNodes: mockReadPersistedNodes,
  readPersistedEdges: mockReadPersistedEdges,
}))

describe('dead-code-query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects unreferenced symbols and files while excluding exported and route nodes', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'file:src/legacy/auth.ts',
        type: 'file',
        name: 'auth.ts',
        filePath: 'src/legacy/auth.ts',
        loc: { startLine: 1, endLine: 30 },
      },
      {
        id: 'file:src/auth/live.ts',
        type: 'file',
        name: 'live.ts',
        filePath: 'src/auth/live.ts',
        loc: { startLine: 1, endLine: 20 },
      },
      {
        id: 'function:src/legacy/auth.ts#createLegacyToken',
        type: 'function',
        name: 'createLegacyToken',
        filePath: 'src/legacy/auth.ts',
        loc: { startLine: 2, endLine: 5 },
      },
      {
        id: 'class:src/legacy/auth.ts#LegacyPaymentProcessor',
        type: 'class',
        name: 'LegacyPaymentProcessor',
        filePath: 'src/legacy/auth.ts',
        loc: { startLine: 7, endLine: 15 },
      },
      {
        id: 'method:src/legacy/auth.ts#LegacyPaymentProcessor.run',
        type: 'method',
        name: 'LegacyPaymentProcessor.run',
        filePath: 'src/legacy/auth.ts',
        loc: { startLine: 9, endLine: 12 },
      },
      {
        id: 'function:src/auth/live.ts#login',
        type: 'function',
        name: 'login',
        filePath: 'src/auth/live.ts',
        loc: { startLine: 2, endLine: 8 },
      },
      {
        id: 'function:src/auth/live.ts#publicApi',
        type: 'function',
        name: 'publicApi',
        filePath: 'src/auth/live.ts',
        loc: { startLine: 10, endLine: 14 },
        exported: true,
      },
      {
        id: 'route:src/auth/live.ts#GET_/health',
        type: 'route',
        name: 'GET /health',
        filePath: 'src/auth/live.ts',
        loc: { startLine: 16, endLine: 18 },
      },
    ]

    const edges: ArchEdge[] = [
      {
        from: 'function:src/auth/live.ts#login',
        to: 'function:src/auth/live.ts#login',
        type: 'references',
      },
      {
        from: 'file:src/auth/live.ts',
        to: 'file:src/auth/live.ts',
        type: 'imports',
        filePath: 'src/auth/live.ts',
      },
      {
        from: 'method:src/legacy/auth.ts#LegacyPaymentProcessor.run',
        to: 'function:src/auth/live.ts#login',
        type: 'calls',
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue(edges)

    await expect(queryDeadCode('/repo')).resolves.toEqual({
      functions: ['createLegacyToken'],
      methods: ['LegacyPaymentProcessor.run'],
      classes: ['LegacyPaymentProcessor'],
      files: ['src/legacy/auth.ts'],
    })
  })

  it('returns empty collections when no candidates are dead', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'file:src/live.ts',
        type: 'file',
        name: 'live.ts',
        filePath: 'src/live.ts',
        loc: { startLine: 1, endLine: 10 },
      },
      {
        id: 'function:src/live.ts#run',
        type: 'function',
        name: 'run',
        filePath: 'src/live.ts',
        loc: { startLine: 2, endLine: 5 },
      },
    ]

    const edges: ArchEdge[] = [
      {
        from: 'function:src/live.ts#run',
        to: 'function:src/live.ts#run',
        type: 'references',
      },
      {
        from: 'file:src/live.ts',
        to: 'file:src/live.ts',
        type: 'imports',
        filePath: 'src/live.ts',
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue(edges)

    await expect(queryDeadCode('/repo')).resolves.toEqual({
      functions: [],
      methods: [],
      classes: [],
      files: [],
    })
  })
})
