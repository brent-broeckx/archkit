import { querySymbols, readPersistedNodes } from '@arch/graph'
import { printQueryOutput } from '../utils/output'

export async function runQueryCommand(term: string | undefined): Promise<void> {
  const queryTerm = term?.trim()

  if (!queryTerm) {
    console.error('Provide a query term. Usage: `arch query <term>`.')
    process.exitCode = 1
    return
  }

  try {
    const [queryResult, nodes] = await Promise.all([
      querySymbols(process.cwd(), queryTerm),
      readPersistedNodes(process.cwd()),
    ])
    printQueryOutput(queryResult, nodes)
  } catch {
    console.error('No graph index found. Run `arch build` first.')
    process.exitCode = 1
  }
}
