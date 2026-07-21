import { AgentManager, AegisAgent, AgentContext, AgentResult } from './AgentManager.js';
import { EvidenceAgent } from './agents/EvidenceAgent.js';
import { ClaimAgent } from './agents/ClaimAgent.js';
import { TimelineAgent } from './agents/TimelineAgent.js';
import { EntityAgent } from './agents/EntityAgent.js';
import { ReportAgent } from './agents/ReportAgent.js';
import { VerifierAgent } from './agents/VerifierAgent.js';
import { Planner } from './Planner.js';

export { AgentManager } from './AgentManager.js';
export { EvidenceAgent } from './agents/EvidenceAgent.js';
export { ClaimAgent } from './agents/ClaimAgent.js';
export { TimelineAgent } from './agents/TimelineAgent.js';
export { EntityAgent } from './agents/EntityAgent.js';
export { ReportAgent } from './agents/ReportAgent.js';
export { VerifierAgent } from './agents/VerifierAgent.js';
export { Planner } from './Planner.js';

export function initializeAgents(): void {
  AgentManager.register(new EvidenceAgent());
  AgentManager.register(new ClaimAgent());
  AgentManager.register(new TimelineAgent());
  AgentManager.register(new EntityAgent());
  AgentManager.register(new ReportAgent());
  AgentManager.register(new VerifierAgent());
  AgentManager.setMemory('planner', new Planner());
}
