import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { EvidenceDocument } from '../../../shared/models.js';
import { GraphStore } from '../../lib/graph/GraphStore.js';

export interface SearchQuery {
  q: string;
  documentType?: string;
  sourceId?: string;
  organisation?: string;
  fromDate?: string;
  toDate?: string;
  minConfidence?: number;
  sortBy?: 'relevance' | 'confidence' | 'date';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: string;
  createdAt: string;
}

export interface SearchResults {
  documents: Array<EvidenceDocument & { score: number; reason: string; highlights: string[] }>;
  entities: Array<{ id: string; name: string; type: string; mentionCount: number; score: number }>;
  relationships: Array<{ id: string; sourceName: string; targetName: string; type: string; score: number }>;
  claims: Array<{ id: string; claim: string; confidence: number; score: number }>;
  investigations: Array<{ id: string; title: string; description: string; score: number }>;
  total: number;
}

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'of', 'to', 'in', 'on', 'for', 'with', 'by']);

export const SemanticSearch = {
  async search(query: SearchQuery): Promise<SearchResults> {
    const terms = this.parseBooleanQuery(query.q);
    const documents = await this.searchDocuments(terms, query);
    const entities = await this.searchEntities(terms);
    const relationships = await this.searchRelationships(terms);
    const claims = await this.searchClaims(terms);
    const investigations = await this.searchInvestigations(terms);

    return {
      documents,
      entities,
      relationships,
      claims,
      investigations,
      total: documents.length + entities.length + relationships.length + claims.length + investigations.length,
    };
  },

  parseBooleanQuery(q: string): string[] {
    if (!q) return [];
    const cleaned = q.replace(/\b(AND|OR|NOT)\b/gi, ' ').replace(/[()"]/g, ' ');
    return cleaned.split(/\s+/).filter((t) => t.length > 1 && !STOPWORDS.has(t.toLowerCase())).map((t) => t.toLowerCase());
  },

  async searchDocuments(terms: string[], query: SearchQuery): Promise<Array<EvidenceDocument & { score: number; reason: string; highlights: string[] }>> {
    if (!terms.length) return [];
    let sql = `SELECT * FROM evidence WHERE `;
    const conditions: string[] = [];
    const params: any[] = [];
    for (const term of terms) {
      conditions.push(`(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(sourceName) LIKE ? OR LOWER(organisation) LIKE ? OR LOWER(keywords) LIKE ? OR LOWER(entities) LIKE ?)`);
      const like = `%${term}%`;
      params.push(like, like, like, like, like, like);
    }
    sql += conditions.join(' AND ');
    if (query.documentType) {
      sql += ` AND documentType = ?`;
      params.push(query.documentType);
    }
    if (query.sourceId) {
      sql += ` AND sourceId = ?`;
      params.push(query.sourceId);
    }
    if (query.organisation) {
      sql += ` AND LOWER(organisation) LIKE ?`;
      params.push(`%${query.organisation.toLowerCase()}%`);
    }
    if (query.minConfidence !== undefined) {
      sql += ` AND confidence >= ?`;
      params.push(query.minConfidence);
    }
    if (query.fromDate) {
      sql += ` AND retrievedDate >= ?`;
      params.push(query.fromDate);
    }
    if (query.toDate) {
      sql += ` AND retrievedDate <= ?`;
      params.push(query.toDate);
    }
    const sort = query.sortBy || 'relevance';
    if (sort === 'confidence') sql += ` ORDER BY confidence DESC LIMIT 100`;
    else if (sort === 'date') sql += ` ORDER BY retrievedDate DESC LIMIT 100`;
    else sql += ` ORDER BY retrievedDate DESC LIMIT 100`;

    const rows = await Sql.all<EvidenceDocument>(sql, params);
    return rows.map((doc) => {
      const score = this.scoreDocument(doc, terms);
      const highlights = this.extractHighlights(doc, terms);
      return { ...doc, score, reason: `Matched ${terms.length} term(s) in evidence`, highlights };
    }).sort((a, b) => b.score - a.score);
  },

  scoreDocument(doc: EvidenceDocument, terms: string[]): number {
    const text = `${doc.title} ${doc.content} ${doc.sourceName} ${doc.organisation || ''}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const occurrences = (text.match(new RegExp(term, 'g')) || []).length;
      score += occurrences;
    }
    return Math.round((score * (0.5 + doc.confidence * 0.5)) * 100) / 100;
  },

  extractHighlights(doc: EvidenceDocument, terms: string[]): string[] {
    const highlights: string[] = [];
    const sentences = doc.content.split(/(?<=[.!?])\s+/).slice(0, 50);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (terms.some((t) => lower.includes(t)) && highlights.length < 3) {
        highlights.push(sentence.trim().slice(0, 200));
      }
    }
    return highlights;
  },

  async searchEntities(terms: string[]): Promise<Array<{ id: string; name: string; type: string; mentionCount: number; score: number }>> {
    if (!terms.length) return [];
    const nodes = await GraphStore.getNodes(2000);
    return nodes
      .map((n) => {
        const lower = n.name.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (lower.includes(term)) score += n.mentionCount;
        }
        return { ...n, score };
      })
      .filter((n) => n.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  },

  async searchRelationships(terms: string[]): Promise<Array<{ id: string; sourceName: string; targetName: string; type: string; score: number }>> {
    if (!terms.length) return [];
    const rows = await Sql.all<{ id: string; sourceName: string; targetName: string; type: string }>(
      `SELECT r.id, s.name AS sourceName, t.name AS targetName, r.type
       FROM relationships r
       JOIN entities s ON s.id = r.sourceId
       JOIN entities t ON t.id = r.targetId
       WHERE ${terms.map(() => '(LOWER(s.name) LIKE ? OR LOWER(t.name) LIKE ? OR LOWER(r.type) LIKE ?)').join(' OR ')}
       LIMIT 20`,
      terms.flatMap((t) => [`%${t}%`, `%${t}%`, `%${t}%`])
    );
    return rows.map((r) => ({ ...r, score: 1 }));
  },

  async searchClaims(terms: string[]): Promise<Array<{ id: string; claim: string; confidence: number; score: number }>> {
    if (!terms.length) return [];
    const rows = await Sql.all<{ id: string; claim: string; confidence: number }>(
      `SELECT id, claim, confidence FROM resolved_claims
       WHERE ${terms.map(() => 'LOWER(claim) LIKE ?').join(' OR ')}
       ORDER BY confidence DESC LIMIT 10`,
      terms.map((t) => `%${t}%`)
    );
    return rows.map((r) => ({ ...r, score: r.confidence }));
  },

  async searchInvestigations(terms: string[]): Promise<Array<{ id: string; title: string; description: string; score: number }>> {
    if (!terms.length) return [];
    const rows = await Sql.all<{ id: string; title: string; description: string }>(
      `SELECT id, title, description FROM investigations
       WHERE ${terms.map(() => '(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)').join(' OR ')}
       LIMIT 10`,
      terms.flatMap((t) => [`%${t}%`, `%${t}%`])
    );
    return rows.map((r) => ({ ...r, score: 1 }));
  },

  async saveSearch(name: string, query: string, filters?: object): Promise<SavedSearch> {
    const saved: SavedSearch = {
      id: uuid(),
      name,
      query,
      filters: filters ? JSON.stringify(filters) : undefined,
      createdAt: new Date().toISOString(),
    };
    await Sql.run(
      `INSERT INTO saved_searches (id, name, query, filters, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [saved.id, saved.name, saved.query, saved.filters, saved.createdAt]
    );
    return saved;
  },

  async listSavedSearches(): Promise<SavedSearch[]> {
    return Sql.all<SavedSearch>(`SELECT * FROM saved_searches ORDER BY createdAt DESC`);
  },

  async deleteSavedSearch(id: string): Promise<void> {
    await Sql.run(`DELETE FROM saved_searches WHERE id = ?`, [id]);
  },
};
