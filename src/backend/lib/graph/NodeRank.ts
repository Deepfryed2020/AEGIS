import { GraphStore } from './GraphStore.js';
import { GraphNode, GraphEdge } from './types.js';

export interface NodeRankResult {
  nodeId: string;
  rank: number;
  degree: number;
  weightedDegree: number;
}

export const NodeRank = {
  async computePageRank(iterations = 20, damping = 0.85): Promise<Array<{ nodeId: string; rank: number }>> {
    const nodes = await GraphStore.getNodes(2000);
    const edges = await GraphStore.getEdges(4000);
    if (!nodes.length) return [];

    const outLinks = new Map<string, string[]>();
    const inLinks = new Map<string, string[]>();
    for (const node of nodes) {
      outLinks.set(node.id, []);
      inLinks.set(node.id, []);
    }
    for (const edge of edges) {
      outLinks.get(edge.sourceId)?.push(edge.targetId);
      inLinks.get(edge.targetId)?.push(edge.sourceId);
    }

    let ranks = new Map<string, number>();
    const initial = 1 / nodes.length;
    for (const node of nodes) ranks.set(node.id, initial);

    for (let i = 0; i < iterations; i += 1) {
      const newRanks = new Map<string, number>();
      let danglingSum = 0;
      for (const node of nodes) {
        if ((outLinks.get(node.id) || []).length === 0) {
          danglingSum += ranks.get(node.id) || 0;
        }
      }
      for (const node of nodes) {
        const inNeighbours = inLinks.get(node.id) || [];
        let sum = 0;
        for (const neighbourId of inNeighbours) {
          const outCount = (outLinks.get(neighbourId) || []).length;
          if (outCount > 0) sum += (ranks.get(neighbourId) || 0) / outCount;
        }
        const n = nodes.length;
        const rank = (1 - damping) / n + damping * (sum + danglingSum / n);
        newRanks.set(node.id, rank);
      }
      ranks = newRanks;
    }

    return Array.from(ranks.entries())
      .map(([nodeId, rank]) => ({ nodeId, rank }))
      .sort((a, b) => b.rank - a.rank);
  },

  async degreeCentrality(limit = 50): Promise<NodeRankResult[]> {
    const nodes = await GraphStore.getNodes(2000);
    const edges = await GraphStore.getEdges(4000);
    const degreeMap = new Map<string, { degree: number; weightedDegree: number }>();
    for (const node of nodes) degreeMap.set(node.id, { degree: 0, weightedDegree: 0 });
    for (const edge of edges) {
      const s = degreeMap.get(edge.sourceId);
      if (s) {
        s.degree += 1;
        s.weightedDegree += edge.weight;
      }
      const t = degreeMap.get(edge.targetId);
      if (t) {
        t.degree += 1;
        t.weightedDegree += edge.weight;
      }
    }
    return Array.from(degreeMap.entries())
      .map(([nodeId, v]) => ({ nodeId, rank: v.weightedDegree, degree: v.degree, weightedDegree: v.weightedDegree }))
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);
  },
};
