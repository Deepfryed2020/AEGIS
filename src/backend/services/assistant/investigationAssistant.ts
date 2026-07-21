import { Investigation, EvidenceDocument } from '../../../shared/models.js';
import { Sql } from '../../db.js';
import { GraphStore } from '../../lib/graph/GraphStore.js';
import { GraphQuery } from '../../lib/graph/GraphQuery.js';
import { NodeRank } from '../../lib/graph/NodeRank.js';
import { ClaimResolutionEngine } from '../claims/claimResolutionEngine.js';
import { TimelineReconstructor } from '../timeline/timelineReconstructor.js';

export interface AssistantSuggestion {
  category: 'people' | 'missing-evidence' | 'conflicts' | 'questions' | 'related-investigations' | 'legislation' | 'procurement' | 'funding' | 'angles';
  title: string;
  reason: string;
  confidence: number;
  references?: string[];
}

export interface AssistantReport {
  investigationId: string;
  suggestions: AssistantSuggestion[];
  generatedAt: string;
}

export const InvestigationAssistant = {
  async suggest(investigationId: string): Promise<AssistantReport> {
    const investigation = await this.fetchInvestigation(investigationId);
    if (!investigation) {
      return { investigationId, suggestions: [], generatedAt: new Date().toISOString() };
    }
    const evidence = await this.fetchEvidence(investigation.evidenceIds);
    const suggestions: AssistantSuggestion[] = [];

    suggestions.push(...(await this.suggestPeople(evidence)));
    suggestions.push(...(await this.suggestMissingEvidence(investigation, evidence)));
    suggestions.push(...(await this.suggestConflicts(evidence)));
    suggestions.push(...(await this.suggestQuestions(investigation, evidence)));
    suggestions.push(...(await this.suggestRelatedInvestigations(investigationId, evidence)));
    suggestions.push(...(await this.suggestLegislation(evidence)));
    suggestions.push(...(await this.suggestProcurement(evidence)));
    suggestions.push(...(await this.suggestUnusualFunding(evidence)));
    suggestions.push(...(await this.suggestReportingAngles(investigation, evidence)));

    return {
      investigationId,
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 30),
      generatedAt: new Date().toISOString(),
    };
  },

  async fetchInvestigation(id: string): Promise<Investigation | undefined> {
    const row = await Sql.get<Investigation>(`SELECT * FROM investigations WHERE id = ?`, [id]);
    if (!row) return undefined;
    const evidenceRows = await Sql.all<{ evidenceId: string }>(
      `SELECT evidenceId FROM investigation_evidence WHERE investigationId = ?`,
      [id]
    );
    return { ...row, evidenceIds: evidenceRows.map((r) => r.evidenceId) };
  },

  async fetchEvidence(ids: string[]): Promise<EvidenceDocument[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return Sql.all<EvidenceDocument>(`SELECT * FROM evidence WHERE id IN (${placeholders})`, ids);
  },

  async suggestPeople(evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    const personIds = new Set<string>();
    for (const doc of evidence) {
      const entities = await GraphStore.getEntitiesForEvidence(doc.id);
      for (const entity of entities) {
        if (entity.type === 'Person' || entity.type === 'Minister') {
          personIds.add(entity.id);
        }
      }
    }
    const ranks = await NodeRank.degreeCentrality(500);
    for (const id of Array.from(personIds).slice(0, 5)) {
      const node = await GraphStore.getNode(id);
      if (!node) continue;
      const rank = ranks.find((r) => r.nodeId === id);
      suggestions.push({
        category: 'people',
        title: `Inspect ${node.name}`,
        reason: `${node.name} is mentioned ${node.mentionCount} time(s) across the evidence and has ${rank?.degree || 0} graph connections, indicating a central figure.`,
        confidence: Math.min(0.95, 0.5 + (rank?.degree || 0) / 20),
        references: [id],
      });
    }
    return suggestions;
  },

  async suggestMissingEvidence(investigation: Investigation, evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    if (evidence.length < 3) {
      suggestions.push({
        category: 'missing-evidence',
        title: 'Expand source coverage',
        reason: `Only ${evidence.length} document(s) attached — additional sources are needed to establish a reliable evidence base.`,
        confidence: 0.85,
      });
    }
    const sourceIds = new Set(evidence.map((e) => e.sourceId));
    if (sourceIds.size === 1) {
      suggestions.push({
        category: 'missing-evidence',
        title: 'Diversify sources',
        reason: 'All attached evidence comes from a single source — cross-reference with at least one independent source.',
        confidence: 0.8,
      });
    }
    const oldEvidence = evidence.filter((e) => {
      const ageDays = (Date.now() - new Date(e.retrievedDate).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays > 365;
    });
    if (oldEvidence.length === evidence.length && evidence.length > 0) {
      suggestions.push({
        category: 'missing-evidence',
        title: 'Refresh stale evidence',
        reason: 'All attached evidence is over 1 year old — recent updates may have changed the picture.',
        confidence: 0.7,
      });
    }
    return suggestions;
  },

  async suggestConflicts(evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    const claimText = evidence.slice(0, 3).map((e) => e.summary || e.title).join(' ');
    if (claimText) {
      const resolved = await ClaimResolutionEngine.resolve(claimText, evidence);
      if (resolved.contradictoryEvidence.length > 0) {
        suggestions.push({
          category: 'conflicts',
          title: `${resolved.contradictoryEvidence.length} contradictory citation(s) detected`,
          reason: 'Contradictory markers (denied, refuted, however) appear in attached evidence — review for conflicting claims.',
          confidence: 0.75,
        });
      }
    }
    return suggestions;
  },

  async suggestQuestions(investigation: Investigation, evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    if (evidence.length === 0) {
      suggestions.push({
        category: 'questions',
        title: 'What is the central claim?',
        reason: 'No evidence attached yet — define the central claim before gathering sources.',
        confidence: 0.9,
      });
    } else {
      suggestions.push({
        category: 'questions',
        title: 'Who are the primary decision-makers?',
        reason: 'Identify ministers, directors, or officials named in the evidence to establish accountability.',
        confidence: 0.65,
      });
      suggestions.push({
        category: 'questions',
        title: 'What funding flows are involved?',
        reason: 'Trace grants, contracts, and procurement referenced in the evidence to identify beneficiaries.',
        confidence: 0.6,
      });
    }
    return suggestions;
  },

  async suggestRelatedInvestigations(currentId: string, evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    if (!evidence.length) return suggestions;
    const evidenceIds = evidence.map((e) => e.id);
    const placeholders = evidenceIds.map(() => '?').join(',');
    const rows = await Sql.all<{ investigationId: string; title: string; count: number }>(
      `SELECT i.id AS investigationId, i.title, COUNT(*) AS count
       FROM investigation_evidence ie
       JOIN investigations i ON i.id = ie.investigationId
       WHERE ie.evidenceId IN (${placeholders}) AND ie.investigationId != ?
       GROUP BY i.id
       ORDER BY count DESC
       LIMIT 5`,
      [...evidenceIds, currentId]
    );
    for (const row of rows) {
      suggestions.push({
        category: 'related-investigations',
        title: `Related: ${row.title}`,
        reason: `Shares ${row.count} piece(s) of evidence with this investigation — overlapping scope likely.`,
        confidence: Math.min(0.9, 0.4 + row.count * 0.15),
        references: [row.investigationId],
      });
    }
    return suggestions;
  },

  async suggestLegislation(evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    const legislation = new Map<string, number>();
    for (const doc of evidence) {
      const entities = await GraphStore.getEntitiesForEvidence(doc.id);
      for (const entity of entities) {
        if (entity.type === 'Legislation') {
          legislation.set(entity.name, (legislation.get(entity.name) || 0) + 1);
        }
      }
    }
    for (const [name, count] of Array.from(legislation.entries()).slice(0, 3)) {
      suggestions.push({
        category: 'legislation',
        title: `Review ${name}`,
        reason: `${name} is referenced ${count} time(s) — examine amendments and regulatory impact.`,
        confidence: 0.7,
      });
    }
    return suggestions;
  },

  async suggestProcurement(evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    const procurementKeywords = ['tender', 'contract', 'procurement', 'awarded', 'supplier', 'vendor'];
    for (const doc of evidence.slice(0, 20)) {
      const lower = doc.content.toLowerCase();
      for (const keyword of procurementKeywords) {
        if (lower.includes(keyword)) {
          suggestions.push({
            category: 'procurement',
            title: `Procurement signal in "${doc.title}"`,
            reason: `Document contains "${keyword}" — investigate contract value, recipient, and procurement process.`,
            confidence: 0.65,
            references: [doc.id],
          });
          break;
        }
      }
    }
    return suggestions.slice(0, 5);
  },

  async suggestUnusualFunding(evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    const fundingKeywords = ['grant', 'funding', 'subsidy', 'payment', 'allocated'];
    for (const doc of evidence.slice(0, 20)) {
      const lower = doc.content.toLowerCase();
      const matches = fundingKeywords.filter((k) => lower.includes(k));
      if (matches.length >= 2) {
        suggestions.push({
          category: 'funding',
          title: `Unusual funding pattern in "${doc.title}"`,
          reason: `Multiple funding-related terms (${matches.join(', ')}) detected — verify amount, recipient, and approval authority.`,
          confidence: 0.7,
          references: [doc.id],
        });
      }
    }
    return suggestions.slice(0, 5);
  },

  async suggestReportingAngles(investigation: Investigation, evidence: EvidenceDocument[]): Promise<AssistantSuggestion[]> {
    const suggestions: AssistantSuggestion[] = [];
    if (evidence.length >= 3) {
      suggestions.push({
        category: 'angles',
        title: 'Cross-reference timeline gaps',
        reason: 'Reconstruct the timeline to identify unexplained periods that may indicate missing decisions or events.',
        confidence: 0.6,
      });
      suggestions.push({
        category: 'angles',
        title: 'Map the relationship network',
        reason: 'Visualise entities and funding flows to expose indirect connections between people and organisations.',
        confidence: 0.55,
      });
    }
    return suggestions;
  },
};
