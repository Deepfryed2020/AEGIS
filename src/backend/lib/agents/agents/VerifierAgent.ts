import { AgentCapability, AgentContext, AgentResult, AegisAgent } from '../AgentManager.js';
import { ReliabilityEngine } from '../../../services/reliability/reliabilityEngine.js';
import { GraphValidator } from '../../graph/GraphValidator.js';

export class VerifierAgent implements AegisAgent {
  id = 'verifier-agent';
  name = 'Verifier Agent';
  capabilities: AgentCapability[] = ['investigation-suggestion'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const validation = await GraphValidator.validate();
    const reliability = await ReliabilityEngine.scoreAll();
    const issues = validation.summary.total;
    const lowReliability = reliability.filter((r) => r.compositeScore < 0.5);

    return {
      agentId: this.id,
      capability: 'investigation-suggestion',
      output: { validation, lowReliabilitySources: lowReliability, suggestions: this.generateSuggestions(validation, lowReliability) },
      confidence: issues === 0 ? 0.9 : 0.5,
      explanation: `Graph validation found ${issues} issues. ${lowReliability.length} sources scored below 0.5 reliability.`,
      timestamp: new Date().toISOString(),
    };
  }

  private generateSuggestions(validation: any, lowReliability: any[]): string[] {
    const suggestions: string[] = [];
    if (validation.summary.duplicates > 0) suggestions.push(`Merge ${validation.summary.duplicates} duplicate entity group(s).`);
    if (validation.summary.broken > 0) suggestions.push(`Remove ${validation.summary.broken} broken relationship(s).`);
    if (validation.summary.orphans > 0) suggestions.push(`Review ${validation.summary.orphans} orphaned entit(ies).`);
    if (lowReliability.length > 0) suggestions.push(`${lowReliability.length} source(s) have low reliability — seek corroboration.`);
    if (suggestions.length === 0) suggestions.push('No issues detected — graph integrity is healthy.');
    return suggestions;
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
