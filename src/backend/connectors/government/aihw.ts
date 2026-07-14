import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const aihwSource: SourceMetadata = {
  id: 'source-aihw',
  name: 'Australian Institute of Health and Welfare',
  url: 'https://www.aihw.gov.au',
  level: 'Agency',
  authorityScore: 0.95,
  trustScore: 0.95,
  officialStatus: 'Official',
};

export const AIHWConnector: Connector = {
  id: 'aihw',
  name: 'AIHW',
  sourceMetadata: aihwSource,
  async discover() {
    return [aihwSource.url, `${aihwSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(aihwSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
