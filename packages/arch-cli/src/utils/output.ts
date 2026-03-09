import type { GraphMeta } from '@arch/core'
import type { ArchNode, NodeType } from '@arch/core'
import type { SymbolQueryResult } from '@arch/graph'

export function printCliBanner(): void {
  console.log('Arch CLI')
  console.log('')
  console.log('Commands available:')
  console.log('* build')
  console.log('* stats')
  console.log('* query')
  console.log('* deps')
  console.log('* show')
  console.log('* context')
}

export function printBuildOutput(meta: GraphMeta): void {
  console.log(`Files scanned: ${meta.files}`)
  console.log(`Symbols extracted: ${meta.symbols}`)
  console.log(`Edges created: ${meta.edges}`)
  console.log('')
  console.log('Graph saved to .arch/graph')
}

export function printStatsOutput(meta: GraphMeta): void {
  console.log('Repository Architecture')
  console.log('')
  console.log(`Files: ${meta.files}`)
  console.log(`Symbols: ${meta.symbols}`)
  console.log(`Edges: ${meta.edges}`)
  console.log('')
  console.log('Symbol Types')
  console.log(`  classes: ${meta.nodeTypeCounts.class}`)
  console.log(`  methods: ${meta.nodeTypeCounts.method}`)
  console.log(`  functions: ${meta.nodeTypeCounts.function}`)
  console.log(`  interfaces: ${meta.nodeTypeCounts.interface}`)
  console.log(`  types: ${meta.nodeTypeCounts.type}`)
  console.log(`  routes: ${meta.nodeTypeCounts.route}`)
}

export function printQueryOutput(result: SymbolQueryResult, nodes: ArchNode[]): void {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const grouped = new Map<NodeType, ArchNode[]>()

  result.matches.forEach((match) => {
    match.nodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId)
      if (!node) {
        return
      }

      const existing = grouped.get(node.type)
      if (existing) {
        existing.push(node)
      } else {
        grouped.set(node.type, [node])
      }
    })
  })

  console.log(`arch query ${result.term}`)
  console.log('')

  if (grouped.size === 0) {
    console.log('No matches found.')
    return
  }

  console.log('Matches')
  console.log('')

  ;['class', 'method', 'function', 'interface', 'type', 'route', 'file'].forEach(
    (typeName) => {
      const typedNodes = grouped.get(typeName as NodeType)
      if (!typedNodes || typedNodes.length === 0) {
        return
      }

      console.log(typeName)
      typedNodes
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id))
        .forEach((node) => {
          console.log(`  ${node.name} (${node.filePath})`)
        })
      console.log('')
    },
  )
}

export function printShowOutput(node: ArchNode, snippet: string): void {
  console.log(`${node.filePath}:${node.loc.startLine}-${node.loc.endLine}`)
  console.log('')
  if (snippet.length > 0) {
    console.log(snippet)
  }
}

export function printShowNoMatchOutput(input: string): void {
  console.log(`No symbol found for: ${input}`)
}

export function printShowAmbiguousOutput(input: string, nodes: ArchNode[]): void {
  console.log(`Ambiguous symbol: ${input}`)
  console.log('')
  console.log('Matches:')
  nodes
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((node) => {
      console.log(`  ${node.id}`)
    })
}
