import { Sql } from '../db.js';
import { Logger } from '../lib/observability/Logger.js';
import { PluginRegistry } from '../plugins/registry.js';
import { GraphStore } from '../lib/graph/GraphStore.js';
import { intelligenceCache } from '../lib/cache/IntelligenceCache.js';
import { EventBus } from '../lib/events/EventBus.js';
import { AgentManager } from '../lib/agents/AgentManager.js';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface SelfTestReport {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  timestamp: string;
  overallStatus: 'pass' | 'fail';
}

async function test(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    return { name, passed: true, message: 'OK', durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    return { name, passed: false, message: String(error), durationMs };
  }
}

export const SelfTest = {
  async run(): Promise<SelfTestReport> {
    Logger.info('self-test', 'Starting automated self-test suite');
    const results: TestResult[] = [];

    results.push(await test('database_connection', async () => {
      const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM evidence`);
      if (row === undefined) throw new Error('Database query returned undefined');
    }));

    results.push(await test('database_migrations_table', async () => {
      const row = await Sql.get<{ version: string }>(`SELECT version FROM migration_log LIMIT 1`);
      if (!row) throw new Error('No migrations recorded');
    }));

    results.push(await test('graph_store_nodes', async () => {
      const count = await GraphStore.countNodes();
      if (count < 0) throw new Error('Negative node count');
    }));

    results.push(await test('graph_store_edges', async () => {
      const count = await GraphStore.countEdges();
      if (count < 0) throw new Error('Negative edge count');
    }));

    results.push(await test('plugins_registered', async () => {
      const plugins = PluginRegistry.list();
      if (plugins.length === 0) throw new Error('No plugins registered');
    }));

    results.push(await test('agents_registered', async () => {
      const agents = AgentManager.list();
      if (agents.length === 0) throw new Error('No agents registered');
    }));

    results.push(await test('cache_operational', async () => {
      intelligenceCache.set('test-key', { value: 1 }, ['test']);
      const val = intelligenceCache.get<{ value: number }>('test-key');
      if (!val || val.value !== 1) throw new Error('Cache set/get failed');
      intelligenceCache.invalidate('test-key');
    }));

    results.push(await test('event_bus_operational', async () => {
      let received = false;
      const handler = () => { received = true; };
      EventBus.on('EvidenceAdded', handler);
      EventBus.emit('EvidenceAdded', { test: true });
      if (!received) throw new Error('Event bus did not deliver event');
      EventBus.off('EvidenceAdded', handler);
    }));

    results.push(await test('api_route_dashboard', async () => {
      const response = await fetch('http://localhost:4000/api/dashboard');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.investigations !== 'number') throw new Error('Dashboard response missing investigations field');
    }));

    results.push(await test('api_route_health', async () => {
      const response = await fetch('http://localhost:4000/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.status) throw new Error('Health response missing status field');
    }));

    results.push(await test('api_route_graph2', async () => {
      const response = await fetch('http://localhost:4000/api/graph2');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.nodes)) throw new Error('Graph2 response missing nodes array');
    }));

    results.push(await test('api_route_search2', async () => {
      const response = await fetch('http://localhost:4000/api/search2?q=test');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.total !== 'number') throw new Error('Search2 response missing total field');
    }));

    results.push(await test('api_route_timeline', async () => {
      const response = await fetch('http://localhost:4000/api/timeline');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.events)) throw new Error('Timeline response missing events array');
    }));

    results.push(await test('api_route_reliability', async () => {
      const response = await fetch('http://localhost:4000/api/reliability');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Reliability response is not an array');
    }));

    results.push(await test('api_route_plugins', async () => {
      const response = await fetch('http://localhost:4000/api/plugins');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Plugins response is not an array');
    }));

    results.push(await test('api_route_agents', async () => {
      const response = await fetch('http://localhost:4000/api/agents');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Agents response is not an array');
    }));

    results.push(await test('api_route_jobs2_stats', async () => {
      const response = await fetch('http://localhost:4000/api/jobs2/stats');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.total !== 'number') throw new Error('Jobs stats missing total field');
    }));

    results.push(await test('api_route_graph2_validate', async () => {
      const response = await fetch('http://localhost:4000/api/graph2/validate');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.summary) throw new Error('Validation response missing summary');
    }));

    results.push(await test('api_route_cache_metrics', async () => {
      const response = await fetch('http://localhost:4000/api/cache/metrics');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.hits !== 'number') throw new Error('Cache metrics missing hits field');
    }));

    results.push(await test('api_route_events', async () => {
      const response = await fetch('http://localhost:4000/api/events');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Events response is not an array');
    }));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const report: SelfTestReport = {
      total: results.length,
      passed,
      failed,
      results,
      timestamp: new Date().toISOString(),
      overallStatus: failed === 0 ? 'pass' : 'fail',
    };
    Logger.info('self-test', `Self-test complete: ${passed}/${results.length} passed, ${failed} failed`);
    return report;
  },
};
