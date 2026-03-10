import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CliCommandError,
  handleCommandError,
  resolveOutputMode,
  writeFormattedOutput,
} from '../src/utils/command-output'

describe('command-output utils', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = 0
  })

  it('resolves json mode with highest precedence', () => {
    expect(resolveOutputMode({ json: true, format: 'llm' }, false)).toBe('json')
  })

  it('throws for unsupported llm mode', () => {
    expect(() => resolveOutputMode({ format: 'llm' }, false)).toThrowError(CliCommandError)
  })

  it('throws for invalid format', () => {
    expect(() => resolveOutputMode({ format: 'xml' }, true)).toThrowError(CliCommandError)
  })

  it('writes formatted output with console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    writeFormattedOutput('ok')

    expect(logSpy).toHaveBeenCalledWith('ok')
  })

  it('handles command error in json mode', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    handleCommandError(new CliCommandError('BAD', 'problem'), { json: true })

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(1)
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(payload).toEqual({
      error: {
        code: 'BAD',
        message: 'problem',
      },
    })
  })

  it('handles unknown errors in human mode', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    handleCommandError(new Error('boom'), { format: 'human' })

    expect(errorSpy).toHaveBeenCalledWith('boom')
    expect(process.exitCode).toBe(1)
  })
})
