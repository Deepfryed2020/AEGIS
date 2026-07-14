import { SourceMetadata, EvidenceDocument } from '../../../shared/models.js';
import { extractMetadata } from '../parser/metadataParser.js';
import { v4 as uuid } from 'uuid';

export function buildDocument(url: string, source: SourceMetadata, type: string, content: string): EvidenceDocument {
  const metadata = extractMetadata(content, type as any, url, source);
  return {
    id: uuid(),
    title: metadata.title || url,
    sourceId: source.id,
    sourceName: source.name,
    url,
    documentType: type as any,
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
    contentHash: `${content.length}`,
  };
}
