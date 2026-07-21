import { EvidenceDocument, SourceMetadata } from '../../../shared/models.js';

export type AgentCapability =
  | 'evidence-analysis'
  | 'claim-verification'
  | 'entity-resolution'
  | 'timeline-reconstruction'
  | 'report-drafting'
  | 'investigation-suggestion';

export interface AgentContext {
  document?: EvidenceDocument;
  source?: SourceMetadata;
  investigationId?: string;
  claim?: string;
  evidenceIds?: string[];
}

export interface AgentResult {
  agentId: string;
  capability: AgentCapability;
  output: any;
  confidence: number;
  notes?: string;
}

export interface AegisAgent {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  invoke(context: AgentContext): Promise<AgentResult>;
}

export const AgentRegistry = {
  agents: new Map<string, AegisAgent>(),

  register(agent: AegisAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[agents] registered ${agent.id} with capabilities: ${agent.capabilities.join(', ')}`);
  },

  unregister(agentId: string): void {
    this.agents.delete(agentId);
  },

  list(): AegisAgent[] {
    return Array.from(this.agents.values());
  },

  async invoke(capability: AgentCapability, context: AgentContext): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agent of this.agents.values()) {
      if (!agent.capabilities.includes(capability)) continue;
      try {
        const result = await agent.invoke(context);
        results.push(result);
      } catch (error) {
        console.error(`[agents] ${agent.id} invocation failed:`, error);
      }
    }
    return results;
  },
};
