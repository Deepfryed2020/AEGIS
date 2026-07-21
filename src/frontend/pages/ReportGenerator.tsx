import { useEffect, useState } from 'react';

interface Investigation {
  id: string;
  title: string;
}

interface ReportSection {
  title: string;
  body: string;
  citations: Array<{ quote: string; documentId: string; url: string; publisher?: string }>;
}

interface GeneratedReport {
  id: string;
  investigationId: string;
  title: string;
  sections: ReportSection[];
  generatedAt: string;
  format: string;
}

export default function ReportGenerator() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/investigations').then((res) => res.json()).then(setInvestigations);
  }, []);

  async function generate() {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reports/generate/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'markdown' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setReport(await response.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!report) return;
    const content = report.sections.map((s) => `## ${s.title}\n\n${s.body}\n`).join('\n');
    const blob = new Blob([`# ${report.title}\n\n${content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, '_')}.md`;
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
        <div className="input-group">
          <label htmlFor="report-investigation">Investigation</label>
          <select id="report-investigation" value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Select an investigation</option>
            {investigations.map((inv) => <option key={inv.id} value={inv.id}>{inv.title}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="button" onClick={generate} disabled={loading || !selectedId}>
            {loading ? 'Generating…' : 'Generate report'}
          </button>
          {report && <button className="button" onClick={download}>Download Markdown</button>}
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
      </div>
      {report && (
        <div className="panel">
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{report.title}</div>
          <div style={{ color: '#94a3b8', marginBottom: 18 }}>Generated {new Date(report.generatedAt).toLocaleString()}</div>
          {report.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{section.title}</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#d1d5db' }}>{section.body}</div>
              {section.citations.length > 0 && (
                <div style={{ marginTop: 12, borderLeft: '3px solid #22d3ee', paddingLeft: 12 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Citations</div>
                  {section.citations.map((c, j) => (
                    <div key={j} style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
                      "{c.quote}" — {c.publisher || 'Source'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
