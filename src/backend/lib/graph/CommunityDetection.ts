import { GraphStore } from './GraphStore.js';
import { Community, GraphNode, GraphEdge } from './types.js';
import { v4 as uuid } from 'uuid';

export const CommunityDetection = {
  async detectCommunities(maxIterations = 5): Promise<Community[]> {
    const nodes = await GraphStore.getNodes(2000);
    const edges = await GraphStore.getEdges(4000);

    const adjacency = new Map<string, Set<string>>();
    for (const node of nodes) adjacency.set(node.id, new Set());
    for (const edge of edges) {
      adjacency.get(edge.sourceId)?.add(edge.targetId);
      adjacency.get(edge.targetId)?.add(edge.sourceId);
    }

    const communityOf = new Map<string, string>();
    for (const node of nodes) communityOf.set(node.id, node.id);

    for (let iter = 0; iter < maxIterations; iter += 1) {
      let changed = false;
      for (const node of nodes) {
        const neighborCommunities = new Map<string, number>();
        const neighbors = adjacency.get(node.id) || new Set<string>();
        for (const neighbourId of neighbors) {
          const c = communityOf.get(neighbourId);
          if (!c) continue;
          neighborCommunities.set(c, (neighborCommunities.get(c) || 0) + 1);
        }
        if (neighborCommunities.size === 0) continue;
        let bestCommunity = communityOf.get(node.id)!;
        let bestCount = 0;
        for (const [community, count] of neighborCommunities) {
          if (count > bestCount) {
            bestCount = count;
            bestCommunity = community;
          }
        }
        if (bestCommunity !== communityOf.get(node.id)) {
          communityOf.set(node.id, bestCommunity);
          changed = true;
        }
      }
      if (!changed) break;
    }

    const groups = new Map<string, string[]>();
    for (const [nodeId, community] of communityOf) {
      if (!groups.has(community)) groups.set(community, []);
      groups.get(community)!.push(nodeId);
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));
    const communities: Community[] = [];
    for (const [seed, memberIds] of groups) {
      if (memberIds.length < 2) continue;
      const labelNode = nodeMap.get(seed);
      communities.push({
        id: uuid(),
        label: labelNode?.name || seed,
        memberIds,
        size: memberIds.length,
        modularity: 0,
      });
    }
    return communities.sort((a, b) => b.size - a.size);
  },
};
