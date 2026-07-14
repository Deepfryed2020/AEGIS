import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const absSource: SourceMetadata = {
  id: 'source-abs',
  name: 'Australian Bureau of Statistics',
  url: 'https://www.abs.gov.au',
  level: 'Agency',
  authorityScore: 0.96,
  trustScore: 0.96,
  officialStatus: 'Official',
};

export const ABSConnector: Connector = {
  id: 'abs',
  name: 'ABS',
  sourceMetadata: absSource,
  async discover() {
    return [absSource.url, `${absSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(absSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
