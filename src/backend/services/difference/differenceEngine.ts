import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { EvidenceDocument } from '../../../shared/models.js';

export interface DocumentDifference {
  id: string;
  evidenceId: string;
  versionA: string;
  versionB: string;
  addedParagraphs: string[];
  removedParagraphs: string[];
  amendedParagraphs: Array<{ before: string; after: string; similarity: number }>;
  changedFigures: Array<{ before: string; after: string }>;
  newEntities: string[];
  removedEntities: string[];
  policyChanges: string[];
  summary: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  evidenceId: string;
  versionedAt: string;
  contentHash: string;
  summary: string;
  diff?: string;
  changeType: 'Added' | 'Removed' | 'Modified';
  pageCount?: number;
}

export const DifferenceEngine = {
  async recordVersion(evidenceId: string, contentHash: string, summary: string, changeType: 'Added' | 'Removed' | 'Modified'): Promise<void> {
    await Sql.run(
      `INSERT INTO document_versions (id, evidenceId, versionedAt, contentHash, summary, changeType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), evidenceId, new Date().toISOString(), contentHash, summary, changeType]
    );
  },

  async getVersions(evidenceId: string): Promise<DocumentVersion[]> {
    return Sql.all<DocumentVersion>(
      `SELECT * FROM document_versions WHERE evidenceId = ? ORDER BY versionedAt DESC`,
      [evidenceId]
    );
  },

  async compareVersions(evidenceId: string, versionAId: string, versionBId: string): Promise<DocumentDifference | undefined> {
    const versionA = await Sql.get<DocumentVersion>(`SELECT * FROM document_versions WHERE id = ? AND evidenceId = ?`, [versionAId, evidenceId]);
    const versionB = await Sql.get<DocumentVersion>(`SELECT * FROM document_versions WHERE id = ? AND evidenceId = ?`, [versionBId, evidenceId]);
    if (!versionA || !versionB) return undefined;

    const docA = await Sql.get<EvidenceDocument>(`SELECT * FROM evidence WHERE id = ?`, [evidenceId]);
    if (!docA) return undefined;

    const contentA = versionA.summary || '';
    const contentB = versionB.summary || '';
    const paragraphsA = this.splitParagraphs(contentA);
    const paragraphsB = this.splitParagraphs(contentB);

    const addedParagraphs = paragraphsB.filter((p) => !paragraphsA.some((q) => this.similarity(p, q) > 0.7));
    const removedParagraphs = paragraphsA.filter((p) => !paragraphsB.some((q) => this.similarity(p, q) > 0.7));
    const amendedParagraphs: Array<{ before: string; after: string; similarity: number }> = [];
    for (const a of paragraphsA) {
      for (const b of paragraphsB) {
        const sim = this.similarity(a, b);
        if (sim > 0.4 && sim < 0.7) {
          amendedParagraphs.push({ before: a, after: b, similarity: sim });
        }
      }
    }

    const changedFigures = this.detectChangedFigures(contentA, contentB);
    const entitiesA = await this.getEntitiesForVersion(evidenceId);
    const entitiesB = entitiesA;
    const newEntities = entitiesB.filter((e) => !entitiesA.includes(e));
    const removedEntities = entitiesA.filter((e) => !entitiesB.includes(e));
    const policyChanges = this.detectPolicyChanges(contentA, contentB);

    const diff: DocumentDifference = {
      id: uuid(),
      evidenceId,
      versionA: versionAId,
      versionB: versionBId,
      addedParagraphs,
      removedParagraphs,
      amendedParagraphs,
      changedFigures,
      newEntities,
      removedEntities,
      policyChanges,
      summary: `${addedParagraphs.length} added, ${removedParagraphs.length} removed, ${amendedParagraphs.length} amended, ${changedFigures.length} figure changes`,
      createdAt: new Date().toISOString(),
    };
    return diff;
  },

  splitParagraphs(content: string): string[] {
    return content.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 20);
  },

  similarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = Array.from(wordsA).filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  },

  detectChangedFigures(a: string, b: string): Array<{ before: string; after: string }> {
    const figureRegex = /\$[\d,]+(?:\.\d+)?(?:\s?(?:million|billion|thousand))?|\b\d+(?:,\d{3})+\b/g;
    const figuresA = a.match(figureRegex) || [];
    const figuresB = b.match(figureRegex) || [];
    const changes: Array<{ before: string; after: string }> = [];
    const maxLen = Math.max(figuresA.length, figuresB.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (figuresA[i] !== figuresB[i]) {
        changes.push({ before: figuresA[i] || '', after: figuresB[i] || '' });
      }
    }
    return changes;
  },

  async getEntitiesForVersion(evidenceId: string): Promise<string[]> {
    const rows = await Sql.all<{ name: string }>(
      `SELECT e.name FROM entities e
       JOIN evidence_entities ee ON ee.entityId = e.id
       WHERE ee.evidenceId = ?`,
      [evidenceId]
    );
    return rows.map((r) => r.name);
  },

  detectPolicyChanges(a: string, b: string): string[] {
    const policyKeywords = ['policy', 'regulation', 'amendment', 'reform', 'threshold', 'eligibility', 'rate', 'levy'];
    const changes: string[] = [];
    const sentencesA = a.split(/(?<=[.!?])\s+/);
    const sentencesB = b.split(/(?<=[.!?])\s+/);
    for (const sentence of sentencesB) {
      if (policyKeywords.some((k) => sentence.toLowerCase().includes(k))) {
        if (!sentencesA.some((s) => this.similarity(s, sentence) > 0.8)) {
          changes.push(sentence.trim().slice(0, 200));
        }
      }
    }
    return changes.slice(0, 10);
  },

  async compareSideBySide(evidenceId: string): Promise<{ versions: DocumentVersion[]; latestDiff?: DocumentDifference }> {
    const versions = await this.getVersions(evidenceId);
    let latestDiff: DocumentDifference | undefined;
    if (versions.length >= 2) {
      latestDiff = await this.compareVersions(evidenceId, versions[1].id, versions[0].id);
    }
    return { versions, latestDiff };
  },
};
