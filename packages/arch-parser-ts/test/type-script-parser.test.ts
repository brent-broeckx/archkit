import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDir, removeTempDir } from '../../test-utils/temp-dir'
import { TypeScriptParser } from '../src/services/type-script-parser'

describe('type-script-parser', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => removeTempDir(dir)))
  })

  it('parses repository and extracts deterministic nodes/edges for symbols imports and calls', async () => {
    const rootDir = await createTempDir('ts-parser')
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'src'), { recursive: true })

    await writeFile(
      path.join(rootDir, 'src', 'lib.ts'),
      [
        'export function helper(): string {',
        "  return 'ok'",
        '}',
        '',
        'export interface AuthPayload {',
        '  token: string',
        '}',
        '',
        'export type AuthResult = AuthPayload & {',
        '  expiresAt: number',
        '}',
      ].join('\n'),
      'utf-8',
    )

    await writeFile(
      path.join(rootDir, 'src', 'service.ts'),
      [
        "import { helper } from './lib'",
        '',
        'export class AuthService {',
        '  login(): string {',
        '    this.logout()',
        '    return helper()',
        '  }',
        '',
        '  logout(): string {',
        "    return 'bye'",
        '  }',
        '}',
      ].join('\n'),
      'utf-8',
    )

    await writeFile(
      path.join(rootDir, 'src', 'entry.ts'),
      [
        "import { AuthService } from './service'",
        '',
        'export function boot(): string {',
        '  const service = new AuthService()',
        '  return service.login()',
        '}',
      ].join('\n'),
      'utf-8',
    )

    const parser = new TypeScriptParser()
    const graph = parser.parseRepository({ rootDir })

    const nodeIds = new Set(graph.nodes.map((node) => node.id))
    const edgeKeys = new Set(graph.edges.map((edge) => `${edge.type}:${edge.from}->${edge.to}`))

    expect(nodeIds.has('file:src/lib.ts')).toBe(true)
    expect(nodeIds.has('file:src/service.ts')).toBe(true)
    expect(nodeIds.has('file:src/entry.ts')).toBe(true)
    expect(nodeIds.has('function:src/lib.ts#helper')).toBe(true)
    expect(nodeIds.has('interface:src/lib.ts#AuthPayload')).toBe(true)
    expect(nodeIds.has('type:src/lib.ts#AuthResult')).toBe(true)
    expect(nodeIds.has('class:src/service.ts#AuthService')).toBe(true)
    expect(nodeIds.has('method:src/service.ts#AuthService.login')).toBe(true)
    expect(nodeIds.has('method:src/service.ts#AuthService.logout')).toBe(true)
    expect(nodeIds.has('function:src/entry.ts#boot')).toBe(true)

    expect(edgeKeys.has('imports:file:src/service.ts->file:src/lib.ts')).toBe(true)
    expect(edgeKeys.has('imports:file:src/entry.ts->file:src/service.ts')).toBe(true)
    expect(edgeKeys.has('calls:method:src/service.ts#AuthService.login->method:src/service.ts#AuthService.logout')).toBe(true)
    expect(edgeKeys.has('calls:method:src/service.ts#AuthService.login->function:src/lib.ts#helper')).toBe(true)
    expect(edgeKeys.has('calls:function:src/entry.ts#boot->method:src/service.ts#AuthService.login')).toBe(true)

    // Sorted deterministically by id/composite keys.
    expect(graph.nodes[0].id <= graph.nodes[graph.nodes.length - 1].id).toBe(true)
    expect(graph.edges.length).toBeGreaterThan(0)
  })
})
