import { Connector } from '../Connector.js';
import { SourceMetadata } from '../../../shared/models.js';
import { crawlSource } from '../../services/crawler/crawler.js';

const anaoSource: SourceMetadata = {
  id: 'source-anao',
  name: 'Australian National Audit Office',
  url: 'https://www.anao.gov.au',
  level: 'Agency',
  authorityScore: 0.96,
  trustScore: 0.96,
  officialStatus: 'Official',
};

export const ANAOConnector: Connector = {
  id: 'anao',
  name: 'ANAO',
  sourceMetadata: anaoSource,
  async discover() {
    return [anaoSource.url, `${anaoSource.url}/sitemap.xml`];
  },
  validate(url: string) {
    return url.startsWith(anaoSource.url);
  },
  async crawl(url: string, jobId: string, maxDepth = 2) {
    return crawlSource(this.sourceMetadata, url, jobId, maxDepth);
  },
};
