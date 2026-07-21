import { useCallback, useEffect, useState } from 'react';
import type { Investigation, AssistantReport, AssistantSuggestion } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

const CATEGORY_COLORS: Record<string, string> = {
  people: '#60a5fa',
  'missing-evidence': '#fbbf24',
  conflicts: '#f87171',
  questions: '#22d3ee',
  'related-investigations': '#a78bfa',
  legislation: '#34d399',
  procurement: '#fb923c',
  funding: '#f472b6',
  angles: '#cbd5e1',
};

export default function Assistant() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<AssistantReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const [error, setError] = useState('');
  const [invError, setInvError] = useState('');
  const { notify } = useToast();

  const loadInvestigations = useCallback(async () => {
    const result = await safeFetch<Investigation[]>('/api/investigations');
    if (result.error) {
      setInvError(result.error);
    } else if (result.data) {
      setInvestigations(ensureArray<Investigation>(result.data));
      setInvError('');
    }
    setInvLoading(false);
  }, []);

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

  async function loadSuggestions(id: string) {
    setSelectedId(id);
    setLoading(true);
    setError('');
    const result = await safeFetch<AssistantReport>(`/api/assistant/${id}`);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      notify('Failed to generate suggestions', 'error');
    } else if (result.data) {
      setReport(result.data);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Investigation Assistant</h1>
          <p>Autonomous suggestions for people, missing evidence, conflicts, and reporting angles.</p>
        </div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="panel" style={{ minHeight: 520 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Investigations</div>
          {invLoading ? (
            <LoadingState message="Loading investigations…" />
          ) : invError ? (
            <ErrorState message={invError} onRetry={loadInvestigations} />
          ) : ensureArray(investigations).length === 0 ? (
            <EmptyState message="No investigations." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {ensureArray<Investigation>(investigations).map((inv) => (
                <div
                  key={ensureString(inv.id)}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === inv.id ? '#22d3ee' : undefined, padding: 12 }}
                  onClick={() => loadSuggestions(ensureString(inv.id))}
                >
                  <div style={{ fontWeight: 600 }}>{ensureString(inv.title)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {loading ? (
            <LoadingState message="Generating suggestions…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => selectedId && loadSuggestions(selectedId)} />
          ) : report ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{ensureArray(report.suggestions).length} suggestions</div>
              <div style={{ color: '#94a3b8', marginBottom: 14 }}>{report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Unknown time'}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {ensureArray<AssistantSuggestion>(report.suggestions).map((s, i) => (
                  <div key={i} className="list-item" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{ensureString(s.title)}</div>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        background: CATEGORY_COLORS[ensureString(s.category)] || '#475569',
                        color: '#0b1020',
                        fontWeight: 600,
                      }}>
                        {ensureString(s.category)}
                      </span>
                    </div>
                    <div style={{ color: '#cbd5e1' }}>{ensureString(s.reason)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>Confidence {ensureNumber(s.confidence).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="Select an investigation to generate suggestions." />
          )}
        </div>
      </div>
    </div>
  );
}
