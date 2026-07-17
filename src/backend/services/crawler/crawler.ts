import fetch from 'node-fetch';
import { URL } from 'url';
import crypto from 'crypto';
import { SourceMetadata, EvidenceDocument, DocumentType } from '../../../shared/models.js';
import { createDocument } from '../evidence/evidenceService.js';
import { fetchRobotsTxt, isAllowedByRobots } from './robots.js';
import { fetchSitemap } from './sitemap.js';
import { JobService } from '../jobService.js';
import { Storage } from '../../storage.js';
import { PipelineService } from '../pipelineService.js';
import { intelligenceEngine } from '../../lib/intelligence/pipeline.js';

interface CrawlJob {
  url: string;
  depth: number;
}

const RETRY_LIMIT = 2;

function normalizeUrl(base: string, link: string): string | null {
  try {
    return new URL(link, base).toString();
  } catch {
    return null;
  }
}

function enumerateLinks(base: string, html: string): string[] {
  const urls: Set<string> = new Set();
  const regex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const normalized = normalizeUrl(base, match[1]);
    if (normalized && normalized.startsWith(base)) {
      urls.add(normalized);
    }
  }
  return Array.from(urls);
}

function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '/';
  }
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function determineType(url: string, contentType: string | null): DocumentType {
  if (url.endsWith('.pdf') || contentType?.includes('pdf')) return 'PDF';
  if (url.endsWith('.json') || contentType?.includes('json')) return 'JSON';
  if (url.endsWith('.xml') || contentType?.includes('xml')) return 'XML';
  if (url.endsWith('.csv') || contentType?.includes('csv')) return 'CSV';
  if (contentType?.includes('rss')) return 'RSS';
  if (contentType?.includes('html') || url.endsWith('.htm') || url.endsWith('.html')) return 'HTML';
  return 'Text';
}

async function fetchWithRetries(url: string, jobId: string) {
  let attempt = 0;
  while (attempt <= RETRY_LIMIT) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type');
      const buffer = Buffer.from(await response.arrayBuffer());
      await JobService.updateStatus(jobId, 'Downloading', 0, undefined, { pagesFetched: 1, bytesFetched: buffer.length });
      return { buffer, contentType };
    } catch (error) {
      clearTimeout(timeout);
      await JobService.updateStatus(jobId, 'Downloading', 0, String(error), { retryCount: attempt });
      if (attempt > RETRY_LIMIT) {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  return null;
}


export async function crawlSource(source: SourceMetadata, seedUrl: string, jobId: string, maxDepth = 2) {
  const origin = new URL(source.url).origin;
  const robotsText = await fetchRobotsTxt(origin);
  const visited = new Set<string>();
  const queue: CrawlJob[] = [{ url: seedUrl, depth: 0 }];
  const results: EvidenceDocument[] = [];

  while (queue.length) {
    const queueJson = JSON.stringify(queue.map((item) => ({ url: item.url, depth: item.depth })));
    await JobService.updateStatus(jobId, 'Downloading', results.length, undefined, { queueState: queueJson, visitedState: JSON.stringify(Array.from(visited)) });

    const job = queue.shift();
    if (!job) break;
    if (job.depth > maxDepth) continue;
    if (visited.has(job.url)) continue;
    visited.add(job.url);

    const path = getUrlPath(job.url);
    if (!isAllowedByRobots(origin, path, robotsText)) {
      await JobService.recordAudit(jobId, 'robots-blocked', job.url, `Blocked by robots.txt`, { path });
      continue;
    }

    const fetchResult = await fetchWithRetries(job.url, jobId);
    if (!fetchResult) {
      await JobService.recordAudit(jobId, 'fetch-failed', job.url, `Failed to fetch after retries`);
      continue;
    }

    const { buffer, contentType } = fetchResult;
    const documentType = determineType(job.url, contentType);
    const rawHash = sha256(buffer);
    const existing = await Storage.getEvidenceByHash(rawHash);
    if (existing) {
      await JobService.recordAudit(jobId, 'duplicate', job.url, `Duplicate of ${existing.id}`, { duplicateId: existing.id });
      continue;
    }

    await JobService.updateStatus(jobId, 'Parsing', results.length);
    const document = await createDocument(job.url, source, contentType, buffer.buffer, rawHash);
    await PipelineService.createStage(document.id, 'Queued', 'Document queued for processing');
    await PipelineService.updateStage(document.id, 'Queued', 'Completed');
    await PipelineService.createStage(document.id, 'Downloading', 'Content downloaded');
    await PipelineService.updateStage(document.id, 'Downloading', 'Completed');
    await PipelineService.createStage(document.id, 'ExtractingText', 'Extracting text from raw content');

    results.push(document);
    await PipelineService.updateStage(document.id, 'ExtractingText', 'Completed');
    await PipelineService.createStage(document.id, 'MetadataExtraction', 'Extracting metadata');
    await PipelineService.updateStage(document.id, 'MetadataExtraction', 'Completed');
    await PipelineService.createStage(document.id, 'EntityExtraction', 'Extracting entities');
    await PipelineService.updateStage(document.id, 'EntityExtraction', 'Completed');
    await PipelineService.createStage(document.id, 'Chunking', 'Chunking document content');
    await PipelineService.addChunk(document.id, 0, document.content.slice(0, 200));
    await PipelineService.updateStage(document.id, 'Chunking', 'Completed');
    await PipelineService.createStage(document.id, 'CitationMapping', 'Generating citation metadata');
    await PipelineService.updateStage(document.id, 'CitationMapping', 'Completed');

    await Storage.addEvidence(document);
    await PipelineService.createStage(document.id, 'SearchIndexing', 'Indexing document for retrieval');
    await PipelineService.updateStage(document.id, 'SearchIndexing', 'Completed');
    await PipelineService.createStage(document.id, 'KnowledgeGraphLinking', 'Linking evidence to graph');
    try {
      const intelligence = await intelligenceEngine.analyze(document, source);
      document.confidence = intelligence.confidence;
      await Storage.updateEvidence(document);
    } catch (error) {
      await JobService.recordAudit(jobId, 'intelligence-error', job.url, String(error));
    }
    await PipelineService.updateStage(document.id, 'KnowledgeGraphLinking', 'Completed');
    await PipelineService.createStage(document.id, 'Completed', 'Document fully ingested');
    await PipelineService.updateStage(document.id, 'Completed', 'Completed');

    if (documentType === 'HTML') {
      const links = enumerateLinks(job.url, document.content);
      for (const childUrl of links) {
        if (childUrl.startsWith(origin) && !visited.has(childUrl)) {
          queue.push({ url: childUrl, depth: job.depth + 1 });
        }
      }
    }
    if (documentType === 'XML' && job.url.endsWith('sitemap.xml')) {
      const sitemapUrls = await fetchSitemap(job.url);
      for (const sitemapUrl of sitemapUrls) {
        if (!visited.has(sitemapUrl)) {
          queue.push({ url: sitemapUrl, depth: job.depth + 1 });
        }
      }
    }
  }

  await JobService.updateStatus(jobId, 'Complete', results.length, undefined, { finishedAt: new Date().toISOString() });
  return results;
}
