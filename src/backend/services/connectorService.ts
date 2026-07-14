import { Connectors } from '../connectors/index.js';
import { Storage } from '../storage.js';
import { EvidenceDocument, SourceMetadata } from '../../shared/models.js';
import { JobService } from './jobService.js';
import { Sql } from '../db.js';

interface ConnectorSummary {
  id: string;
  name: string;
  source: SourceMetadata;
  capabilities: string[];
  status: string;
  health: string;
  lastCrawl?: string;
  documentsIndexed: number;
  averageCrawlTimeMs?: number;
}

export async function listConnectors(): Promise<ConnectorSummary[]> {
  const summaries: ConnectorSummary[] = [];
  const jobs = await JobService.getJobs();

  for (const connector of Connectors) {
    const connectorJobs = jobs.filter((job) => job.connectorId === connector.id);
    const latestJob = connectorJobs[0];
    const completedJobs = connectorJobs.filter((job) => job.finishedAt && job.startedAt);
    const avgCrawlTimeMs = completedJobs.length
      ? completedJobs.reduce((sum, job) => sum + (new Date(job.finishedAt!).getTime() - new Date(job.startedAt!).getTime()), 0) / completedJobs.length
      : undefined;
    const evidenceCountRow = await Sql.get<{ count: number }>(`SELECT COUNT(*) as count FROM evidence WHERE sourceId = ?`, [connector.sourceMetadata.id]);
    summaries.push({
      id: connector.id,
      name: connector.name,
      source: connector.sourceMetadata,
      capabilities: connector.capabilities || ['HTML', 'PDF', 'XML', 'CSV', 'JSON'],
      status: latestJob ? latestJob.status : 'Idle',
      health: latestJob?.status === 'Failed' ? 'Warning' : 'Healthy',
      lastCrawl: latestJob?.finishedAt || undefined,
      documentsIndexed: evidenceCountRow?.count || 0,
      averageCrawlTimeMs: avgCrawlTimeMs,
    });
  }

  return summaries;
}

export function getConnectorBySourceId(sourceId: string) {
  return Connectors.find((connector) => connector.sourceMetadata.id === sourceId);
}

export async function crawlConnector(connectorId: string, query?: string, maxDepth = 2) {
  const connector = Connectors.find((connectorItem) => connectorItem.id === connectorId);
  if (!connector) return null;
  const url = connector.sourceMetadata.url;
  const job = await JobService.create(connectorId, url, query, maxDepth);

  try {
    await JobService.updateStatus(job.id, 'Downloading');
    const results = await connector.crawl(url, job.id, maxDepth, query);

    await JobService.updateStatus(job.id, 'Parsing', results.length);

    if (!await Storage.getSource(connector.sourceMetadata.id)) {
      await Storage.addSource(connector.sourceMetadata);
    }

    await JobService.updateStatus(job.id, 'Indexing', results.length);
    return results;
  } catch (error) {
    await JobService.updateStatus(job.id, 'Failed', 0, String(error));
    return [];
  }
}

export function getConnectorByName(name: string) {
  return Connectors.find((connectorItem) => connectorItem.name === name);
}
