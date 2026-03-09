import path from 'node:path'
import { TypeScriptParser } from '@arch/parser-ts'
import { persistGraph } from '@arch/graph'
import { printBuildOutput } from '../utils/output'

export async function runBuildCommand(repoPath: string): Promise<void> {
  const rootDir = path.resolve(process.cwd(), repoPath)
  const parser = new TypeScriptParser()

  console.log('Scanning repository...')
  console.log('')

  const graphData = parser.parseRepository({ rootDir })
  const result = await persistGraph(rootDir, graphData)

  printBuildOutput(result.meta)
}
