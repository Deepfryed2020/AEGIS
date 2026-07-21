import { AegisPlugin } from '../registry.js';
import { SemanticSearch } from '../../services/search/semanticSearch.js';

export const semanticSearchPlugin: AegisPlugin = {
  id: 'semantic-search-default',
  name: 'Semantic Search',
  category: 'search',
  version: '1.0.0',
  description: 'Searches across documents, entities, relationships, claims, and investigations.',
  async execute(context) {
    if (!context.query) return { pluginId: this.id, category: 'search', data: null };
    const results = await SemanticSearch.search({ q: context.query });
    return { pluginId: this.id, category: 'search', data: results };
  },
};

export const searchPlugins: AegisPlugin[] = [semanticSearchPlugin];
