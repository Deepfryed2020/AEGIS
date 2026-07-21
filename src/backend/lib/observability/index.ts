import { v4 as uuid } from 'uuid';
import { Logger } from './Logger.js';
import { PerfTimer } from './PerfTimer.js';
import { ErrorTracker } from './ErrorTracker.js';

export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
}

const requestLog: Array<RequestContext & { statusCode: number; durationMs: number }> = [];
const REQUEST_LOG_MAX = 200;

export function requestTracer(req: any, res: any, next: any): void {
  const requestId = (req.headers['x-request-id'] as string) || uuid();
  const ctx: RequestContext = {
    requestId,
    method: req.method,
    url: req.url,
    startTime: performance.now(),
  };
  (req as any).requestId = requestId;
  (req as any).requestContext = ctx;

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - ctx.startTime);
    const statusCode = res.statusCode;
    requestLog.push({ ...ctx, statusCode, durationMs });
    if (requestLog.length > REQUEST_LOG_MAX) requestLog.shift();
    if (statusCode >= 500) {
      Logger.error('router', `${ctx.method} ${ctx.url} → ${statusCode}`, { requestId });
    } else if (statusCode >= 400) {
      Logger.warn('router', `${ctx.method} ${ctx.url} → ${statusCode}`, { requestId });
    } else {
      Logger.debug('router', `${ctx.method} ${ctx.url} → ${statusCode} (${durationMs}ms)`, { requestId });
    }
  });

  next();
}

export const RequestTracer = {
  getRecent(count = 50): Array<RequestContext & { statusCode: number; durationMs: number }> {
    return [...requestLog].reverse().slice(0, count);
  },

  getSlowRequests(thresholdMs = 1000): Array<RequestContext & { statusCode: number; durationMs: number }> {
    return requestLog.filter((r) => r.durationMs >= thresholdMs);
  },

  getErrorRequests(): Array<RequestContext & { statusCode: number; durationMs: number }> {
    return requestLog.filter((r) => r.statusCode >= 400);
  },

  getMetrics(): {
    total: number;
    errors: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  } {
    const total = requestLog.length;
    const errors = requestLog.filter((r) => r.statusCode >= 400).length;
    const latencies = requestLog.map((r) => r.durationMs).sort((a, b) => a - b);
    const avg = total > 0 ? Math.round(latencies.reduce((s, l) => s + l, 0) / total) : 0;
    const p95Index = Math.floor(total * 0.95);
    const p95 = total > 0 ? latencies[p95Index] || 0 : 0;
    return { total, errors, avgLatencyMs: avg, p95LatencyMs: p95 };
  },
};

export { Logger, PerfTimer, ErrorTracker };
