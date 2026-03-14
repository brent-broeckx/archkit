import path from 'node:path'
import type { ShowCommandResult } from '../models/command-results'
import type { OutputMode } from '../models/output-mode'
import { formatNextActionsHuman, formatNextActionsLlm } from './next-actions'

export function formatShowResult(result: ShowCommandResult, mode: OutputMode): string {
  if (mode === 'json') {
    return JSON.stringify(
      {
        symbol: result.node.name,
        nodeId: result.node.id,
        file: result.node.filePath,
        startLine: result.node.loc.startLine,
        endLine: result.node.loc.endLine,
        code: result.snippet,
        next_actions: result.nextActions ?? [],
      },
      null,
      2,
    )
  }

  if (mode === 'llm') {
    const language = inferCodeFenceLanguage(result.node.filePath)
    const fenceStart = `\`\`\`${language}`
    const lines = [
      `# Symbol: ${result.node.name}`,
      '',
      `- File: ${result.node.filePath}`,
      `- Range: ${result.node.loc.startLine}-${result.node.loc.endLine}`,
      '',
      '## Code',
      fenceStart,
    ]

    if (result.snippet.length > 0) {
      lines.push(result.snippet)
    }

    lines.push('```')
    const nextActionLines = formatNextActionsLlm(result.nextActions)
    if (nextActionLines.length > 0) {
      lines.push('', ...nextActionLines)
    }
    return lines.join('\n')
  }

  const humanLines = [`${result.node.filePath}:${result.node.loc.startLine}-${result.node.loc.endLine}`, '']
  if (result.snippet.length > 0) {
    humanLines.push(result.snippet)
  }
  const nextActionLines = formatNextActionsHuman(result.nextActions)
  if (nextActionLines.length > 0) {
    humanLines.push('', ...nextActionLines)
  }
  return humanLines.join('\n')
}

function inferCodeFenceLanguage(filePath: string): string {
  const extension = path.extname(filePath).toLocaleLowerCase()
  if (extension === '.ts' || extension === '.tsx') {
    return 'ts'
  }

  if (extension === '.js' || extension === '.jsx' || extension === '.mjs' || extension === '.cjs') {
    return 'js'
  }

  return ''
}
