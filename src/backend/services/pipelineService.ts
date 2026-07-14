import { v4 as uuid } from 'uuid';
import { Sql } from '../db.js';
import { DocumentStage, EvidenceDocument } from '../../shared/models.js';

export interface DocumentStageRecord {
  id: string;
  evidenceId: string;
  stage: DocumentStage;
  status: 'Queued' | 'Active' | 'Completed' | 'Failed';
  startedAt: string;
  completedAt?: string;
  details?: string;
}

export const PipelineService = {
  async createStage(evidenceId: string, stage: DocumentStage, details?: string) {
    const record: DocumentStageRecord = {
      id: uuid(),
      evidenceId,
      stage,
      status: 'Queued',
      startedAt: new Date().toISOString(),
      details,
    };
    await Sql.run(
      `INSERT INTO document_stages (id, evidenceId, stage, status, startedAt, completedAt, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.evidenceId, record.stage, record.status, record.startedAt, null, record.details || null]
    );
    return record;
  },
  async updateStage(evidenceId: string, stage: DocumentStage, status: DocumentStageRecord['status'], details?: string) {
    const completedAt = status === 'Completed' || status === 'Failed' ? new Date().toISOString() : null;
    await Sql.run(
      `UPDATE document_stages SET status = ?, completedAt = ?, details = ? WHERE evidenceId = ? AND stage = ? AND status != 'Completed'`,
      [status, completedAt, details || null, evidenceId, stage]
    );
    return this.getLatestStage(evidenceId);
  },
  async getLatestStage(evidenceId: string) {
    return Sql.get<DocumentStageRecord>(
      `SELECT * FROM document_stages WHERE evidenceId = ? ORDER BY startedAt DESC LIMIT 1`,
      [evidenceId]
    );
  },
  async getPipelineForEvidence(evidenceId: string) {
    return Sql.all<DocumentStageRecord>(
      `SELECT * FROM document_stages WHERE evidenceId = ? ORDER BY startedAt ASC`,
      [evidenceId]
    );
  },
  async addChunk(evidenceId: string, chunkIndex: number, snippet: string) {
    await Sql.run(
      `INSERT INTO document_chunks (id, evidenceId, chunkIndex, chunkHash, snippet, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), evidenceId, chunkIndex, '', snippet, new Date().toISOString()]
    );
  },
  async addRelationship(sourceId: string, targetId: string, type: string, evidenceId?: string) {
    await Sql.run(
      `INSERT OR IGNORE INTO relationships (id, sourceId, targetId, type, evidenceId, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), sourceId, targetId, type, evidenceId || null, new Date().toISOString()]
    );
  },
  async addEntity(evidenceId: string, name: string, type: string) {
    const existing = await Sql.get<{ id: string; mentionCount: number }>(
      `SELECT id, mentionCount FROM entities WHERE name = ? AND type = ?`,
      [name, type]
    );
    let entityId = existing?.id;
    if (existing) {
      await Sql.run(`UPDATE entities SET mentionCount = ? WHERE id = ?`, [existing.mentionCount + 1, existing.id]);
    } else {
      entityId = uuid();
      await Sql.run(
        `INSERT INTO entities (id, name, type, mentionCount) VALUES (?, ?, ?, ?)`,
        [entityId, name, type, 1]
      );
    }
    await Sql.run(
      `INSERT OR IGNORE INTO evidence_entities (evidenceId, entityId, mentionCount) VALUES (?, ?, ?)`,
      [evidenceId, entityId, 1]
    );
    return entityId;
  },
  async recordVersion(evidenceId: string, contentHash: string, summary: string, diff: string, changeType: string, pageCount?: number) {
    await Sql.run(
      `INSERT INTO document_versions (id, evidenceId, versionedAt, contentHash, summary, diff, changeType, pageCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), evidenceId, new Date().toISOString(), contentHash, summary || null, diff || null, changeType, pageCount || null]
    );
  },
  async getActiveDocuments() {
    return Sql.all(
      `SELECT e.*, s.stage, s.status AS stageStatus, s.startedAt AS stageStartedAt, s.completedAt AS stageCompletedAt
       FROM evidence e
       LEFT JOIN document_stages s
       ON s.evidenceId = e.id
       AND s.startedAt = (
         SELECT MAX(startedAt)
         FROM document_stages
         WHERE evidenceId = e.id
       )`,
      []
    );
  }
};
