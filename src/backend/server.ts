import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuid } from 'uuid';
import { Storage } from './storage.js';
import { listConnectors, crawlConnector, getConnectorBySourceId } from './services/connectorService.js';
import { JobService } from './services/jobService.js';
import { SourceMetadata } from '../shared/models.js';
import { analyzeClaim } from './services/claims/claimService.js';
import { KnowledgeGraph } from './lib/intelligence/knowledge.js';
import { GraphStore } from './lib/graph/GraphStore.js';
import { GraphQuery } from './lib/graph/GraphQuery.js';
import { CommunityDetection } from './lib/graph/CommunityDetection.js';
import { PathFinder } from './lib/graph/PathFinder.js';
import { NodeRank } from './lib/graph/NodeRank.js';
import { ProfileService } from './lib/intelligence/profileService.js';
import { ClaimResolutionEngine } from './services/claims/claimResolutionEngine.js';
import { TimelineReconstructor } from './services/timeline/timelineReconstructor.js';
import { InvestigationAssistant } from './services/assistant/investigationAssistant.js';
import { ReliabilityEngine } from './services/reliability/reliabilityEngine.js';
import { ContinuousIngestion } from './services/ingestion/continuousIngestion.js';
import { DifferenceEngine } from './services/difference/differenceEngine.js';
import { DashboardService } from './services/dashboard/dashboardService.js';
import { SemanticSearch } from './services/search/semanticSearch.js';
import { ReportGenerator } from './services/reports/reportGenerator.js';
import { initializePlugins, PluginRegistry } from './plugins/index.js';
import { requestTracer, Logger, ErrorTracker, RequestTracer } from './lib/observability/index.js';
import { HealthMonitor } from './lib/observability/HealthMonitor.js';
import { MigrationRunner } from './migrations/MigrationRunner.js';
import { JobEngine } from './services/jobs/jobEngine.js';
import { GraphValidator, SelfHealer } from './lib/graph/GraphValidator.js';
import { EventBus } from './lib/events/EventBus.js';
import { intelligenceCache } from './lib/cache/IntelligenceCache.js';
import { AgentManager } from './lib/agents/AgentManager.js';
import { initializeAgents } from './lib/agents/index.js';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(requestTracer);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/connectors', async (req, res) => {
  const connectors = await listConnectors();
  res.json(connectors);
});

app.post('/api/connectors/:id/crawl', async (req, res) => {
  const connectorId = req.params.id;
  const query = typeof req.body.query === 'string' ? req.body.query : String(req.query.q || '');
  const maxDepth = typeof req.body.maxDepth === 'number' ? req.body.maxDepth : Number(req.query.maxDepth || 2);
  const results = await crawlConnector(connectorId, query || undefined, Number.isNaN(maxDepth) ? 2 : maxDepth);
  if (results === null) return res.status(404).json({ error: 'connector not found' });
  res.json({ ingested: results.length, documents: results });
});

app.get('/api/jobs', async (req, res) => {
  const jobs = await JobService.getJobs();
  res.json(jobs);
});

app.get('/api/sources', async (req, res) => {
  const sources = await Storage.getSources();
  res.json(sources);
});

app.post('/api/sources', async (req, res) => {
  const { name, url, level } = req.body;
  if (!name || !url || !level) {
    return res.status(400).json({ error: 'name, url, and level are required' });
  }
  const source: SourceMetadata = {
    id: uuid(),
    name,
    url,
    level,
    authorityScore: 0.8,
    trustScore: 0.85,
    officialStatus: 'Official',
    lastCrawled: undefined,
  };
  await Storage.addSource(source);
  return res.status(201).json(source);
});

