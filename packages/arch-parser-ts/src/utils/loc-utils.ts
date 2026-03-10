import type { SourceLoc } from '@archkit/core'
import type {
  CallExpression,
  ClassDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  InterfaceDeclaration,
  MethodDeclaration,
  SourceFile,
  TypeAliasDeclaration,
} from 'ts-morph'

type LocDeclaration =
  | CallExpression
  | ClassDeclaration
  | MethodDeclaration
  | FunctionDeclaration
  | InterfaceDeclaration
  | TypeAliasDeclaration
  | ImportDeclaration

export function getLoc(declaration: LocDeclaration): SourceLoc {
  return {
    startLine: declaration.getStartLineNumber(),
    endLine: declaration.getEndLineNumber(),
    startOffset: declaration.getStart(),
    endOffset: declaration.getEnd(),
  }
}

export function getLocFromSourceFile(sourceFile: SourceFile): SourceLoc {
  return {
    startLine: 1,
    endLine: sourceFile.getEndLineNumber(),
    startOffset: 0,
    endOffset: sourceFile.getFullText().length,
  }
}
