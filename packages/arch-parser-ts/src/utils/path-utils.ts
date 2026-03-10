import path from 'node:path'

export function normalizeToPosixPath(inputPath: string): string {
  return inputPath.replace(/\\/g, '/')
}

export function toRelativePath(absolutePath: string, rootDir: string): string {
  return normalizeToPosixPath(path.relative(rootDir, absolutePath))
}

export function createFileNodeId(filePath: string): string {
  return `file:${filePath}`
}
