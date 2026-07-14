import { EvidenceDocument } from '../../../shared/models.js';

export interface Citation {
  quote: string;
  paragraph: number;
  page?: number;
  url: string;
  retrievedDate: string;
  publisher?: string;
}

export function generateCitation(document: EvidenceDocument, query: string): Citation | null {
  const lower = document.content.toLowerCase();
  const terms = query.toLowerCase().split(' ').filter(Boolean);
  let bestMatch = '';
  let paragraphIndex = -1;
  const paragraphs = document.content.split(/\n\n+/);
  paragraphs.forEach((paragraph, index) => {
    const paragraphText = paragraph.toLowerCase();
    if (terms.every((term) => paragraphText.includes(term))) {
      if (bestMatch.length < paragraph.length) {
        bestMatch = paragraph.trim();
        paragraphIndex = index + 1;
      }
    }
  });
  if (!bestMatch) return null;
  return {
    quote: bestMatch.slice(0, 480),
    paragraph: paragraphIndex,
    url: document.url,
    retrievedDate: document.retrievedDate,
    publisher: document.publisher,
  };
}
