import { JobService } from '../jobService.js';
import { crawlSource } from '../crawler/crawler.js';
import { Storage } from '../../storage.js';
import { SourceMetadata } from '../../../shared/models.js';

export async function runIngestionJob(connectorId: string, source: SourceMetadata, seedUrl: string, maxDepth = 2, query?: string) {
  const job = await JobService.create(connectorId, seedUrl, query, maxDepth);
  void (async () => {
    try {
      await JobService.updateStatus(job.id, 'Fetching');
      const results = await crawlSource(source, seedUrl, job.id, maxDepth);
      await JobService.updateStatus(job.id, 'Complete', results.length);
      if (!await Storage.getSource(source.id)) {
        await Storage.addSource(source);
      }
    } catch (error) {
      await JobService.updateStatus(job.id, 'Failed', 0, String(error));
    }
  })();
  return job;
}
