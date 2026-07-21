import { useCallback, useEffect, useState } from 'react';
import type { CrawlSchedule, QueueEntry, ConnectorInfo } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

export default function IngestionQueue() {
  const [schedules, setSchedules] = useState<CrawlSchedule[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [selectedConnector, setSelectedConnector] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { notify } = useToast();

  const loadAll = useCallback(async () => {
    const [schedulesRes, queueRes, connectorsRes] = await Promise.all([
      safeFetch<CrawlSchedule[]>('/api/ingestion/schedules'),
      safeFetch<QueueEntry[]>('/api/ingestion/queue'),
      safeFetch<ConnectorInfo[]>('/api/connectors'),
    ]);
    if (schedulesRes.error || queueRes.error || connectorsRes.error) {
      setError(schedulesRes.error || queueRes.error || connectorsRes.error || 'Failed to load');
    } else {
      setError('');
      setSchedules(ensureArray<CrawlSchedule>(schedulesRes.data));
      setQueue(ensureArray<QueueEntry>(queueRes.data));
      const conns = ensureArray<ConnectorInfo>(connectorsRes.data);
      setConnectors(conns);
      if (!selectedConnector && conns.length > 0) setSelectedConnector(ensureString(conns[0].id));
    }
    setLoading(false);
  }, [selectedConnector]);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  async function createSchedule() {
    if (!selectedConnector) return;
    const result = await safeFetch('/api/ingestion/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId: selectedConnector, intervalMinutes, maxDepth: 2 }),
    });
    if (result.error) {
      notify('Failed to create schedule', 'error');
    } else {
      setStatus('Schedule created.');
      notify('Schedule created', 'success');
      loadAll();
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    await safeFetch(`/api/ingestion/schedules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    loadAll();
  }

  async function queueNow() {
    if (!selectedConnector) return;
    const result = await safeFetch('/api/ingestion/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId: selectedConnector, maxDepth: 2 }),
    });
    if (result.error) {
      notify('Failed to queue', 'error');
    } else {
      setStatus('Queued for immediate processing.');
      notify('Queued for processing', 'success');
      loadAll();
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header"><div><h1>Continuous Ingestion</h1><p>Loading…</p></div></div>
        <LoadingState message="Loading ingestion queue…" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Continuous Ingestion</h1>
          <p>Schedule recurring crawls, monitor the queue, and track change detection.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>New schedule</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="connector-select">Connector</label>
            <select id="connector-select" value={selectedConnector} onChange={(e) => setSelectedConnector(e.target.value)}>
              {ensureArray<ConnectorInfo>(connectors).map((c) => <option key={ensureString(c.id)} value={ensureString(c.id)}>{ensureString(c.name)}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ width: 140 }}>
            <label htmlFor="interval-min">Interval (min)</label>
            <input id="interval-min" type="number" min={1} value={intervalMinutes} onChange={(e) => setIntervalMinutes(ensureNumber(Number(e.target.value), 60))} />
          </div>
          <button className="button" onClick={createSchedule}>Create schedule</button>
          <button className="button" onClick={queueNow}>Run now</button>
        </div>
        {status && <div style={{ marginTop: 10, color: '#94a3b8' }}>{status}</div>}
      </div>
      <div className="grid-2">
        <div className="panel" style={{ minHeight: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Schedules</div>
          {ensureArray(schedules).length === 0 ? (
            <EmptyState message="No schedules configured." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {ensureArray<CrawlSchedule>(schedules).map((s) => (
                <div key={ensureString(s.id)} className="list-item" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(s.connectorId)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(s.cronExpression)} • depth {ensureNumber(s.maxDepth)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Next: {s.nextRun ? new Date(ensureString(s.nextRun)).toLocaleString() : 'N/A'}</div>
                  <button className="button" style={{ marginTop: 8 }} onClick={() => toggleSchedule(ensureString(s.id), !s.enabled)}>
                    {s.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Queue</div>
          {ensureArray(queue).length === 0 ? (
            <EmptyState message="Queue is empty." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {ensureArray<QueueEntry>(queue).map((q) => (
                <div key={ensureString(q.id)} className="list-item" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(q.connectorId)}</div>
                  <div style={{ color: q.status === 'failed' ? '#f87171' : q.status === 'complete' ? '#34d399' : '#94a3b8', fontSize: 12 }}>
                    {ensureString(q.status)}{q.changed ? ` • ${ensureNumber(q.changed)} changed` : ''}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{q.createdAt ? new Date(ensureString(q.createdAt)).toLocaleString() : ''}</div>
                  {q.reason && <div style={{ color: '#f87171', fontSize: 12 }}>{ensureString(q.reason)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
