import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuid } from 'uuid';
import { Storage } from './storage.js';
import { listConnectors, crawlConnector, getConnectorBySourceId } from './services/connectorService.js';
import { JobService } from './services/jobService.js';
import { SourceMetadata } from '../shared/models.js';
import { analyzeClaim } from './services/claims/claimService.js';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

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

app.listen(4000, () => {
  console.log('AEGIS backend running on http://localhost:4000');
});
