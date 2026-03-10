import type { ArchEdge, ArchNode } from '@archkit/core'
import { describe, expect, it } from 'vitest'
import { addEdge, addNode, createParseState } from '../src/services/parse-state'

describe('parse-state', () => {
  it('initializes with discovered file set', () => {
    const state = createParseState('/repo', ['src/a.ts', 'src/b.ts'])

    expect(state.rootDir).toBe('/repo')
    expect(state.discoveredFilesSet.has('src/a.ts')).toBe(true)
    expect(state.discoveredFilesSet.has('src/b.ts')).toBe(true)
  })

  it('deduplicates nodes by node id', () => {
    const state = createParseState('/repo', [])
    const node: ArchNode = {
      id: 'function:src/a.ts#run',
      type: 'function',
      name: 'run',
      filePath: 'src/a.ts',
      loc: { startLine: 1, endLine: 2 },
    }

    addNode(state, node)
    addNode(state, { ...node })

    expect(state.nodes).toHaveLength(1)
  })

  it('deduplicates edges by deterministic edge key', () => {
    const state = createParseState('/repo', [])
    const edge: ArchEdge = {
      from: 'function:src/a.ts#run',
      to: 'function:src/b.ts#doWork',
      type: 'calls',
      filePath: 'src/a.ts',
      loc: { startLine: 9, endLine: 9 },
    }

    addEdge(state, edge)
    addEdge(state, { ...edge })

    expect(state.edges).toHaveLength(1)
  })
})
