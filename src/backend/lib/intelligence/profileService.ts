import { GraphStore } from '../graph/GraphStore.js';
import { GraphQuery } from '../graph/GraphQuery.js';
import { NodeRank } from '../graph/NodeRank.js';
import { Sql } from '../../db.js';
import { GraphNode, GraphEdge } from '../graph/types.js';
import { EvidenceDocument } from '../../../shared/models.js';

export interface RiskIndicator {
  level: 'low' | 'medium' | 'high';
  label: string;
  reason: string;
}

export interface EntityClaim {
  claim: string;
  documentId: string;
  supporting: boolean;
  confidence: number;
}

export interface EntityProfile {
  node: GraphNode;
  summary: string;
  aliases: string[];
  timeline: Array<{ date: string; title: string; description: string; evidenceId?: string }>;
  relatedEntities: Array<{ node: GraphNode; edge: GraphEdge }>;
  connectedEvidence: EvidenceDocument[];
  claims: EntityClaim[];
  confidence: number;
  riskIndicators: RiskIndicator[];
  documentsMentioning: Array<{ id: string; title: string; retrievedDate: string; url: string }>;
  recentActivity: Array<{ timestamp: string; event: string; evidenceId?: string }>;
  rank: number;
  degree: number;
}

export const ProfileService = {
  async getProfile(entityId: string): Promise<EntityProfile | undefined> {
    const node = await GraphStore.getNode(entityId);
    if (!node) return undefined;

    const neighbourhood = await GraphQuery.getNeighbourhood(entityId, 1, { limit: 100 });
    const relatedEntities: Array<{ node: GraphNode; edge: GraphEdge }> = [];
    for (const edge of neighbourhood.edges) {
      const otherId = edge.sourceId === entityId ? edge.targetId : edge.sourceId;
      const other = neighbourhood.nodes.find((n) => n.id === otherId);
      if (other) relatedEntities.push({ node: other, edge });
    }

    const evidenceLinks = await GraphStore.getEvidenceForEntity(entityId);
    let connectedEvidence: EvidenceDocument[] = [];
    if (evidenceLinks.length) {
      const ids = evidenceLinks.map((e) => e.evidenceId);
      const placeholders = ids.map(() => '?').join(',');
      connectedEvidence = await Sql.all<EvidenceDocument>(
        `SELECT * FROM evidence WHERE id IN (${placeholders}) ORDER BY retrievedDate DESC LIMIT 20`,
        ids
      );
    }

    const documentsMentioning = connectedEvidence.map((doc) => ({
      id: doc.id,
      title: doc.title,
      retrievedDate: doc.retrievedDate,
      url: doc.url,
    }));

    const claims: EntityClaim[] = [];
    for (const doc of connectedEvidence.slice(0, 10)) {
      const sentences = doc.content.split(/(?<=[.!?])\s+/).filter((s) => s.toLowerCase().includes(node.name.toLowerCase()));
      for (const sentence of sentences.slice(0, 2)) {
        claims.push({
          claim: sentence.trim().slice(0, 280),
          documentId: doc.id,
          supporting: true,
          confidence: doc.confidence,
        });
      }
    }

    const timelineRows = await Sql.all<{ date: string; title: string; description: string; evidenceId?: string }>(
      `SELECT DISTINCT 
         CASE WHEN e2.type = 'Date' THEN e2.name ELSE '' END AS date,
         n.name AS title,
         r.reason AS description,
         r.evidenceId AS evidenceId
       FROM relationships r
       LEFT JOIN entities e2 ON e2.id = CASE WHEN r.sourceId = ? THEN r.targetId ELSE r.sourceId END
       LEFT JOIN entities n ON n.id = CASE WHEN r.sourceId = ? THEN r.targetId ELSE r.sourceId END
       WHERE (r.sourceId = ? OR r.targetId = ?) AND e2.type = 'Date'
       ORDER BY date ASC
       LIMIT 50`,
      [entityId, entityId, entityId, entityId]
    );

    const ranks = await NodeRank.degreeCentrality(2000);
    const rankEntry = ranks.find((r) => r.nodeId === entityId);

    const riskIndicators = this.computeRiskIndicators(node, relatedEntities, claims);
    const confidence = this.computeConfidence(node, relatedEntities, connectedEvidence.length);

    const recentActivity = connectedEvidence.slice(0, 8).map((doc) => ({
      timestamp: doc.retrievedDate,
      event: `Mentioned in ${doc.title}`,
      evidenceId: doc.id,
    }));

    return {
      node,
      summary: this.buildSummary(node, relatedEntities.length, connectedEvidence.length),
      aliases: this.deriveAliases(node),
      timeline: timelineRows,
      relatedEntities,
      connectedEvidence,
      claims,
      confidence,
      riskIndicators,
      documentsMentioning,
      recentActivity,
      rank: rankEntry?.rank || 0,
      degree: rankEntry?.degree || 0,
    };
  },

  buildSummary(node: GraphNode, relatedCount: number, evidenceCount: number): string {
    return `${node.name} is a ${node.type.toLowerCase()} entity referenced ${node.mentionCount} time(s) across ${evidenceCount} document(s), connected to ${relatedCount} related entities in the knowledge graph.`;
  },

  deriveAliases(node: GraphNode): string[] {
    const aliases: string[] = [];
    if (node.canonical && node.canonical !== node.name) aliases.push(node.canonical);
    const parts = node.name.split(/\s+/);
    if (parts.length > 1) {
      aliases.push(parts.map((p) => p[0]).join(''));
      if (parts[parts.length - 1].length > 3) aliases.push(parts[parts.length - 1]);
    }
    return Array.from(new Set(aliases)).slice(0, 5);
  },

  computeRiskIndicators(node: GraphNode, related: Array<{ node: GraphNode; edge: GraphEdge }>, claims: EntityClaim[]): RiskIndicator[] {
    const indicators: RiskIndicator[] = [];
    const opposed = related.filter((r) => r.edge.type === 'OPPOSED' || r.edge.type === 'CONTRADICTS');
    if (opposed.length > 0) {
      indicators.push({
        level: 'high',
        label: 'Conflicting relationships',
        reason: `${opposed.length} relationship(s) indicate opposition or contradiction.`,
      });
    }
    if (claims.length > 5) {
      indicators.push({
        level: 'medium',
        label: 'High claim volume',
        reason: `${claims.length} claims detected — verify consistency across sources.`,
      });
    }
    if (node.mentionCount > 20) {
      indicators.push({
        level: 'low',
        label: 'High visibility',
        reason: `Mentioned ${node.mentionCount} times — central entity requiring careful review.`,
      });
    }
    return indicators;
  },

  computeConfidence(node: GraphNode, related: Array<{ node: GraphNode; edge: GraphEdge }>, evidenceCount: number): number {
    const mentionFactor = Math.min(1, node.mentionCount / 10);
    const relationFactor = Math.min(1, related.length / 8);
    const evidenceFactor = Math.min(1, evidenceCount / 5);
    return Math.round((mentionFactor * 0.4 + relationFactor * 0.3 + evidenceFactor * 0.3) * 100) / 100;
  },
};
