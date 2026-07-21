import { AgentCapability, AgentContext, AgentResult, AegisAgent } from '../AgentManager.js';
import { TimelineReconstructor } from '../../../services/timeline/timelineReconstructor.js';

export class TimelineAgent implements AegisAgent {
  id = 'timeline-agent';
  name = 'Timeline Reconstruction Agent';
  capabilities: AgentCapability[] = ['timeline-reconstruction'];

  async execute(context: AgentContext): Promise<AgentResult> {
    const timeline = await TimelineReconstructor.reconstruct(context.evidenceIds);
    return {
      agentId: this.id,
      capability: 'timeline-reconstruction',
      output: timeline,
      confidence: Math.min(0.95, 0.3 + timeline.events.length * 0.02),
      explanation: `Reconstructed ${timeline.events.length} events with ${timeline.missingPeriods.length} gaps, ${timeline.conflictingDates.length} conflicts, and ${timeline.causalRelationships.length} causal links.`,
      timestamp: new Date().toISOString(),
    };
  }

  validate(result: AgentResult): boolean {
    return result.output && Array.isArray(result.output.events);
  }

  explain(result: AgentResult): string {
    return result.explanation;
  }

  confidence(result: AgentResult): number {
    return result.confidence;
  }
}
