import { extractSnippetForNode, resolveSymbolInput } from '@arch/graph'
import { printShowAmbiguousOutput, printShowNoMatchOutput, printShowOutput } from '../utils/output'

export async function runShowCommand(symbol: string | undefined): Promise<void> {
  const symbolInput = symbol?.trim()

  if (!symbolInput) {
    console.error('Provide a symbol. Usage: `arch show <symbol>`.')
    process.exitCode = 1
    return
  }

  try {
    const resolved = await resolveSymbolInput(process.cwd(), symbolInput)

    if (resolved.nodes.length === 0) {
      printShowNoMatchOutput(symbolInput)
      process.exitCode = 1
      return
    }

    if (resolved.nodes.length > 1) {
      printShowAmbiguousOutput(symbolInput, resolved.nodes)
      process.exitCode = 1
      return
    }

    const selectedNode = resolved.nodes[0]
    const snippet = await extractSnippetForNode(process.cwd(), selectedNode)
    printShowOutput(selectedNode, snippet)
  } catch {
    console.error('No graph data found. Run `arch build` first.')
    process.exitCode = 1
  }
}
