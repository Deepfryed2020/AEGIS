import { useEffect, useState } from 'react';

interface SearchResults {
  documents: Array<{ id: string; title: string; sourceName: string; documentType: string; confidence: number; score: number; highlights: string[]; url: string }>;
  entities: Array<{ id: string; name: string; type: string; mentionCount: number; score: number }>;
  relationships: Array<{ id: string; sourceName: string; targetName: string; type: string; score: number }>;
  claims: Array<{ id: string; claim: string; confidence: number; score: number }>;
  investigations: Array<{ id: string; title: string; description: string; score: number }>;
  total: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

export default function Search2() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    fetch('/api/search2/saved').then((res) => res.json()).then(setSaved);
  }, []);

  async function search() {
    if (!query.trim()) return;
    const params = new URLSearchParams({ q: query });
    if (documentType) params.set('documentType', documentType);
    if (minConfidence > 0) params.set('minConfidence', String(minConfidence));
    if (sortBy) params.set('sortBy', sortBy);
    const response = await fetch(`/api/search2?${params}`);
    if (response.ok) setResults(await response.json());
  }

  async function saveSearch() {
    if (!saveName.trim() || !query.trim()) return;
    await fetch('/api/search2/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName, query, filters: { documentType, minConfidence, sortBy } }),
    });
    setSaveName('');
    const fresh = await fetch('/api/search2/saved').then((res) => res.json());
    setSaved(fresh);
  }

  async function deleteSaved(id: string) {
    await fetch(`/api/search2/saved/${id}`, { method: 'DELETE' });
    const fresh = await fetch('/api/search2/saved').then((res) => res.json());
    setSaved(fresh);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Search 2.0</h1>
          <p>Semantic search across documents, entities, relationships, claims, and investigations.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="input-group">
          <label htmlFor="search2-query">Query</label>
          <input id="search2-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across all evidence and intelligence" />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
          <div className="input-group" style={{ width: 160 }}>
            <label htmlFor="doc-type">Document type</label>
            <select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="">Any</option>
              <option>HTML</option><option>PDF</option><option>JSON</option><option>XML</option><option>CSV</option><option>RSS</option><option>Text</option>
            </select>
          </div>
          <div className="input-group" style={{ width: 140 }}>
            <label htmlFor="min-conf">Min confidence</label>
            <input id="min-conf" type="number" step={0.1} min={0} max={1} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))} />
          </div>
          <div className="input-group" style={{ width: 160 }}>
            <label htmlFor="sort-by">Sort by</label>
            <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="confidence">Confidence</option>
              <option value="date">Date</option>
            </select>
          </div>
          <button className="button" onClick={search}>Search</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="save-name">Save search as</label>
            <input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name this search" />
          </div>
          <button className="button" onClick={saveSearch}>Save</button>
        </div>
      </div>
      {saved.length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Saved searches</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {saved.map((s) => (
              <div key={s.id} className="list-item" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ cursor: 'pointer', color: '#22d3ee' }} onClick={() => setQuery(s.query)}>{s.name}</span>
                <button className="button" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteSaved(s.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {results && (
        <div className="grid-2">
          <div className="panel" style={{ minHeight: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Documents ({results.documents.length})</div>
            {results.documents.length === 0 ? <div style={{ color: '#94a3b8' }}>None</div> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {results.documents.slice(0, 10).map((d) => (
                  <div key={d.id} className="list-item" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{d.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{d.sourceName} • {d.documentType} • score {d.score.toFixed(2)}</div>
                    {d.highlights.slice(0, 1).map((h, i) => <div key={i} style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{h}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel" style={{ minHeight: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Entities ({results.entities.length})</div>
            {results.entities.length === 0 ? <div style={{ color: '#94a3b8' }}>None</div> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {results.entities.slice(0, 8).map((e) => (
                  <div key={e.id} className="list-item" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{e.type} • {e.mentionCount} mentions</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 10px' }}>Claims ({results.claims.length})</div>
            {results.claims.length === 0 ? <div style={{ color: '#94a3b8' }}>None</div> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {results.claims.slice(0, 5).map((c) => (
                  <div key={c.id} className="list-item" style={{ padding: 10 }}>
                    <div>{c.claim.slice(0, 120)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>confidence {c.confidence.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
