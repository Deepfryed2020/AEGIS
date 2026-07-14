import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const atoSource: SourceMetadata = {
  id: 'source-ato',
  name: 'Australian Taxation Office',
  url: 'https://www.ato.gov.au',
  level: 'Agency',
  authorityScore: 0.97,
  trustScore: 0.97,
  officialStatus: 'Official',
};

export const ATOConnector: Connector = {
  id: 'ato',
  name: 'ATO',
  sourceMetadata: atoSource,
  async discover() {
    return [atoSource.url, `${atoSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith('https://www.ato.gov.au');
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
