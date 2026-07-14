import { parseStringPromise } from 'xml2js';
import pdfParse from 'pdf-parse';
import Papa from 'papaparse';
import { detectDocumentType } from './detect.js';

export async function parseContent(url: string, contentType: string | null, rawBuffer: Buffer) {
  const type = detectDocumentType(url, contentType);
  if (type === 'PDF') {
    const parsed = await pdfParse(rawBuffer);
    return { type, content: parsed.text };
  }
  if (type === 'JSON') {
    const parsed = JSON.parse(rawBuffer.toString('utf-8'));
    return { type, content: JSON.stringify(parsed, null, 2) };
  }
  if (type === 'XML' || type === 'RSS') {
    const parsed = await parseStringPromise(rawBuffer.toString('utf-8'));
    return { type, content: JSON.stringify(parsed, null, 2) };
  }
  if (type === 'CSV') {
    const parsed = Papa.parse(rawBuffer.toString('utf-8'), { preview: 100 }).data;
    return { type, content: JSON.stringify(parsed, null, 2) };
  }
  return { type, content: rawBuffer.toString('utf-8') };
}
