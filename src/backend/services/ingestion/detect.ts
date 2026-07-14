import { DocumentType } from '../../../shared/models.js';

export function detectDocumentType(url: string, contentType: string | null): DocumentType {
  if (contentType?.includes('pdf') || url.endsWith('.pdf')) return 'PDF';
  if (contentType?.includes('json') || url.endsWith('.json')) return 'JSON';
  if (contentType?.includes('xml') || url.endsWith('.xml')) return 'XML';
  if (contentType?.includes('csv') || url.endsWith('.csv')) return 'CSV';
  if (contentType?.includes('html') || url.endsWith('.html') || url.endsWith('.htm')) return 'HTML';
  return 'Text';
}
