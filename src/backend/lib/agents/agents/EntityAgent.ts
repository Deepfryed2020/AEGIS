import { AgentCapability, AgentContext, AgentResult, AegisAgent } from '../AgentManager.js';
import { ProfileService } from '../../intelligence/profileService.js';

export class EntityAgent implements AegisAgent {
  id = 'entity-agent';
  name = 'Entity Resolution Agent';
  capabilities: AgentCapability[] = ['entity-resolution'];

  async execute(context: AgentContext): Promise<AgentResult> {
    if (!context.entityId) {
      return { agentId: this.id, capability: 'entity-resolution', output: null, confidence: 0, explanation: 'No entity ID provided', timestamp: new Date().toISOString() };
    }
    const profile = await ProfileService.getProfile(context.entityId);
    if (!profile) {
      return { agentId: this.id, capability: 'entity-resolution', output: null, confidence: 0, explanation: `Entity ${context.entityId} not found`, timestamp: new Date().toISOString() };
    }
    return {
      agentId: this.id,
      capability: 'entity-resolution',
      output: profile,
      confidence: profile.confidence,
      explanation: `Profile for ${profile.node.name}: ${profile.relatedEntities.length} related entities, ${profile.connectedEvidence.length} evidence documents, ${profile.riskIndicators.length} risk indicators.`,
      timestamp: new Date().toISOString(),
    };
  }

  validate(result: AgentResult): boolean {
    return result.output !== null;
  }

  explain(result: AgentResult): string {
    return result.explanation;
  }

  confidence(result: AgentResult): number {
    return result.confidence;
  }
}
