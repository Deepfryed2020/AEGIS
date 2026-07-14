import { parseStringPromise } from 'xml2js';
import { DocumentType } from '../../../shared/models.js';

export async function parseRawDocument(type: DocumentType, raw: ArrayBuffer, url: string) {
  if (type === 'PDF') {
    return { text: '', metadata: {} };
  }
  if (type === 'JSON') {
    const payload = JSON.parse(Buffer.from(raw).toString('utf-8'));
    return { text: JSON.stringify(payload, null, 2), metadata: payload };
  }
  if (type === 'XML' || type === 'RSS') {
    const xml = Buffer.from(raw).toString('utf-8');
    const parsed = await parseStringPromise(xml);
    return { text: JSON.stringify(parsed, null, 2), metadata: parsed };
  }
  if (type === 'CSV') {
    return { text: Buffer.from(raw).toString('utf-8'), metadata: {} };
  }
  return { text: Buffer.from(raw).toString('utf-8'), metadata: {} };
}
