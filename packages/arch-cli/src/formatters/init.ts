import type { InitCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'

export function formatInitResult(result: InitCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(result, null, 2)
  }

  return [
    'Arch initialized',
    '',
    `Repository: ${result.repoPath}`,
    `Directory: ${result.archDir}`,
    `Ignore file: ${result.archIgnorePath}`,
    `Config file: ${result.archConfigPath}`,
    '',
    `Created .arch directory: ${result.createdArchDir ? 'yes' : 'no'}`,
    `Created .archignore: ${result.createdArchIgnore ? 'yes' : 'no'}`,
    `Created arch.conf: ${result.createdArchConfig ? 'yes' : 'no'}`,
  ].join('\n')
}
