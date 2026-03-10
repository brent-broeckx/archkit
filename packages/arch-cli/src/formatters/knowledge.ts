import type { KnowledgeCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'

export function formatKnowledgeResult(result: KnowledgeCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(result, null, 2)
  }

  if (result.action === 'add') {
    if (mode === 'llm') {
      return [
        '# Knowledge Entry Created',
        '',
        `- Id: ${result.entry.id}`,
        `- Title: ${result.entry.title}`,
        `- Type: ${result.entry.type}`,
        `- Feature: ${result.entry.feature}`,
        '',
        '## Content',
        result.entry.body,
      ].join('\n')
    }

    return [
      'Knowledge entry created',
      '',
      `Id: ${result.entry.id}`,
      `Title: ${result.entry.title}`,
      `Type: ${result.entry.type}`,
      `Feature: ${result.entry.feature}`,
      '',
      result.entry.body,
    ].join('\n')
  }

  if (result.action === 'list') {
    const grouped = new Map<string, string[]>()
    result.entries.forEach((entry) => {
      const existing = grouped.get(entry.feature)
      if (existing) {
        existing.push(entry.id)
      } else {
        grouped.set(entry.feature, [entry.id])
      }
    })

    const features = [...grouped.keys()].sort((left, right) => left.localeCompare(right))

    if (mode === 'llm') {
      const lines = ['# Knowledge Entries']
      if (result.entries.length === 0) {
        lines.push('', '- none')
        return lines.join('\n')
      }

      features.forEach((feature) => {
        lines.push('', `## ${feature}`)
        const ids = grouped.get(feature) ?? []
        ids.slice().sort((left, right) => left.localeCompare(right)).forEach((id) => {
          lines.push(`- ${id}`)
        })
      })

      return lines.join('\n')
    }

    const lines = ['Knowledge Entries', '']
    if (result.entries.length === 0) {
      lines.push('  (none)')
      return lines.join('\n')
    }

    features.forEach((feature) => {
      lines.push(feature)
      const ids = grouped.get(feature) ?? []
      ids.slice().sort((left, right) => left.localeCompare(right)).forEach((id) => {
        lines.push(`  ${id}`)
      })
      lines.push('')
    })

    return lines.join('\n').trimEnd()
  }

  if (result.action === 'show') {
    if (mode === 'llm') {
      const lines = [
        `# ${result.entry.title}`,
        '',
        `- Id: ${result.entry.id}`,
        `- Type: ${result.entry.type}`,
        `- Feature: ${result.entry.feature}`,
        `- Created: ${result.entry.createdAt}`,
      ]

      if (result.entry.tags.length > 0) {
        lines.push(`- Tags: ${result.entry.tags.join(', ')}`)
      }

      lines.push('', '## Notes', result.entry.body)
      return lines.join('\n')
    }

    const lines = [
      `Title: ${result.entry.title}`,
      `Type: ${result.entry.type}`,
      `Feature: ${result.entry.feature}`,
    ]

    if (result.entry.tags.length > 0) {
      lines.push(`Tags: ${result.entry.tags.join(', ')}`)
    }

    lines.push('', result.entry.body)
    return lines.join('\n')
  }

  if (mode === 'llm') {
    const lines = [`# Knowledge Search: ${result.query}`, '', '## Matches']
    if (result.matches.length === 0) {
      lines.push('- none')
      return lines.join('\n')
    }

    result.matches.forEach((match) => {
      lines.push(`- ${match.id} (${match.type}, ${match.feature})`)
    })

    return lines.join('\n')
  }

  const lines = ['Matches', '']
  if (result.matches.length === 0) {
    lines.push('  (none)')
    return lines.join('\n')
  }

  result.matches.forEach((match) => {
    lines.push(match.id)
    lines.push(`  Feature: ${match.feature}`)
    lines.push(`  Type: ${match.type}`)
    lines.push('')
  })

  return lines.join('\n').trimEnd()
}
