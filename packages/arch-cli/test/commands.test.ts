import type { ArchNode, GraphData, GraphMeta } from '@archkit/core'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { FeatureMappingConfigError } from '@archkit/graph'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeBuildCommand } from '../src/commands/build'
import { executeContextCommand } from '../src/commands/context'
import { executeDeadCodeCommand } from '../src/commands/dead-code'
import { executeDepsCommand } from '../src/commands/deps'
import {
  executeFeatureAssignCommand,
  executeFeatureShowCommand,
  executeFeatureUnmappedCommand,
  executeFeaturesListCommand,
  executeFeaturesSuggestCommand,
  runFeatureAssignCommand,
  runFeatureShowCommand,
  runFeatureUnmappedCommand,
  runFeaturesListCommand,
  runFeaturesSuggestCommand,
} from '../src/commands/feature'
import {
  executeKnowledgeAddCommand, 
  executeKnowledgeListCommand, 
  executeKnowledgeSearchCommand, 
  executeKnowledgeShowCommand, 
} from '../src/commands/knowledge'
import { executeInitCommand } from '../src/commands/init'
import { executeQueryCommand } from '../src/commands/query'
import { executeShowCommand } from '../src/commands/show'
import { executeStatsCommand } from '../src/commands/stats'
import { CliCommandError } from '../src/utils/command-output'

const {
  mockPersistGraph,
  mockReadGraphMeta,
  mockExecuteHybridRetrieval,
  mockReadPersistedNodes,
  mockResolveSymbolInput,
  mockQueryDependencies,
  mockQueryDeadCode,
  mockExtractSnippetForNode,
  mockAddKnowledgeEntry,
  mockListKnowledgeEntries,
  mockGetKnowledgeEntry,
  mockSearchKnowledgeEntries,
  mockLoadFeatureMapping,
  mockListFeatureSummaries,
  mockSuggestFeatureMappings,
  mockGetFeatureDetails,
  mockAssignFeaturePattern,
  mockListUnmappedFiles,
  mockParseRepository,
  mockCompileContext,
} = vi.hoisted(() => ({
  mockPersistGraph: vi.fn(),
  mockReadGraphMeta: vi.fn(),
  mockExecuteHybridRetrieval: vi.fn(),
  mockReadPersistedNodes: vi.fn(),
  mockResolveSymbolInput: vi.fn(),
  mockQueryDependencies: vi.fn(),
  mockQueryDeadCode: vi.fn(),
  mockExtractSnippetForNode: vi.fn(),
  mockAddKnowledgeEntry: vi.fn(),
  mockListKnowledgeEntries: vi.fn(),
  mockGetKnowledgeEntry: vi.fn(),
  mockSearchKnowledgeEntries: vi.fn(),
  mockLoadFeatureMapping: vi.fn(),
  mockListFeatureSummaries: vi.fn(),
  mockSuggestFeatureMappings: vi.fn(),
  mockGetFeatureDetails: vi.fn(),
  mockAssignFeaturePattern: vi.fn(),
  mockListUnmappedFiles: vi.fn(),
  mockParseRepository: vi.fn(),
  mockCompileContext: vi.fn(),
}))

vi.mock('@archkit/graph', () => ({
  KNOWLEDGE_TYPES: ['decision', 'workaround', 'caveat', 'note', 'migration'],
  FeatureMappingConfigError: class FeatureMappingConfigError extends Error {},
  persistGraph: mockPersistGraph,
  readGraphMeta: mockReadGraphMeta,
  executeHybridRetrieval: mockExecuteHybridRetrieval,
  readPersistedNodes: mockReadPersistedNodes,
  resolveSymbolInput: mockResolveSymbolInput,
  queryDependencies: mockQueryDependencies,
  queryDeadCode: mockQueryDeadCode,
  extractSnippetForNode: mockExtractSnippetForNode,
  loadFeatureMapping: mockLoadFeatureMapping,
  listFeatureSummaries: mockListFeatureSummaries,
  suggestFeatureMappings: mockSuggestFeatureMappings,
  getFeatureDetails: mockGetFeatureDetails,
  assignFeaturePattern: mockAssignFeaturePattern,
  listUnmappedFiles: mockListUnmappedFiles,
  addKnowledgeEntry: mockAddKnowledgeEntry,
  listKnowledgeEntries: mockListKnowledgeEntries,
  getKnowledgeEntry: mockGetKnowledgeEntry,
  searchKnowledgeEntries: mockSearchKnowledgeEntries,
}))

