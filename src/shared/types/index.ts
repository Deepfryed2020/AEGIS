// Shared API contracts used by both frontend and backend.
// These are the source of truth — backend responses must match these shapes.

export interface DashboardStats {
  investigations: number;
  evidence: number;
  sources: number;
  relationships: number;
  entities: number;
  claims: number;
  jobs: number;
  queuePending: number;
  latestImports: LatestImport[];
  relationshipGrowth: GrowthPoint[];
  entityGrowth: GrowthPoint[];
  mostConnectedOrganisations: ConnectedOrg[];
  evidenceConfidence: ConfidenceDistribution;
  claimConflicts: ClaimConflict[];
  timelineActivity: GrowthPoint[];
  sourceReliability: SourceReliabilitySummary[];
  investigationProgress: InvestigationProgress[];
  graphStats: GraphStats;
}

export interface LatestImport {
  id: string;
  title: string;
  sourceName: string;
  retrievedDate: string;
  documentType: string;
}

export interface GrowthPoint {
  date: string;
  count: number;
}

export interface ConnectedOrg {
  name: string;
  degree: number;
  mentionCount: number;
}

export interface ConfidenceDistribution {
  average: number;
  high: number;
  medium: number;
  low: number;
}

export interface ClaimConflict {
  claim: string;
  supporting: number;
  contradicting: number;
}

export interface SourceReliabilitySummary {
  sourceId: string;
  sourceName: string;
  compositeScore: number;
  sourceClass: string;
}

export interface InvestigationProgress {
  id: string;
  title: string;
  evidenceCount: number;
  archived: number;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  typeDistribution: Record<string, number>;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  canonical?: string;
  mentionCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  confidence: number;
  source: string;
  timestamp?: string;
  citation?: string;
  reason?: string;
  weight: number;
  evidenceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EntityProfile {
  node: GraphNode;
  summary: string;
  aliases: string[];
  timeline: ProfileTimelineEvent[];
  relatedEntities: Array<{ node: GraphNode; edge: GraphEdge }>;
  connectedEvidence: EvidenceDocument[];
  claims: EntityClaim[];
  confidence: number;
  riskIndicators: RiskIndicator[];
  documentsMentioning: DocumentMention[];
  recentActivity: ActivityEvent[];
  rank: number;
  degree: number;
}

export interface ProfileTimelineEvent {
  date: string;
  title: string;
  description: string;
  evidenceId?: string;
}

export interface EntityClaim {
  claim: string;
  documentId: string;
  supporting: boolean;
  confidence: number;
}

export interface RiskIndicator {
  level: 'low' | 'medium' | 'high';
  label: string;
  reason: string;
}

export interface DocumentMention {
  id: string;
  title: string;
  retrievedDate: string;
  url: string;
}

export interface ActivityEvent {
  timestamp: string;
  event: string;
  evidenceId?: string;
}

export interface EvidenceDocument {
  id: string;
  url: string;
  title: string;
  content: string;
  sourceId?: string;
  sourceName?: string;
  documentType?: string;
  retrievedDate: string;
  contentHash?: string;
  confidence: number;
  publisher?: string;
  organisation?: string;
  keywords?: string;
  entities?: string;
  summary?: string;
}

export interface Investigation {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  evidenceIds: string[];
  notes?: string;
  archived?: number;
  archivedAt?: string;
}

export interface ResolvedClaim {
  id: string;
  claim: string;
  supportingEvidence: Array<{ citation: Citation; documentId: string }>;
  contradictoryEvidence: Array<{ citation: Citation; documentId: string }>;
  insufficientEvidence: boolean;
  confidence: number;
  reasoning: string;
  outstandingQuestions: string[];
  createdAt: string;
}

export interface Citation {
  quote: string;
  paragraph: number;
  url: string;
  publisher?: string;
}

export interface TimelineData {
  events: MergedTimelineEvent[];
  missingPeriods: Gap[];
  conflictingDates: ConflictingDate[];
  duplicateEvents: DuplicateEvent[];
  eventChains: EventChain[];
  causalRelationships: CausalRelationship[];
}

export interface MergedTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
  sourceCount: number;
}

export interface Gap {
  start: string;
  end: string;
  reason: string;
}