app.post('/api/ingest', async (req, res) => {
  const { url, sourceId, maxDepth } = req.body;
  if (!url || !sourceId) {
    return res.status(400).json({ error: 'url and sourceId are required' });
  }
  const source = await Storage.getSource(sourceId);
  if (!source) {
    return res.status(404).json({ error: 'source not found' });
  }
  const connector = getConnectorBySourceId(sourceId);
  if (!connector) {
    return res.status(404).json({ error: 'connector not found for source' });
  }
  try {
    const results = await crawlConnector(connector.id, undefined, typeof maxDepth === 'number' ? maxDepth : 2);
    if (results === null) return res.status(404).json({ error: 'connector not found' });
    return res.status(201).json(results);
  } catch (error) {
    console.error('Ingestion error', error);
    return res.status(500).json({ error: 'Failed to ingest url' });
  }
});

app.get('/api/evidence', async (req, res) => {
  const query = String(req.query.q || '');
  if (query) {
    return res.json(await Storage.searchEvidence(query));
  }
  res.json(await Storage.getEvidence());
});

app.get('/api/evidence/:id', async (req, res) => {
  const document = await Storage.getEvidenceById(req.params.id);
  if (!document) return res.status(404).json({ error: 'document not found' });
  res.json(document);
});

app.post('/api/investigations', async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const investigation = {
    id: uuid(),
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    evidenceIds: [],
    notes: ''
  };
  await Storage.addInvestigation(investigation);
  res.status(201).json(investigation);
});

app.get('/api/investigations', async (req, res) => {
  res.json(await Storage.getInvestigations());
});

app.get('/api/investigations/:id', async (req, res) => {
  const investigation = await Storage.getInvestigation(req.params.id);
  if (!investigation) return res.status(404).json({ error: 'investigation not found' });
  res.json(investigation);
});

app.post('/api/investigations/:id/evidence', async (req, res) => {
  const { evidenceId } = req.body;
  if (!evidenceId) return res.status(400).json({ error: 'evidenceId is required' });
  const investigation = await Storage.linkEvidenceToInvestigation(req.params.id, evidenceId);
  if (!investigation) return res.status(404).json({ error: 'investigation not found' });
  res.json(investigation);
});

app.get('/api/investigations/:id/evidence', async (req, res) => {
  const investigation = await Storage.getInvestigation(req.params.id);
  if (!investigation) return res.status(404).json({ error: 'investigation not found' });
  const evidence = await Storage.getInvestigationEvidence(req.params.id);
  res.json(evidence);
});

app.delete('/api/investigations/:id/evidence/:evidenceId', async (req, res) => {
  const investigation = await Storage.removeEvidenceFromInvestigation(req.params.id, req.params.evidenceId);
  if (!investigation) return res.status(404).json({ error: 'investigation not found' });
  res.json(investigation);
});

app.put('/api/investigations/:id', async (req, res) => {
  const { title, description, notes, archived } = req.body;
  const investigation = await Storage.updateInvestigation(req.params.id, {
    title,
    description,
    notes,
    archived,
    archivedAt: archived ? new Date().toISOString() : undefined,
  });
  if (!investigation) return res.status(404).json({ error: 'investigation not found' });
  res.json(investigation);
});

app.delete('/api/investigations/:id', async (req, res) => {
  const deleted = await Storage.deleteInvestigation(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'investigation not found' });
  res.json({ success: true });
});

app.post('/api/investigations/:id/reports', async (req, res) => {
  const { title, format, content } = req.body;
  if (!title || !format || !content) {
    return res.status(400).json({ error: 'title, format, and content are required' });
  }
  const report = {
    id: uuid(),
    investigationId: req.params.id,
    title,
    format,
    content,
    createdAt: new Date().toISOString(),
  };
  await Storage.addReport(report);
  res.status(201).json(report);
});

app.get('/api/investigations/:id/reports', async (req, res) => {
  const reports = await Storage.getReports(req.params.id);
  res.json(reports);
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '');
  if (!query) return res.status(400).json({ error: 'query is required' });
  const evidenceResults = await Storage.searchEvidence(query);
  res.json({ evidence: evidenceResults });
});

app.post('/api/claims', async (req, res) => {
  const claim = String(req.body.claim || '');
  if (!claim) return res.status(400).json({ error: 'claim is required' });
  const evidence = await Storage.getEvidence();
  const analysis = analyzeClaim(claim, evidence);
  res.json(analysis);
});

