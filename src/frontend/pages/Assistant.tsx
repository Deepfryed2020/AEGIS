import { useEffect, useState } from 'react';

interface Investigation {
  id: string;
  title: string;
}

interface Suggestion {
  category: string;
  title: string;
  reason: string;
  confidence: number;
  references?: string[];
}

interface AssistantReport {
  investigationId: string;
  suggestions: Suggestion[];
  generatedAt: string;
}

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

  useEffect(() => {
    fetch('/api/investigations').then((res) => res.json()).then(setInvestigations);
  }, []);

  async function loadSuggestions(id: string) {
    setSelectedId(id);
    setLoading(true);
    try {
      const response = await fetch(`/api/assistant/${id}`);
      const data = await response.json();
      setReport(data);
    } finally {
      setLoading(false);
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
          {investigations.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No investigations.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {investigations.map((inv) => (
                <div
                  key={inv.id}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === inv.id ? '#22d3ee' : undefined, padding: 12 }}
                  onClick={() => loadSuggestions(inv.id)}
                >
                  <div style={{ fontWeight: 600 }}>{inv.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {loading ? (
            <div>Generating suggestions…</div>
          ) : report ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{report.suggestions.length} suggestions</div>
              <div style={{ color: '#94a3b8', marginBottom: 14 }}>Generated {new Date(report.generatedAt).toLocaleString()}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {report.suggestions.map((s, i) => (
                  <div key={i} className="list-item" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{s.title}</div>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        background: CATEGORY_COLORS[s.category] || '#475569',
                        color: '#0b1020',
                        fontWeight: 600,
                      }}>
                        {s.category}
                      </span>
                    </div>
                    <div style={{ color: '#cbd5e1' }}>{s.reason}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>Confidence {s.confidence.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>Select an investigation to generate suggestions.</div>
          )}
        </div>
      </div>
    </div>
  );
}
