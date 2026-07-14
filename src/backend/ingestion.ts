import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import pdfParse from 'pdf-parse';
import Papa from 'papaparse';
import { v4 as uuid } from 'uuid';
import { EvidenceDocument, DocumentType, SourceMetadata } from '../shared/models.js';
import { Storage } from './storage.js';

function getDocumentType(contentType: string | null, url: string): DocumentType {
  if (!contentType) return 'Unknown';
  if (contentType.includes('pdf') || url.endsWith('.pdf')) return 'PDF';
  if (contentType.includes('json') || url.endsWith('.json')) return 'JSON';
  if (contentType.includes('xml') || url.endsWith('.xml')) return 'XML';
  if (contentType.includes('csv') || url.endsWith('.csv')) return 'CSV';
  if (contentType.includes('rss') || contentType.includes('xml')) return 'RSS';
  if (contentType.includes('html') || url.endsWith('.html') || url.endsWith('.htm')) return 'HTML';
  return 'Text';
}

function createBaseDocument(url: string, source: SourceMetadata, type: DocumentType, content: string): EvidenceDocument {
  return {
    id: uuid(),
    title: url,
    sourceId: source.id,
    sourceName: source.name,
    url,
    documentType: type,
    publisher: source.name,
    retrievedDate: new Date().toISOString(),
    entities: [],
    topics: [],
    keywords: [],
    content,
    contentHash: String(content.length),
  };
}

export const Ingestion = {
  async ingestUrl(url: string, source: SourceMetadata) {
    const response = await fetch(url, { redirect: 'follow' });
    const contentType = response.headers.get('content-type');
    const documentType = getDocumentType(contentType, url);
    const raw = await response.arrayBuffer();

    let content = '';
    if (documentType === 'PDF') {
      const data = await pdfParse(Buffer.from(raw));
      content = data.text;
    } else if (documentType === 'JSON') {
      const json = JSON.parse(Buffer.from(raw).toString('utf-8'));
      content = JSON.stringify(json, null, 2);
    } else if (documentType === 'XML' || documentType === 'RSS') {
      const xml = Buffer.from(raw).toString('utf-8');
      const parsed = await parseStringPromise(xml);
      content = JSON.stringify(parsed, null, 2);
    } else if (documentType === 'CSV') {
      const csv = Buffer.from(raw).toString('utf-8');
      const parsed = Papa.parse(csv, { preview: 50 }).data;
      content = JSON.stringify(parsed, null, 2);
    } else {
      content = Buffer.from(raw).toString('utf-8');
    }

    const document = createBaseDocument(url, source, documentType, content);
    document.title = `${document.documentType} Document`;
    document.indexedAt = new Date().toISOString();
    document.confidence = 0.8;
    await Storage.addEvidence(document);
    return document;
  }
};
