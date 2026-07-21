import { SourceMetadata, EvidenceDocument } from '../../../shared/models.js';
import { Sql } from '../../db.js';

export type SourceClass =
  | 'government'
  | 'academic'
  | 'media'
  | 'corporate'
  | 'lobby'
  | 'anonymous'
  | 'unknown';

export interface ReliabilityScore {
  sourceId: string;
  sourceName: string;
  sourceClass: SourceClass;
  baseTrust: number;
  historicalAccuracy: number;
  crossReferences: number;
  documentAge: number;
  evidenceQuality: number;
  independentCorroboration: number;
  compositeScore: number;
  confidence: number;
  signals: Array<{ label: string; value: number; weight: number }>;
}

const CLASS_BASELINES: Record<SourceClass, number> = {
  government: 0.9,
  academic: 0.82,
  media: 0.65,
  corporate: 0.55,
  lobby: 0.4,
  anonymous: 0.25,
  unknown: 0.5,
};

const CLASS_KEYWORDS: Array<{ class: SourceClass; keywords: string[] }> = [
  { class: 'government', keywords: ['gov.au', 'government', 'parliament', 'minister', 'department', 'agency'] },
  { class: 'academic', keywords: ['edu.au', 'university', 'research', 'journal', 'study', 'doi'] },
  { class: 'media', keywords: ['news', 'abc.net', 'smh.com', 'theage', 'guardian', 'australian'] },
  { class: 'corporate', keywords: ['pty', 'ltd', 'company', 'corporate', 'annual report'] },
  { class: 'lobby', keywords: ['institute', 'council', 'association', 'advocacy', 'think tank'] },
  { class: 'anonymous', keywords: ['anonymous', 'whistleblower', 'undisclosed'] },
];

export const ReliabilityEngine = {
  classifySource(source: SourceMetadata | { url: string; name: string }): SourceClass {
    const text = `${source.url} ${source.name}`.toLowerCase();
    for (const entry of CLASS_KEYWORDS) {
      if (entry.keywords.some((k) => text.includes(k))) return entry.class;
    }
    return 'unknown';
  },

  async scoreSource(sourceId: string): Promise<ReliabilityScore | undefined> {
    const source = await Sql.get<SourceMetadata>(`SELECT * FROM sources WHERE id = ?`, [sourceId]);
    if (!source) return undefined;
    const sourceClass = this.classifySource(source);
    const baseTrust = CLASS_BASELINES[sourceClass];

    const evidence = await Sql.all<EvidenceDocument>(
      `SELECT * FROM evidence WHERE sourceId = ? ORDER BY retrievedDate DESC LIMIT 100`,
      [sourceId]
    );

    const historicalAccuracy = this.computeHistoricalAccuracy(evidence);
    const crossReferences = await this.computeCrossReferences(sourceId);
    const documentAge = this.computeDocumentAge(evidence);
    const evidenceQuality = this.computeEvidenceQuality(evidence);
    const independentCorroboration = await this.computeCorroboration(sourceId, evidence);

    const signals = [
      { label: 'Base trust', value: baseTrust, weight: 0.3 },
      { label: 'Historical accuracy', value: historicalAccuracy, weight: 0.15 },
      { label: 'Cross references', value: crossReferences, weight: 0.15 },
      { label: 'Document age', value: documentAge, weight: 0.1 },
      { label: 'Evidence quality', value: evidenceQuality, weight: 0.15 },
      { label: 'Independent corroboration', value: independentCorroboration, weight: 0.15 },
    ];

    const compositeScore = Math.round(
      signals.reduce((sum, s) => sum + s.value * s.weight, 0) * 100
    ) / 100;

    const confidence = Math.round(
      Math.min(1, evidence.length / 10) * 100
    ) / 100;

    return {
      sourceId,
      sourceName: source.name,
      sourceClass,
      baseTrust,
      historicalAccuracy,
      crossReferences,
      documentAge,
      evidenceQuality,
      independentCorroboration,
      compositeScore,
      confidence,
      signals,
    };
  },

  computeHistoricalAccuracy(evidence: EvidenceDocument[]): number {
    if (!evidence.length) return 0.5;
    const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
    return Math.round(avgConfidence * 100) / 100;
  },

  async computeCrossReferences(sourceId: string): Promise<number> {
    const row = await Sql.get<{ count: number }>(
      `SELECT COUNT(DISTINCT r.evidenceId) AS count
       FROM relationships r
       JOIN evidence e ON e.id = r.evidenceId
       WHERE e.sourceId = ?`,
      [sourceId]
    );
    return Math.min(1, (row?.count || 0) / 20);
  },

  computeDocumentAge(evidence: EvidenceDocument[]): number {
    if (!evidence.length) return 0.5;
    const avgAgeDays = evidence.reduce((sum, e) => {
      const age = (Date.now() - new Date(e.retrievedDate).getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0) / evidence.length;
    return Math.max(0, Math.min(1, 1 - avgAgeDays / 365));
  },

  computeEvidenceQuality(evidence: EvidenceDocument[]): number {
    if (!evidence.length) return 0.5;
    const avgLength = evidence.reduce((sum, e) => sum + e.content.length, 0) / evidence.length;
    const lengthFactor = Math.min(1, avgLength / 5000);
    const docTypeFactor = evidence.filter((e) => e.documentType === 'PDF' || e.documentType === 'HTML').length / evidence.length;
    return Math.round((lengthFactor * 0.5 + docTypeFactor * 0.5) * 100) / 100;
  },

  async computeCorroboration(sourceId: string, evidence: EvidenceDocument[]): Promise<number> {
    if (!evidence.length) return 0;
    const otherSources = await Sql.all<{ count: number; sourceId: string }>(
      `SELECT e2.sourceId, COUNT(*) AS count
       FROM evidence_entities ee
       JOIN evidence e ON e.id = ee.evidenceId
       JOIN evidence_entities ee2 ON ee2.entityId = ee.entityId
       JOIN evidence e2 ON e2.id = ee2.evidenceId
       WHERE e.sourceId = ? AND e2.sourceId != ?
       GROUP BY e2.sourceId
       LIMIT 10`,
      [sourceId, sourceId]
    );
    return Math.min(1, otherSources.length / 5);
  },

  async scoreAll(): Promise<ReliabilityScore[]> {
    const sources = await Sql.all<SourceMetadata>(`SELECT * FROM sources ORDER BY name`);
    const scores: ReliabilityScore[] = [];
    for (const source of sources) {
      const score = await this.scoreSource(source.id);
      if (score) scores.push(score);
    }
    return scores.sort((a, b) => b.compositeScore - a.compositeScore);
  },
};
