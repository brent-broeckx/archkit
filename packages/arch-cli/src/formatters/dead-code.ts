import type { DeadCodeCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'

export function formatDeadCodeResult(result: DeadCodeCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(result, null, 2)
  }

  if (mode === 'llm') {
    return [
      '# Dead Code Detected',
      '',
      '## Functions',
      ...toBulleted(result.functions),
      '',
      '## Methods',
      ...toBulleted(result.methods),
      '',
      '## Classes',
      ...toBulleted(result.classes),
      '',
      '## Files',
      ...toBulleted(result.files),
    ].join('\n')
  }

  return [
    'Dead Code Detected',
    '',
    'Functions',
    ...toIndented(result.functions),
    '',
    'Methods',
    ...toIndented(result.methods),
    '',
    'Classes',
    ...toIndented(result.classes),
    '',
    'Files',
    ...toIndented(result.files),
  ].join('\n')
}

function toIndented(values: string[]): string[] {
  if (values.length === 0) {
    return ['  (none)']
  }

  return values.map((value) => `  ${value}`)
}

function toBulleted(values: string[]): string[] {
  if (values.length === 0) {
    return ['- none']
  }

  return values.map((value) => `- ${value}`)
}
