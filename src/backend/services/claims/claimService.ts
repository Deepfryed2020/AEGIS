import { EvidenceDocument, ClaimAnalysis } from '../../../shared/models.js';
import { generateCitation } from '../citations/citationService.js';
import { searchDocuments } from '../search/searchService.js';

export function analyzeClaim(claim: string, documents: EvidenceDocument[]): ClaimAnalysis {
  const filtered = searchDocuments(documents, { query: claim });
  const citations = filtered
    .map((doc) => ({ doc, citation: generateCitation(doc, claim) }))
    .filter((entry) => entry.citation !== null) as Array<{ doc: EvidenceDocument; citation: ReturnType<typeof generateCitation> }>;

  const supportingEvidence = citations
    .filter((entry): entry is { doc: EvidenceDocument; citation: NonNullable<ReturnType<typeof generateCitation>> } => entry.citation !== null)
    .map((entry) => ({ documentId: entry.doc.id, citation: entry.citation }));
  const contradictoryEvidence = [] as Array<{ documentId: string; citation: NonNullable<ReturnType<typeof generateCitation>> }>;
  const insufficientEvidence = supportingEvidence.length === 0;

  return {
    claim,
    supportingEvidence,
    contradictoryEvidence,
    insufficientEvidence,
    confidence: filtered.length > 0 ? Math.min(0.98, filtered.length * 0.18) : 0,
    reasoning: filtered.length
      ? `Evidence found in ${filtered.length} document(s). Citations reference passages matching the claim.`
      : 'No matching evidence found in indexed documents. Additional sources should be crawled.'
  };
}
