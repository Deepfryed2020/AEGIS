import * as cheerio from 'cheerio';
import { DocumentType, SourceMetadata } from '../../../shared/models.js';

export function extractMetadata(content: string, type: DocumentType, url: string, source: SourceMetadata) {
  let title: string | undefined;
  let author: string | undefined;
  let publicationDate: string | undefined;
  let summary: string | undefined;
  const organisation = source.name;
  if (type === 'HTML') {
    const $ = cheerio.load(content);
    title = $('title').first().text().trim() || undefined;
    author = $('meta[name="author"]').attr('content')?.trim();
    publicationDate = $('meta[property="article:published_time"]').attr('content')?.trim() || $('meta[name="date"]').attr('content')?.trim();
    summary = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim();
  }
  if (!summary) {
    summary = content.slice(0, 300).replace(/\s+/g, ' ').trim();
  }
  if (!publicationDate) {
    const dateMatch = content.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    publicationDate = dateMatch?.[1];
  }
  const entities = Array.from(new Set((content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).slice(0, 30)));
  const topics = Array.from(new Set((content.match(/\b(government|policy|budget|tax|health|education|climate|energy|spending|investment|revenue|reform|report|commission)\b/gi) || []).map((token) => token.toLowerCase())));
  const keywords = Array.from(new Set((content.match(/\b[A-Za-z0-9]{4,}\b/g) || []).slice(0, 40))).slice(0, 20);
  const confidence = Math.min(0.95, Math.max(0.35, content.length / 2000));
  return { title, publisher: source.name, author, publicationDate, summary, entities, topics, keywords, organisation, confidence };
}
