import path from 'node:path'
import { readGraphMeta } from '@arch/graph'
import { printStatsOutput } from '../utils/output'

export async function runStatsCommand(repoPath: string): Promise<void> {
  const rootDir = path.resolve(process.cwd(), repoPath)

  try {
    const meta = await readGraphMeta(rootDir)
    printStatsOutput(meta)
  } catch {
    console.error('No graph metadata found. Run `arch build` first.')
    process.exitCode = 1
  }
}
