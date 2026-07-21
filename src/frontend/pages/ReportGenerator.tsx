import { useCallback, useEffect, useState } from 'react';
import type { Investigation, GeneratedReport, ReportSection } from '../../shared/types';
import { safeFetch, ensureArray, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

export default function ReportGenerator() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
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

  async function generate() {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    const result = await safeFetch<GeneratedReport>(`/api/reports/generate/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'markdown' }),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      notify('Failed to generate report', 'error');
    } else if (result.data) {
      setReport(result.data);
      notify('Report generated', 'success');
    }
  }

  function download() {
    if (!report) return;
    const content = ensureArray<ReportSection>(report.sections).map((s) => `## ${ensureString(s.title)}\n\n${ensureString(s.body)}\n`).join('\n');
    const blob = new Blob([`# ${ensureString(report.title)}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ensureString(report.title).replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Report Generator</h1>
          <p>Generate cited investigation reports with executive summary, findings, timeline, and recommendations.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        {invLoading ? (
          <LoadingState message="Loading investigations…" />
        ) : invError ? (
          <ErrorState message={invError} onRetry={loadInvestigations} />
        ) : (
          <>
            <div className="input-group">
              <label htmlFor="report-investigation">Investigation</label>
              <select id="report-investigation" value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">Select an investigation</option>
                {ensureArray<Investigation>(investigations).map((inv) => <option key={ensureString(inv.id)} value={ensureString(inv.id)}>{ensureString(inv.title)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="button" onClick={generate} disabled={loading || !selectedId}>
                {loading ? 'Generating…' : 'Generate report'}
              </button>
              {report && <button className="button" onClick={download}>Download Markdown</button>}
            </div>
            {error && <div style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
          </>
        )}
      </div>
      {loading && <LoadingState message="Generating report…" />}
      {report && !loading && (
        <div className="panel">
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{ensureString(report.title)}</div>
          <div style={{ color: '#94a3b8', marginBottom: 18 }}>{report.generatedAt ? new Date(ensureString(report.generatedAt)).toLocaleString() : 'Unknown time'}</div>
          {ensureArray<ReportSection>(report.sections).map((section, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{ensureString(section.title)}</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#d1d5db' }}>{ensureString(section.body)}</div>
              {ensureArray(section.citations).length > 0 && (
                <div style={{ marginTop: 12, borderLeft: '3px solid #22d3ee', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Citations</div>
                  {ensureArray(section.citations).map((c, j) => (
                    <div key={j} style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                      "{ensureString(c.quote)}" — {ensureString(c.publisher) || 'Source'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!report && !loading && !invLoading && !invError && ensureArray(investigations).length === 0 && (
        <EmptyState message="Create an investigation first to generate a report." />
      )}
    </div>
  );
}
