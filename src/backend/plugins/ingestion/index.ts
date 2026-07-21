import { AegisPlugin } from '../registry.js';
import { fingerprintContent } from '../../services/ingestion/fingerprint.js';

export const deduplicationPlugin: AegisPlugin = {
  id: 'dedup-default',
  name: 'Content Deduplication',
  category: 'ingestion',
  version: '1.0.0',
  description: 'Fingerprints document content to detect duplicates during ingestion.',
  async execute(context) {
    if (!context.document) return { pluginId: this.id, category: 'ingestion', data: null };
    const fingerprint = fingerprintContent(context.document.content);
    return { pluginId: this.id, category: 'ingestion', data: { fingerprint } };
  },
};

export const ingestionPlugins: AegisPlugin[] = [deduplicationPlugin];
