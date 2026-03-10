import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProgram } from '../src/program'

const {
  mockRunBuild,
  mockRunStats,
  mockRunQuery,
  mockRunDeps,
  mockRunShow,
  mockRunContext,
  mockRunKnowledgeAdd,
  mockRunKnowledgeList,
  mockRunKnowledgeShow,
  mockRunKnowledgeSearch,
  mockBanner,
} = vi.hoisted(() => ({
  mockRunBuild: vi.fn(),
  mockRunStats: vi.fn(),
  mockRunQuery: vi.fn(),
  mockRunDeps: vi.fn(),
  mockRunShow: vi.fn(),
  mockRunContext: vi.fn(),
  mockRunKnowledgeAdd: vi.fn(),
  mockRunKnowledgeList: vi.fn(),
  mockRunKnowledgeShow: vi.fn(),
  mockRunKnowledgeSearch: vi.fn(),
  mockBanner: vi.fn(),
}))

vi.mock('../src/commands/build', () => ({ runBuildCommand: mockRunBuild }))
vi.mock('../src/commands/stats', () => ({ runStatsCommand: mockRunStats }))
vi.mock('../src/commands/query', () => ({ runQueryCommand: mockRunQuery }))
vi.mock('../src/commands/deps', () => ({ runDepsCommand: mockRunDeps }))
vi.mock('../src/commands/show', () => ({ runShowCommand: mockRunShow }))
vi.mock('../src/commands/context', () => ({ runContextCommand: mockRunContext }))
vi.mock('../src/commands/knowledge', () => ({
  runKnowledgeAddCommand: mockRunKnowledgeAdd,
  runKnowledgeListCommand: mockRunKnowledgeList,
  runKnowledgeShowCommand: mockRunKnowledgeShow,
  runKnowledgeSearchCommand: mockRunKnowledgeSearch,
}))
vi.mock('../src/utils/output', () => ({ printCliBanner: mockBanner }))

describe('program', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes command actions to corresponding run handlers', async () => {
    const program = buildProgram()

    await program.parseAsync(['node', 'arch'])
    await program.parseAsync(['node', 'arch', 'build', 'repo', '--json'])
    await program.parseAsync(['node', 'arch', 'stats'])
    await program.parseAsync(['node', 'arch', 'query', 'Auth'])
    await program.parseAsync(['node', 'arch', 'deps', 'Auth.login'])
    await program.parseAsync(['node', 'arch', 'show', 'Auth.login'])
    await program.parseAsync(['node', 'arch', 'context', 'auth'])
    await program.parseAsync([
      'node',
      'arch',
      'knowledge',
      'add',
      '--type',
      'note',
      '--title',
      'T',
      '--body',
      'B',
      '--feature',
      'auth',
      '--tags',
      'a,b',
    ])
    await program.parseAsync(['node', 'arch', 'knowledge', 'list'])
    await program.parseAsync(['node', 'arch', 'knowledge', 'show', 'id-1'])
    await program.parseAsync(['node', 'arch', 'knowledge', 'search', 'auth'])

    expect(mockBanner).toHaveBeenCalledTimes(1)
    expect(mockRunBuild).toHaveBeenCalledWith('repo', expect.objectContaining({ json: true }))
    expect(mockRunStats).toHaveBeenCalled()
    expect(mockRunQuery).toHaveBeenCalledWith('Auth', expect.any(Object))
    expect(mockRunDeps).toHaveBeenCalledWith('Auth.login', expect.any(Object))
    expect(mockRunShow).toHaveBeenCalledWith('Auth.login', expect.any(Object))
    expect(mockRunContext).toHaveBeenCalledWith('auth', expect.any(Object))
    expect(mockRunKnowledgeAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'note', title: 'T', body: 'B' }))
    expect(mockRunKnowledgeList).toHaveBeenCalledTimes(1)
    expect(mockRunKnowledgeShow).toHaveBeenCalledWith('id-1', expect.any(Object))
    expect(mockRunKnowledgeSearch).toHaveBeenCalledWith('auth', expect.any(Object))
  })
})
