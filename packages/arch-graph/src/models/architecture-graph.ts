import type { ArchEdge, ArchNode, GraphData } from '@archkit/core'

export class ArchitectureGraph {
  private readonly nodeMap = new Map<string, ArchNode>()
  private readonly edgeList: ArchEdge[] = []

  public addNode(node: ArchNode): void {
    this.nodeMap.set(node.id, node)
  }

  public addEdge(edge: ArchEdge): void {
    this.edgeList.push(edge)
  }

  public getNode(nodeId: string): ArchNode | undefined {
    return this.nodeMap.get(nodeId)
  }

  public getNodes(): ArchNode[] {
    return [...this.nodeMap.values()]
  }

  public getEdges(): ArchEdge[] {
    return [...this.edgeList]
  }

  public getOutgoingEdges(nodeId: string): ArchEdge[] {
    return this.edgeList.filter((edge) => edge.from === nodeId)
  }

  public toGraphData(): GraphData {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
    }
  }
}

export function createArchitectureGraph(graphData: GraphData): ArchitectureGraph {
  const graph = new ArchitectureGraph()
  graphData.nodes.forEach((node) => graph.addNode(node))
  graphData.edges.forEach((edge) => graph.addEdge(edge))
  return graph
}
