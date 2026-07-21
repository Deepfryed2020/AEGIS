import { useEffect, useState } from 'react';

interface Schedule {
  id: string;
  connectorId: string;
  cronExpression: string;
  lastRun?: string;
  nextRun?: string;
  enabled: number;
  maxDepth: number;
}

interface QueueEntry {
  id: string;
  connectorId: string;
  status: string;
  reason?: string;
  changed?: number;
  createdAt: string;
  finishedAt?: string;
}

interface ConnectorSummary {
  id: string;
  name: string;
}

export default function IngestionQueue() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [selectedConnector, setSelectedConnector] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    const [schedulesRes, queueRes, connectorsRes] = await Promise.all([
      fetch('/api/ingestion/schedules'),
      fetch('/api/ingestion/queue'),
      fetch('/api/connectors'),
    ]);
    setSchedules(await schedulesRes.json());
    setQueue(await queueRes.json());
    const connectorsData = await connectorsRes.json();
    setConnectors(connectorsData);
    if (!selectedConnector && connectorsData.length) setSelectedConnector(connectorsData[0].id);
  }

  async function createSchedule() {
    if (!selectedConnector) return;
    const response = await fetch('/api/ingestion/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId: selectedConnector, intervalMinutes, maxDepth: 2 }),
    });
    if (response.ok) {
      setStatus('Schedule created.');
      loadAll();
    } else {
      setStatus('Failed to create schedule.');
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    await fetch(`/api/ingestion/schedules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    loadAll();
  }

  async function queueNow() {
    if (!selectedConnector) return;
    await fetch('/api/ingestion/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectorId: selectedConnector, maxDepth: 2 }),
    });
    setStatus('Queued for immediate processing.');
    loadAll();
  }

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
              {connectors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ width: 140 }}>
            <label htmlFor="interval-min">Interval (min)</label>
            <input id="interval-min" type="number" min={1} value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value))} />
          </div>
          <button className="button" onClick={createSchedule}>Create schedule</button>
          <button className="button" onClick={queueNow}>Run now</button>
        </div>
        {status && <div style={{ marginTop: 10, color: '#94a3b8' }}>{status}</div>}
      </div>
      <div className="grid-2">
        <div className="panel" style={{ minHeight: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Schedules</div>
          {schedules.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No schedules configured.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {schedules.map((s) => (
                <div key={s.id} className="list-item" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{s.connectorId}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.cronExpression} • depth {s.maxDepth}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Next: {s.nextRun ? new Date(s.nextRun).toLocaleString() : 'N/A'}</div>
                  <button className="button" style={{ marginTop: 8 }} onClick={() => toggleSchedule(s.id, !s.enabled)}>
                    {s.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Queue</div>
          {queue.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>Queue is empty.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {queue.map((q) => (
                <div key={q.id} className="list-item" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{q.connectorId}</div>
                  <div style={{ color: q.status === 'failed' ? '#f87171' : q.status === 'complete' ? '#34d399' : '#94a3b8', fontSize: 12 }}>
                    {q.status}{q.changed ? ` • ${q.changed} changed` : ''}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(q.createdAt).toLocaleString()}</div>
                  {q.reason && <div style={{ color: '#f87171', fontSize: 12 }}>{q.reason}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
