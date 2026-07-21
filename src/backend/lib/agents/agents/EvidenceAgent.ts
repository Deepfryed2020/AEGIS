import { AgentCapability, AgentContext, AgentResult, AgentManager, AegisAgent } from '../AgentManager.js';
import { extractEntities } from '../../intelligence/entities.js';
import { extractRelationships } from '../../intelligence/relationships.js';
import { extractTimelineEvents } from '../../intelligence/timeline.js';
import { Logger } from '../../observability/Logger.js';

export class EvidenceAgent implements AegisAgent {
  id = 'evidence-agent';
  name = 'Evidence Analysis Agent';
  capabilities: AgentCapability[] = ['evidence-analysis'];

  async execute(context: AgentContext): Promise<AgentResult> {
    if (!context.document) {
      return this.emptyResult('No document provided for analysis');
    }
    const doc = context.document;
    const entities = extractEntities(doc.content);
    const relationships = extractRelationships(doc.content, entities);
    const timeline = extractTimelineEvents(doc.content, doc.id);

    AgentManager.setMemory(`evidence:${doc.id}`, { entities, relationships, timeline });

    return {
      agentId: this.id,
      capability: 'evidence-analysis',
      output: { entityCount: entities.length, relationshipCount: relationships.length, timelineEventCount: timeline.length, entities, relationships, timeline },
      confidence: Math.min(0.95, 0.4 + entities.length * 0.05),
      explanation: `Extracted ${entities.length} entities, ${relationships.length} relationships, and ${timeline.length} timeline events from "${doc.title}".`,
      timestamp: new Date().toISOString(),
    };
  }

  validate(result: AgentResult): boolean {
    return result.output && typeof result.output.entityCount === 'number';
  }

  explain(result: AgentResult): string {
    return result.explanation;
  }

  confidence(result: AgentResult): number {
    return result.confidence;
  }

  private emptyResult(message: string): AgentResult {
    return { agentId: this.id, capability: 'evidence-analysis', output: null, confidence: 0, explanation: message, timestamp: new Date().toISOString() };
  }
}
