import type { ParseState } from '../models/parser-types'
import type { SourceFile } from 'ts-morph'
import { createFileNodeId, toRelativePath } from '../utils/path-utils'
import { getLoc, getLocFromSourceFile } from '../utils/loc-utils'
import { addEdge, addNode } from './parse-state'

export function extractFileAndSymbolNodes(sourceFile: SourceFile, state: ParseState): void {
  const filePath = toRelativePath(sourceFile.getFilePath(), state.rootDir)
  const fileId = createFileNodeId(filePath)

  addNode(state, {
    id: fileId,
    type: 'file',
    name: filePath,
    filePath,
    loc: getLocFromSourceFile(sourceFile),
  })

  sourceFile.getClasses().forEach((classDeclaration, classIndex) => {
    const className = classDeclaration.getName() ?? `AnonymousClass${classIndex + 1}`
    const classNodeId = `class:${filePath}#${className}`
    const classLoc = getLoc(classDeclaration)

    addNode(state, {
      id: classNodeId,
      type: 'class',
      name: className,
      filePath,
      loc: classLoc,
      exported: classDeclaration.isExported() || classDeclaration.isDefaultExport(),
    })

    addEdge(state, {
      from: fileId,
      to: classNodeId,
      type: 'contains',
      filePath,
      loc: classLoc,
    })

    classDeclaration.getMethods().forEach((methodDeclaration, methodIndex) => {
      const methodName = methodDeclaration.getName() ?? `anonymousMethod${methodIndex + 1}`
      const methodNodeId = `method:${filePath}#${className}.${methodName}`
      const methodLoc = getLoc(methodDeclaration)

      addNode(state, {
        id: methodNodeId,
        type: 'method',
        name: `${className}.${methodName}`,
        filePath,
        loc: methodLoc,
      })

      addEdge(state, {
        from: fileId,
        to: methodNodeId,
        type: 'contains',
        filePath,
        loc: methodLoc,
      })
    })
  })

  sourceFile.getFunctions().forEach((functionDeclaration, functionIndex) => {
    const functionName = functionDeclaration.getName() ?? `anonymousFunction${functionIndex + 1}`
    const functionNodeId = `function:${filePath}#${functionName}`
    const functionLoc = getLoc(functionDeclaration)

    addNode(state, {
      id: functionNodeId,
      type: 'function',
      name: functionName,
      filePath,
      loc: functionLoc,
      exported: functionDeclaration.isExported(),
    })

    addEdge(state, {
      from: fileId,
      to: functionNodeId,
      type: 'contains',
      filePath,
      loc: functionLoc,
    })
  })

  sourceFile.getInterfaces().forEach((interfaceDeclaration, interfaceIndex) => {
    const interfaceName =
      interfaceDeclaration.getName() ?? `AnonymousInterface${interfaceIndex + 1}`
    const interfaceNodeId = `interface:${filePath}#${interfaceName}`
    const interfaceLoc = getLoc(interfaceDeclaration)

    addNode(state, {
      id: interfaceNodeId,
      type: 'interface',
      name: interfaceName,
      filePath,
      loc: interfaceLoc,
      exported: interfaceDeclaration.isExported(),
    })

    addEdge(state, {
      from: fileId,
      to: interfaceNodeId,
      type: 'contains',
      filePath,
      loc: interfaceLoc,
    })
  })

  sourceFile.getTypeAliases().forEach((typeAliasDeclaration, typeIndex) => {
    const typeName = typeAliasDeclaration.getName() ?? `AnonymousType${typeIndex + 1}`
    const typeNodeId = `type:${filePath}#${typeName}`
    const typeLoc = getLoc(typeAliasDeclaration)

    addNode(state, {
      id: typeNodeId,
      type: 'type',
      name: typeName,
      filePath,
      loc: typeLoc,
      exported: typeAliasDeclaration.isExported(),
    })

    addEdge(state, {
      from: fileId,
      to: typeNodeId,
      type: 'contains',
      filePath,
      loc: typeLoc,
    })
  })
}
