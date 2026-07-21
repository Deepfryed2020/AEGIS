import { useCallback, useEffect, useState } from 'react';
import type { ReliabilityScore } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

function ScoreBar({ value, label }: { value: number; label: string }) {
  const v = ensureNumber(value);
  const pct = Math.round(v * 100);
  const color = v >= 0.75 ? '#34d399' : v >= 0.5 ? '#fbbf24' : '#f87171';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function Reliability() {
  const [scores, setScores] = useState<ReliabilityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const result = await safeFetch<ReliabilityScore[]>('/api/reliability');
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setScores(ensureArray<ReliabilityScore>(result.data));
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
        <div className="page-header"><div><h1>Evidence Reliability</h1><p>Loading…</p></div></div>
        <LoadingState message="Computing reliability scores…" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evidence Reliability</h1>
          <p>Composite reliability scores across government, academic, media, corporate, lobby, and anonymous sources.</p>
        </div>
      </div>
      {ensureArray(scores).length === 0 ? (
        <EmptyState message="No sources scored yet. Ingest evidence to compute reliability." />
      ) : (
        <div className="grid-2">
          {ensureArray<ReliabilityScore>(scores).map((s) => (
            <div key={ensureString(s.sourceId)} className="panel" style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{ensureString(s.sourceName)}</div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: '#22d3ee',
                  color: '#0b1020',
                  fontWeight: 600,
                }}>
                  {ensureString(s.sourceClass)}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
                {Math.round(ensureNumber(s.compositeScore) * 100)}%
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {ensureArray(s.signals).map((sig, i) => <ScoreBar key={i} value={ensureNumber(sig?.value)} label={ensureString(sig?.label)} />)}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>Confidence in score: {ensureNumber(s.confidence).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
