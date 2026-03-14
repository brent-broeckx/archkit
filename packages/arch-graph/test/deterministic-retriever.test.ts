import type { ArchEdge, ArchNode } from '@archkit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runDeterministicRetrieval } from '../src/services/retrieval/deterministic-retriever'

const {
  mockReadPersistedNodes,
  mockReadPersistedEdges,
  mockReadPersistedSymbolsIndex,
  mockReadPersistedFilesIndex,
  mockLoadFeatureMapping,
  mockResolveFeaturesForFilePath,
} = vi.hoisted(() => ({
  mockReadPersistedNodes: vi.fn(),
  mockReadPersistedEdges: vi.fn(),
  mockReadPersistedSymbolsIndex: vi.fn(),
  mockReadPersistedFilesIndex: vi.fn(),
  mockLoadFeatureMapping: vi.fn(),
  mockResolveFeaturesForFilePath: vi.fn(),
}))

vi.mock('../src/services/persisted-read', () => ({
  readPersistedNodes: mockReadPersistedNodes,
  readPersistedEdges: mockReadPersistedEdges,
  readPersistedSymbolsIndex: mockReadPersistedSymbolsIndex,
  readPersistedFilesIndex: mockReadPersistedFilesIndex,
}))

vi.mock('../src/services/feature-mapping', () => ({
  loadFeatureMapping: mockLoadFeatureMapping,
  resolveFeaturesForFilePath: mockResolveFeaturesForFilePath,
}))

describe('deterministic-retriever', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scores exact, lexical, feature, and graph proximity evidence', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'function:src/auth/service.ts#AuthService',
        type: 'function',
        name: 'AuthService',
        filePath: 'src/auth/service.ts',
        loc: { startLine: 1, endLine: 10 },
        signature: 'authenticate user token',
      },
      {
        id: 'function:src/auth/controller.ts#login',
        type: 'function',
        name: 'login',
        filePath: 'src/auth/controller.ts',
        loc: { startLine: 1, endLine: 6 },
      },
      {
        id: 'file:src/auth/service.ts',
        type: 'file',
        name: 'service.ts',
        filePath: 'src/auth/service.ts',
        loc: { startLine: 1, endLine: 30 },
      },
    ]

    const edges: ArchEdge[] = [
      {
        from: 'function:src/auth/controller.ts#login',
        to: 'function:src/auth/service.ts#AuthService',
        type: 'calls',
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue(edges)
    mockReadPersistedSymbolsIndex.mockResolvedValue({
      AuthService: ['function:src/auth/service.ts#AuthService'],
      login: ['function:src/auth/controller.ts#login'],
    })
    mockReadPersistedFilesIndex.mockResolvedValue(['src/auth/service.ts', 'src/auth/controller.ts'])
    mockLoadFeatureMapping.mockResolvedValue({
      hasConfig: true,
      configPath: '.arch/features.json',
      features: {
        authentication: ['src/auth/**'],
      },
    })
    mockResolveFeaturesForFilePath.mockImplementation((_: unknown, filePath: string) =>
      filePath.includes('auth') ? ['authentication'] : [],
    )

    const result = await runDeterministicRetrieval('/repo', 'AuthService', 'symbol')

    expect(result.hasExactSymbolMatch).toBe(true)
    expect(result.results.length).toBeGreaterThan(0)
    expect(result.results[0].evidence.some((e) => e.type === 'exact_symbol_match')).toBe(true)
  })

  it('returns empty results with zero cluster score', async () => {
    mockReadPersistedNodes.mockResolvedValue([])
    mockReadPersistedEdges.mockResolvedValue([])
    mockReadPersistedSymbolsIndex.mockResolvedValue({})
    mockReadPersistedFilesIndex.mockResolvedValue([])
    mockLoadFeatureMapping.mockResolvedValue({ hasConfig: false, configPath: '.arch/features.json', features: {} })
    mockResolveFeaturesForFilePath.mockReturnValue([])

    const result = await runDeterministicRetrieval('/repo', 'x', 'conceptual')

    expect(result.results).toEqual([])
    expect(result.clusterScore).toBe(0)
    expect(result.hasExactSymbolMatch).toBe(false)
  })
})
