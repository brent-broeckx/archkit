import type { ArchEdge, ArchNode } from '@archkit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextCompiler } from '../src/services/context-compiler'

const {
  mockReadPersistedNodes,
  mockReadPersistedEdges,
  mockResolveSymbolInput,
  mockQuerySymbols,
  mockLoadFeatureMapping,
  mockResolveFeatureForNodes,
} = vi.hoisted(() => ({
  mockReadPersistedNodes: vi.fn(),
  mockReadPersistedEdges: vi.fn(),
  mockResolveSymbolInput: vi.fn(),
  mockQuerySymbols: vi.fn(),
  mockLoadFeatureMapping: vi.fn(),
  mockResolveFeatureForNodes: vi.fn(),
}))

vi.mock('@archkit/graph', () => ({
  readPersistedNodes: mockReadPersistedNodes,
  readPersistedEdges: mockReadPersistedEdges,
  resolveSymbolInput: mockResolveSymbolInput,
  querySymbols: mockQuerySymbols,
  loadFeatureMapping: mockLoadFeatureMapping,
  resolveFeatureForNodes: mockResolveFeatureForNodes,
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
    mockLoadFeatureMapping.mockResolvedValue({ hasConfig: false, configPath: '.arch/features.json', features: {} })
    mockResolveFeatureForNodes.mockReturnValue(undefined)
    mockResolveSymbolInput.mockResolvedValue({ input: 'entry', nodes: [nodes[0]] })
    mockQuerySymbols.mockResolvedValue({
      term: 'entry',
      matches: [{ name: 'entry', nodeIds: [nodes[0].id] }],
    })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: ' entry ' })

    expect(result.query).toBe('entry')
    expect(result.resolution).toEqual({ kind: 'query' })
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
    mockLoadFeatureMapping.mockResolvedValue({ hasConfig: false, configPath: '.arch/features.json', features: {} })
    mockResolveFeatureForNodes.mockReturnValue(undefined)
    mockResolveSymbolInput.mockResolvedValue({ input: 'x', nodes: [] })
    mockQuerySymbols.mockResolvedValue({ term: 'x', matches: [] })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: 'x' })

    expect(result).toEqual({
      query: 'x',
      resolution: { kind: 'query' },
      entrypoints: [],
      files: [],
      paths: [],
      snippets: [],
    })
  })

  it('uses configured feature matches before symbol query fallback', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'function:src/auth/service.ts#login',
        type: 'function',
        name: 'login',
        filePath: 'src/auth/service.ts',
        loc: { startLine: 1, endLine: 6 },
      },
      {
        id: 'function:src/auth/service.ts#logout',
        type: 'function',
        name: 'logout',
        filePath: 'src/auth/service.ts',
        loc: { startLine: 8, endLine: 12 },
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue([])
    mockLoadFeatureMapping.mockResolvedValue({
      hasConfig: true,
      configPath: '.arch/features.json',
      features: { authentication: ['src/auth/**'] },
    })
    mockResolveFeatureForNodes.mockReturnValue({
      feature: 'authentication',
      matchedFilePaths: ['src/auth/service.ts'],
      matchedNodes: [...nodes],
    })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: 'authentication' })

    expect(result.resolution).toEqual({ kind: 'feature', feature: 'authentication' })
    expect(result.entrypoints).toEqual(['login', 'logout'])
    expect(mockResolveSymbolInput).not.toHaveBeenCalled()
    expect(mockQuerySymbols).not.toHaveBeenCalled()
  })

  it('balances feature entrypoints across matched files and uses higher feature limit', async () => {
    const nodes: ArchNode[] = [
      {
        id: 'function:packages/arch-cli/src/commands/build.ts#executeBuildCommand',
        type: 'function',
        name: 'executeBuildCommand',
        filePath: 'packages/arch-cli/src/commands/build.ts',
        loc: { startLine: 1, endLine: 10 },
      },
      {
        id: 'function:packages/arch-cli/src/commands/build.ts#runBuildCommand',
        type: 'function',
        name: 'runBuildCommand',
        filePath: 'packages/arch-cli/src/commands/build.ts',
        loc: { startLine: 12, endLine: 20 },
      },
      {
        id: 'function:packages/arch-cli/src/commands/context.ts#executeContextCommand',
        type: 'function',
        name: 'executeContextCommand',
        filePath: 'packages/arch-cli/src/commands/context.ts',
        loc: { startLine: 1, endLine: 10 },
      },
      {
        id: 'function:packages/arch-context/src/services/context-compiler.ts#ContextCompiler.compile',
        type: 'method',
        name: 'ContextCompiler.compile',
        filePath: 'packages/arch-context/src/services/context-compiler.ts',
        loc: { startLine: 20, endLine: 60 },
      },
      {
        id: 'function:packages/arch-context/src/services/context-compiler.ts#expandPaths',
        type: 'function',
        name: 'expandPaths',
        filePath: 'packages/arch-context/src/services/context-compiler.ts',
        loc: { startLine: 80, endLine: 140 },
      },
      {
        id: 'function:packages/arch-context/src/services/context-compiler.ts#rankNodes',
        type: 'function',
        name: 'rankNodes',
        filePath: 'packages/arch-context/src/services/context-compiler.ts',
        loc: { startLine: 62, endLine: 78 },
      },
    ]

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue([])
    mockLoadFeatureMapping.mockResolvedValue({
      hasConfig: true,
      configPath: '.arch/features.json',
      features: {
        command: ['packages/arch-cli/src/commands/**', 'packages/arch-context/src/services/**'],
      },
    })
    mockResolveFeatureForNodes.mockReturnValue({
      feature: 'command',
      matchedFilePaths: [
        'packages/arch-cli/src/commands/build.ts',
        'packages/arch-cli/src/commands/context.ts',
        'packages/arch-context/src/services/context-compiler.ts',
      ],
      matchedNodes: [...nodes],
    })

    const compiler = new ContextCompiler()
    const result = await compiler.compile('/repo', { query: 'command' })

    expect(result.resolution).toEqual({ kind: 'feature', feature: 'command' })
    expect(result.entrypoints.length).toBe(6)
    expect(result.entrypoints).toContain('executeBuildCommand')
    expect(result.entrypoints).toContain('executeContextCommand')
    expect(result.entrypoints).toContain('ContextCompiler.compile')
    expect(result.files).toContain('packages/arch-context/src/services/context-compiler.ts')
  })

  it('disables query-mode limits when limits is enabled', async () => {
    const nodes: ArchNode[] = Array.from({ length: 9 }).map((_, index) => ({
      id: `function:src/q.ts#fn${index + 1}`,
      type: 'function' as const,
      name: `fn${index + 1}`,
      filePath: 'src/q.ts',
      loc: { startLine: index + 1, endLine: index + 1 },
    }))

    mockReadPersistedNodes.mockResolvedValue(nodes)
    mockReadPersistedEdges.mockResolvedValue([])
    mockLoadFeatureMapping.mockResolvedValue({ hasConfig: false, configPath: '.arch/features.json', features: {} })
    mockResolveFeatureForNodes.mockReturnValue(undefined)
    mockResolveSymbolInput.mockResolvedValue({ input: 'fn', nodes: nodes })
    mockQuerySymbols.mockResolvedValue({
      term: 'fn',
      matches: [
        {
          name: 'fn',
          nodeIds: nodes.map((node) => node.id),
        },
      ],
    })

    const compiler = new ContextCompiler()
    const limited = await compiler.compile('/repo', { query: 'fn' })
    const unlimited = await compiler.compile('/repo', { query: 'fn', limits: true })

    expect(limited.entrypoints.length).toBe(5)
    expect(unlimited.entrypoints.length).toBe(9)
  })
})
