import { AegisPlugin } from '../registry.js';
import { extractEntities } from '../../lib/intelligence/entities.js';
import { extractTimelineEvents } from '../../lib/intelligence/timeline.js';

export const entityExtractionPlugin: AegisPlugin = {
  id: 'entity-extractor-default',
  name: 'Entity Extractor',
  category: 'analysis',
  version: '1.0.0',
  description: 'Extracts people, organisations, legislation, and other entities from document content.',
  async execute(context) {
    if (!context.document) return { pluginId: this.id, category: 'analysis', data: null };
    const entities = extractEntities(context.document.content);
    return { pluginId: this.id, category: 'analysis', data: { entities } };
  },
};

export const timelineExtractionPlugin: AegisPlugin = {
  id: 'timeline-extractor-default',
  name: 'Timeline Extractor',
  category: 'analysis',
  version: '1.0.0',
  description: 'Extracts dated events from document content for timeline reconstruction.',
  async execute(context) {
    if (!context.document) return { pluginId: this.id, category: 'analysis', data: null };
    const events = extractTimelineEvents(context.document.content, context.document.id);
    return { pluginId: this.id, category: 'analysis', data: { events } };
  },
};

export const analysisPlugins: AegisPlugin[] = [entityExtractionPlugin, timelineExtractionPlugin];
