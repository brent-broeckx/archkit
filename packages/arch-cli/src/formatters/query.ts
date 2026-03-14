import type { QueryCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'
import {
  formatEvidenceInline,
  formatRetrievalMetadataHuman,
  formatRetrievalMetadataLlm,
} from './retrieval'
import { formatNextActionsHuman, formatNextActionsLlm } from './next-actions'

export function formatQueryResult(result: QueryCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    const jsonResult = {
      query: result.term,
      mode: result.mode ?? 'hybrid',
      retrieval_metadata: result.retrievalMetadata ?? null,
      results:
        result.results ??
        result.matches.map((match) => ({
          kind: match.type === 'file' ? 'file' : 'symbol',
          path: match.file,
          name: match.name,
          nodeIds: [match.nodeId],
          score: 0,
          evidence: [],
        })),
      matches: result.matches,
      next_actions: result.nextActions ?? [],
      ambiguities: result.ambiguities ?? [],
    }

    return JSON.stringify(jsonResult, null, 2)
  }

  if (mode === 'llm') {
    const lines = [`# Query: ${result.term}`, '', '## Matches']

    lines.push('', '## Retrieval Metadata', ...formatRetrievalMetadataLlm(result.retrievalMetadata))

    if (result.matches.length === 0) {
      lines.push('- none')

      const nextActionLines = formatNextActionsLlm(result.nextActions)
      if (nextActionLines.length > 0) {
        lines.push('', ...nextActionLines)
      }

      return lines.join('\n')
    }

    result.matches.forEach((match) => {
      lines.push(`- ${match.type}: ${match.name} (${match.file})`)
    })

    if (result.results && result.results.length > 0) {
      lines.push('', '## Evidence')
      result.results.slice(0, 10).forEach((item) => {
        lines.push(`- ${item.path} [${item.score}]: ${formatEvidenceInline(item)}`)
      })
    }

    const nextActionLines = formatNextActionsLlm(result.nextActions)
    if (nextActionLines.length > 0) {
      lines.push('', ...nextActionLines)
    }

    return lines.join('\n')
  }

  const groups = new Map<string, Array<{ name: string; file: string; nodeId: string }>>()
  result.matches.forEach((match) => {
    const existing = groups.get(match.type)
    if (existing) {
      existing.push({ name: match.name, file: match.file, nodeId: match.nodeId })
    } else {
      groups.set(match.type, [{ name: match.name, file: match.file, nodeId: match.nodeId }])
    }
  })

  const lines = [`arch query ${result.term}`, '']
  lines.push(...formatRetrievalMetadataHuman(result.retrievalMetadata), '')

  if (result.matches.length === 0) {
    lines.push('No matches found.')
    return lines.join('\n')
  }

  lines.push('Matches', '')
  ;['class', 'method', 'function', 'interface', 'type', 'route', 'file'].forEach((typeName) => {
    const group = groups.get(typeName)
    if (!group || group.length === 0) {
      return
    }

    lines.push(typeName)
    group
      .slice()
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
      .forEach((item) => {
        lines.push(`  ${item.name} (${item.file})`)
      })
    lines.push('')
  })

  if (result.results && result.results.length > 0) {
    lines.push('Evidence', '')
    result.results.slice(0, 10).forEach((item) => {
      lines.push(`  ${item.path} [${item.score}]`)
      lines.push(`    ${formatEvidenceInline(item)}`)
    })
  }

  const nextActionLines = formatNextActionsHuman(result.nextActions)
  if (nextActionLines.length > 0) {
    lines.push('', ...nextActionLines)
  }

  return lines.join('\n').trimEnd()
}
