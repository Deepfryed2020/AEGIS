import { AgentCapability, AgentContext, AgentResult, AegisAgent } from '../AgentManager.js';
import { ReportGenerator } from '../../../services/reports/reportGenerator.js';

export class ReportAgent implements AegisAgent {
  id = 'report-agent';
  name = 'Report Drafting Agent';
  capabilities: AgentCapability[] = ['report-drafting'];

  async execute(context: AgentContext): Promise<AgentResult> {
    if (!context.investigationId) {
      return { agentId: this.id, capability: 'report-drafting', output: null, confidence: 0, explanation: 'No investigation ID provided', timestamp: new Date().toISOString() };
    }
    const report = await ReportGenerator.generate(context.investigationId, 'markdown');
    if (!report) {
      return { agentId: this.id, capability: 'report-drafting', output: null, confidence: 0, explanation: `Investigation ${context.investigationId} not found`, timestamp: new Date().toISOString() };
    }
    return {
      agentId: this.id,
      capability: 'report-drafting',
      output: report,
      confidence: 0.85,
      explanation: `Generated report "${report.title}" with ${report.sections.length} sections.`,
      timestamp: new Date().toISOString(),
    };
  }

  validate(result: AgentResult): boolean {
    return result.output !== null && Array.isArray(result.output.sections);
  }

  explain(result: AgentResult): string {
    return result.explanation;
  }

  confidence(result: AgentResult): number {
    return result.confidence;
  }
}
