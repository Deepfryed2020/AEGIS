import { EvidenceDocument, SourceMetadata } from '../../shared/models.js';

export type PluginCategory =
  | 'ingestion'
  | 'analysis'
  | 'graph'
  | 'timeline'
  | 'reports'
  | 'search'
  | 'connectors'
  | 'visualisations';

export interface PluginContext {
  document?: EvidenceDocument;
  source?: SourceMetadata;
  investigationId?: string;
  query?: string;
}

export interface PluginResult {
  pluginId: string;
  category: PluginCategory;
  data: any;
  metadata?: Record<string, any>;
}

export interface AegisPlugin {
  id: string;
  name: string;
  category: PluginCategory;
  version: string;
  description?: string;
  initialize?(): Promise<void>;
  execute?(context: PluginContext): Promise<PluginResult>;
  teardown?(): Promise<void>;
}

export interface PluginManifest {
  plugins: AegisPlugin[];
}

export const PluginRegistry = {
  plugins: new Map<string, AegisPlugin>(),

  register(plugin: AegisPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered — replacing.`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`[plugins] registered ${plugin.category}/${plugin.id} v${plugin.version}`);
  },

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin?.teardown) {
      void plugin.teardown();
    }
    this.plugins.delete(pluginId);
  },

  get(pluginId: string): AegisPlugin | undefined {
    return this.plugins.get(pluginId);
  },

  list(category?: PluginCategory): AegisPlugin[] {
    const all = Array.from(this.plugins.values());
    return category ? all.filter((p) => p.category === category) : all;
  },

  async initializeAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.initialize) {
        try {
          await plugin.initialize();
        } catch (error) {
          console.error(`[plugins] failed to initialise ${plugin.id}:`, error);
        }
      }
    }
  },

  async executeCategory(category: PluginCategory, context: PluginContext): Promise<PluginResult[]> {
    const results: PluginResult[] = [];
    for (const plugin of this.list(category)) {
      if (!plugin.execute) continue;
      try {
        const result = await plugin.execute(context);
        results.push(result);
      } catch (error) {
        console.error(`[plugins] ${plugin.id} execution failed:`, error);
      }
    }
    return results;
  },
};
