import { AegisPlugin } from '../registry.js';
import { GraphBuilder } from '../../lib/graph/GraphBuilder.js';
import { extractEntities } from '../../lib/intelligence/entities.js';
import { extractRelationships } from '../../lib/intelligence/relationships.js';
import { extractTimelineEvents } from '../../lib/intelligence/timeline.js';

export const graphBuilderPlugin: AegisPlugin = {
  id: 'graph-builder-default',
  name: 'Graph Builder',
  category: 'graph',
  version: '1.0.0',
  description: 'Automatically updates the knowledge graph when documents are imported.',
  async execute(context) {
    if (!context.document || !context.source) return { pluginId: this.id, category: 'graph', data: null };
    const entities = extractEntities(context.document.content);
    const relationships = extractRelationships(context.document.content, entities);
    const timeline = extractTimelineEvents(context.document.content, context.document.id);
    const result = await GraphBuilder.ingestExtracted(
      context.document.id,
      entities,
      relationships,
      timeline,
      context.source,
      context.document
    );
    return { pluginId: this.id, category: 'graph', data: result };
  },
};

export const graphPlugins: AegisPlugin[] = [graphBuilderPlugin];
