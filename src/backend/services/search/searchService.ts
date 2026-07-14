import { EvidenceDocument } from '../../../shared/models.js';

interface SearchFilters {
  query: string;
  documentType?: string;
  organisation?: string;
  state?: string;
  topic?: string;
  fromDate?: string;
  toDate?: string;
}

export function searchDocuments(documents: EvidenceDocument[], filters: SearchFilters): EvidenceDocument[] {
  const query = filters.query.trim().toLowerCase();
  return documents.filter((doc) => {
    const matchText = [doc.title, doc.content, doc.sourceName, doc.organisation, ...doc.entities, ...doc.topics].join(' ').toLowerCase();
    const matchesQuery = !query || matchText.includes(query);
    const matchesType = !filters.documentType || doc.documentType === filters.documentType;
    const matchesOrg = !filters.organisation || doc.organisation?.toLowerCase().includes(filters.organisation.toLowerCase());
    const matchesTopic = !filters.topic || doc.topics.some((topic) => topic.toLowerCase() === filters.topic.toLowerCase());
    const matchesDate = (() => {
      if (!filters.fromDate && !filters.toDate) return true;
      const published = new Date(doc.publicationDate || doc.retrievedDate);
      if (filters.fromDate && published < new Date(filters.fromDate)) return false;
      if (filters.toDate && published > new Date(filters.toDate)) return false;
      return true;
    })();
    return matchesQuery && matchesType && matchesOrg && matchesTopic && matchesDate;
  });
}
