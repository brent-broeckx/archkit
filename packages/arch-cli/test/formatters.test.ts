import type { ArchNode, GraphMeta } from '@archkit/core'
import { describe, expect, it } from 'vitest'
import { formatBuildResult } from '../src/formatters/build'
import { formatContextResult } from '../src/formatters/context'
import { formatDeadCodeResult } from '../src/formatters/dead-code'
import { formatDepsResult } from '../src/formatters/deps'
import { formatFeatureResult } from '../src/formatters/feature'
import { formatInitResult } from '../src/formatters/init'
import { formatKnowledgeResult } from '../src/formatters/knowledge'
import { formatQueryResult } from '../src/formatters/query'
import { formatShowResult } from '../src/formatters/show'
import { formatStatsResult } from '../src/formatters/stats'

const meta: GraphMeta = {
  files: 2,
  symbols: 3,
  edges: 4,
  nodeTypeCounts: {
    file: 2,
    class: 1,
    method: 1,
    function: 1,
    interface: 0,
    type: 0,
    route: 0,
  },
}

describe('cli formatters', () => {
  it('formats build and stats results in json and human', () => {
    const buildHuman = formatBuildResult({ repoPath: '.', meta }, 'human')
    const buildJson = formatBuildResult({ repoPath: '.', meta }, 'json')
    const statsHuman = formatStatsResult({ repoPath: '.', meta }, 'human')
    const statsJson = formatStatsResult({ repoPath: '.', meta }, 'json')

    expect(buildHuman).toContain('Scanning repository...')
    expect(buildJson).toContain('"files": 2')
    expect(statsHuman).toContain('Repository Architecture')
    expect(statsJson).toContain('"edges": 4')
  })

  it('formats init result in human and json modes', () => {
    const initResult = {
      repoPath: '.',
      archDir: '.arch',
      archIgnorePath: '.arch/.archignore',
      archConfigPath: '.arch/arch.conf',
      createdArchDir: true,
      createdArchIgnore: false,
      createdArchConfig: true,
    }

    expect(formatInitResult(initResult, 'human')).toContain('Arch initialized')
    expect(JSON.parse(formatInitResult(initResult, 'json'))).toEqual(initResult)
  })

  it('formats query/deps/context in all output modes', () => {
    const queryResult = {
      term: 'auth',
      matches: [{ nodeId: 'method:src/a.ts#Auth.login', type: 'method' as const, name: 'Auth.login', file: 'src/a.ts' }],
      nextActions: [
        {
          tool: 'arch_show' as const,
          priority: 1,
          args: { target: 'Auth.login' },
          reason: 'Top-ranked symbol',
        },
      ],
    }
    const depsResult = {
      input: 'Auth.login',
      resolvedNodeIds: ['method:src/a.ts#Auth.login'],
      imports: ['src/lib.ts'],
      calls: ['generateToken'],
      callers: ['entry'],
      nextActions: [
        {
          tool: 'arch_show' as const,
          priority: 1,
          args: { target: 'generateToken' },
          reason: 'Strong connected node',
        },
      ],
    }
    const contextResult = {
      query: 'auth',
      resolution: { kind: 'feature' as const, feature: 'authentication' },
      entrypoints: ['Auth.login'],
      files: ['src/a.ts'],
      paths: [['Auth.login', 'generateToken']],
      snippets: [{ file: 'src/a.ts', symbol: 'Auth.login', startLine: 1, endLine: 4 }],
      nextActions: [
        {
          tool: 'arch_show' as const,
          priority: 1,
          args: { target: 'Auth.login' },
          reason: 'Representative entrypoint',
        },
      ],
    }

    expect(formatQueryResult(queryResult, 'human')).toContain('Matches')
    expect(formatQueryResult(queryResult, 'human')).toContain('Recommended next steps')
    expect(formatQueryResult(queryResult, 'llm')).toContain('# Query: auth')
    expect(formatDepsResult(depsResult, 'human')).toContain('Imports')
    expect(formatDepsResult(depsResult, 'llm')).toContain('## Recommended next steps')
    expect(formatDepsResult(depsResult, 'llm')).toContain('## Calls')
    expect(formatContextResult(contextResult, 'human')).toContain('Entrypoints')
    expect(formatContextResult(contextResult, 'llm')).toContain('## Recommended next steps')
    expect(formatContextResult(contextResult, 'human')).toContain('feature: authentication')
    expect(formatContextResult(contextResult, 'llm')).toContain('## Flow')
    expect(formatContextResult(contextResult, 'llm')).toContain('## Resolution')
  })

  it('formats dead-code result in all output modes and empty states', () => {
    const result = {
      functions: ['createLegacyToken'],
      methods: ['AuthService.legacyLogin'],
      classes: ['LegacyPaymentProcessor'],
      files: ['src/legacy/auth.ts'],
    }

    const human = formatDeadCodeResult(result, 'human')
    const llm = formatDeadCodeResult(result, 'llm')
    const json = formatDeadCodeResult(result, 'json')

    expect(human).toContain('Dead Code Detected')
    expect(human).toContain('Methods')
    expect(human).toContain('AuthService.legacyLogin')
    expect(llm).toContain('# Dead Code Detected')
    expect(llm).toContain('## Files')
    expect(JSON.parse(json)).toEqual(result)

    const emptyHuman = formatDeadCodeResult(
      { functions: [], methods: [], classes: [], files: [] },
      'human',
    )
    const emptyLlm = formatDeadCodeResult(
      { functions: [], methods: [], classes: [], files: [] },
      'llm',
    )

    expect(emptyHuman).toContain('  (none)')
    expect(emptyLlm).toContain('- none')
  })

  it('formats context empty states and query resolution branches', () => {
    const emptyContext = {
      query: 'token',
      resolution: { kind: 'query' as const },
      entrypoints: [],
      files: [],
      paths: [],
      snippets: [],
    }

    const human = formatContextResult(emptyContext, 'human')
    const llm = formatContextResult(emptyContext, 'llm')
    const json = formatContextResult(emptyContext, 'json')

    expect(human).toContain('query')
    expect(human).toContain('  (none)')
    expect(llm).toContain('- query')
    expect(llm).toContain('- none')
    expect(json).toContain('"resolution"')
  })

  it('formats show output with proper fence language and handles empty snippets', () => {
    const tsNode: ArchNode = {
      id: 'function:src/a.ts#run',
      type: 'function',
      name: 'run',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 2 },
    }
    const otherNode: ArchNode = {
      id: 'function:src/script.py#run',
      type: 'function',
      name: 'run',
      filePath: 'src/script.py',
      loc: { startLine: 10, endLine: 12 },
    }

    expect(
      formatShowResult(
        {
          input: 'run',
          node: tsNode,
          snippet: 'const x = 1',
          nextActions: [
            {
              tool: 'arch_deps',
              priority: 1,
              args: { target: 'run' },
              reason: 'Inspect graph neighborhood',
            },
          ],
        },
        'llm',
      ),
    ).toContain('## Recommended next steps')
    expect(formatShowResult({ input: 'run', node: otherNode, snippet: '' }, 'llm')).toContain('```\n```')
    expect(formatShowResult({ input: 'run', node: tsNode, snippet: 'const x = 1' }, 'json')).toContain('"code": "const x = 1"')
    expect(
      formatQueryResult(
        {
          term: 'auth',
          matches: [],
          nextActions: [
            {
              tool: 'arch_context',
              priority: 1,
              args: { query: 'auth' },
              reason: 'Broaden context',
            },
          ],
        },
        'json',
      ),
    ).toContain('"next_actions"')
  })

  it('formats knowledge results across actions and empty states', () => {
    const add = formatKnowledgeResult(
      {
        action: 'add',
        entry: {
          id: 'id-1',
          title: 'T',
          type: 'note',
          feature: 'f',
          tags: [],
          createdAt: '2026-03-10',
          file: '.arch/knowledge/entries/f/2026-03-10_id-1.md',
          body: 'Body',
        },
      },
      'human',
    )

    const list = formatKnowledgeResult({ action: 'list', entries: [] }, 'llm')
    const show = formatKnowledgeResult(
      {
        action: 'show',
        entry: {
          id: 'id-2',
          title: 'S',
          type: 'decision',
          feature: 'auth',
          tags: ['a', 'b'],
          createdAt: '2026-03-10',
          file: '.arch/knowledge/entries/auth/2026-03-10_id-2.md',
          body: 'Details',
        },
      },
      'llm',
    )
    const search = formatKnowledgeResult(
      { action: 'search', query: 'q', matches: [] },
      'human',
    )

    expect(add).toContain('Knowledge entry created')
    expect(list).toContain('- none')
    expect(show).toContain('## Notes')
    expect(search).toContain('(none)')
  })

  it('formats knowledge non-empty branches in human and llm modes', () => {
    const listHuman = formatKnowledgeResult(
      {
        action: 'list',
        entries: [
          {
            id: 'id-3',
            title: 'A',
            type: 'note',
            feature: 'billing',
            tags: [],
            createdAt: '2026-03-10',
            file: '.arch/knowledge/entries/billing/2026-03-10_id-3.md',
            body: 'Body A',
          },
          {
            id: 'id-4',
            title: 'B',
            type: 'decision',
            feature: 'auth',
            tags: [],
            createdAt: '2026-03-10',
            file: '.arch/knowledge/entries/auth/2026-03-10_id-4.md',
            body: 'Body B',
          },
        ],
      },
      'human',
    )

    const addLlm = formatKnowledgeResult(
      {
        action: 'add',
        entry: {
          id: 'id-5',
          title: 'Llm entry',
          type: 'note',
          feature: 'auth',
          tags: [],
          createdAt: '2026-03-10',
          file: '.arch/knowledge/entries/auth/2026-03-10_id-5.md',
          body: 'Details',
        },
      },
      'llm',
    )

    const showHumanNoTags = formatKnowledgeResult(
      {
        action: 'show',
        entry: {
          id: 'id-6',
          title: 'No tags',
          type: 'note',
          feature: 'platform',
          tags: [],
          createdAt: '2026-03-10',
          file: '.arch/knowledge/entries/platform/2026-03-10_id-6.md',
          body: 'Plain text',
        },
      },
      'human',
    )

    const searchLlm = formatKnowledgeResult(
      {
        action: 'search',
        query: 'auth',
        matches: [
          {
            id: 'id-7',
            title: 'Auth notes',
            type: 'note',
            feature: 'auth',
            tags: ['team'],
            createdAt: '2026-03-10',
            file: '.arch/knowledge/entries/auth/2026-03-10_id-7.md',
            body: 'Auth details',
          },
        ],
      },
      'llm',
    )

    expect(listHuman).toContain('auth')
    expect(listHuman).toContain('billing')
    expect(addLlm).toContain('# Knowledge Entry Created')
    expect(showHumanNoTags).not.toContain('Tags:')
    expect(searchLlm).toContain('id-7 (note, auth)')
  })

  it('formats feature command results across actions', () => {
    const listHuman = formatFeatureResult(
      {
        action: 'list',
        hasConfig: true,
        configPath: '.arch/features.json',
        features: [{ feature: 'authentication', patterns: ['src/auth/**'], fileCount: 2 }],
      },
      'human',
    )
    const suggestJson = formatFeatureResult(
      {
        action: 'suggest',
        suggestions: [{ feature: 'auth', patterns: ['src/features/auth/**'], fileCount: 3 }],
      },
      'json',
    )
    const showLlm = formatFeatureResult(
      {
        action: 'show',
        hasConfig: true,
        configPath: '.arch/features.json',
        feature: {
          feature: 'authentication',
          patterns: ['src/auth/**'],
          files: ['src/auth/service.ts'],
        },
      },
      'llm',
    )
    const unmappedHuman = formatFeatureResult(
      {
        action: 'unmapped',
        hasConfig: true,
        configPath: '.arch/features.json',
        unmappedFiles: ['src/shared/date.ts'],
      },
      'human',
    )
    const listLlmNoConfig = formatFeatureResult(
      {
        action: 'list',
        hasConfig: false,
        configPath: '.arch/features.json',
        features: [],
      },
      'llm',
    )
    const suggestHumanEmpty = formatFeatureResult(
      {
        action: 'suggest',
        suggestions: [],
      },
      'human',
    )
    const assignLlm = formatFeatureResult(
      {
        action: 'assign',
        assignment: {
          configPath: '.arch/features.json',
          feature: 'billing',
          pattern: 'packages/billing/**',
          patterns: ['packages/billing/**'],
          created: false,
          duplicate: true,
        },
      },
      'llm',
    )
    const unmappedLlm = formatFeatureResult(
      {
        action: 'unmapped',
        hasConfig: true,
        configPath: '.arch/features.json',
        unmappedFiles: [],
      },
      'llm',
    )
    const suggestHumanFilled = formatFeatureResult(
      {
        action: 'suggest',
        suggestions: [{ feature: 'orders', patterns: ['libs/orders/**'], fileCount: 4 }],
      },
      'human',
    )
    const showHuman = formatFeatureResult(
      {
        action: 'show',
        hasConfig: true,
        configPath: '.arch/features.json',
        feature: {
          feature: 'orders',
          patterns: [],
          files: [],
        },
      },
      'human',
    )
    const assignHuman = formatFeatureResult(
      {
        action: 'assign',
        assignment: {
          configPath: '.arch/features.json',
          feature: 'orders',
          pattern: 'libs/orders/**',
          patterns: ['libs/orders/**'],
          created: true,
          duplicate: false,
        },
      },
      'human',
    )

    expect(listHuman).toContain('Configured features')
    expect(suggestJson).toContain('"suggestions"')
    expect(showLlm).toContain('## Files')
    expect(unmappedHuman).toContain('Unmapped files')
    expect(listLlmNoConfig).toContain('No `.arch/features.json` file found.')
    expect(suggestHumanEmpty).toContain('(none)')
    expect(assignLlm).toContain('duplicate: yes')
    expect(unmappedLlm).toContain('- none')
    expect(suggestHumanFilled).toContain('orders')
    expect(showHuman).toContain('Patterns')
    expect(assignHuman).toContain('Feature pattern assigned')
  })
})
