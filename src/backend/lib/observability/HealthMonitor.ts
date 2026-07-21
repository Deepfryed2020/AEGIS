import { Sql } from '../../db.js';
import { PluginRegistry } from '../../plugins/registry.js';
import { graphCache } from '../../lib/graph/cache.js';
import { ingestionWorkerPool } from '../../lib/intelligence/workerPool.js';
import { ContinuousIngestion } from '../../services/ingestion/continuousIngestion.js';
import { ErrorTracker } from './ErrorTracker.js';
import { RequestTracer } from './index.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SubsystemHealth {
  name: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, any>;
}

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  subsystems: SubsystemHealth[];
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
}

const startTime = Date.now();
const VERSION = '0.2.0';

async function checkDatabase(): Promise<SubsystemHealth> {
  try {
    const row = await Sql.get<{ count: number }>(`SELECT COUNT(*) AS count FROM evidence`);
    return {
      name: 'database',
      status: 'healthy',
      message: `Connected (${row?.count || 0} evidence rows)`,
      details: { evidenceCount: row?.count || 0 },
    };
  } catch (error) {
    return { name: 'database', status: 'unhealthy', message: String(error) };
  }
}

async function checkGraph(): Promise<SubsystemHealth> {
  try {
    const { GraphStore } = await import('../../lib/graph/GraphStore.js');
    const nodeCount = await GraphStore.countNodes();
    const edgeCount = await GraphStore.countEdges();
    return {
      name: 'graph',
      status: 'healthy',
      message: `${nodeCount} nodes, ${edgeCount} edges`,
      details: { nodeCount, edgeCount },
    };
  } catch (error) {
    return { name: 'graph', status: 'unhealthy', message: String(error) };
  }
}

function checkPlugins(): SubsystemHealth {
  const plugins = PluginRegistry.list();
  return {
    name: 'plugins',
    status: plugins.length > 0 ? 'healthy' : 'degraded',
    message: `${plugins.length} plugin(s) registered`,
    details: { count: plugins.length, categories: [...new Set(plugins.map((p) => p.category))] },
  };
}

function checkWorkers(): SubsystemHealth {
  return {
    name: 'workers',
    status: 'healthy',
    message: `${ingestionWorkerPool.running} running, ${ingestionWorkerPool.pending} pending`,
    details: { running: ingestionWorkerPool.running, pending: ingestionWorkerPool.pending },
  };
}

function checkQueue(): SubsystemHealth {
  return {
    name: 'queue',
    status: 'healthy',
    message: 'Ingestion scheduler active',
    details: { schedulerRunning: ContinuousIngestion.running },
  };
}

function checkCache(): SubsystemHealth {
  const metrics = graphCache.metrics();
  return {
    name: 'cache',
    status: 'healthy',
    message: `${metrics.hits} hits, ${metrics.misses} misses (${Math.round(metrics.hitRate * 100)}%)`,
    details: metrics,
  };
}

function checkOCR(): SubsystemHealth {
  return {
    name: 'ocr',
    status: 'healthy',
    message: 'Tesseract.js available (lazy-loaded)',
  };
}

function checkMemory(): SubsystemHealth {
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const status = rssMB > 512 ? 'degraded' : 'healthy';
  return {
    name: 'memory',
    status,
    message: `RSS ${rssMB}MB, heap ${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    details: { rssMB, heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024), heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024) },
  };
}

export const HealthMonitor = {
  async check(): Promise<HealthReport> {
    const checks = await Promise.all([
      checkDatabase(),
      checkGraph(),
      checkPlugins(),
      checkWorkers(),
      checkQueue(),
      checkCache(),
      checkOCR(),
      checkMemory(),
    ]);

    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');
    const overall: HealthStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    return {
      status: overall,
      version: VERSION,
      uptime: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      subsystems: checks,
      memory: process.memoryUsage(),
    };
  },

  async getStatus(): Promise<{
    status: HealthStatus;
    uptime: number;
    version: string;
    errorCount: number;
    requestMetrics: any;
  }> {
    const report = await this.check();
    return {
      status: report.status,
      uptime: report.uptime,
      version: report.version,
      errorCount: ErrorTracker.getCount(),
      requestMetrics: RequestTracer.getMetrics(),
    };
  },

  async getMetrics(): Promise<{
    uptime: number;
    memory: any;
    requestMetrics: any;
    cacheMetrics: any;
    errorCount: number;
    recentErrors: any[];
    slowQueries: any[];
    slowRequests: any[];
    plugins: any[];
  }> {
    return {
      uptime: Math.round((Date.now() - startTime) / 1000),
      memory: process.memoryUsage(),
      requestMetrics: RequestTracer.getMetrics(),
      cacheMetrics: graphCache.metrics(),
      errorCount: ErrorTracker.getCount(),
      recentErrors: ErrorTracker.getRecent(20),
      slowQueries: [],
      slowRequests: RequestTracer.getSlowRequests(),
      plugins: PluginRegistry.list().map((p) => ({ id: p.id, name: p.name, category: p.category, version: p.version })),
    };
  },
};
