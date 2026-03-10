import type { ArchNode } from '@archkit/core'

export function createSymbolsIndex(nodes: ArchNode[]): Record<string, string[]> {
  const symbolMap = new Map<string, string[]>()

  nodes
    .filter((node) => node.type !== 'file')
    .forEach((node) => {
      const existing = symbolMap.get(node.name)
      if (existing) {
        existing.push(node.id)
      } else {
        symbolMap.set(node.name, [node.id])
      }
    })

  const sortedNames = [...symbolMap.keys()].sort((left, right) =>
    left.localeCompare(right),
  )

  return sortedNames.reduce<Record<string, string[]>>((accumulator, name) => {
    const values = symbolMap.get(name) ?? []
    accumulator[name] = [...values].sort((left, right) => left.localeCompare(right))
    return accumulator
  }, {})
}

export function createFilesIndex(nodes: ArchNode[]): string[] {
  return nodes
    .filter((node) => node.type === 'file')
    .map((node) => node.filePath)
    .sort((left, right) => left.localeCompare(right))
}
