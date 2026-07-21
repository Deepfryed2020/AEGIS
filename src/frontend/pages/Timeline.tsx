import { useEffect, useState } from 'react';

interface MergedEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
  sourceCount: number;
}

interface TimelineData {
  events: MergedEvent[];
  missingPeriods: Array<{ start: string; end: string; reason: string }>;
  conflictingDates: Array<{ date: string; event: string; descriptions: string[] }>;
  duplicateEvents: Array<{ date: string; description: string; count: number }>;
  eventChains: Array<{ name: string; events: MergedEvent[] }>;
  causalRelationships: Array<{ cause: MergedEvent; effect: MergedEvent; reason: string }>;
}

export default function Timeline() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/timeline')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (d) setData(d); else setError('No timeline data'); })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="panel">{error}</div>;
  if (!data) return <div className="panel">Reconstructing timeline…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Timeline Reconstruction</h1>
          <p>Merged events across all documents with gap, conflict, and causal-chain detection.</p>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Missing periods</div>
          {data.missingPeriods.length === 0 ? <div style={{ color: '#94a3b8' }}>None detected</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.missingPeriods.map((p, i) => (
                <div key={i} className="list-item" style={{ padding: 10, borderColor: '#fbbf24' }}>
                  <div style={{ fontWeight: 600 }}>{p.start} → {p.end}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{p.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Conflicting dates</div>
          {data.conflictingDates.length === 0 ? <div style={{ color: '#94a3b8' }}>None detected</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.conflictingDates.map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10, borderColor: '#f87171' }}>
                  <div style={{ fontWeight: 600 }}>{c.date} — {c.event}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.descriptions.length} conflicting descriptions</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Causal relationships</div>
          {data.causalRelationships.length === 0 ? <div style={{ color: '#94a3b8' }}>None detected</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.causalRelationships.map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{c.cause.title} → {c.effect.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Event chains</div>
          {data.eventChains.length === 0 ? <div style={{ color: '#94a3b8' }}>None detected</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.eventChains.map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{c.events.length} events</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Reconstructed events ({data.events.length})</div>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {data.events.map((event) => (
            <div key={event.id} className="list-item" style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -20, top: 14, width: 12, height: 12, borderRadius: '50%', background: '#22d3ee' }} />
              <div style={{ fontWeight: 600 }}>{event.date} — {event.title}</div>
              <div>{event.description.slice(0, 200)}</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{event.sourceCount} source(s) • confidence {event.confidence.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
