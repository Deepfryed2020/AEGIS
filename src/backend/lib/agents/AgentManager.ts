import { v4 as uuid } from 'uuid';
import { Logger } from '../observability/Logger.js';
import { EventBus } from '../events/EventBus.js';

export type AgentCapability =
  | 'evidence-analysis'
  | 'claim-verification'
  | 'entity-resolution'
  | 'timeline-reconstruction'
  | 'report-drafting'
  | 'investigation-suggestion';

export interface AgentContext {
  document?: any;
  source?: any;
  investigationId?: string;
  claim?: string;
  evidenceIds?: string[];
  entityId?: string;
}

export interface AgentResult {
  agentId: string;
  capability: AgentCapability;
  output: any;
  confidence: number;
  explanation: string;
  notes?: string;
  timestamp: string;
}

export interface AegisAgent {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  execute(context: AgentContext): Promise<AgentResult>;
  validate(result: AgentResult): boolean;
  explain(result: AgentResult): string;
  confidence(result: AgentResult): number;
}

export const AgentManager = {
  agents: new Map<string, AegisAgent>(),
  sharedMemory: new Map<string, any>(),

  register(agent: AegisAgent): void {
    this.agents.set(agent.id, agent);
    Logger.info('agent-manager', `Registered agent ${agent.id} (${agent.name})`);
  },

  unregister(agentId: string): void {
    this.agents.delete(agentId);
  },

  list(): AegisAgent[] {
    return Array.from(this.agents.values());
  },

  async execute(capability: AgentCapability, context: AgentContext): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agent of this.agents.values()) {
      if (!agent.capabilities.includes(capability)) continue;
      try {
        const result = await agent.execute(context);
        if (agent.validate(result)) {
          results.push(result);
          EventBus.emit('ClaimResolved', { agentId: agent.id, capability, confidence: result.confidence });
        }
      } catch (error) {
        Logger.error('agent-manager', `Agent ${agent.id} failed: ${error}`);
      }
    }
    return results;
  },

  setMemory(key: string, value: any): void {
    this.sharedMemory.set(key, value);
  },

  getMemory(key: string): any {
    return this.sharedMemory.get(key);
  },

  clearMemory(key?: string): void {
    if (key) this.sharedMemory.delete(key);
    else this.sharedMemory.clear();
  },
};
