import { describe, expect, it, vi } from 'vitest'
import { runScaffoldCommand } from '../src/commands/scaffold'
import { printCliBanner } from '../src/utils/output'

describe('cli output utilities', () => {
  it('prints the CLI banner', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    printCliBanner()

    expect(spy).toHaveBeenCalledWith('Arch CLI')
    expect(spy).toHaveBeenCalledWith('* context')
    spy.mockRestore()
  })

  it('prints scaffold command summary', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    runScaffoldCommand('build', 'packages/arch-cli')
    runScaffoldCommand('query')

    expect(spy).toHaveBeenNthCalledWith(1, 'arch build (scaffold): packages/arch-cli')
    expect(spy).toHaveBeenNthCalledWith(2, 'arch query (scaffold):')
    spy.mockRestore()
  })
})
