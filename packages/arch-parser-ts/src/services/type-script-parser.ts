import path from 'node:path'
import { Project, type SourceFile } from 'ts-morph'
import type { GraphData } from '@arch/core'
import type { ParseRepositoryOptions } from '../models/parser-types'
import { discoverSourceFiles } from '../utils/file-discovery'
import { sortEdges, sortNodes } from '../utils/sort-utils'
import { createParseState } from './parse-state'
import { extractImportEdges } from './import-extractor'
import { extractFileAndSymbolNodes } from './symbol-extractor'

export class TypeScriptParser {
  private readonly project: Project

  public constructor(tsConfigFilePath?: string) {
    this.project = tsConfigFilePath
      ? new Project({ tsConfigFilePath })
      : new Project({
          skipAddingFilesFromTsConfig: true,
          skipFileDependencyResolution: true,
        })
  }

  public parseRepository(options: ParseRepositoryOptions): GraphData {
    const rootDir = path.resolve(options.rootDir)
    const discoveredFiles = discoverSourceFiles(rootDir)
    const state = createParseState(rootDir, discoveredFiles)

    this.project.getSourceFiles().forEach((sourceFile) => sourceFile.forget())
    const sourceFiles = this.loadSourceFiles(rootDir, discoveredFiles)

    sourceFiles.forEach((sourceFile) => {
      extractFileAndSymbolNodes(sourceFile, state)
      extractImportEdges(sourceFile, state)
    })

    return {
      nodes: sortNodes(state.nodes),
      edges: sortEdges(state.edges),
    }
  }

  public getProject(): Project {
    return this.project
  }

  private loadSourceFiles(rootDir: string, discoveredFiles: string[]): SourceFile[] {
    return discoveredFiles.map((relativeFilePath) => {
      const absoluteFilePath = path.join(rootDir, relativeFilePath)
      return this.project.addSourceFileAtPath(absoluteFilePath)
    })
  }
}