app.get('/api/graph', async (req, res) => {
  const nodeLimit = Math.min(Number(req.query.nodes) || 200, 500);
  const edgeLimit = Math.min(Number(req.query.edges) || 400, 1000);
  const nodes = await KnowledgeGraph.getNodes(nodeLimit);
  const edges = await KnowledgeGraph.getEdges(edgeLimit);
  res.json({ nodes, edges });
});

app.get('/api/graph/:entityId', async (req, res) => {
  const depth = Math.min(Number(req.query.depth) || 1, 2);
  const subgraph = await KnowledgeGraph.getNeighbours(req.params.entityId, depth);
  res.json(subgraph);
});

// Phase 1: Autonomous Knowledge Graph
app.get('/api/graph2', async (req, res) => {
  const nodeLimit = Math.min(Number(req.query.nodes) || 200, 1000);
  const edgeLimit = Math.min(Number(req.query.edges) || 400, 2000);
  const nodes = await GraphStore.getNodes(nodeLimit);
  const edges = await GraphStore.getEdges(edgeLimit);
  res.json({ nodes, edges });
});

app.get('/api/graph2/stats', async (req, res) => {
  res.json(await GraphQuery.getStats());
});

app.get('/api/graph2/neighbours/:id', async (req, res) => {
  const depth = Math.min(Number(req.query.depth) || 1, 3);
  res.json(await GraphQuery.getNeighbourhood(req.params.id, depth));
});

app.get('/api/graph2/communities', async (req, res) => {
  res.json(await CommunityDetection.detectCommunities());
});

app.get('/api/graph2/path', async (req, res) => {
  const { source, target } = req.query;
  if (!source || !target) return res.status(400).json({ error: 'source and target are required' });
  const path = await PathFinder.findShortestPath(String(source), String(target));
  res.json(path);
});

app.get('/api/graph2/rank', async (req, res) => {
  const ranks = await NodeRank.degreeCentrality(50);
  res.json(ranks);
});

// Phase 2: Entity Profiles
app.get('/api/profiles/:entityId', async (req, res) => {
  const profile = await ProfileService.getProfile(req.params.entityId);
  if (!profile) return res.status(404).json({ error: 'entity not found' });
  res.json(profile);
});

app.get('/api/profiles', async (req, res) => {
  const query = String(req.query.q || '');
  const nodes = await GraphQuery.searchNodes(query, 20);
  res.json(nodes);
});

// Phase 3: Claim Resolution
app.post('/api/claims/resolve', async (req, res) => {
  const claim = String(req.body.claim || '');
  if (!claim) return res.status(400).json({ error: 'claim is required' });
  const resolved = await ClaimResolutionEngine.resolve(claim);
  res.json(resolved);
});

app.get('/api/claims/resolved', async (req, res) => {
  res.json(await ClaimResolutionEngine.list());
});

// Phase 4: Timeline Reconstruction
app.get('/api/timeline', async (req, res) => {
  const investigationId = String(req.query.investigationId || '');
  let evidenceIds: string[] | undefined;
  if (investigationId) {
    const investigation = await Storage.getInvestigation(investigationId);
    if (investigation) evidenceIds = investigation.evidenceIds;
  }
  res.json(await TimelineReconstructor.reconstruct(evidenceIds));
});

// Phase 5: Investigation Assistant
app.get('/api/assistant/:investigationId', async (req, res) => {
  const report = await InvestigationAssistant.suggest(req.params.investigationId);
  res.json(report);
});

// Phase 6: Evidence Reliability
app.get('/api/reliability', async (req, res) => {
  res.json(await ReliabilityEngine.scoreAll());
});

app.get('/api/reliability/:sourceId', async (req, res) => {
  const score = await ReliabilityEngine.scoreSource(req.params.sourceId);
  if (!score) return res.status(404).json({ error: 'source not found' });
  res.json(score);
});

// Phase 7: Continuous Ingestion
app.get('/api/ingestion/schedules', async (req, res) => {
  res.json(await ContinuousIngestion.listSchedules());
});

