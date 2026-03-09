import path from 'node:path'

export function normalizeToPosixPath(inputPath: string): string {
  return inputPath.split(path.sep).join('/')
}

export function toRelativePath(absolutePath: string, rootDir: string): string {
  return normalizeToPosixPath(path.relative(rootDir, absolutePath))
}

export function createFileNodeId(filePath: string): string {
  return `file:${filePath}`
}
