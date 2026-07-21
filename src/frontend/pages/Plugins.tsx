import { useEffect, useState } from 'react';

interface Plugin {
  id: string;
  name: string;
  category: string;
  version: string;
  description?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  ingestion: '#22d3ee',
  analysis: '#60a5fa',
  graph: '#a78bfa',
  timeline: '#34d399',
  reports: '#fbbf24',
  search: '#fb923c',
  connectors: '#f472b6',
  visualisations: '#cbd5e1',
};

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [category, setCategory] = useState('');
  const [execResults, setExecResults] = useState<any>(null);
  const [execCategory, setExecCategory] = useState('analysis');

  useEffect(() => {
    loadPlugins();
  }, [category]);

  async function loadPlugins() {
    const url = category ? `/api/plugins?category=${category}` : '/api/plugins';
    const res = await fetch(url);
    if (res.ok) setPlugins(await res.json());
  }

  async function execute() {
    const res = await fetch('/api/plugins/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: execCategory, context: {} }),
    });
    if (res.ok) setExecResults(await res.json());
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Plugins</h1>
          <p>Auto-registered plugins across ingestion, analysis, graph, timeline, reports, search, and visualisations.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ width: 200 }}>
            <label htmlFor="plugin-category">Filter by category</label>
            <select id="plugin-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All</option>
              <option>ingestion</option><option>analysis</option><option>graph</option><option>timeline</option>
              <option>reports</option><option>search</option><option>connectors</option><option>visualisations</option>
            </select>
          </div>
          <div className="input-group" style={{ width: 200 }}>
            <label htmlFor="exec-category">Execute category</label>
            <select id="exec-category" value={execCategory} onChange={(e) => setExecCategory(e.target.value)}>
              <option>ingestion</option><option>analysis</option><option>graph</option><option>timeline</option>
              <option>reports</option><option>search</option><option>visualisations</option>
            </select>
          </div>
          <button className="button" onClick={execute}>Execute</button>
        </div>
        {execResults && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Execution results</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', maxHeight: 300, overflow: 'auto' }}>
              {JSON.stringify(execResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <div className="grid-2">
        {plugins.length === 0 ? (
          <div className="panel">No plugins registered.</div>
        ) : (
          plugins.map((p) => (
            <div key={p.id} className="list-item" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: CATEGORY_COLORS[p.category] || '#475569',
                  color: '#0b1020',
                  fontWeight: 600,
                }}>
                  {p.category}
                </span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>v{p.version} • {p.id}</div>
              {p.description && <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 6 }}>{p.description}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
