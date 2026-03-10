import type { ArchNode, GraphData, GraphMeta } from '@archkit/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeBuildCommand } from '../src/commands/build'
import { executeContextCommand } from '../src/commands/context'
import { executeDepsCommand } from '../src/commands/deps'
import {
  executeKnowledgeAddCommand, 
  executeKnowledgeListCommand, 
  executeKnowledgeSearchCommand, 
  executeKnowledgeShowCommand, 
} from '../src/commands/knowledge'
import { executeQueryCommand } from '../src/commands/query'
import { executeShowCommand } from '../src/commands/show'
import { executeStatsCommand } from '../src/commands/stats'
import { CliCommandError } from '../src/utils/command-output'

const {
  mockPersistGraph,
  mockReadGraphMeta,
  mockQuerySymbols,
  mockReadPersistedNodes,
  mockResolveSymbolInput,
  mockQueryDependencies,
  mockExtractSnippetForNode,
  mockAddKnowledgeEntry,
  mockListKnowledgeEntries,
  mockGetKnowledgeEntry,
  mockSearchKnowledgeEntries,
  mockParseRepository,
  mockCompileContext,
} = vi.hoisted(() => ({
  mockPersistGraph: vi.fn(),
  mockReadGraphMeta: vi.fn(),
  mockQuerySymbols: vi.fn(),
  mockReadPersistedNodes: vi.fn(),
  mockResolveSymbolInput: vi.fn(),
  mockQueryDependencies: vi.fn(),
  mockExtractSnippetForNode: vi.fn(),
  mockAddKnowledgeEntry: vi.fn(),
  mockListKnowledgeEntries: vi.fn(),
  mockGetKnowledgeEntry: vi.fn(),
  mockSearchKnowledgeEntries: vi.fn(),
  mockParseRepository: vi.fn(),
  mockCompileContext: vi.fn(),
}))

vi.mock('@archkit/graph', () => ({
  KNOWLEDGE_TYPES: ['decision', 'workaround', 'caveat', 'note', 'migration'],
  persistGraph: mockPersistGraph,
  readGraphMeta: mockReadGraphMeta,
  querySymbols: mockQuerySymbols,
  readPersistedNodes: mockReadPersistedNodes,
  resolveSymbolInput: mockResolveSymbolInput,
  queryDependencies: mockQueryDependencies,
  extractSnippetForNode: mockExtractSnippetForNode,
  addKnowledgeEntry: mockAddKnowledgeEntry,
  listKnowledgeEntries: mockListKnowledgeEntries,
  getKnowledgeEntry: mockGetKnowledgeEntry,
  searchKnowledgeEntries: mockSearchKnowledgeEntries,
}))

vi.mock('@archkit/parser-ts', () => ({
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

    mockQuerySymbols.mockResolvedValue({
      term: 'Auth',
      matches: [
        { name: 'Auth', nodeIds: [nodeB.id, nodeA.id, nodeA.id] },
      ],
    })
    mockReadPersistedNodes.mockResolvedValue([nodeA, nodeB])

    const result = await executeQueryCommand(' Auth ', '/repo')
    expect(result.term).toBe('Auth')
    expect(result.matches.map((match) => match.nodeId)).toEqual([nodeA.id, nodeB.id])
  })

  it('validates query input and graph-not-found mapping', async () => {
    await expect(executeQueryCommand('   ', '/repo')).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    mockQuerySymbols.mockRejectedValue(new Error('missing'))
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
      entrypoints: ['Auth.login'],
      files: ['src/a.ts'],
      paths: [['Auth.login']],
      snippets: [],
    })

    await expect(executeContextCommand(' auth ', '/repo')).resolves.toMatchObject({ query: 'auth' })
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
})
