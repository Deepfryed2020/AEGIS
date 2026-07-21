import { GraphStore } from './GraphStore.js';
import { GraphPath, GraphNode, GraphEdge } from './types.js';

export interface PathFinderOptions {
  maxDepth?: number;
  relationshipTypes?: string[];
}

export const PathFinder = {
  async findShortestPath(sourceId: string, targetId: string, options: PathFinderOptions = {}): Promise<GraphPath | null> {
    const maxDepth = options.maxDepth ?? 5;
    if (sourceId === targetId) {
      const node = await GraphStore.getNode(sourceId);
      return node ? { nodes: [node], edges: [], cost: 0 } : null;
    }

    const visited = new Set<string>([sourceId]);
    const queue: Array<{ id: string; path: string[]; edges: GraphEdge[] }> = [
      { id: sourceId, path: [sourceId], edges: [] },
    ];

    while (queue.length) {
      const current = queue.shift()!;
      if (current.path.length - 1 >= maxDepth) continue;
      let edges = await GraphStore.getEdgesForNode(current.id);
      if (options.relationshipTypes?.length) {
        edges = edges.filter((e) => options.relationshipTypes!.includes(e.type));
      }
      for (const edge of edges) {
        const neighbourId = edge.sourceId === current.id ? edge.targetId : edge.sourceId;
        if (visited.has(neighbourId)) continue;
        visited.add(neighbourId);
        const newPath = [...current.path, neighbourId];
        const newEdges = [...current.edges, edge];
        if (neighbourId === targetId) {
          const nodes = await GraphStore.getNodesByIds(newPath);
          return { nodes, edges: newEdges, cost: newEdges.reduce((sum, e) => sum + 1 / Math.max(0.01, e.weight), 0) };
        }
        queue.push({ id: neighbourId, path: newPath, edges: newEdges });
      }
    }
    return null;
  },

  async findAllPaths(sourceId: string, targetId: string, options: PathFinderOptions = {}): Promise<GraphPath[]> {
    const maxDepth = options.maxDepth ?? 4;
    const paths: GraphPath[] = [];
    const visited = new Set<string>([sourceId]);

    const dfs = async (currentId: string, path: string[], edges: GraphEdge[]): Promise<void> => {
      if (paths.length >= 10) return;
      if (path.length - 1 >= maxDepth) return;
      let candidateEdges = await GraphStore.getEdgesForNode(currentId);
      if (options.relationshipTypes?.length) {
        candidateEdges = candidateEdges.filter((e) => options.relationshipTypes!.includes(e.type));
      }
      for (const edge of candidateEdges) {
        const neighbourId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (visited.has(neighbourId)) continue;
        if (neighbourId === targetId) {
          const nodeIds = [...path, neighbourId];
          const nodes = await GraphStore.getNodesByIds(nodeIds);
          paths.push({
            nodes,
            edges: [...edges, edge],
            cost: [...edges, edge].reduce((sum, e) => sum + 1 / Math.max(0.01, e.weight), 0),
          });
          continue;
        }
        visited.add(neighbourId);
        await dfs(neighbourId, [...path, neighbourId], [...edges, edge]);
        visited.delete(neighbourId);
      }
    };

    await dfs(sourceId, [sourceId], []);
    return paths.sort((a, b) => a.cost - b.cost);
  },
};
