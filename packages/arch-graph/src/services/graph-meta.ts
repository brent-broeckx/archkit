import type { GraphData, GraphMeta, NodeType } from '@arch/core'

export function createGraphMeta(graphData: GraphData): GraphMeta {
  const nodeTypeCounts: Record<NodeType, number> = {
    file: 0,
    class: 0,
    method: 0,
    function: 0,
    interface: 0,
    type: 0,
    route: 0,
  }

  graphData.nodes.forEach((node) => {
    nodeTypeCounts[node.type] += 1
  })

  return {
    files: nodeTypeCounts.file,
    symbols:
      nodeTypeCounts.class +
      nodeTypeCounts.method +
      nodeTypeCounts.function +
      nodeTypeCounts.interface +
      nodeTypeCounts.type +
      nodeTypeCounts.route,
    edges: graphData.edges.length,
    nodeTypeCounts,
  }
}
