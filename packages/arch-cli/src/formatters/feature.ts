import type { FeatureCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'

export function formatFeatureResult(result: FeatureCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(result, null, 2)
  }

  if (result.action === 'list') {
    if (mode === 'llm') {
      const lines = ['# Configured Features', '']
      if (!result.hasConfig) {
        lines.push('- No `.arch/features.json` file found.')
      }

      if (result.features.length === 0) {
        lines.push('- none')
      } else {
        result.features.forEach((feature) => {
          lines.push(`- ${feature.feature} (files: ${feature.fileCount})`)
        })
      }

      return lines.join('\n')
    }

    const lines = ['Configured features', '']
    if (!result.hasConfig) {
      lines.push(`No mapping file found at ${result.configPath}.`, '')
    }

    if (result.features.length === 0) {
      lines.push('  (none)')
    } else {
      result.features.forEach((feature) => {
        lines.push(feature.feature)
        lines.push(`  files: ${feature.fileCount}`)
        if (feature.patterns.length > 0) {
          lines.push('  patterns:')
          feature.patterns.forEach((pattern) => {
            lines.push(`    ${pattern}`)
          })
        }
        lines.push('')
      })
      if (lines[lines.length - 1] === '') {
        lines.pop()
      }
    }

    return lines.join('\n')
  }

  if (result.action === 'suggest') {
    if (mode === 'llm') {
      const lines = ['# Feature Suggestions', '']
      if (result.suggestions.length === 0) {
        lines.push('- none')
      } else {
        result.suggestions.forEach((suggestion) => {
          lines.push(`- ${suggestion.feature}`)
          suggestion.patterns.forEach((pattern) => {
            lines.push(`  - ${pattern}`)
          })
        })
      }

      return lines.join('\n')
    }

    const lines = ['Suggested features', '']
    if (result.suggestions.length === 0) {
      lines.push('  (none)')
    } else {
      result.suggestions.forEach((suggestion) => {
        lines.push(suggestion.feature)
        suggestion.patterns.forEach((pattern) => {
          lines.push(`  - ${pattern}`)
        })
      })
    }

    return lines.join('\n')
  }

  if (result.action === 'show') {
    if (mode === 'llm') {
      const lines = [`# Feature: ${result.feature.feature}`, '', '## Patterns']
      if (result.feature.patterns.length === 0) {
        lines.push('- none')
      } else {
        result.feature.patterns.forEach((pattern) => lines.push(`- ${pattern}`))
      }

      lines.push('', '## Files')
      if (result.feature.files.length === 0) {
        lines.push('- none')
      } else {
        result.feature.files.forEach((file) => lines.push(`- ${file}`))
      }

      return lines.join('\n')
    }

    const lines = [`Feature: ${result.feature.feature}`, '', 'Patterns']
    if (result.feature.patterns.length === 0) {
      lines.push('  (none)')
    } else {
      result.feature.patterns.forEach((pattern) => lines.push(`  ${pattern}`))
    }

    lines.push('', 'Files')
    if (result.feature.files.length === 0) {
      lines.push('  (none)')
    } else {
      result.feature.files.forEach((file) => lines.push(`  ${file}`))
    }

    return lines.join('\n')
  }

  if (result.action === 'assign') {
    if (mode === 'llm') {
      return [
        '# Feature Pattern Assigned',
        '',
        `- feature: ${result.assignment.feature}`,
        `- pattern: ${result.assignment.pattern}`,
        `- duplicate: ${result.assignment.duplicate ? 'yes' : 'no'}`,
      ].join('\n')
    }

    const lines = ['Feature pattern assigned', '']
    lines.push(`Feature: ${result.assignment.feature}`)
    lines.push(`Pattern: ${result.assignment.pattern}`)
    lines.push(`Duplicate: ${result.assignment.duplicate ? 'yes' : 'no'}`)
    lines.push(`Config: ${result.assignment.configPath}`)
    return lines.join('\n')
  }

  if (mode === 'llm') {
    const lines = ['# Unmapped Files', '']
    if (result.unmappedFiles.length === 0) {
      lines.push('- none')
    } else {
      result.unmappedFiles.forEach((file) => lines.push(`- ${file}`))
    }
    return lines.join('\n')
  }

  const lines = ['Unmapped files', '']
  if (result.unmappedFiles.length === 0) {
    lines.push('  (none)')
  } else {
    result.unmappedFiles.forEach((file) => lines.push(file))
  }

  return lines.join('\n')
}
