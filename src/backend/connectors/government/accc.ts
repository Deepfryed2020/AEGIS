import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const acccSource: SourceMetadata = {
  id: 'source-accc',
  name: 'Australian Competition and Consumer Commission',
  url: 'https://www.accc.gov.au',
  level: 'Agency',
  authorityScore: 0.96,
  trustScore: 0.96,
  officialStatus: 'Official',
};

export const ACCCConnector: Connector = {
  id: 'accc',
  name: 'ACCC',
  sourceMetadata: acccSource,
  async discover() {
    return [acccSource.url, `${acccSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(acccSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
