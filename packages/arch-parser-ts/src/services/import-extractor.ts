import path from 'node:path'
import type { ParseState } from '../models/parser-types'
import type { ImportDeclaration, SourceFile } from 'ts-morph'
import { MODULE_EXTENSIONS } from '../models/parser-constants'
import { getLoc } from '../utils/loc-utils'
import { createFileNodeId, normalizeToPosixPath, toRelativePath } from '../utils/path-utils'
import { addEdge } from './parse-state'

export function extractImportEdges(sourceFile: SourceFile, state: ParseState): void {
  const filePath = toRelativePath(sourceFile.getFilePath(), state.rootDir)
  const sourceFileId = createFileNodeId(filePath)

  sourceFile.getImportDeclarations().forEach((importDeclaration) => {
    const targetPath = resolveImportTarget(filePath, importDeclaration, state)
    if (!targetPath) {
      return
    }

    addEdge(state, {
      from: sourceFileId,
      to: createFileNodeId(targetPath),
      type: 'imports',
      filePath,
      loc: getLoc(importDeclaration),
    })
  })
}

function resolveImportTarget(
  sourceRelativePath: string,
  importDeclaration: ImportDeclaration,
  state: ParseState,
): string | undefined {
  const moduleSpecifier = importDeclaration.getModuleSpecifierValue()
  if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
    return undefined
  }

  const sourceDirectory = path.dirname(path.join(state.rootDir, sourceRelativePath))
  const candidateBasePath = path.resolve(sourceDirectory, moduleSpecifier)

  const directRelative = normalizeToPosixPath(path.relative(state.rootDir, candidateBasePath))
  if (state.discoveredFilesSet.has(directRelative)) {
    return directRelative
  }

  for (const extension of MODULE_EXTENSIONS) {
    const extensionRelative = normalizeToPosixPath(
      path.relative(state.rootDir, `${candidateBasePath}${extension}`),
    )
    if (state.discoveredFilesSet.has(extensionRelative)) {
      return extensionRelative
    }
  }

  for (const extension of MODULE_EXTENSIONS) {
    const indexRelative = normalizeToPosixPath(
      path.relative(state.rootDir, path.join(candidateBasePath, `index${extension}`)),
    )
    if (state.discoveredFilesSet.has(indexRelative)) {
      return indexRelative
    }
  }

  return undefined
}
