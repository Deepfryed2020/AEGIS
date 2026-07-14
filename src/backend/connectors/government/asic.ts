import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const asicSource: SourceMetadata = {
  id: 'source-asic',
  name: 'Australian Securities and Investments Commission',
  url: 'https://asic.gov.au',
  level: 'Agency',
  authorityScore: 0.96,
  trustScore: 0.96,
  officialStatus: 'Official',
};

export const ASICConnector: Connector = {
  id: 'asic',
  name: 'ASIC',
  sourceMetadata: asicSource,
  async discover() {
    return [asicSource.url, `${asicSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(asicSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
