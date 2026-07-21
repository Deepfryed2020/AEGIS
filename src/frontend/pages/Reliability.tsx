import { useEffect, useState } from 'react';

interface ReliabilityScore {
  sourceId: string;
  sourceName: string;
  sourceClass: string;
  baseTrust: number;
  historicalAccuracy: number;
  crossReferences: number;
  documentAge: number;
  evidenceQuality: number;
  independentCorroboration: number;
  compositeScore: number;
  confidence: number;
  signals: Array<{ label: string; value: number; weight: number }>;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? '#34d399' : value >= 0.5 ? '#fbbf24' : '#f87171';
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
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reliability')
      .then((res) => (res.ok ? res.json() : []))
      .then(setScores)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="panel">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evidence Reliability</h1>
          <p>Composite reliability scores across government, academic, media, corporate, lobby, and anonymous sources.</p>
        </div>
      </div>
      {scores.length === 0 ? (
        <div className="panel">No sources scored yet. Ingest evidence to compute reliability.</div>
      ) : (
        <div className="grid-2">
          {scores.map((s) => (
            <div key={s.sourceId} className="panel" style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{s.sourceName}</div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: '#22d3ee',
                  color: '#0b1020',
                  fontWeight: 600,
                }}>
                  {s.sourceClass}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
                {Math.round(s.compositeScore * 100)}%
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {s.signals.map((sig, i) => <ScoreBar key={i} value={sig.value} label={sig.label} />)}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>Confidence in score: {s.confidence.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
