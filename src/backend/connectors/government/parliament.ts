import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const parliamentSource: SourceMetadata = {
  id: 'source-parliament',
  name: 'Parliament of Australia',
  url: 'https://www.aph.gov.au',
  level: 'Agency',
  authorityScore: 0.95,
  trustScore: 0.95,
  officialStatus: 'Official',
};

export const ParliamentConnector: Connector = {
  id: 'parliament',
  name: 'Parliament',
  sourceMetadata: parliamentSource,
  async discover() {
    return [parliamentSource.url, `${parliamentSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(parliamentSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
