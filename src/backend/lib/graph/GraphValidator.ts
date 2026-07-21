import { Sql } from '../../db.js';
import { Logger } from '../observability/Logger.js';
import { EventBus } from '../events/EventBus.js';

export interface ValidationResult {
  duplicateNodes: Array<{ name: string; type: string; ids: string[] }>;
  brokenEdges: Array<{ edgeId: string; sourceId: string; targetId: string; reason: string }>;
  orphanEntities: Array<{ entityId: string; name: string; type: string }>;
  invalidReferences: Array<{ evidenceId: string; entityId: string; reason: string }>;
  summary: { total: number; duplicates: number; broken: number; orphans: number; invalid: number };
}

export const GraphValidator = {
  async validate(): Promise<ValidationResult> {
    Logger.info('graph-validator', 'Starting graph validation');
    const duplicateNodes = await this.findDuplicateNodes();
    const brokenEdges = await this.findBrokenEdges();
    const orphanEntities = await this.findOrphanEntities();
    const invalidReferences = await this.findInvalidReferences();

    const result: ValidationResult = {
      duplicateNodes,
      brokenEdges,
      orphanEntities,
      invalidReferences,
      summary: {
        total: duplicateNodes.length + brokenEdges.length + orphanEntities.length + invalidReferences.length,
        duplicates: duplicateNodes.length,
        broken: brokenEdges.length,
        orphans: orphanEntities.length,
        invalid: invalidReferences.length,
      },
    };
    Logger.info('graph-validator', `Validation complete: ${result.summary.total} issues found`);
    return result;
  },

  async findDuplicateNodes(): Promise<Array<{ name: string; type: string; ids: string[] }>> {
    const rows = await Sql.all<{ name: string; type: string; id: string }>(
      `SELECT name, type, id FROM entities ORDER BY name`
    );
    const grouped = new Map<string, string[]>();
    for (const row of rows) {
      const key = `${row.name.toLowerCase()}|${row.type}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row.id);
    }
    const duplicates: Array<{ name: string; type: string; ids: string[] }> = [];
    for (const [key, ids] of grouped) {
      if (ids.length > 1) {
        const [name, type] = key.split('|');
        duplicates.push({ name, type, ids });
      }
    }
    return duplicates;
  },

  async findBrokenEdges(): Promise<Array<{ edgeId: string; sourceId: string; targetId: string; reason: string }>> {
    const rows = await Sql.all<{ id: string; sourceId: string; targetId: string }>(
      `SELECT id, sourceId, targetId FROM relationships`
    );
    const entityIds = new Set((await Sql.all<{ id: string }>(`SELECT id FROM entities`)).map((r) => r.id));
    const broken: Array<{ edgeId: string; sourceId: string; targetId: string; reason: string }> = [];
    for (const row of rows) {
      if (!entityIds.has(row.sourceId)) {
        broken.push({ edgeId: row.id, sourceId: row.sourceId, targetId: row.targetId, reason: 'source entity missing' });
      } else if (!entityIds.has(row.targetId)) {
        broken.push({ edgeId: row.id, sourceId: row.sourceId, targetId: row.targetId, reason: 'target entity missing' });
      }
    }
    return broken;
  },

  async findOrphanEntities(): Promise<Array<{ entityId: string; name: string; type: string }>> {
    const rows = await Sql.all<{ id: string; name: string; type: string }>(`SELECT id, name, type FROM entities`);
    const orphans: Array<{ entityId: string; name: string; type: string }> = [];
    for (const row of rows) {
      const edgeCount = await Sql.get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM relationships WHERE sourceId = ? OR targetId = ?`,
        [row.id, row.id]
      );
      const evidenceCount = await Sql.get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM evidence_entities WHERE entityId = ?`,
        [row.id]
      );
      if ((edgeCount?.count || 0) === 0 && (evidenceCount?.count || 0) === 0) {
        orphans.push({ entityId: row.id, name: row.name, type: row.type });
      }
    }
    return orphans;
  },

  async findInvalidReferences(): Promise<Array<{ evidenceId: string; entityId: string; reason: string }>> {
    const rows = await Sql.all<{ evidenceId: string; entityId: string }>(
      `SELECT evidenceId, entityId FROM evidence_entities`
    );
    const evidenceIds = new Set((await Sql.all<{ id: string }>(`SELECT id FROM evidence`)).map((r) => r.id));
    const entityIds = new Set((await Sql.all<{ id: string }>(`SELECT id FROM entities`)).map((r) => r.id));
    const invalid: Array<{ evidenceId: string; entityId: string; reason: string }> = [];
    for (const row of rows) {
      if (!evidenceIds.has(row.evidenceId)) {
        invalid.push({ evidenceId: row.evidenceId, entityId: row.entityId, reason: 'evidence document missing' });
      } else if (!entityIds.has(row.entityId)) {
        invalid.push({ evidenceId: row.evidenceId, entityId: row.entityId, reason: 'entity missing' });
      }
    }
    return invalid;
  },
};

export const SelfHealer = {
  async heal(): Promise<{
    duplicatesMerged: number;
    brokenEdgesRemoved: number;
    orphansRemoved: number;
    invalidRefsRemoved: number;
    indexesRebuilt: number;
  }> {
    Logger.info('self-healer', 'Starting self-healing');
    const validation = await GraphValidator.validate();

    let duplicatesMerged = 0;
    for (const dup of validation.duplicateNodes) {
      const [keepId, ...removeIds] = dup.ids;
      for (const removeId of removeIds) {
        await Sql.run(`UPDATE relationships SET sourceId = ? WHERE sourceId = ?`, [keepId, removeId]);
        await Sql.run(`UPDATE relationships SET targetId = ? WHERE targetId = ?`, [keepId, removeId]);
        await Sql.run(`UPDATE evidence_entities SET entityId = ? WHERE entityId = ?`, [keepId, removeId]);
        await Sql.run(`DELETE FROM entities WHERE id = ?`, [removeId]);
        duplicatesMerged += 1;
      }
    }

    let brokenEdgesRemoved = 0;
    for (const edge of validation.brokenEdges) {
      await Sql.run(`DELETE FROM relationships WHERE id = ?`, [edge.edgeId]);
      brokenEdgesRemoved += 1;
    }

    let orphansRemoved = 0;
    for (const orphan of validation.orphanEntities) {
      await Sql.run(`DELETE FROM entities WHERE id = ?`, [orphan.entityId]);
      orphansRemoved += 1;
    }

    let invalidRefsRemoved = 0;
    for (const ref of validation.invalidReferences) {
      await Sql.run(`DELETE FROM evidence_entities WHERE evidenceId = ? AND entityId = ?`, [ref.evidenceId, ref.entityId]);
      invalidRefsRemoved += 1;
    }

    const indexesRebuilt = await this.rebuildIndexes();

    EventBus.emit('GraphUpdated', { action: 'self-heal', duplicatesMerged, brokenEdgesRemoved, orphansRemoved, invalidRefsRemoved });
    Logger.info('self-healer', `Healing complete: merged ${duplicatesMerged}, removed ${brokenEdgesRemoved} edges, ${orphansRemoved} orphans, ${invalidRefsRemoved} invalid refs, rebuilt ${indexesRebuilt} indexes`);

    return { duplicatesMerged, brokenEdgesRemoved, orphansRemoved, invalidRefsRemoved, indexesRebuilt };
  },

  async rebuildIndexes(): Promise<number> {
    const indexes = [
      'idx_evidence_sourceId',
      'idx_evidence_retrievedDate',
      'idx_evidence_contentHash',
      'idx_relationships_sourceId',
      'idx_relationships_targetId',
      'idx_relationships_type',
      'idx_evidence_entities_entityId',
      'idx_evidence_entities_evidenceId',
      'idx_document_versions_evidenceId',
      'idx_jobs_status',
    ];
    for (const idx of indexes) {
      try {
        await Sql.run(`DROP INDEX IF EXISTS ${idx}`);
      } catch {
        // ignore
      }
    }
    const recreate = [
      `CREATE INDEX IF NOT EXISTS idx_evidence_sourceId ON evidence(sourceId)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_retrievedDate ON evidence(retrievedDate)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_contentHash ON evidence(contentHash)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_sourceId ON relationships(sourceId)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_targetId ON relationships(targetId)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_entities_entityId ON evidence_entities(entityId)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_entities_evidenceId ON evidence_entities(evidenceId)`,
      `CREATE INDEX IF NOT EXISTS idx_document_versions_evidenceId ON document_versions(evidenceId)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`,
    ];
    for (const stmt of recreate) {
      await Sql.run(stmt);
    }
    return recreate.length;
  },

  async rebuildGraph(): Promise<{ documentsProcessed: number; entitiesCreated: number; relationshipsCreated: number }> {
    Logger.info('self-healer', 'Rebuilding graph from evidence');
    const { intelligenceEngine } = await import('../intelligence/pipeline.js');
    const { Storage } = await import('../../storage.js');
    const evidence = await Storage.getEvidence();
    let entitiesCreated = 0;
    let relationshipsCreated = 0;
    for (const doc of evidence) {
      try {
        const source = await Storage.getSource(doc.sourceId || '');
        if (!source) continue;
        const result = await intelligenceEngine.analyze(doc, source);
        entitiesCreated += result.entities.length;
        relationshipsCreated += result.relationships.length;
      } catch (err) {
        Logger.error('self-healer', `Failed to rebuild graph for ${doc.id}: ${err}`);
      }
    }
    EventBus.emit('GraphUpdated', { action: 'rebuild', documentsProcessed: evidence.length, entitiesCreated, relationshipsCreated });
    return { documentsProcessed: evidence.length, entitiesCreated, relationshipsCreated };
  },
};
