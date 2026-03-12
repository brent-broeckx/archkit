import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { IGNORED_DIRECTORIES, SUPPORTED_EXTENSIONS } from '../models/parser-constants'
import { normalizeToPosixPath } from './path-utils'

interface ArchIgnoreRule {
  pattern: string
  negated: boolean
  directoryOnly: boolean
  hasSlash: boolean
  rooted: boolean
}

export function discoverSourceFiles(rootDir: string): string[] {
  const discovered: string[] = []
  const stack: string[] = [rootDir]
  const archIgnoreRules = readArchIgnoreRules(rootDir)

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
      const relativePath = normalizeToPosixPath(path.relative(rootDir, absolutePath))

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !matchesArchIgnore(relativePath, true, archIgnoreRules)) {
          stack.push(absolutePath)
        }
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      if (matchesArchIgnore(relativePath, false, archIgnoreRules)) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue
      }

      discovered.push(relativePath)
    }
  }

  return discovered.sort((left, right) => left.localeCompare(right))
}

function readArchIgnoreRules(rootDir: string): ArchIgnoreRule[] {
  const candidatePaths = [
    path.join(rootDir, '.archignore'),
    path.join(rootDir, '.arch', '.archignore'),
  ]

  return candidatePaths
    .filter((candidatePath) => existsSync(candidatePath))
    .flatMap((candidatePath) =>
      readFileSync(candidatePath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .map(parseArchIgnoreRule),
    )
}

function parseArchIgnoreRule(line: string): ArchIgnoreRule {
  const negated = line.startsWith('!')
  let pattern = negated ? line.slice(1) : line
  pattern = pattern.trim()

  const directoryOnly = pattern.endsWith('/')
  const rooted = pattern.startsWith('/')

  if (directoryOnly) {
    pattern = pattern.slice(0, -1)
  }

  if (rooted) {
    pattern = pattern.slice(1)
  }

  return {
    pattern,
    negated,
    directoryOnly,
    rooted,
    hasSlash: pattern.includes('/'),
  }
}

function matchesArchIgnore(
  relativePath: string,
  isDirectory: boolean,
  rules: ArchIgnoreRule[],
): boolean {
  if (rules.length === 0) {
    return false
  }

  const normalizedPath = normalizeToPosixPath(relativePath)
  if (normalizedPath.length === 0 || normalizedPath === '.') {
    return false
  }

  let ignored = false

  rules.forEach((rule) => {
    if (rule.pattern.length === 0) {
      return
    }

    if (rule.directoryOnly && !isDirectory) {
      return
    }

    if (!rule.hasSlash) {
      const segments = normalizedPath.split('/')
      const matchedSegment = segments.some((segment) => path.matchesGlob(segment, rule.pattern))
      if (matchedSegment) {
        ignored = !rule.negated
      }
      return
    }

    const directMatch = path.matchesGlob(normalizedPath, rule.pattern)
    const nestedMatch = rule.rooted
      ? false
      : path.matchesGlob(normalizedPath, `**/${rule.pattern}`)

    if (directMatch || nestedMatch) {
      ignored = !rule.negated
    }
  })

  return ignored
}
