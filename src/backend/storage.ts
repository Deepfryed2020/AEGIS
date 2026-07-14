import { Sql } from './db.js';
import { EvidenceDocument, Investigation, SourceMetadata } from '../shared/models.js';

function textSafe(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

export const Storage = {
  async addSource(source: SourceMetadata) {
    await Sql.run(
      `INSERT OR REPLACE INTO sources (id, name, url, level, authorityScore, trustScore, officialStatus, lastCrawled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [source.id, source.name, source.url, source.level, source.authorityScore, source.trustScore, source.officialStatus, source.lastCrawled || null]
    );
    return source;
  },
  async getSources() {
    return Sql.all<SourceMetadata>(`SELECT * FROM sources ORDER BY name`);
  },
  async getSource(id: string) {
    return Sql.get<SourceMetadata>(`SELECT * FROM sources WHERE id = ?`, [id]);
  },
  async addEvidence(document: EvidenceDocument) {
    await Sql.run(
      `INSERT INTO evidence (id, sourceId, sourceName, title, url, documentType, publisher, author, publicationDate, retrievedDate, indexedAt, confidence, organisation, summary, entities, topics, keywords, language, pages, "headings", "references", "footnotes", status, ocrUsed, wordCount, citationCount, content, contentHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        document.sourceId,
        document.sourceName,
        document.title,
        document.url,
        document.documentType,
        document.publisher || null,
        document.author || null,
        document.publicationDate || null,
        document.retrievedDate,
        document.indexedAt,
        document.confidence,
        document.organisation || null,
        document.summary || null,
        textSafe(document.entities),
        textSafe(document.topics),
        textSafe(document.keywords),
        document.language || null,
        document.pages || null,
        textSafe(document.headings),
        textSafe(document.references),
        textSafe(document.footnotes),
        document.status || 'Completed',
        document.ocrUsed ? 1 : 0,
        document.wordCount || document.content.split(/\s+/).filter(Boolean).length,
        document.citationCount || 0,
        document.content,
        document.contentHash,
      ]
    );

    await Sql.run(
      `INSERT INTO evidence_fts (rowid, title, content, sourceName, organisation, publisher, summary, keywords, topics, entities)
       VALUES ((SELECT rowid FROM evidence WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        document.title,
        document.content,
        document.sourceName,
        document.organisation || '',
        document.publisher || '',
        document.summary || '',
        textSafe(document.keywords),
        textSafe(document.topics),
        textSafe(document.entities),
      ]
    );
    return document;
  },
  async getEvidence() {
    return Sql.all<EvidenceDocument>(`SELECT * FROM evidence ORDER BY retrievedDate DESC`);
  },
  async getEvidenceById(id: string) {
    return Sql.get<EvidenceDocument>(`SELECT * FROM evidence WHERE id = ?`, [id]);
  },
  async getEvidenceByHash(hash: string) {
    return Sql.get<EvidenceDocument>(`SELECT * FROM evidence WHERE contentHash = ?`, [hash]);
  },
  async getEvidenceByUrl(url: string) {
    return Sql.get<EvidenceDocument>(`SELECT * FROM evidence WHERE url = ?`, [url]);
  },
  async searchEvidence(query: string) {
    const results = await Sql.all<EvidenceDocument>(
      `SELECT e.* FROM evidence_fts f JOIN evidence e ON e.rowid = f.rowid WHERE evidence_fts MATCH ? ORDER BY e.retrievedDate DESC`,
      [query]
    );
    if (results.length) return results;
    const lower = `%${query.toLowerCase()}%`;
    return Sql.all<EvidenceDocument>(
      `SELECT * FROM evidence WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(sourceName) LIKE ? ORDER BY retrievedDate DESC`,
      [lower, lower, lower]
    );
  },
  async updateEvidence(document: EvidenceDocument) {
    await Sql.run(
      `UPDATE evidence SET title = ?, sourceId = ?, sourceName = ?, documentType = ?, publisher = ?, author = ?, publicationDate = ?, retrievedDate = ?, indexedAt = ?, confidence = ?, organisation = ?, summary = ?, entities = ?, topics = ?, keywords = ?, content = ?, contentHash = ?, language = ?, pages = ?, "headings" = ?, "references" = ?, "footnotes" = ?, status = ? WHERE id = ?`,
      [
        document.title,
        document.sourceId,
        document.sourceName,
        document.documentType,
        document.publisher || null,
        document.author || null,
        document.publicationDate || null,
        document.retrievedDate,
        document.indexedAt,
        document.confidence,
        document.organisation || null,
        document.summary || null,
        textSafe(document.entities),
        textSafe(document.topics),
        textSafe(document.keywords),
        document.content,
        document.contentHash,
        document.language || null,
        document.pages || null,
        textSafe(document.headings),
        textSafe(document.references),
        textSafe(document.footnotes),
        document.status || 'Completed',
        document.id,
      ]
    );

    await Sql.run(
      `UPDATE evidence_fts SET title = ?, content = ?, sourceName = ?, organisation = ?, publisher = ?, summary = ?, keywords = ?, topics = ?, entities = ?, "headings" = ?, "references" = ? WHERE rowid = (SELECT rowid FROM evidence WHERE id = ?)`,
      [
        document.title,
        document.content,
        document.sourceName,
        document.organisation || '',
        document.publisher || '',
        document.summary || '',
        textSafe(document.keywords),
        textSafe(document.topics),
        textSafe(document.entities),
        textSafe(document.headings),
        textSafe(document.references),
        document.id,
      ]
    );
    return document;
  },
  async addInvestigation(investigation: Investigation) {
    await Sql.run(
      `INSERT INTO investigations (id, title, description, createdAt, notes) VALUES (?, ?, ?, ?, ?)`,
      [investigation.id, investigation.title, investigation.description || '', investigation.createdAt, investigation.notes || '']
    );
    return investigation;
  },
  async getInvestigations() {
    const investigations = await Sql.all<Investigation>(`SELECT * FROM investigations ORDER BY createdAt DESC`);
    return Promise.all(investigations.map(async (investigation) => {
      const evidenceIds = await Sql.all<{ evidenceId: string }>(`SELECT evidenceId FROM investigation_evidence WHERE investigationId = ?`, [investigation.id]);
      return { ...investigation, evidenceIds: evidenceIds.map((row) => row.evidenceId) };
    }));
  },
  async getInvestigation(id: string) {
    const investigation = await Sql.get<Investigation>(`SELECT * FROM investigations WHERE id = ?`, [id]);
    if (!investigation) return undefined;
    const evidenceIds = await Sql.all<{ evidenceId: string }>(`SELECT evidenceId FROM investigation_evidence WHERE investigationId = ?`, [id]);
    return { ...investigation, evidenceIds: evidenceIds.map((row) => row.evidenceId) };
  },
  async updateInvestigation(id: string, updates: Partial<Investigation>) {
    const existing = await Sql.get<Investigation>(`SELECT * FROM investigations WHERE id = ?`, [id]);
    if (!existing) return undefined;
    const title = updates.title ?? existing.title;
    const description = updates.description ?? existing.description;
    const notes = updates.notes ?? existing.notes;
    const archived = typeof updates.archived === 'number' ? updates.archived : existing.archived || 0;
    const archivedAt = updates.archivedAt ?? (existing.archivedAt ?? null);
    await Sql.run(
      `UPDATE investigations SET title = ?, description = ?, notes = ?, archived = ?, archivedAt = ? WHERE id = ?`,
      [title, description, notes, archived, archivedAt, id]
    );
    return this.getInvestigation(id);
  },
  async deleteInvestigation(id: string) {
    await Sql.run(`DELETE FROM investigation_evidence WHERE investigationId = ?`, [id]);
    await Sql.run(`DELETE FROM reports WHERE investigationId = ?`, [id]);
    await Sql.run(`DELETE FROM investigations WHERE id = ?`, [id]);
    return true;
  },
  async linkEvidenceToInvestigation(investigationId: string, evidenceId: string) {
    await Sql.run(`INSERT OR IGNORE INTO investigation_evidence (investigationId, evidenceId, tags, bookmarked) VALUES (?, ?, ?, ?)`, [investigationId, evidenceId, '', 0]);
    return this.getInvestigation(investigationId);
  },
  async removeEvidenceFromInvestigation(investigationId: string, evidenceId: string) {
    await Sql.run(`DELETE FROM investigation_evidence WHERE investigationId = ? AND evidenceId = ?`, [investigationId, evidenceId]);
    return this.getInvestigation(investigationId);
  },
  async getInvestigationEvidence(investigationId: string) {
    const rows = await Sql.all<{ evidenceId: string }>(`SELECT evidenceId FROM investigation_evidence WHERE investigationId = ?`, [investigationId]);
    const evidenceIds = rows.map((row) => row.evidenceId);
    if (!evidenceIds.length) return [];
    return Sql.all<EvidenceDocument>(`SELECT * FROM evidence WHERE id IN (${evidenceIds.map(() => '?').join(',')})`, evidenceIds);
  },
  async addReport(report: { id: string; investigationId: string; title: string; format: string; content: string; createdAt: string }) {
    await Sql.run(
      `INSERT INTO reports (id, investigationId, title, format, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [report.id, report.investigationId, report.title, report.format, report.content, report.createdAt]
    );
    return report;
  },
  async getReports(investigationId: string) {
    return Sql.all(`SELECT * FROM reports WHERE investigationId = ? ORDER BY createdAt DESC`, [investigationId]);
  }
};
