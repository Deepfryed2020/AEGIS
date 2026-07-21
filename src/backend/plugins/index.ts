import { PluginRegistry, AegisPlugin } from './registry.js';
import { ingestionPlugins } from './ingestion/index.js';
import { analysisPlugins } from './analysis/index.js';
import { graphPlugins } from './graph/index.js';
import { timelinePlugins } from './timeline/index.js';
import { reportPlugins } from './reports/index.js';
import { searchPlugins } from './search/index.js';
import { visualisationPlugins } from './visualisations/index.js';

export { PluginRegistry } from './registry.js';
export type { AegisPlugin, PluginCategory, PluginContext, PluginResult } from './registry.js';

export function registerAllPlugins(): void {
  const allPlugins: AegisPlugin[] = [
    ...ingestionPlugins,
    ...analysisPlugins,
    ...graphPlugins,
    ...timelinePlugins,
    ...reportPlugins,
    ...searchPlugins,
    ...visualisationPlugins,
  ];
  for (const plugin of allPlugins) {
    PluginRegistry.register(plugin);
  }
}

export async function initializePlugins(): Promise<void> {
  registerAllPlugins();
  await PluginRegistry.initializeAll();
}
