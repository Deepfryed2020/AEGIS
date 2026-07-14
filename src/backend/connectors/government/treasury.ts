import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const treasurySource: SourceMetadata = {
  id: 'source-treasury',
  name: 'Australian Treasury',
  url: 'https://treasury.gov.au',
  level: 'Agency',
  authorityScore: 0.97,
  trustScore: 0.97,
  officialStatus: 'Official',
};

export const TreasuryConnector: Connector = {
  id: 'treasury',
  name: 'Treasury',
  sourceMetadata: treasurySource,
  async discover() {
    return [treasurySource.url, `${treasurySource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(treasurySource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
