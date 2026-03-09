import { readdirSync } from 'node:fs'
import path from 'node:path'
import { IGNORED_DIRECTORIES, SUPPORTED_EXTENSIONS } from '../models/parser-constants'
import { normalizeToPosixPath } from './path-utils'

export function discoverSourceFiles(rootDir: string): string[] {
  const discovered: string[] = []
  const stack: string[] = [rootDir]

  while (stack.length > 0) {
    const currentDir = stack.pop()
    if (!currentDir) {
      continue
    }

    const entries = readdirSync(currentDir, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          stack.push(absolutePath)
        }
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue
      }

      discovered.push(normalizeToPosixPath(path.relative(rootDir, absolutePath)))
    }
  }

  return discovered.sort((left, right) => left.localeCompare(right))
}
