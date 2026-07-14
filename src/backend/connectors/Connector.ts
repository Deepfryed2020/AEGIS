import { EvidenceDocument, SourceMetadata } from '../../shared/models.js';

export interface Connector {
  id: string;
  name: string;
  sourceMetadata: SourceMetadata;
  capabilities?: string[];
  discover(): Promise<string[]>;
  validate(url: string): boolean;
  crawl(url: string, jobId: string, maxDepth?: number, query?: string): Promise<EvidenceDocument[]>;
  search?(query: string): Promise<EvidenceDocument[]>;
}