app.post('/api/ingestion/schedules', async (req, res) => {
  const { connectorId, intervalMinutes, maxDepth } = req.body;
  if (!connectorId || !intervalMinutes) return res.status(400).json({ error: 'connectorId and intervalMinutes are required' });
  const schedule = await ContinuousIngestion.createSchedule(connectorId, intervalMinutes, maxDepth || 2);
  res.status(201).json(schedule);
});

app.post('/api/ingestion/schedules/:id/toggle', async (req, res) => {
  await ContinuousIngestion.toggleSchedule(req.params.id, Boolean(req.body.enabled));
  res.json({ success: true });
});

app.post('/api/ingestion/queue', async (req, res) => {
  const { connectorId, maxDepth } = req.body;
  if (!connectorId) return res.status(400).json({ error: 'connectorId is required' });
  const entry = await ContinuousIngestion.queueManual(connectorId, maxDepth || 2);
  res.status(201).json(entry);
});

app.get('/api/ingestion/queue', async (req, res) => {
  res.json(await ContinuousIngestion.getQueue());
});

// Phase 8: Difference Engine
app.get('/api/diff/:evidenceId/versions', async (req, res) => {
  res.json(await DifferenceEngine.getVersions(req.params.evidenceId));
});

app.get('/api/diff/:evidenceId/compare', async (req, res) => {
  const result = await DifferenceEngine.compareSideBySide(req.params.evidenceId);
  res.json(result);
});

app.get('/api/diff/:evidenceId/compare-versions', async (req, res) => {
  const { versionA, versionB } = req.query;
  if (!versionA || !versionB) return res.status(400).json({ error: 'versionA and versionB are required' });
  const diff = await DifferenceEngine.compareVersions(req.params.evidenceId, String(versionA), String(versionB));
  res.json(diff);
});

// Phase 9: Investigation Dashboard
app.get('/api/dashboard', async (req, res) => {
  res.json(await DashboardService.getStats());
});

// Phase 10: Search 2.0
app.get('/api/search2', async (req, res) => {
  const q = String(req.query.q || '');
  if (!q) return res.status(400).json({ error: 'query is required' });
  const results = await SemanticSearch.search({
    q,
    documentType: req.query.documentType ? String(req.query.documentType) : undefined,
    sourceId: req.query.sourceId ? String(req.query.sourceId) : undefined,
    organisation: req.query.organisation ? String(req.query.organisation) : undefined,
    fromDate: req.query.fromDate ? String(req.query.fromDate) : undefined,
    toDate: req.query.toDate ? String(req.query.toDate) : undefined,
    minConfidence: req.query.minConfidence ? Number(req.query.minConfidence) : undefined,
    sortBy: req.query.sortBy ? String(req.query.sortBy) as any : undefined,
  });
  res.json(results);
});

app.post('/api/search2/saved', async (req, res) => {
  const { name, query, filters } = req.body;
  if (!name || !query) return res.status(400).json({ error: 'name and query are required' });
  const saved = await SemanticSearch.saveSearch(name, query, filters);
  res.status(201).json(saved);
});

app.get('/api/search2/saved', async (req, res) => {
  res.json(await SemanticSearch.listSavedSearches());
});

app.delete('/api/search2/saved/:id', async (req, res) => {
  await SemanticSearch.deleteSavedSearch(req.params.id);
  res.json({ success: true });
});

// Phase 11: Report Generator
app.post('/api/reports/generate/:investigationId', async (req, res) => {
  const format = (req.body.format === 'json' ? 'json' : 'markdown') as 'markdown' | 'json';
  const report = await ReportGenerator.generate(req.params.investigationId, format);
  if (!report) return res.status(404).json({ error: 'investigation not found' });
  res.status(201).json(report);
});

// Phase 14: Plugins
app.get('/api/plugins', async (req, res) => {
  res.json(PluginRegistry.list(req.query.category as any));
});

app.post('/api/plugins/execute', async (req, res) => {
  const { category, context } = req.body;
  if (!category) return res.status(400).json({ error: 'category is required' });
  const results = await PluginRegistry.executeCategory(category, context || {});
  res.json(results);
});

