import { AgentCapability, AgentContext, AgentResult, AegisAgent } from '../AgentManager.js';
import { ClaimResolutionEngine } from '../../../services/claims/claimResolutionEngine.js';

export class ClaimAgent implements AegisAgent {
  id = 'claim-agent';
  name = 'Claim Verification Agent';
  capabilities: AgentCapability[] = ['claim-verification'];

  async execute(context: AgentContext): Promise<AgentResult> {
    if (!context.claim) {
      return { agentId: this.id, capability: 'claim-verification', output: null, confidence: 0, explanation: 'No claim provided', timestamp: new Date().toISOString() };
    }
    const resolved = await ClaimResolutionEngine.resolve(context.claim);
    return {
      agentId: this.id,
      capability: 'claim-verification',
      output: resolved,
      confidence: resolved.confidence,
      explanation: `Claim "${context.claim.slice(0, 80)}" resolved with ${resolved.supportingEvidence.length} supporting and ${resolved.contradictoryEvidence.length} contradictory citations.`,
      timestamp: new Date().toISOString(),
    };
  }

  validate(result: AgentResult): boolean {
    return result.output !== null && typeof result.output.confidence === 'number';
  }

  explain(result: AgentResult): string {
    return result.explanation;
  }

  confidence(result: AgentResult): number {
    return result.confidence;
  }
}
