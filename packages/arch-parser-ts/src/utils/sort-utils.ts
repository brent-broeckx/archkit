import type { ArchEdge, ArchNode } from '@arch/core'

export function sortNodes(nodes: ArchNode[]): ArchNode[] {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id))
}

export function sortEdges(edges: ArchEdge[]): ArchEdge[] {
  return [...edges].sort((left, right) => {
    const leftKey = `${left.type}:${left.from}:${left.to}:${left.filePath ?? ''}:${left.loc?.startLine ?? 0}`
    const rightKey = `${right.type}:${right.from}:${right.to}:${right.filePath ?? ''}:${right.loc?.startLine ?? 0}`
    return leftKey.localeCompare(rightKey)
  })
}
