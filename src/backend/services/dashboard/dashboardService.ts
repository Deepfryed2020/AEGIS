import { Sql } from '../../db.js';
import { GraphQuery } from '../../lib/graph/GraphQuery.js';
import { NodeRank } from '../../lib/graph/NodeRank.js';
import { ReliabilityEngine } from '../reliability/reliabilityEngine.js';
import { ClaimResolutionEngine } from '../claims/claimResolutionEngine.js';

export interface DashboardStats {
  investigations: number;
  evidence: number;
  sources: number;
  relationships: number;
  entities: number;
  claims: number;
  jobs: number;
  queuePending: number;
  latestImports: Array<{ id: string; title: string; sourceName: string; retrievedDate: string; documentType: string }>;
  relationshipGrowth: Array<{ date: string; count: number }>;
  entityGrowth: Array<{ date: string; count: number }>;
  mostConnectedOrganisations: Array<{ name: string; degree: number; mentionCount: number }>;
  evidenceConfidence: { average: number; high: number; medium: number; low: number };
  claimConflicts: Array<{ claim: string; supporting: number; contradicting: number }>;
  timelineActivity: Array<{ date: string; count: number }>;
  sourceReliability: Array<{ sourceId: string; sourceName: string; compositeScore: number; sourceClass: string }>;
  investigationProgress: Array<{ id: string; title: string; evidenceCount: number; archived: number }>;
  graphStats: { nodeCount: number; edgeCount: number; typeDistribution: Record<string, number> };
}

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [investigations, evidence, sources, relationships, entities, claims, jobs, queuePending] = await Promise.all([
      this.count('investigations'),
      this.count('evidence'),
      this.count('sources'),
      this.count('relationships'),
      this.count('entities'),
      this.count('resolved_claims'),
      this.count('jobs'),
      this.countWhere('ingestion_queue', "status = 'queued'"),
    ]);

    const latestImports = await Sql.all<{ id: string; title: string; sourceName: string; retrievedDate: string; documentType: string }>(
      `SELECT id, title, sourceName, retrievedDate, documentType FROM evidence ORDER BY retrievedDate DESC LIMIT 10`
    );

    const relationshipGrowth = await this.growthOverTime('relationships', 'createdAt');
    const entityGrowth = await this.growthOverTime('entities', 'createdAt');
    const timelineActivity = await this.growthOverTime('document_versions', 'versionedAt');

    const graphStats = await GraphQuery.getStats();
    const mostConnectedOrganisations = graphStats.topConnected
      .filter((n) => n.type === 'Company' || n.type === 'Department' || n.type === 'Agency')
      .map((n) => ({ name: n.name, degree: n.degree, mentionCount: n.mentionCount }));

    const evidenceConfidence = await this.computeConfidenceDistribution();
    const claimConflicts = await this.computeClaimConflicts();
    const sourceReliability = (await ReliabilityEngine.scoreAll()).slice(0, 10).map((s) => ({
      sourceId: s.sourceId,
      sourceName: s.sourceName,
      compositeScore: s.compositeScore,
      sourceClass: s.sourceClass,
    }));
    const investigationProgress = await this.computeInvestigationProgress();

    return {
      investigations,
      evidence,
      sources,
      relationships,
      entities,
      claims,
      jobs,
      queuePending,
      latestImports,
      relationshipGrowth,
      entityGrowth,
      mostConnectedOrganisations,
      evidenceConfidence,
      claimConflicts,
      timelineActivity,
      sourceReliability,
      investigationProgress,
      graphStats: { nodeCount: graphStats.nodeCount, edgeCount: graphStats.edgeCount, typeDistribution: graphStats.typeDistribution },
    };
  },

  async count(table: string): Promise<number> {
    const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
    return row?.count || 0;
  },

  async countWhere(table: string, where: string): Promise<number> {
    const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`);
    return row?.count || 0;
  },

  async growthOverTime(table: string, dateColumn: string): Promise<Array<{ date: string; count: number }>> {
    const hasColumn = await this.columnExists(table, dateColumn);
    if (!hasColumn) return [];
    const rows = await Sql.all<{ date: string; count: number }>(
      `SELECT substr(${dateColumn}, 1, 10) AS date, COUNT(*) AS count
       FROM ${table}
       WHERE ${dateColumn} IS NOT NULL
       GROUP BY date
       ORDER BY date DESC
       LIMIT 30`
    );
    return rows.reverse();
  },

  async columnExists(table: string, column: string): Promise<boolean> {
    const rows = await Sql.all<{ name: string }>(`PRAGMA table_info(${table})`);
    return rows.some((r) => r.name === column);
  },

  async computeConfidenceDistribution(): Promise<{ average: number; high: number; medium: number; low: number }> {
    const row = await Sql.get<{ avg: number; high: number; medium: number; low: number }>(
      `SELECT
         AVG(confidence) AS avg,
         SUM(CASE WHEN confidence >= 0.75 THEN 1 ELSE 0 END) AS high,
         SUM(CASE WHEN confidence >= 0.5 AND confidence < 0.75 THEN 1 ELSE 0 END) AS medium,
         SUM(CASE WHEN confidence < 0.5 THEN 1 ELSE 0 END) AS low
       FROM evidence`
    );
    return {
      average: Math.round((row?.avg || 0) * 100) / 100,
      high: row?.high || 0,
      medium: row?.medium || 0,
      low: row?.low || 0,
    };
  },

  async computeClaimConflicts(): Promise<Array<{ claim: string; supporting: number; contradicting: number }>> {
    const rows = await Sql.all<{ claim: string; supporting: number; contradicting: number }>(
      `SELECT claim, supportingCount AS supporting, contradictingCount AS contradicting
       FROM resolved_claims
       WHERE contradictingCount > 0
       ORDER BY contradictingCount DESC
       LIMIT 10`
    );
    return rows;
  },

  async computeInvestigationProgress(): Promise<Array<{ id: string; title: string; evidenceCount: number; archived: number }>> {
    const rows = await Sql.all<{ id: string; title: string; evidenceCount: number; archived: number }>(
      `SELECT i.id, i.title, i.archived,
         (SELECT COUNT(*) FROM investigation_evidence ie WHERE ie.investigationId = i.id) AS evidenceCount
       FROM investigations i
       ORDER BY i.createdAt DESC
       LIMIT 10`
    );
    return rows;
  },
};