// Phase 14: Health & Observability
app.get('/health', async (req, res) => {
  const report = await HealthMonitor.check();
  res.status(report.status === 'unhealthy' ? 503 : 200).json(report);
});

app.get('/status', async (req, res) => {
  res.json(await HealthMonitor.getStatus());
});

app.get('/metrics', async (req, res) => {
  res.json(await HealthMonitor.getMetrics());
});

app.get('/api/logs', async (req, res) => {
  const count = Number(req.query.count) || 50;
  const level = req.query.level as any;
  res.json(Logger.getRecent(count, level));
});

app.get('/api/errors', async (req, res) => {
  res.json(ErrorTracker.getRecent(Number(req.query.count) || 50));
});

app.get('/api/requests', async (req, res) => {
  res.json(RequestTracer.getRecent(Number(req.query.count) || 50));
});

// Phase 14: Migrations
app.get('/api/migrations', async (req, res) => {
  res.json(await MigrationRunner.list());
});

app.post('/api/migrations/run', async (req, res) => {
  res.json(await MigrationRunner.run());
});

// Phase 14: Job Engine
app.get('/api/jobs2', async (req, res) => {
  res.json(await JobEngine.getJobs(Number(req.query.limit) || 50, req.query.status as string));
});

app.post('/api/jobs2', async (req, res) => {
  const { type, payload, priority, investigationId } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  const job = await JobEngine.enqueue(type, payload || {}, { priority, investigationId });
  res.status(201).json(job);
});

app.get('/api/jobs2/stats', async (req, res) => {
  res.json(await JobEngine.getStats());
});

app.get('/api/jobs2/:id', async (req, res) => {
  const job = await JobEngine.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

app.post('/api/jobs2/:id/pause', async (req, res) => {
  await JobEngine.pause(req.params.id);
  res.json({ success: true });
});

app.post('/api/jobs2/:id/resume', async (req, res) => {
  await JobEngine.resume(req.params.id);
  res.json({ success: true });
});

app.post('/api/jobs2/:id/cancel', async (req, res) => {
  await JobEngine.cancel(req.params.id);
  res.json({ success: true });
});

// Phase 14: Graph Validation & Self-Healing
app.get('/api/graph2/validate', async (req, res) => {
  res.json(await GraphValidator.validate());
});

app.post('/api/graph2/heal', async (req, res) => {
  res.json(await SelfHealer.heal());
});

app.post('/api/graph2/rebuild', async (req, res) => {
  res.json(await SelfHealer.rebuildGraph());
});

// Phase 14: AI Agents
app.get('/api/agents', async (req, res) => {
  res.json(AgentManager.list().map((a) => ({ id: a.id, name: a.name, capabilities: a.capabilities })));
});

app.post('/api/agents/execute', async (req, res) => {
  const { capability, context } = req.body;
  if (!capability) return res.status(400).json({ error: 'capability is required' });
  const results = await AgentManager.execute(capability, context || {});
  res.json(results);
});

// Phase 14: Event Bus
app.get('/api/events', async (req, res) => {
  res.json(EventBus.getRecent(Number(req.query.count) || 50));
});

app.get('/api/events/stats', async (req, res) => {
  res.json(EventBus.getStats());
});

// Phase 14: Cache
app.get('/api/cache/metrics', async (req, res) => {
  res.json(intelligenceCache.metrics());
});

app.post('/api/cache/invalidate', async (req, res) => {
  const { tag } = req.body;
  if (tag) intelligenceCache.invalidateByTag(tag);
  else intelligenceCache.clear();
  res.json({ success: true });
});

app.listen(4000, async () => {
  console.log('AEGIS backend running on http://localhost:4000');
  try {
    await MigrationRunner.run();
    await initializePlugins();
    initializeAgents();
    ContinuousIngestion.startScheduler();
    Logger.info('server', 'Plugins initialized, agents registered, ingestion scheduler started.');
  } catch (error) {
    Logger.error('server', `Startup failed: ${error}`, { stack: String(error) });
  }
});
