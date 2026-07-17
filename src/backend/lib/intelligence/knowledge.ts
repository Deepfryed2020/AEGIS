import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { ExtractedEntity } from './entities.js';
import { ExtractedRelationship } from './relationships.js';
import { TimelineEvent } from './timeline.js';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentionCount: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  evidenceId?: string;
}

export const KnowledgeGraph = {
  async upsertEntity(name: string, type: string): Promise<string> {
    const existing = await Sql.get<{ id: string; mentionCount: number }>(
      `SELECT id, mentionCount FROM entities WHERE name = ? AND type = ?`,
      [name, type]
    );
    if (existing) {
      await Sql.run(`UPDATE entities SET mentionCount = ? WHERE id = ?`, [existing.mentionCount + 1, existing.id]);
      return existing.id;
    }
    const id = uuid();
    await Sql.run(
      `INSERT INTO entities (id, name, type, mentionCount) VALUES (?, ?, ?, ?)`,
      [id, name, type, 1]
    );
    return id;
  },

  async linkEvidence(evidenceId: string, entityId: string) {
    await Sql.run(
      `INSERT OR IGNORE INTO evidence_entities (evidenceId, entityId, mentionCount) VALUES (?, ?, ?)`,
      [evidenceId, entityId, 1]
    );
  },

  async addRelationship(sourceId: string, targetId: string, type: string, weight: number, evidenceId?: string) {
    const existing = await Sql.get<{ id: string; weight: number }>(
      `SELECT id, weight FROM relationships WHERE sourceId = ? AND targetId = ? AND type = ?`,
      [sourceId, targetId, type]
    );
    if (existing) {
      await Sql.run(`UPDATE relationships SET weight = ? WHERE id = ?`, [existing.weight + weight, existing.id]);
      return existing.id;
    }
    const id = uuid();
    await Sql.run(
      `INSERT OR IGNORE INTO relationships (id, sourceId, targetId, type, evidenceId, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, sourceId, targetId, type, evidenceId || null, new Date().toISOString()]
    );
    return id;
  },

  async getNodes(limit = 200): Promise<GraphNode[]> {
    return Sql.all<GraphNode>(
      `SELECT id, name, type, mentionCount FROM entities ORDER BY mentionCount DESC LIMIT ?`,
      [limit]
    );
  },

  async getEdges(limit = 400): Promise<GraphEdge[]> {
    return Sql.all<GraphEdge>(
      `SELECT id, sourceId, targetId, type, weight, evidenceId FROM relationships ORDER BY weight DESC LIMIT ?`,
      [limit]
    );
  },

  async getNeighbours(entityId: string, depth = 1): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const visited = new Set<string>([entityId]);

    const sourceNode = await Sql.get<GraphNode>(`SELECT id, name, type, mentionCount FROM entities WHERE id = ?`, [entityId]);
    if (sourceNode) nodes.set(sourceNode.id, sourceNode);

    let frontier: string[] = [entityId];
    for (let d = 0; d < depth; d += 1) {
      const next: string[] = [];
      for (const nodeId of frontier) {
        const outgoing = await Sql.all<GraphEdge>(
          `SELECT id, sourceId, targetId, type, weight, evidenceId FROM relationships WHERE sourceId = ? OR targetId = ?`,
          [nodeId, nodeId]
        );
        for (const edge of outgoing) {
          edges.push(edge);
          const neighbourId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          if (!visited.has(neighbourId)) {
            visited.add(neighbourId);
            next.push(neighbourId);
            const node = await Sql.get<GraphNode>(`SELECT id, name, type, mentionCount FROM entities WHERE id = ?`, [neighbourId]);
            if (node) nodes.set(node.id, node);
          }
        }
      }
      frontier = next;
    }

    return { nodes: Array.from(nodes.values()), edges };
  },

  async ingestExtracted(evidenceId: string, entities: ExtractedEntity[], relationships: ExtractedRelationship[], timeline: TimelineEvent[]) {
    const nameToId = new Map<string, string>();
    for (const entity of entities) {
      const id = await this.upsertEntity(entity.name, entity.type);
      await this.linkEvidence(evidenceId, id);
      nameToId.set(entity.name.toLowerCase(), id);
    }

    for (const rel of relationships) {
      const sourceId = nameToId.get(rel.sourceName.toLowerCase());
      const targetId = nameToId.get(rel.targetName.toLowerCase());
      if (sourceId && targetId) {
        await this.addRelationship(sourceId, targetId, rel.type, rel.weight, evidenceId);
      }
    }
  },
};
