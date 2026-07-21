import { useEffect, useState } from 'react';

interface Metrics {
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  requestMetrics: { total: number; errors: number; avgLatencyMs: number; p95LatencyMs: number };
  cacheMetrics: { hits: number; misses: number; hitRate: number; size: number; invalidations: number };
  errorCount: number;
  recentErrors: Array<{ id: string; timestamp: string; module: string; message: string; statusCode?: number }>;
  slowRequests: Array<{ requestId: string; method: string; url: string; durationMs: number; statusCode: number }>;
  plugins: Array<{ id: string; name: string; category: string; version: string }>;
}

interface HealthReport {
  status: string;
  uptime: number;
  version: string;
  subsystems: Array<{ name: string; status: string; message: string }>;
}

interface EventStats {
  [key: string]: number;
}

interface JobStats {
  total: number;
  queued: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  cancelled: number;
  activeCount: number;
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'healthy' ? '#34d399' : status === 'degraded' ? '#fbbf24' : '#f87171';
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 10,
      fontSize: 11,
      background: color,
      color: '#0b1020',
      fontWeight: 600,
    }}>{status}</span>
  );
}

export default function DevConsole() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [events, setEvents] = useState<EventStats>({});
  const [jobs, setJobs] = useState<JobStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [metricsRes, healthRes, eventsRes, jobsRes] = await Promise.all([
          fetch('/metrics'),
          fetch('/health'),
          fetch('/api/events/stats'),
          fetch('/api/jobs2/stats'),
        ]);
        if (!active) return;
        if (metricsRes.ok) setMetrics(await metricsRes.json());
        if (healthRes.ok) setHealth(await healthRes.json());
        if (eventsRes.ok) setEvents(await eventsRes.json());
        if (jobsRes.ok) setJobs(await jobsRes.json());
      } catch (err) {
        if (active) setError(String(err));
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (error) return <div className="panel">Failed to load dev console: {error}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Developer Console</h1>
          <p>Live system metrics, worker activity, cache usage, event bus traffic, and plugin status.</p>
        </div>
      </div>

      {health && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>System Health</div>
            <StatusBadge status={health.status} />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
            v{health.version} • uptime {Math.round(health.uptime / 60)}min
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {health.subsystems.map((s) => (
              <div key={s.name} className="list-item" style={{ padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics && (
        <>
          <div className="grid-2" style={{ marginBottom: 18 }}>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Request Metrics</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div>Total: {metrics.requestMetrics.total}</div>
                <div>Errors: {metrics.requestMetrics.errors}</div>
                <div>Avg latency: {metrics.requestMetrics.avgLatencyMs}ms</div>
                <div>P95 latency: {metrics.requestMetrics.p95LatencyMs}ms</div>
              </div>
            </div>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Memory</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div>RSS: {formatBytes(metrics.memory.rss)}</div>
                <div>Heap used: {formatBytes(metrics.memory.heapUsed)}</div>
                <div>Heap total: {formatBytes(metrics.memory.heapTotal)}</div>
                <div>External: {formatBytes(metrics.memory.external)}</div>
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 18 }}>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Cache</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div>Hits: {metrics.cacheMetrics.hits}</div>
                <div>Misses: {metrics.cacheMetrics.misses}</div>
                <div>Hit rate: {Math.round(metrics.cacheMetrics.hitRate * 100)}%</div>
                <div>Size: {metrics.cacheMetrics.size}</div>
                <div>Invalidations: {metrics.cacheMetrics.invalidations}</div>
              </div>
            </div>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Event Bus</div>
              {Object.keys(events).length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No events yet</div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {Object.entries(events).map(([type, count]) => (
                    <div key={type}>{type}: {count}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {jobs && (
            <div className="panel" style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Job Engine</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>Total: {jobs.total}</div>
                <div>Queued: {jobs.queued}</div>
                <div>Running: {jobs.running}</div>
                <div>Paused: {jobs.paused}</div>
                <div>Completed: {jobs.completed}</div>
                <div>Failed: {jobs.failed}</div>
                <div>Active: {jobs.activeCount}</div>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 18 }}>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Recent Errors ({metrics.errorCount})</div>
              {metrics.recentErrors.length === 0 ? (
                <div style={{ color: '#34d399' }}>No errors</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {metrics.recentErrors.slice(0, 10).map((e) => (
                    <div key={e.id} className="list-item" style={{ padding: 8, borderColor: '#f87171' }}>
                      <div style={{ fontWeight: 600 }}>{e.module}</div>
                      <div style={{ color: '#f87171', fontSize: 12 }}>{e.message}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{new Date(e.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel">
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Slow Requests</div>
              {metrics.slowRequests.length === 0 ? (
                <div style={{ color: '#34d399' }}>No slow requests</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {metrics.slowRequests.slice(0, 10).map((r, i) => (
                    <div key={i} className="list-item" style={{ padding: 8, borderColor: '#fbbf24' }}>
                      <div>{r.method} {r.url}</div>
                      <div style={{ color: '#fbbf24', fontSize: 12 }}>{r.durationMs}ms → {r.statusCode}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Plugins ({metrics.plugins.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
              {metrics.plugins.map((p) => (
                <div key={p.id} className="list-item" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.category} • v{p.version}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
