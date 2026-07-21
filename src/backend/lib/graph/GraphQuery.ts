import { GraphStore } from './GraphStore.js';
import { GraphNode, GraphEdge, GraphNeighbourhood } from './types.js';

export interface GraphQueryOptions {
  minWeight?: number;
  relationshipTypes?: string[];
  limit?: number;
}

export const GraphQuery = {
  async getNeighbourhood(nodeId: string, depth = 1, options: GraphQueryOptions = {}): Promise<GraphNeighbourhood> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const visited = new Set<string>([nodeId]);

    const sourceNode = await GraphStore.getNode(nodeId);
    if (sourceNode) nodes.set(sourceNode.id, sourceNode);

    let frontier: string[] = [nodeId];
    for (let d = 0; d < depth; d += 1) {
      const next: string[] = [];
      for (const id of frontier) {
        let candidateEdges = await GraphStore.getEdgesForNode(id);
        if (options.minWeight !== undefined) {
          candidateEdges = candidateEdges.filter((e) => e.weight >= options.minWeight!);
        }
        if (options.relationshipTypes?.length) {
          candidateEdges = candidateEdges.filter((e) => options.relationshipTypes!.includes(e.type));
        }
        for (const edge of candidateEdges) {
          edges.push(edge);
          const neighbourId = edge.sourceId === id ? edge.targetId : edge.sourceId;
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId);
            next.push(neighbourId);
          }
        }
      }
      if (next.length) {
        const neighbourNodes = await GraphStore.getNodesByIds(next);
        for (const n of neighbourNodes) nodes.set(n.id, n);
      }
      frontier = next;
      if (options.limit && edges.length >= options.limit) break;
    }

    return { nodes: Array.from(nodes.values()), edges: edges.slice(0, options.limit || edges.length) };
  },

  async searchNodes(query: string, limit = 20): Promise<GraphNode[]> {
    const all = await GraphStore.getNodes(1000);
    const lower = query.toLowerCase();
    return all
      .filter((n) => n.name.toLowerCase().includes(lower) || (n.canonical || '').toLowerCase().includes(lower))
      .slice(0, limit);
  },

  async getStats(): Promise<{
    nodeCount: number;
    edgeCount: number;
    topConnected: Array<GraphNode & { degree: number }>;
    typeDistribution: Record<string, number>;
  }> {
    const nodeCount = await GraphStore.countNodes();
    const edgeCount = await GraphStore.countEdges();
    const topConnected = await GraphStore.getTopConnectedNodes(10);
    const allNodes = await GraphStore.getNodes(2000);
    const typeDistribution: Record<string, number> = {};
    for (const n of allNodes) {
      typeDistribution[n.type] = (typeDistribution[n.type] || 0) + 1;
    }
    return { nodeCount, edgeCount, topConnected, typeDistribution };
  },
};