export interface ConflictingDate {
  date: string;
  event: string;
  descriptions: string[];
}

export interface DuplicateEvent {
  date: string;
  description: string;
  count: number;
}

export interface EventChain {
  name: string;
  events: MergedTimelineEvent[];
}

export interface CausalRelationship {
  cause: MergedTimelineEvent;
  effect: MergedTimelineEvent;
  reason: string;
}

export interface AssistantReport {
  investigationId: string;
  suggestions: AssistantSuggestion[];
  generatedAt: string;
}

export interface AssistantSuggestion {
  category: string;
  title: string;
  reason: string;
  confidence: number;
  references?: string[];
}

export interface ReliabilityScore {
  sourceId: string;
  sourceName: string;
  sourceClass: string;
  baseTrust: number;
  historicalAccuracy: number;
  crossReferences: number;
  documentAge: number;
  evidenceQuality: number;
  independentCorroboration: number;
  compositeScore: number;
  confidence: number;
  signals: Array<{ label: string; value: number; weight: number }>;
}

export interface SearchResults {
  documents: Array<EvidenceDocument & { score: number; reason: string; highlights: string[] }>;
  entities: Array<{ id: string; name: string; type: string; mentionCount: number; score: number }>;
  relationships: Array<{ id: string; sourceName: string; targetName: string; type: string; score: number }>;
  claims: Array<{ id: string; claim: string; confidence: number; score: number }>;
  investigations: Array<{ id: string; title: string; description: string; score: number }>;
  total: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: string;
  createdAt: string;
}

export interface GeneratedReport {
  id: string;
  investigationId: string;
  title: string;
  sections: ReportSection[];
  generatedAt: string;
  format: 'markdown' | 'json';
}

export interface ReportSection {
  title: string;
  body: string;
  citations: Array<{ quote: string; documentId: string; url: string; publisher?: string }>;
}

export interface PluginInfo {
  id: string;
  name: string;
  category: string;
  version: string;
  description?: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  subsystems: SubsystemHealth[];
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
}

export interface SubsystemHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
}

export interface JobInfo {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  payload: any;
  result?: any;
  error?: string;
  progress: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  investigationId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  estimatedCompletion?: string;
}

export interface JobStats {
  total: number;
  queued: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
  activeCount: number;
}

export interface ValidationResult {
  duplicateNodes: Array<{ name: string; type: string; ids: string[] }>;
  brokenEdges: Array<{ edgeId: string; sourceId: string; targetId: string; reason: string }>;
  orphanEntities: Array<{ entityId: string; name: string; type: string }>;
  invalidReferences: Array<{ evidenceId: string; entityId: string; reason: string }>;
  summary: { total: number; duplicates: number; broken: number; orphans: number; invalid: number };
}

export interface MetricsReport {
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  requestMetrics: { total: number; errors: number; avgLatencyMs: number; p95LatencyMs: number };
  cacheMetrics: { hits: number; misses: number; hitRate: number; size: number; invalidations: number };
  errorCount: number;
  recentErrors: any[];
  slowRequests: any[];
  plugins: PluginInfo[];
}

export interface CrawlSchedule {
  id: string;
  connectorId: string;
  cronExpression: string;
  lastRun?: string;
  nextRun?: string;
  enabled: number;
  maxDepth: number;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  connectorId: string;
  status: string;
  reason?: string;
  changed?: number;
  createdAt: string;
  finishedAt?: string;
}

export interface DocumentVersion {
  id: string;
  evidenceId: string;
  versionedAt: string;
  contentHash: string;
  summary: string;
  changeType: string;
  pageCount?: number;
}

export interface DocumentDifference {
  id: string;
  evidenceId: string;
  versionA: string;
  versionB: string;
  addedParagraphs: string[];
  removedParagraphs: string[];
  amendedParagraphs: Array<{ before: string; after: string; similarity: number }>;
  changedFigures: Array<{ before: string; after: string }>;
  newEntities: string[];
  removedEntities: string[];
  policyChanges: string[];
  summary: string;
  createdAt: string;
}

export interface ConnectorInfo {
  id: string;
  name: string;
  sourceType?: string;
  url?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  capabilities: string[];
}

export interface ApiError {
  error: string;
}
