import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const rbaSource: SourceMetadata = {
  id: 'source-rba',
  name: 'Reserve Bank of Australia',
  url: 'https://www.rba.gov.au',
  level: 'Agency',
  authorityScore: 0.96,
  trustScore: 0.96,
  officialStatus: 'Official',
};

export const RBAConnector: Connector = {
  id: 'rba',
  name: 'RBA',
  sourceMetadata: rbaSource,
  async discover() {
    return [rbaSource.url, `${rbaSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(rbaSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
