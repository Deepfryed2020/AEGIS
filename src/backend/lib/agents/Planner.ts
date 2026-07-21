import { AgentManager, AgentCapability, AgentContext } from './AgentManager.js';
import { Logger } from '../observability/Logger.js';

export interface PlanStep {
  capability: AgentCapability;
  context: AgentContext;
  description: string;
  dependsOn?: number[];
}

export interface ExecutionPlan {
  steps: PlanStep[];
  estimatedSteps: number;
}

export class Planner {
  planInvestigation(investigationId: string, evidenceIds: string[]): ExecutionPlan {
    const steps: PlanStep[] = [
      {
        capability: 'evidence-analysis',
        context: { investigationId, evidenceIds },
        description: 'Analyze all evidence documents for entities and relationships',
      },
      {
        capability: 'entity-resolution',
        context: { investigationId },
        description: 'Resolve and profile key entities',
        dependsOn: [0],
      },
      {
        capability: 'timeline-reconstruction',
        context: { investigationId, evidenceIds },
        description: 'Reconstruct timeline from evidence',
        dependsOn: [0],
      },
      {
        capability: 'claim-verification',
        context: { investigationId },
        description: 'Verify claims found in evidence',
        dependsOn: [0],
      },
      {
        capability: 'investigation-suggestion',
        context: { investigationId },
        description: 'Generate investigation suggestions and verify graph integrity',
        dependsOn: [1, 2, 3],
      },
      {
        capability: 'report-drafting',
        context: { investigationId },
        description: 'Draft investigation report',
        dependsOn: [4],
      },
    ];
    Logger.info('planner', `Created ${steps.length}-step execution plan for investigation ${investigationId}`);
    return { steps, estimatedSteps: steps.length };
  }

  async executePlan(plan: ExecutionPlan): Promise<any[]> {
    const results: any[] = [];
    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i];
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!results[dep]) {
            Logger.warn('planner', `Step ${i} depends on step ${dep} which has no result — skipping`);
            results.push(null);
            continue;
          }
        }
      }
      const result = await AgentManager.execute(step.capability, step.context);
      results.push(result);
      Logger.info('planner', `Step ${i + 1}/${plan.steps.length}: ${step.description}`);
    }
    return results;
  }
}
