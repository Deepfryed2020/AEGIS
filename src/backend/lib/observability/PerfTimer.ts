export interface TimerResult {
  name: string;
  module: string;
  durationMs: number;
  metadata?: Record<string, any>;
}

const timers = new Map<string, { name: string; module: string; start: number; metadata?: Record<string, any> }>();
const history: TimerResult[] = [];
const HISTORY_MAX = 200;

export const PerfTimer = {
  start(name: string, module: string, metadata?: Record<string, any>): void {
    timers.set(name, { name, module, start: performance.now(), metadata });
  },

  end(name: string): TimerResult | undefined {
    const timer = timers.get(name);
    if (!timer) return undefined;
    timers.delete(name);
    const durationMs = Math.round(performance.now() - timer.start);
    const result: TimerResult = { name: timer.name, module: timer.module, durationMs, metadata: timer.metadata };
    history.push(result);
    if (history.length > HISTORY_MAX) history.shift();
    return result;
  },

  async measure<T>(name: string, module: string, fn: () => Promise<T>): Promise<T> {
    this.start(name, module);
    try {
      return await fn();
    } finally {
      const result = this.end(name);
      if (result && result.durationMs > 1000) {
        console.warn(`[perf] ${module}/${name} took ${result.durationMs}ms`);
      }
    }
  },

  getHistory(count = 50): TimerResult[] {
    return history.slice(-count);
  },

  getSlowQueries(thresholdMs = 500): TimerResult[] {
    return history.filter((t) => t.durationMs >= thresholdMs);
  },

  clear(): void {
    history.length = 0;
  },
};
