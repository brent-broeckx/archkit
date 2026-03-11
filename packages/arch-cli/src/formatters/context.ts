import type { ContextCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'

export function formatContextResult(result: ContextCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(result, null, 2)
  }

  if (mode === 'llm') {
    const lines = [`# Context: ${result.query}`, '']

    lines.push('## Resolution')
    lines.push(...toBulleted(toResolutionLines(result)))

    lines.push('', '## Entrypoints', ...toBulleted(result.entrypoints))

    lines.push('', '## Flow')
    if (result.paths.length === 0) {
      lines.push('- none')
    } else {
      result.paths.forEach((pathNodes) => {
        lines.push(`- ${pathNodes.join(' -> ')}`)
      })
    }

    lines.push('', '## Files', ...toBulleted(result.files), '', '## Snippets')
    if (result.snippets.length === 0) {
      lines.push('- none')
    } else {
      result.snippets.forEach((snippet) => {
        lines.push(
          `- ${snippet.symbol} (${snippet.file}:${snippet.startLine}-${snippet.endLine})`,
        )
      })
    }

    return lines.join('\n')
  }

  const lines = [`Context: ${result.query}`, '', 'Resolution', ...toIndented(toResolutionLines(result)), '']

  lines.push('Entrypoints', ...toIndented(result.entrypoints), '')

  lines.push('Flow')
  if (result.paths.length === 0) {
    lines.push('  (none)')
  } else {
    result.paths.forEach((pathNodes) => {
      lines.push(`  ${pathNodes.join(' -> ')}`)
    })
  }

  lines.push('', 'Files', ...toIndented(result.files), '', 'Snippets')
  if (result.snippets.length === 0) {
    lines.push('  (none)')
  } else {
    result.snippets.forEach((snippet) => {
      lines.push(`  ${snippet.symbol} (${snippet.file}:${snippet.startLine}-${snippet.endLine})`)
    })
  }

  return lines.join('\n')
}

function toResolutionLines(result: ContextCommandResult): string[] {
  if (result.resolution.kind === 'feature' && result.resolution.feature) {
    return [`feature: ${result.resolution.feature}`]
  }

  return ['query']
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
