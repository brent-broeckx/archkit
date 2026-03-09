import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchNode } from '@arch/core'

export async function extractSnippetForNode(
  rootDir: string,
  node: ArchNode,
): Promise<string> {
  const absolutePath = path.join(rootDir, node.filePath)
  const source = await readFile(absolutePath, 'utf-8')
  const lines = source.split(/\r?\n/)
  const startIndex = Math.max(0, node.loc.startLine - 1)
  const endIndex = Math.min(lines.length, node.loc.endLine)

  return lines.slice(startIndex, endIndex).join('\n')
}
