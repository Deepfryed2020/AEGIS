import { v4 as uuid } from 'uuid';
import { Sql } from '../../db.js';
import { EvidenceDocument, Investigation } from '../../../shared/models.js';
import { GraphStore } from '../../lib/graph/GraphStore.js';
import { GraphQuery } from '../../lib/graph/GraphQuery.js';
import { TimelineReconstructor } from '../timeline/timelineReconstructor.js';
import { ClaimResolutionEngine } from '../claims/claimResolutionEngine.js';
import { ReliabilityEngine } from '../reliability/reliabilityEngine.js';
import { NodeRank } from '../../lib/graph/NodeRank.js';

export interface GeneratedReport {
  id: string;
  investigationId: string;
  title: string;
  sections: ReportSection[];
  generatedAt: string;
  format: 'markdown' | 'json';
}

export interface ReportSection {
  title: string;
  body: string;
  citations: Array<{ quote: string; documentId: string; url: string; publisher?: string }>;
}

export const ReportGenerator = {
  async generate(investigationId: string, format: 'markdown' | 'json' = 'markdown'): Promise<GeneratedReport | undefined> {
    const investigation = await this.fetchInvestigation(investigationId);
    if (!investigation) return undefined;
    const evidence = await this.fetchEvidence(investigation.evidenceIds);

    const sections: ReportSection[] = [];
    sections.push(await this.executiveSummary(investigation, evidence));
    sections.push(await this.keyFindings(evidence));
    sections.push(await this.timelineSection(investigation, evidence));
    sections.push(await this.relationshipNetwork(evidence));
    sections.push(await this.evidenceTable(evidence));
    sections.push(await this.contradictoryEvidence(investigation, evidence));
    sections.push(await this.confidenceAssessment(evidence));
    sections.push(await this.recommendations(investigation, evidence));
    sections.push(await this.appendix(evidence));

    const report: GeneratedReport = {
      id: uuid(),
      investigationId,
      title: `${investigation.title} — Investigation Report`,
      sections,
      generatedAt: new Date().toISOString(),
      format,
    };
    await this.persist(report);
    return report;
  },

  async fetchInvestigation(id: string): Promise<Investigation | undefined> {
    const row = await Sql.get<Investigation>(`SELECT * FROM investigations WHERE id = ?`, [id]);
    if (!row) return undefined;
    const evidenceRows = await Sql.all<{ evidenceId: string }>(`SELECT evidenceId FROM investigation_evidence WHERE investigationId = ?`, [id]);
    return { ...row, evidenceIds: evidenceRows.map((r) => r.evidenceId) };
  },

  async fetchEvidence(ids: string[]): Promise<EvidenceDocument[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return Sql.all<EvidenceDocument>(`SELECT * FROM evidence WHERE id IN (${placeholders})`, ids);
  },

  async executiveSummary(investigation: Investigation, evidence: EvidenceDocument[]): Promise<ReportSection> {
    const citations = evidence.slice(0, 3).map((doc) => ({
      quote: (doc.summary || doc.title).slice(0, 200),
      documentId: doc.id,
      url: doc.url,
      publisher: doc.publisher,
    }));
    const body = `This report synthesises ${evidence.length} piece(s) of evidence attached to the investigation "${investigation.title}". ${investigation.description || 'No description provided.'} The evidence spans ${new Set(evidence.map((e) => e.sourceName)).size} source(s) with an average confidence of ${(evidence.reduce((s, e) => s + e.confidence, 0) / Math.max(1, evidence.length)).toFixed(2)}.`;
    return { title: 'Executive Summary', body, citations };
  },

  async keyFindings(evidence: EvidenceDocument[]): Promise<ReportSection> {
    const findings: string[] = [];
    const citations: Array<{ quote: string; documentId: string; url: string; publisher?: string }> = [];
    for (const doc of evidence.slice(0, 5)) {
      const entities = await GraphStore.getEntitiesForEvidence(doc.id);
      const entityNames = entities.slice(0, 3).map((e) => e.name).join(', ');
      findings.push(`- ${doc.title} (${doc.sourceName}) references ${entities.length} entities including ${entityNames || 'none identified'}.`);
      citations.push({ quote: (doc.summary || doc.title).slice(0, 200), documentId: doc.id, url: doc.url, publisher: doc.publisher });
    }
    return { title: 'Key Findings', body: findings.join('\n') || 'No findings extracted.', citations };
  },

  async timelineSection(investigation: Investigation, evidence: EvidenceDocument[]): Promise<ReportSection> {
    const timeline = await TimelineReconstructor.reconstruct(investigation.evidenceIds);
    const lines = timeline.events.slice(0, 15).map((e) => `- ${e.date}: ${e.title} — ${e.description.slice(0, 150)} (${e.sourceCount} source(s))`);
    if (timeline.missingPeriods.length) lines.push(`\n**Missing periods detected:** ${timeline.missingPeriods.length}`);
    if (timeline.conflictingDates.length) lines.push(`**Conflicting dates detected:** ${timeline.conflictingDates.length}`);
    return { title: 'Timeline', body: lines.join('\n') || 'No timeline events reconstructed.', citations: [] };
  },

  async relationshipNetwork(evidence: EvidenceDocument[]): Promise<ReportSection> {
    const entityIds = new Set<string>();
    for (const doc of evidence) {
      const entities = await GraphStore.getEntitiesForEvidence(doc.id);
      for (const e of entities) entityIds.add(e.id);
    }
    const ranks = await NodeRank.degreeCentrality(20);
    const top = ranks.filter((r) => entityIds.has(r.nodeId)).slice(0, 10);
    const nodes = await GraphStore.getNodesByIds(top.map((r) => r.nodeId));
    const lines = nodes.map((n) => `- ${n.name} (${n.type}) — ${n.mentionCount} mention(s)`);
    return { title: 'Relationship Network', body: lines.join('\n') || 'No relationships identified.', citations: [] };
  },

  async evidenceTable(evidence: EvidenceDocument[]): Promise<ReportSection> {
    const rows = evidence.map((doc, i) => `| ${i + 1} | ${doc.title} | ${doc.sourceName} | ${doc.documentType} | ${doc.confidence.toFixed(2)} | ${new Date(doc.retrievedDate).toLocaleDateString()} |`);
    const header = `| # | Title | Source | Type | Confidence | Retrieved |\n|---|-------|--------|------|------------|----------|\n`;
    const citations = evidence.slice(0, 5).map((doc) => ({
      quote: (doc.summary || doc.title).slice(0, 200),
      documentId: doc.id,
      url: doc.url,
      publisher: doc.publisher,
    }));
    return { title: 'Evidence Table', body: header + rows.join('\n'), citations };
  },

  async contradictoryEvidence(investigation: Investigation, evidence: EvidenceDocument[]): Promise<ReportSection> {
    const claimText = evidence.slice(0, 3).map((e) => e.summary || e.title).join(' ');
    const resolved = claimText ? await ClaimResolutionEngine.resolve(claimText, evidence) : null;
    const lines: string[] = [];
    if (resolved) {
      lines.push(`Supporting citations: ${resolved.supportingEvidence.length}`);
      lines.push(`Contradictory citations: ${resolved.contradictoryEvidence.length}`);
      for (const c of resolved.contradictoryEvidence.slice(0, 5)) {
        lines.push(`- "${c.citation.quote.slice(0, 150)}" (document ${c.documentId})`);
      }
    }
    const citations = resolved?.contradictoryEvidence.slice(0, 3).map((c) => ({
      quote: c.citation.quote.slice(0, 200),
      documentId: c.documentId,
      url: c.citation.url,
      publisher: c.citation.publisher,
    })) || [];
    return { title: 'Contradictory Evidence', body: lines.join('\n') || 'No contradictions detected.', citations };
  },

  async confidenceAssessment(evidence: EvidenceDocument[]): Promise<ReportSection> {
    if (!evidence.length) return { title: 'Confidence Assessment', body: 'No evidence to assess.', citations: [] };
    const avg = evidence.reduce((s, e) => s + e.confidence, 0) / evidence.length;
    const high = evidence.filter((e) => e.confidence >= 0.75).length;
    const medium = evidence.filter((e) => e.confidence >= 0.5 && e.confidence < 0.75).length;
    const low = evidence.filter((e) => e.confidence < 0.5).length;
    const body = `Average confidence: ${avg.toFixed(2)}\nHigh confidence: ${high}\nMedium confidence: ${medium}\nLow confidence: ${low}\nOverall assessment: ${avg >= 0.7 ? 'Strong' : avg >= 0.5 ? 'Moderate' : 'Weak'} evidence base.`;
    return { title: 'Confidence Assessment', body, citations: [] };
  },

  async recommendations(investigation: Investigation, evidence: EvidenceDocument[]): Promise<ReportSection> {
    const recs: string[] = [];
    if (evidence.length < 5) recs.push('- Expand evidence collection — fewer than 5 documents attached.');
    if (new Set(evidence.map((e) => e.sourceId)).size < 2) recs.push('- Diversify sources to reduce single-source bias.');
    if (evidence.some((e) => e.confidence < 0.5)) recs.push('- Review low-confidence documents for reliability concerns.');
    recs.push('- Cross-reference timeline gaps for missing decisions or events.');
    recs.push('- Map funding flows and procurement relationships for potential conflicts of interest.');
    return { title: 'Recommendations', body: recs.join('\n'), citations: [] };
  },

  async appendix(evidence: EvidenceDocument[]): Promise<ReportSection> {
    const lines = evidence.map((doc, i) => `[${i + 1}] ${doc.title}. ${doc.publisher}. ${doc.url}. Retrieved ${new Date(doc.retrievedDate).toLocaleDateString()}.`);
    return { title: 'Appendix — Source References', body: lines.join('\n') || 'No sources.', citations: [] };
  },

  async persist(report: GeneratedReport): Promise<void> {
    const content = report.format === 'json' ? JSON.stringify(report, null, 2) : this.toMarkdown(report);
    await Sql.run(
      `INSERT INTO reports (id, investigationId, title, format, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [report.id, report.investigationId, report.title, report.format, content, report.generatedAt]
    );
  },

  toMarkdown(report: GeneratedReport): string {
    const lines: string[] = [`# ${report.title}`, ``, `Generated: ${report.generatedAt}`, ``];
    for (const section of report.sections) {
      lines.push(`## ${section.title}`, ``, section.body, ``);
      if (section.citations.length) {
        lines.push(`**Citations:**`);
        for (const c of section.citations) {
          lines.push(`> ${c.quote} — [${c.publisher || 'Source'}](${c.url})`);
        }
        lines.push('');
      }
    }
    return lines.join('\n');
  },
};