vi.mock('@archkit/parser-ts', () => ({
  ARCHIGNORE_DEFAULT_CONTENT: '# test\ncoverage/\nnode_modules/\n',
  TypeScriptParser: vi.fn().mockImplementation(() => ({
    parseRepository: mockParseRepository,
  })),
}))

vi.mock('@archkit/context', () => ({
  ContextCompiler: vi.fn().mockImplementation(() => ({
    compile: mockCompileContext,
  })),
}))

describe('cli execute commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('executes build and stats commands', async () => {
    const graphData: GraphData = { nodes: [], edges: [] }
    const meta: GraphMeta = {
      files: 1,
      symbols: 2,
      edges: 3,
      nodeTypeCounts: { file: 1, class: 0, method: 1, function: 1, interface: 0, type: 0, route: 0 },
    }

    mockParseRepository.mockReturnValue(graphData)
    mockPersistGraph.mockResolvedValue({ graphDir: '/repo/.arch/graph', indexDir: '/repo/.arch/index', meta })
    mockReadGraphMeta.mockResolvedValue(meta)

    await expect(executeBuildCommand('.', '/repo')).resolves.toEqual({ repoPath: '.', meta })
    await expect(executeStatsCommand('.', '/repo')).resolves.toEqual({ repoPath: '.', meta })
  })

  it('maps stats read errors to GRAPH_NOT_FOUND', async () => {
    mockReadGraphMeta.mockRejectedValue(new Error('missing'))

    await expect(executeStatsCommand('.', '/repo')).rejects.toMatchObject({
      code: 'GRAPH_NOT_FOUND',
    })
  })

  it('executes init command and creates .arch/.archignore idempotently', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'arch-cli-init-'))

    const first = await executeInitCommand('.', tempRoot)
    expect(first).toMatchObject({
      repoPath: '.',
      archDir: '.arch',
      archIgnorePath: '.arch/.archignore',
      archConfigPath: '.arch/arch.conf',
      createdArchDir: true,
      createdArchIgnore: true,
      createdArchConfig: true,
    })

    const archIgnoreContent = await readFile(path.join(tempRoot, '.arch', '.archignore'), 'utf-8')
    const archConfigContent = await readFile(path.join(tempRoot, '.arch', 'arch.conf'), 'utf-8')
    expect(archIgnoreContent).toContain('coverage/')
    expect(archIgnoreContent).toContain('node_modules/')
    expect(archConfigContent).toContain('"semantic"')
    expect(archConfigContent).toContain('"provider": "fallback"')

    const second = await executeInitCommand('.', tempRoot)
    expect(second).toMatchObject({
      createdArchDir: false,
      createdArchIgnore: false,
      createdArchConfig: false,
    })
  })

  it('executes query command and deduplicates sorted matches', async () => {
    const nodeA: ArchNode = {
      id: 'class:src/a.ts#Auth',
      type: 'class',
      name: 'Auth',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 2 },
    }
    const nodeB: ArchNode = {
      id: 'method:src/a.ts#Auth.login',
      type: 'method',
      name: 'Auth.login',
      filePath: 'src/a.ts',
      loc: { startLine: 3, endLine: 4 },
    }

    mockExecuteHybridRetrieval.mockResolvedValue({
      query: 'Auth',
      mode: 'hybrid',
      retrievalMetadata: {
        query: 'Auth',
        mode: 'hybrid',
        queryType: 'symbol',
        deterministicConfidence: 0.9,
        lexicalUsed: false,
        semanticUsed: false,
        reason: [],
      },
      results: [
        {
          id: nodeB.id,
          kind: 'symbol',
          name: nodeB.name,
          path: nodeB.filePath,
          nodeIds: [nodeB.id],
          score: 120,
          deterministicScore: 120,
          scoreBreakdown: {
            exactScore: 100,
            featureScore: 0,
            graphScore: 0,
            lexicalScore: 20,
            semanticScore: 0,
            totalScore: 120,
          },
          evidence: [],
        },
        {
          id: nodeA.id,
          kind: 'symbol',
          name: nodeA.name,
          path: nodeA.filePath,
          nodeIds: [nodeA.id, nodeA.id],
          score: 100,
          deterministicScore: 100,
          scoreBreakdown: {
            exactScore: 100,
            featureScore: 0,
            graphScore: 0,
            lexicalScore: 0,
            semanticScore: 0,
            totalScore: 100,
          },
          evidence: [],
        },
      ],
    })
    mockReadPersistedNodes.mockResolvedValue([nodeA, nodeB])

    const result = await executeQueryCommand(' Auth ', '/repo')
    expect(result.term).toBe('Auth')
    expect(result.matches.map((match) => match.nodeId)).toEqual([nodeA.id, nodeB.id])
    expect(result.retrievalMetadata?.queryType).toBe('symbol')
  })

  it('validates query input and graph-not-found mapping', async () => {
    await expect(executeQueryCommand('   ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    mockExecuteHybridRetrieval.mockRejectedValue(new Error('missing'))
    mockReadPersistedNodes.mockResolvedValue([])
    await expect(executeQueryCommand('x', '/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('executes deps command and handles ambiguous/not-found/input errors', async () => {
    const selectedNode: ArchNode = {
      id: 'method:src/a.ts#Auth.login',
      type: 'method',
      name: 'Auth.login',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 2 },
    }

    mockResolveSymbolInput.mockResolvedValue({ input: 'Auth.login', nodes: [selectedNode] })
    mockQueryDependencies.mockResolvedValue({
      input: 'Auth.login',
      resolvedNodeIds: [selectedNode.id],
      imports: [],
      calls: ['generateToken'],
      callers: [],
    })

    await expect(executeDepsCommand('Auth.login', '/repo')).resolves.toMatchObject({ calls: ['generateToken'] })
    await expect(executeDepsCommand('', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    mockResolveSymbolInput.mockResolvedValueOnce({ input: 'x', nodes: [] })
    await expect(executeDepsCommand('x', '/repo')).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' })

    mockResolveSymbolInput.mockResolvedValueOnce({ input: 'x', nodes: [selectedNode, { ...selectedNode, id: 'method:src/b.ts#Auth.login' }] })
    await expect(executeDepsCommand('x', '/repo')).rejects.toMatchObject({ code: 'SYMBOL_AMBIGUOUS' })

    mockResolveSymbolInput.mockRejectedValueOnce(new Error('missing'))
    await expect(executeDepsCommand('x', '/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('executes dead-code command and maps missing graph errors', async () => {
    mockQueryDeadCode.mockResolvedValue({
      functions: ['createLegacyToken'],
      methods: ['AuthService.legacyLogin'],
      classes: ['LegacyPaymentProcessor'],
      files: ['src/legacy/auth.ts'],
    })

    await expect(executeDeadCodeCommand('/repo')).resolves.toEqual({
      functions: ['createLegacyToken'],
      methods: ['AuthService.legacyLogin'],
      classes: ['LegacyPaymentProcessor'],
      files: ['src/legacy/auth.ts'],
    })

    mockQueryDeadCode.mockRejectedValueOnce(new Error('missing'))
    await expect(executeDeadCodeCommand('/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('executes show command and handles symbol branches', async () => {
    const node: ArchNode = {
      id: 'function:src/a.ts#run',
      type: 'function',
      name: 'run',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 2 },
    }

    mockResolveSymbolInput.mockResolvedValue({ input: 'run', nodes: [node] })
    mockExtractSnippetForNode.mockResolvedValue('const run = () => 1')
    await expect(executeShowCommand('run', '/repo')).resolves.toMatchObject({ snippet: 'const run = () => 1' })

    await expect(executeShowCommand(' ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    mockResolveSymbolInput.mockResolvedValueOnce({ input: 'x', nodes: [] })
    await expect(executeShowCommand('x', '/repo')).rejects.toMatchObject({ code: 'SYMBOL_NOT_FOUND' })

    mockResolveSymbolInput.mockResolvedValueOnce({ input: 'x', nodes: [node, { ...node, id: 'function:src/b.ts#run' }] })
    await expect(executeShowCommand('x', '/repo')).rejects.toMatchObject({ code: 'SYMBOL_AMBIGUOUS' })

    mockResolveSymbolInput.mockRejectedValueOnce(new Error('missing'))
    await expect(executeShowCommand('x', '/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('executes context command and maps compiler errors', async () => {
    mockCompileContext.mockResolvedValue({
      query: 'auth',
      resolution: { kind: 'query' },
      entrypoints: ['Auth.login'],
      files: ['src/a.ts'],
      paths: [['Auth.login']],
      snippets: [],
    })

    await expect(executeContextCommand(' auth ', '/repo')).resolves.toMatchObject({ query: 'auth' })
    expect(mockCompileContext).toHaveBeenCalledWith('/repo', {
      query: 'auth',
      limits: false,
      mode: 'hybrid',
    })
    await expect(executeContextCommand(' auth ', '/repo', true)).resolves.toMatchObject({ query: 'auth' })
    expect(mockCompileContext).toHaveBeenCalledWith('/repo', {
      query: 'auth',
      limits: true,
      mode: 'hybrid',
    })
    await expect(executeContextCommand(' ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    mockCompileContext.mockRejectedValueOnce(new Error('missing'))
    await expect(executeContextCommand('x', '/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('executes knowledge command flows and errors', async () => {
    const entry = {
      id: 'kb-id',
      title: 'Title',
      type: 'note' as const,
      feature: 'auth',
      tags: ['a'],
      createdAt: '2026-03-10',
      file: '.arch/knowledge/entries/auth/2026-03-10_kb-id.md',
      body: 'Body',
    }

    mockAddKnowledgeEntry.mockResolvedValue(entry)
    await expect(
      executeKnowledgeAddCommand({ type: 'NOTE', title: ' Title ', body: ' Body ', tags: 'a, b, , c' }, '/repo'),
    ).resolves.toMatchObject({ action: 'add', entry })

    await expect(executeKnowledgeAddCommand({ type: 'x', title: 't', body: 'b' }, '/repo')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })

    await expect(executeKnowledgeAddCommand({ type: 'note', title: ' ', body: 'b' }, '/repo')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })

    mockAddKnowledgeEntry.mockRejectedValueOnce(new Error('already exists'))
    await expect(executeKnowledgeAddCommand({ type: 'note', title: 't', body: 'b' }, '/repo')).rejects.toMatchObject({
      code: 'KNOWLEDGE_EXISTS',
    })

    mockAddKnowledgeEntry.mockRejectedValueOnce(new Error('boom'))
    await expect(executeKnowledgeAddCommand({ type: 'note', title: 't', body: 'b' }, '/repo')).rejects.toMatchObject({
      code: 'COMMAND_FAILED',
    })

    mockListKnowledgeEntries.mockResolvedValue([{ ...entry, body: undefined }])
    await expect(executeKnowledgeListCommand('/repo')).resolves.toMatchObject({ action: 'list' })

    mockListKnowledgeEntries.mockRejectedValueOnce(new Error('boom'))
    await expect(executeKnowledgeListCommand('/repo')).rejects.toMatchObject({ code: 'COMMAND_FAILED' })

    mockGetKnowledgeEntry.mockResolvedValue(entry)
    await expect(executeKnowledgeShowCommand(' KB-ID ', '/repo')).resolves.toMatchObject({ action: 'show' })

    await expect(executeKnowledgeShowCommand(' ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    mockGetKnowledgeEntry.mockResolvedValueOnce(undefined)
    await expect(executeKnowledgeShowCommand('unknown', '/repo')).rejects.toMatchObject({ code: 'KNOWLEDGE_NOT_FOUND' })

    mockGetKnowledgeEntry.mockRejectedValueOnce(new Error('boom'))
    await expect(executeKnowledgeShowCommand('x', '/repo')).rejects.toMatchObject({ code: 'COMMAND_FAILED' })

    mockSearchKnowledgeEntries.mockResolvedValue([{ ...entry, body: undefined }])
    await expect(executeKnowledgeSearchCommand(' auth ', '/repo')).resolves.toMatchObject({ action: 'search', query: 'auth' })

    await expect(executeKnowledgeSearchCommand(' ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })

    mockSearchKnowledgeEntries.mockRejectedValueOnce(new Error('boom'))
    await expect(executeKnowledgeSearchCommand('x', '/repo')).rejects.toMatchObject({ code: 'COMMAND_FAILED' })
  })

  it('preserves CliCommandError instances', async () => {
    const cliError = new CliCommandError('SYMBOL_NOT_FOUND', 'missing')
    mockResolveSymbolInput.mockRejectedValueOnce(cliError)

    await expect(executeShowCommand('x', '/repo')).rejects.toBe(cliError)
  })

  it('executes feature list/suggest/show/assign/unmapped flows and errors', async () => {
    mockLoadFeatureMapping.mockResolvedValue({
      hasConfig: true,
      configPath: '.arch/features.json',
      features: { authentication: ['src/auth/**'] },
    })
    mockListFeatureSummaries.mockResolvedValue([
      { feature: 'authentication', patterns: ['src/auth/**'], fileCount: 2 },
    ])

    await expect(executeFeaturesListCommand('/repo')).resolves.toEqual({
      action: 'list',
      hasConfig: true,
      configPath: '.arch/features.json',
      features: [{ feature: 'authentication', patterns: ['src/auth/**'], fileCount: 2 }],
    })

    mockSuggestFeatureMappings.mockResolvedValue({
      suggestions: [{ feature: 'auth', patterns: ['src/features/auth/**'], fileCount: 3 }],
    })

    await expect(executeFeaturesSuggestCommand('/repo')).resolves.toEqual({
      action: 'suggest',
      suggestions: [{ feature: 'auth', patterns: ['src/features/auth/**'], fileCount: 3 }],
    })

    mockGetFeatureDetails.mockResolvedValue({
      feature: 'authentication',
      patterns: ['src/auth/**'],
      files: ['src/auth/service.ts'],
    })

    await expect(executeFeatureShowCommand(' authentication ', '/repo')).resolves.toEqual({
      action: 'show',
      hasConfig: true,
      configPath: '.arch/features.json',
      feature: {
        feature: 'authentication',
        patterns: ['src/auth/**'],
        files: ['src/auth/service.ts'],
      },
    })

    mockAssignFeaturePattern.mockResolvedValue({
      configPath: '.arch/features.json',
      feature: 'authentication',
      pattern: 'src/auth/**',
      patterns: ['src/auth/**'],
      created: true,
      duplicate: false,
    })

    await expect(executeFeatureAssignCommand('authentication', 'src/auth/**', '/repo')).resolves.toEqual({
      action: 'assign',
      assignment: {
        configPath: '.arch/features.json',
        feature: 'authentication',
        pattern: 'src/auth/**',
        patterns: ['src/auth/**'],
        created: true,
        duplicate: false,
      },
    })

    mockListUnmappedFiles.mockResolvedValue({ unmappedFiles: ['src/shared/date.ts'] })
    await expect(executeFeatureUnmappedCommand('/repo')).resolves.toEqual({
      action: 'unmapped',
      hasConfig: true,
      configPath: '.arch/features.json',
      unmappedFiles: ['src/shared/date.ts'],
    })

    await expect(executeFeatureShowCommand(' ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    mockGetFeatureDetails.mockResolvedValueOnce(undefined)
    await expect(executeFeatureShowCommand('unknown', '/repo')).rejects.toMatchObject({ code: 'FEATURE_NOT_FOUND' })
    await expect(executeFeatureAssignCommand(' ', 'src/auth/**', '/repo')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })

    mockListFeatureSummaries.mockRejectedValueOnce(new Error('boom'))
    await expect(executeFeaturesListCommand('/repo')).rejects.toMatchObject({ code: 'COMMAND_FAILED' })

    mockSuggestFeatureMappings.mockRejectedValueOnce({ code: 'ENOENT' })
    await expect(executeFeaturesSuggestCommand('/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })

    mockGetFeatureDetails.mockRejectedValueOnce(new Error('boom'))
    await expect(executeFeatureShowCommand('authentication', '/repo')).rejects.toMatchObject({
      code: 'COMMAND_FAILED',
    })

    mockAssignFeaturePattern.mockRejectedValueOnce(
      new FeatureMappingConfigError('Feature pattern must be a non-empty path pattern.'),
    )
    await expect(executeFeatureAssignCommand('authentication', 'x', '/repo')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })

    mockListUnmappedFiles.mockRejectedValueOnce({ code: 'ENOENT' })
    await expect(executeFeatureUnmappedCommand('/repo')).rejects.toMatchObject({ code: 'GRAPH_NOT_FOUND' })
  })

  it('runs feature command wrappers with output options', async () => {
    mockLoadFeatureMapping.mockResolvedValue({
      hasConfig: true,
      configPath: '.arch/features.json',
      features: { authentication: ['src/auth/**'] },
    })
    mockListFeatureSummaries.mockResolvedValue([
      { feature: 'authentication', patterns: ['src/auth/**'], fileCount: 1 },
    ])
    mockSuggestFeatureMappings.mockResolvedValue({
      suggestions: [{ feature: 'auth', patterns: ['src/features/auth/**'], fileCount: 1 }],
    })
    mockGetFeatureDetails.mockResolvedValue({
      feature: 'authentication',
      patterns: ['src/auth/**'],
      files: ['src/auth/a.ts'],
    })
    mockAssignFeaturePattern.mockResolvedValue({
      configPath: '.arch/features.json',
      feature: 'authentication',
      pattern: 'src/auth/**',
      patterns: ['src/auth/**'],
      created: false,
      duplicate: false,
    })
    mockListUnmappedFiles.mockResolvedValue({ unmappedFiles: [] })

    await runFeaturesListCommand({ json: true })
    await runFeaturesSuggestCommand({ json: true })
    await runFeatureShowCommand('authentication', { json: true })
    await runFeatureAssignCommand('authentication', 'src/auth/**', { json: true })
    await runFeatureUnmappedCommand({ json: true })
  })
})
