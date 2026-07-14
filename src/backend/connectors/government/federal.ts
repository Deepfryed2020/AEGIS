import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const federalSource: SourceMetadata = {
  id: 'source-federal',
  name: 'Australian Government (Federal)',
  url: 'https://www.australia.gov.au',
  level: 'Federal',
  authorityScore: 0.98,
  trustScore: 0.98,
  officialStatus: 'Official',
};

export const FederalConnector: Connector = {
  id: 'federal',
  name: 'Federal Government',
  sourceMetadata: federalSource,
  async discover() {
    return [federalSource.url, `${federalSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith('https://www.australia.gov.au');
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
