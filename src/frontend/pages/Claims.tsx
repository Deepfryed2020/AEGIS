import { useCallback, useEffect, useState } from 'react';
import type { ResolvedClaim, Citation } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

const EMPTY_RESOLVED: ResolvedClaim = {
  id: '',
  claim: '',
  supportingEvidence: [],
  contradictoryEvidence: [],
  insufficientEvidence: false,
  confidence: 0,
  reasoning: '',
  outstandingQuestions: [],
  createdAt: '',
};

function EvidenceList({ items, label, color }: { items: Array<{ citation: Citation; documentId: string }>; label: string; color: string }) {
  const safe = ensureArray(items);
  if (safe.length === 0) return <div style={{ color: '#94a3b8' }}>None</div>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {safe.map((e, i) => (
        <div key={i} className="list-item" style={{ padding: 10, borderColor: color }}>
          <div>{ensureString(e?.citation?.quote)}</div>
          <div style={{ color, fontSize: 12 }}>Document {ensureString(e?.documentId)} • paragraph {ensureNumber(e?.citation?.paragraph)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Claims() {
  const [claim, setClaim] = useState('');
  const [resolved, setResolved] = useState<ResolvedClaim | null>(null);
  const [history, setHistory] = useState<ResolvedClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const { notify } = useToast();

  const loadHistory = useCallback(async () => {
    const result = await safeFetch<ResolvedClaim[]>('/api/claims/resolved');
    if (result.error) {
      setHistoryError(result.error);
    } else if (result.data) {
      setHistory(ensureArray<ResolvedClaim>(result.data));
      setHistoryError('');
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function resolve() {
    if (!claim.trim()) return;
    setLoading(true);
    setError('');
    const result = await safeFetch<ResolvedClaim>('/api/claims/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim }),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      notify('Failed to resolve claim', 'error');
    } else if (result.data) {
      setResolved(result.data);
      notify('Claim resolved', 'success');
      loadHistory();
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
          <div style={{ marginBottom: 10 }}><strong>Confidence:</strong> {ensureNumber(resolved.confidence).toFixed(2)}</div>
          <div style={{ marginBottom: 10 }}><strong>Reasoning:</strong> {ensureString(resolved.reasoning)}</div>
          <div style={{ marginBottom: 14 }}>
            <strong>Supporting evidence ({ensureArray(resolved.supportingEvidence).length})</strong>
            <EvidenceList items={resolved.supportingEvidence} label="Supporting" color="#34d399" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <strong>Contradictory evidence ({ensureArray(resolved.contradictoryEvidence).length})</strong>
            <EvidenceList items={resolved.contradictoryEvidence} label="Contradictory" color="#f87171" />
          </div>
          <div>
            <strong>Outstanding questions</strong>
            {ensureArray(resolved.outstandingQuestions).length === 0 ? (
              <div style={{ color: '#94a3b8' }}>None</div>
            ) : (
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                {ensureArray<string>(resolved.outstandingQuestions).map((q, i) => <li key={i}>{ensureString(q)}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Resolved claim history</div>
        {historyLoading ? (
          <LoadingState message="Loading resolved claims…" />
        ) : historyError ? (
          <ErrorState message={historyError} onRetry={loadHistory} />
        ) : history.length === 0 ? (
          <EmptyState message="No claims resolved yet." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((c) => (
              <div key={ensureString(c.id)} className="list-item" style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(c.claim).slice(0, 120)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                  Confidence {ensureNumber(c.confidence).toFixed(2)} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Unknown date'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
