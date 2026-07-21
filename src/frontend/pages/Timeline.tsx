import { useCallback, useEffect, useState } from 'react';
import type { TimelineData, MergedTimelineEvent, Gap, ConflictingDate, EventChain, CausalRelationship } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

const EMPTY_DATA: TimelineData = {
  events: [],
  missingPeriods: [],
  conflictingDates: [],
  duplicateEvents: [],
  eventChains: [],
  causalRelationships: [],
};

export default function Timeline() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await safeFetch<TimelineData>('/api/timeline');
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setData(result.data);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div>
        <div className="page-header"><div><h1>Timeline Reconstruction</h1><p>Loading…</p></div></div>
        <LoadingState message="Reconstructing timeline…" />
      </div>
    );
  }

  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const safe = data || EMPTY_DATA;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Timeline Reconstruction</h1>
          <p>Merged events across all documents with gap, conflict, and causal-chain detection.</p>
        </div>
      </div>
      {error && <div style={{ color: '#fbbf24', marginBottom: 12, fontSize: 13 }}>Warning: {error} — showing last known data</div>}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Missing periods</div>
          {ensureArray<Gap>(safe.missingPeriods).length === 0 ? <EmptyState message="None detected" /> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ensureArray<Gap>(safe.missingPeriods).map((p, i) => (
                <div key={i} className="list-item" style={{ padding: 10, borderColor: '#fbbf24' }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(p.start)} → {ensureString(p.end)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(p.reason)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Conflicting dates</div>
          {ensureArray<ConflictingDate>(safe.conflictingDates).length === 0 ? <EmptyState message="None detected" /> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ensureArray<ConflictingDate>(safe.conflictingDates).map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10, borderColor: '#f87171' }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(c.date)} — {ensureString(c.event)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureArray(c.descriptions).length} conflicting descriptions</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Causal relationships</div>
          {ensureArray<CausalRelationship>(safe.causalRelationships).length === 0 ? <EmptyState message="None detected" /> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ensureArray<CausalRelationship>(safe.causalRelationships).map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(c.cause?.title)} → {ensureString(c.effect?.title)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(c.reason)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Event chains</div>
          {ensureArray<EventChain>(safe.eventChains).length === 0 ? <EmptyState message="None detected" /> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ensureArray<EventChain>(safe.eventChains).map((c, i) => (
                <div key={i} className="list-item" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{ensureString(c.name)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureArray(c.events).length} events</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Reconstructed events ({ensureArray(safe.events).length})</div>
        {ensureArray<MergedTimelineEvent>(safe.events).length === 0 ? (
          <EmptyState message="No events reconstructed yet." />
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {ensureArray<MergedTimelineEvent>(safe.events).map((event) => (
              <div key={ensureString(event.id)} className="list-item" style={{ marginBottom: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -20, top: 14, width: 12, height: 12, borderRadius: '50%', background: '#22d3ee' }} />
                <div style={{ fontWeight: 600 }}>{ensureString(event.date)} — {ensureString(event.title)}</div>
                <div>{ensureString(event.description).slice(0, 200)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureNumber(event.sourceCount)} source(s) • confidence {ensureNumber(event.confidence).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
