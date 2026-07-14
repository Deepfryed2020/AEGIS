import { parseStringPromise } from 'xml2js';
import pdfParse from 'pdf-parse';
import Papa from 'papaparse';
import { v4 as uuid } from 'uuid';
import { EvidenceDocument, DocumentType, SourceMetadata } from '../../../shared/models.js';
import { extractMetadata } from '../parser/metadataParser.js';

const documentHashCache = new Set<string>();

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

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export async function createDocument(url: string, source: SourceMetadata, contentType: string | null, rawData: ArrayBuffer, contentHash?: string): Promise<EvidenceDocument> {
  const type = getDocumentType(contentType, url);
  let content = '';
  if (type === 'PDF') {
    const parsed = await pdfParse(Buffer.from(rawData));
    content = parsed.text;
  } else if (type === 'JSON') {
    const json = JSON.parse(Buffer.from(rawData).toString('utf-8'));
    content = JSON.stringify(json, null, 2);
  } else if (type === 'XML' || type === 'RSS') {
    const xml = Buffer.from(rawData).toString('utf-8');
    const parsed = await parseStringPromise(xml);
    content = JSON.stringify(parsed, null, 2);
  } else if (type === 'CSV') {
    const csv = Buffer.from(rawData).toString('utf-8');
    const parsed = Papa.parse(csv, { preview: 100 }).data;
    content = JSON.stringify(parsed, null, 2);
  } else {
    content = Buffer.from(rawData).toString('utf-8');
  }

  const finalHash = contentHash || hashContent(content);
  if (documentHashCache.has(finalHash)) {
    throw new Error('Duplicate document content detected');
  }
  documentHashCache.add(finalHash);

  const metadata = extractMetadata(content, type, url, source);

  return {
    id: uuid(),
    title: metadata.title || url,
    sourceId: source.id,
    sourceName: source.name,
    url,
    documentType: type,
    publisher: metadata.publisher || source.name,
    author: metadata.author,
    publicationDate: metadata.publicationDate,
    retrievedDate: new Date().toISOString(),
    indexedAt: new Date().toISOString(),
    organisation: metadata.organisation,
    summary: metadata.summary,
    entities: metadata.entities,
    topics: metadata.topics,
    keywords: metadata.keywords,
    confidence: metadata.confidence,
    content,
    contentHash: finalHash,
  };
}
