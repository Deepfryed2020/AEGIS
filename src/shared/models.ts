export type SourceLevel = 'Federal' | 'State' | 'Local' | 'RoyalCommission' | 'Agency';

export type DocumentType = 'HTML' | 'PDF' | 'CSV' | 'JSON' | 'XML' | 'RSS' | 'Text' | 'Unknown';

export type EntityType =
  | 'Person'
  | 'Department'
  | 'Agency'
  | 'Minister'
  | 'Company'
  | 'Legislation'
  | 'Committee'
  | 'Project'
  | 'FundingProgram'
  | 'Location'
  | 'Date'
  | 'Other';

export type DocumentStage =
  | 'Queued'
  | 'Downloading'
  | 'ExtractingText'
  | 'MetadataExtraction'
  | 'LanguageDetection'
  | 'EntityExtraction'
  | 'KeywordExtraction'
  | 'Chunking'
  | 'CitationMapping'
  | 'SearchIndexing'
  | 'KnowledgeGraphLinking'
  | 'Completed'
  | 'Failed';

export interface SourceMetadata {
  id: string;
  name: string;
  url: string;
  level: SourceLevel;
  authorityScore: number;
  trustScore: number;
  officialStatus: 'Official' | 'Unofficial';
  lastCrawled?: string;
}

export interface EvidenceDocument {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  url: string;
  documentType: DocumentType;
  publisher?: string;
  author?: string;
  publicationDate?: string;
  retrievedDate: string;
  indexedAt: string;
  organisation?: string;
  summary?: string;
  entities: string[];
  topics: string[];
  keywords: string[];
  confidence: number;
  language?: string;
  pages?: number;
  headings?: string[];
  references?: string[];
  footnotes?: string[];
  status?: string;
  ocrUsed?: boolean;
  wordCount?: number;
  citationCount?: number;
  content: string;
  contentHash: string;
}

export interface EvidenceVersion {
  id: string;
  evidenceId: string;
  capturedAt: string;
  contentHash: string;
  summary: string;
  changeType: 'Added' | 'Removed' | 'Modified';
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  evidenceIds: string[];
  notes?: string;
  archived?: number;
  archivedAt?: string;
}

export interface ReportRecord {
  id: string;
  investigationId: string;
  title: string;
  format: string;
  content: string;
  createdAt: string;
}

export interface EntityRecord {
  id: string;
  name: string;
  type: EntityType;
  canonical?: string;
  mentionCount: number;
}

export interface RelationshipRecord {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  evidenceId?: string;
}

export interface SearchResult {
  document: EvidenceDocument;
  rank: number;
  score: number;
  reason: string;
  highlights: string[];
}

export interface Citation {
  quote: string;
  paragraph: number;
  page?: number;
  url: string;
  retrievedDate: string;
  publisher?: string;
}

export interface ClaimAnalysis {
  claim: string;
  supportingEvidence: Array<{ citation: Citation; documentId: string }>;
  contradictoryEvidence: Array<{ citation: Citation; documentId: string }>;
  insufficientEvidence: boolean;
  confidence: number;
  reasoning: string;
}
