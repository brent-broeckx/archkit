import type { ContextCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'
import { formatNextActionsHuman, formatNextActionsLlm } from './next-actions'
import { formatRetrievalMetadataHuman, formatRetrievalMetadataLlm } from './retrieval'

export function formatContextResult(result: ContextCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    const jsonResult = {
      query: result.query,
      mode: result.mode ?? 'hybrid',
      retrieval_metadata: result.retrievalMetadata ?? null,
      results: result.retrievalResults ?? [],
      resolution: result.resolution,
      entrypoints: result.entrypoints,
      files: result.files,
      paths: result.paths,
      snippets: result.snippets,
      next_actions: result.nextActions ?? [],
      ambiguities: result.ambiguities ?? [],
    }

    return JSON.stringify(jsonResult, null, 2)
  }

  if (mode === 'llm') {
    const lines = [`# Context: ${result.query}`, '']

    lines.push('## Retrieval Metadata')
    lines.push(...formatRetrievalMetadataLlm(result.retrievalMetadata))

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
          `- ${snippet.symbol} (${snippet.file}:${snippet.startLine}-${snippet.endLine})${toEvidenceSuffix(snippet.evidence)}`,
        )
      })
    }

    const nextActionLines = formatNextActionsLlm(result.nextActions)
    if (nextActionLines.length > 0) {
      lines.push('', ...nextActionLines)
    }

    return lines.join('\n')
  }

  const lines = [`Context: ${result.query}`, '', 'Resolution', ...toIndented(toResolutionLines(result)), '']

  const retrievalLines = formatRetrievalMetadataHuman(result.retrievalMetadata)
  if (retrievalLines.length > 0) {
    lines.push(...retrievalLines, '')
  }

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
      lines.push(
        `  ${snippet.symbol} (${snippet.file}:${snippet.startLine}-${snippet.endLine})${toEvidenceSuffix(snippet.evidence)}`,
      )
    })
  }

  const nextActionLines = formatNextActionsHuman(result.nextActions)
  if (nextActionLines.length > 0) {
    lines.push('', ...nextActionLines)
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

function toEvidenceSuffix(evidence: string[] | undefined): string {
  if (!evidence || evidence.length === 0) {
    return ''
  }

  return ` [evidence: ${evidence.slice(0, 2).join(', ')}]`
}
