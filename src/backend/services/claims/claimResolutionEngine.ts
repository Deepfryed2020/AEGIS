import { EvidenceDocument, ClaimAnalysis, Citation } from '../../../shared/models.js';
import { generateCitation } from '../citations/citationService.js';
import { searchDocuments } from '../search/searchService.js';
import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';

export interface ResolvedClaim {
  id: string;
  claim: string;
  supportingEvidence: Array<{ citation: NonNullable<Citation>; documentId: string }>;
  contradictoryEvidence: Array<{ citation: NonNullable<Citation>; documentId: string }>;
  insufficientEvidence: boolean;
  confidence: number;
  reasoning: string;
  outstandingQuestions: string[];
  createdAt: string;
}

const CONTRADICTION_MARKERS = [
  'denied', 'denies', 'contradicted', 'contradicts', 'refuted', 'refutes',
  'false', 'incorrect', 'not true', 'disputed', 'disputes', 'rebutted',
  'however', 'but ', 'despite', 'although', 'nevertheless',
];

export const ClaimResolutionEngine = {
  async resolve(claim: string, documents?: EvidenceDocument[]): Promise<ResolvedClaim> {
    const evidence = documents || await Sql.all<EvidenceDocument>(`SELECT * FROM evidence ORDER BY retrievedDate DESC LIMIT 5000`);
    const filtered = searchDocuments(evidence, { query: claim });
    const citations = filtered
      .map((doc) => ({ doc, citation: generateCitation(doc, claim) }))
      .filter((entry): entry is { doc: EvidenceDocument; citation: NonNullable<Citation> } => entry.citation !== null);

    const supportingEvidence: Array<{ citation: NonNullable<Citation>; documentId: string }> = [];
    const contradictoryEvidence: Array<{ citation: NonNullable<Citation>; documentId: string }> = [];

    for (const entry of citations) {
      const quote = entry.citation.quote.toLowerCase();
      const isContradicting = CONTRADICTION_MARKERS.some((marker) => quote.includes(marker));
      if (isContradicting) {
        contradictoryEvidence.push({ citation: entry.citation, documentId: entry.doc.id });
      } else {
        supportingEvidence.push({ citation: entry.citation, documentId: entry.doc.id });
      }
    }

    const insufficientEvidence = supportingEvidence.length === 0 && contradictoryEvidence.length === 0;
    const confidence = this.computeConfidence(supportingEvidence.length, contradictoryEvidence.length);
    const reasoning = this.buildReasoning(claim, supportingEvidence.length, contradictoryEvidence.length);
    const outstandingQuestions = this.generateQuestions(claim, supportingEvidence, contradictoryEvidence);

    const resolved: ResolvedClaim = {
      id: uuid(),
      claim,
      supportingEvidence,
      contradictoryEvidence,
      insufficientEvidence,
      confidence,
      reasoning,
      outstandingQuestions,
      createdAt: new Date().toISOString(),
    };

    await this.persist(resolved);
    return resolved;
  },

  async persist(resolved: ResolvedClaim): Promise<void> {
    await Sql.run(
      `INSERT OR REPLACE INTO resolved_claims (id, claim, supportingCount, contradictingCount, confidence, reasoning, outstandingQuestions, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolved.id,
        resolved.claim,
        resolved.supportingEvidence.length,
        resolved.contradictoryEvidence.length,
        resolved.confidence,
        resolved.reasoning,
        JSON.stringify(resolved.outstandingQuestions),
        resolved.createdAt,
      ]
    );
  },

  async list(): Promise<ResolvedClaim[]> {
    const rows = await Sql.all<{ id: string; claim: string; supportingCount: number; contradictingCount: number; confidence: number; reasoning: string; outstandingQuestions: string; createdAt: string }>(
      `SELECT * FROM resolved_claims ORDER BY createdAt DESC LIMIT 100`
    );
    return rows.map((row) => ({
      id: row.id,
      claim: row.claim,
      supportingEvidence: [],
      contradictoryEvidence: [],
      insufficientEvidence: row.supportingCount === 0 && row.contradictingCount === 0,
      confidence: row.confidence,
      reasoning: row.reasoning,
      outstandingQuestions: JSON.parse(row.outstandingQuestions || '[]'),
      createdAt: row.createdAt,
    }));
  },

  computeConfidence(supporting: number, contradicting: number): number {
    if (supporting === 0 && contradicting === 0) return 0;
    const total = supporting + contradicting;
    const ratio = supporting / total;
    const volumeFactor = Math.min(1, total / 5);
    return Math.round((ratio * 0.7 + volumeFactor * 0.3) * 100) / 100;
  },

  buildReasoning(claim: string, supporting: number, contradicting: number): string {
    if (supporting === 0 && contradicting === 0) {
      return `No matching evidence found for the claim "${claim}". Additional sources should be crawled or the claim rephrased.`;
    }
    const parts: string[] = [];
    parts.push(`Evidence found in ${supporting + contradicting} document(s).`);
    parts.push(`${supporting} document(s) provide supporting citations.`);
    if (contradicting > 0) parts.push(`${contradicting} document(s) contain contradictory markers and are preserved separately.`);
    if (contradicting > supporting) parts.push('Contradictory evidence outweighs supporting evidence — treat claim with caution.');
    return parts.join(' ');
  },

  generateQuestions(claim: string, supporting: Array<{ citation: NonNullable<Citation>; documentId: string }>, contradictory: Array<{ citation: NonNullable<Citation>; documentId: string }>): string[] {
    const questions: string[] = [];
    if (supporting.length === 0 && contradictory.length === 0) {
      questions.push(`Which additional sources might corroborate or refute "${claim}"?`);
    }
    if (contradictory.length > supporting.length) {
      questions.push(`Why does contradictory evidence outweigh supporting evidence for "${claim}"?`);
    }
    if (supporting.length > 0 && supporting.length < 3) {
      questions.push(`Can independent corroboration be found beyond ${supporting.length} source(s)?`);
    }
    if (contradictory.length > 0) {
      questions.push(`Which sources are authoritative among the contradictory evidence?`);
    }
    return questions;
  },
};
