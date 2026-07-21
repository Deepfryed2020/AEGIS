import { AegisPlugin } from '../registry.js';
import { GraphQuery } from '../../lib/graph/GraphQuery.js';

export const graphVisualisationPlugin: AegisPlugin = {
  id: 'graph-visualisation-default',
  name: 'Graph Visualisation',
  category: 'visualisations',
  version: '1.0.0',
  description: 'Provides node and edge data for graph rendering.',
  async execute() {
    const stats = await GraphQuery.getStats();
    return { pluginId: this.id, category: 'visualisations', data: stats };
  },
};

export const visualisationPlugins: AegisPlugin[] = [graphVisualisationPlugin];
