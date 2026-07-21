import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { GraphNode, GraphEdge, GraphRelationshipType } from './types.js';

export interface UpsertNodeInput {
  name: string;
  type: string;
  canonical?: string;
}

export interface UpsertEdgeInput {
  sourceId: string;
  targetId: string;
  type: GraphRelationshipType;
  confidence: number;
  source: string;
  citation?: string;
  reason?: string;
  weight?: number;
  evidenceId?: string;
  timestamp?: string;
}

export const GraphStore = {
  async upsertNode(input: UpsertNodeInput): Promise<GraphNode> {
    const existing = await Sql.get<GraphNode>(
      `SELECT * FROM entities WHERE name = ? AND type = ?`,
      [input.name, input.type]
    );
    const now = new Date().toISOString();
    if (existing) {
      await Sql.run(
        `UPDATE entities SET mentionCount = ?, canonical = COALESCE(?, canonical), updatedAt = ? WHERE id = ?`,
        [existing.mentionCount + 1, input.canonical || null, now, existing.id]
      );
      return { ...existing, mentionCount: existing.mentionCount + 1, updatedAt: now };
    }
    const node: GraphNode = {
      id: uuid(),
      name: input.name,
      type: input.type,
      canonical: input.canonical,
      mentionCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    await Sql.run(
      `INSERT INTO entities (id, name, type, canonical, mentionCount) VALUES (?, ?, ?, ?, ?)`,
      [node.id, node.name, node.type, node.canonical || null, node.mentionCount]
    );
    return node;
  },

  async getNode(id: string): Promise<GraphNode | undefined> {
    return Sql.get<GraphNode>(`SELECT * FROM entities WHERE id = ?`, [id]);
  },

  async findNode(name: string, type?: string): Promise<GraphNode | undefined> {
    if (type) {
      return Sql.get<GraphNode>(`SELECT * FROM entities WHERE name = ? AND type = ?`, [name, type]);
    }
    return Sql.get<GraphNode>(`SELECT * FROM entities WHERE name = ? LIMIT 1`, [name]);
  },

  async getNodes(limit = 200, offset = 0): Promise<GraphNode[]> {
    return Sql.all<GraphNode>(
      `SELECT * FROM entities ORDER BY mentionCount DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  async countNodes(): Promise<number> {
    const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM entities`);
    return row?.count || 0;
  },

  async upsertEdge(input: UpsertEdgeInput): Promise<GraphEdge> {
    const existing = await Sql.get<GraphEdge>(
      `SELECT * FROM relationships WHERE sourceId = ? AND targetId = ? AND type = ?`,
      [input.sourceId, input.targetId, input.type]
    );
    const now = new Date().toISOString();
    const weight = input.weight ?? 1;
    if (existing) {
      const newWeight = existing.weight + weight;
      const newConfidence = Math.min(1, (existing.confidence + input.confidence) / 2);
      await Sql.run(
        `UPDATE relationships SET weight = ?, confidence = ?, reason = COALESCE(?, reason), citation = COALESCE(?, citation), updatedAt = ? WHERE id = ?`,
        [newWeight, newConfidence, input.reason || null, input.citation || null, now, existing.id]
      );
      return { ...existing, weight: newWeight, confidence: newConfidence, updatedAt: now };
    }
    const edge: GraphEdge = {
      id: uuid(),
      sourceId: input.sourceId,
      targetId: input.targetId,
      type: input.type,
      confidence: input.confidence,
      source: input.source,
      timestamp: input.timestamp || now,
      citation: input.citation,
      reason: input.reason,
      weight,
      evidenceId: input.evidenceId,
      createdAt: now,
      updatedAt: now,
    };
    await Sql.run(
      `INSERT INTO relationships (id, sourceId, targetId, type, confidence, source, timestamp, citation, reason, weight, evidenceId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [edge.id, edge.sourceId, edge.targetId, edge.type, edge.confidence, edge.source, edge.timestamp, edge.citation || null, edge.reason || null, edge.weight, edge.evidenceId || null, edge.createdAt, edge.updatedAt]
    );
    return edge;
  },

  async getEdges(limit = 400, offset = 0): Promise<GraphEdge[]> {
    return Sql.all<GraphEdge>(
      `SELECT * FROM relationships ORDER BY weight DESC, updatedAt DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  async countEdges(): Promise<number> {
    const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM relationships`);
    return row?.count || 0;
  },

  async getEdgesForNode(nodeId: string): Promise<GraphEdge[]> {
    return Sql.all<GraphEdge>(
      `SELECT * FROM relationships WHERE sourceId = ? OR targetId = ? ORDER BY weight DESC`,
      [nodeId, nodeId]
    );
  },

  async getNodesByIds(ids: string[]): Promise<GraphNode[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return Sql.all<GraphNode>(`SELECT * FROM entities WHERE id IN (${placeholders})`, ids);
  },

  async linkEvidence(evidenceId: string, entityId: string, mentionCount = 1): Promise<void> {
    await Sql.run(
      `INSERT INTO evidence_entities (evidenceId, entityId, mentionCount) VALUES (?, ?, ?)
       ON CONFLICT(evidenceId, entityId) DO UPDATE SET mentionCount = mentionCount + ?`,
      [evidenceId, entityId, mentionCount, mentionCount]
    );
  },

  async getEvidenceForEntity(entityId: string): Promise<Array<{ evidenceId: string; mentionCount: number }>> {
    return Sql.all(
      `SELECT evidenceId, mentionCount FROM evidence_entities WHERE entityId = ?`,
      [entityId]
    );
  },

  async getEntitiesForEvidence(evidenceId: string): Promise<GraphNode[]> {
    return Sql.all<GraphNode>(
      `SELECT e.* FROM entities e
       JOIN evidence_entities ee ON ee.entityId = e.id
       WHERE ee.evidenceId = ?`,
      [evidenceId]
    );
  },

  async getTopConnectedNodes(limit = 10): Promise<Array<GraphNode & { degree: number }>> {
    return Sql.all<GraphNode & { degree: number }>(
      `SELECT e.*, (
         SELECT COUNT(*) FROM relationships r WHERE r.sourceId = e.id OR r.targetId = e.id
       ) AS degree
       FROM entities e
       ORDER BY degree DESC, e.mentionCount DESC
       LIMIT ?`,
      [limit]
    );
  },
};
