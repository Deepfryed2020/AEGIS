import { Sql } from '../../db.js';
import { EvidenceDocument } from '../../../shared/models.js';
import { fingerprintContent } from './fingerprint.js';

export async function storeDocument(document: EvidenceDocument) {
  const fingerprint = fingerprintContent(document.content);
  await Sql.run(
    `INSERT OR IGNORE INTO evidence (id, sourceId, sourceName, title, url, documentType, publisher, author, publicationDate, retrievedDate, indexedAt, confidence, organisation, summary, entities, topics, keywords, content, contentHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
    [document.id, document.sourceId, document.sourceName, document.title, document.url, document.documentType, document.publisher || null, document.author || null, document.publicationDate || null, document.retrievedDate, document.indexedAt, document.confidence, document.organisation || null, document.summary || null, document.entities.join(','), document.topics.join(','), document.keywords.join(','), document.content, fingerprint]
  );
  return { ...document, contentHash: fingerprint };
}
