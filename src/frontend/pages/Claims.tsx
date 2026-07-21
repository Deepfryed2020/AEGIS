import { useEffect, useState } from 'react';

interface ResolvedClaim {
  id: string;
  claim: string;
  supportingEvidence: Array<{ citation: { quote: string; paragraph: number; url: string; publisher?: string }; documentId: string }>;
  contradictoryEvidence: Array<{ citation: { quote: string; paragraph: number; url: string; publisher?: string }; documentId: string }>;
  insufficientEvidence: boolean;
  confidence: number;
  reasoning: string;
  outstandingQuestions: string[];
  createdAt: string;
}

export default function Claims() {
  const [claim, setClaim] = useState('');
  const [resolved, setResolved] = useState<ResolvedClaim | null>(null);
  const [history, setHistory] = useState<ResolvedClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/claims/resolved').then((res) => res.json()).then(setHistory);
  }, []);

  async function resolve() {
    if (!claim.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/claims/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResolved(data);
      const fresh = await fetch('/api/claims/resolved').then((res) => res.json());
      setHistory(fresh);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Claim Resolution</h1>
          <p>Submit a claim to surface supporting and contradicting evidence with confidence and reasoning.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="input-group">
          <label htmlFor="claim-input">Claim to resolve</label>
          <textarea
            id="claim-input"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Enter a factual claim to verify against the evidence base."
            rows={3}
          />
        </div>
        <button className="button" style={{ marginTop: 12 }} onClick={resolve} disabled={loading}>
          {loading ? 'Resolving…' : 'Resolve claim'}
        </button>
        {error && <div style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
      </div>
      {resolved && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Resolution</div>
          <div style={{ marginBottom: 10 }}><strong>Confidence:</strong> {resolved.confidence.toFixed(2)}</div>
          <div style={{ marginBottom: 10 }}><strong>Reasoning:</strong> {resolved.reasoning}</div>
          <div style={{ marginBottom: 14 }}>
            <strong>Supporting evidence ({resolved.supportingEvidence.length})</strong>
            {resolved.supportingEvidence.length === 0 ? (
              <div style={{ color: '#94a3b8' }}>None</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {resolved.supportingEvidence.map((e, i) => (
                  <div key={i} className="list-item" style={{ padding: 10 }}>
                    <div>{e.citation.quote}</div>
                    <div style={{ color: '#34d399', fontSize: 12 }}>Document {e.documentId} • paragraph {e.citation.paragraph}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <strong>Contradictory evidence ({resolved.contradictoryEvidence.length})</strong>
            {resolved.contradictoryEvidence.length === 0 ? (
              <div style={{ color: '#94a3b8' }}>None</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {resolved.contradictoryEvidence.map((e, i) => (
                  <div key={i} className="list-item" style={{ padding: 10, borderColor: '#f87171' }}>
                    <div>{e.citation.quote}</div>
                    <div style={{ color: '#f87171', fontSize: 12 }}>Document {e.documentId} • paragraph {e.citation.paragraph}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <strong>Outstanding questions</strong>
            {resolved.outstandingQuestions.length === 0 ? (
              <div style={{ color: '#94a3b8' }}>None</div>
            ) : (
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {resolved.outstandingQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Resolved claim history</div>
        {history.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No claims resolved yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((c) => (
              <div key={c.id} className="list-item" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{c.claim.slice(0, 120)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                  Confidence {c.confidence.toFixed(2)} • {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
