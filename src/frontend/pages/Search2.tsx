import { useCallback, useEffect, useState } from 'react';
import type { SearchResults, SavedSearch, EvidenceDocument } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

const EMPTY_RESULTS: SearchResults = {
  documents: [],
  entities: [],
  relationships: [],
  claims: [],
  investigations: [],
  total: 0,
};

export default function Search2() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [saveName, setSaveName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { notify } = useToast();

  const loadSaved = useCallback(async () => {
    const result = await safeFetch<SavedSearch[]>('/api/search2/saved');
    if (result.data) setSaved(ensureArray<SavedSearch>(result.data));
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ q: query });
    if (documentType) params.set('documentType', documentType);
    if (minConfidence > 0) params.set('minConfidence', String(minConfidence));
    if (sortBy) params.set('sortBy', sortBy);
    const result = await safeFetch<SearchResults>(`/api/search2?${params}`);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      notify('Search failed', 'error');
    } else if (result.data) {
      setResults(result.data);
    }
  }, [query, documentType, minConfidence, sortBy, notify]);

  async function saveSearch() {
    if (!saveName.trim() || !query.trim()) return;
    const result = await safeFetch('/api/search2/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName, query, filters: { documentType, minConfidence, sortBy } }),
    });
    if (result.error) {
      notify('Failed to save search', 'error');
    } else {
      setSaveName('');
      notify('Search saved', 'success');
      loadSaved();
    }
  }

  async function deleteSaved(id: string) {
    await safeFetch(`/api/search2/saved/${id}`, { method: 'DELETE' });
    loadSaved();
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
            <input id="min-conf" type="number" step={0.1} min={0} max={1} value={minConfidence} onChange={(e) => setMinConfidence(ensureNumber(Number(e.target.value), 0))} />
          </div>
          <div className="input-group" style={{ width: 160 }}>
            <label htmlFor="sort-by">Sort by</label>
            <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="confidence">Confidence</option>
              <option value="date">Date</option>
            </select>
          </div>
          <button className="button" onClick={search} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="save-name">Save search as</label>
            <input id="save-name" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name this search" />
          </div>
          <button className="button" onClick={saveSearch}>Save</button>
        </div>
      </div>
      {ensureArray(saved).length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Saved searches</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ensureArray<SavedSearch>(saved).map((s) => (
              <div key={ensureString(s.id)} className="list-item" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ cursor: 'pointer', color: '#22d3ee' }} onClick={() => setQuery(ensureString(s.query))}>{ensureString(s.name)}</span>
                <button className="button" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteSaved(ensureString(s.id))}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <ErrorState message={error} onRetry={search} />}
      {loading && <LoadingState message="Searching…" />}
      {results && !loading && (
        <div className="grid-2">
          <div className="panel" style={{ minHeight: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Documents ({ensureArray(results.documents).length})</div>
            {ensureArray(results.documents).length === 0 ? <EmptyState message="None" /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {ensureArray<EvidenceDocument & { score: number; highlights: string[] }>(results.documents).slice(0, 10).map((d) => (
                  <div key={ensureString(d.id)} className="list-item" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{ensureString(d.title)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(d.sourceName)} • {ensureString(d.documentType)} • score {ensureNumber(d.score).toFixed(2)}</div>
                    {ensureArray(d.highlights).slice(0, 1).map((h, i) => <div key={i} style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{ensureString(h)}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel" style={{ minHeight: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Entities ({ensureArray(results.entities).length})</div>
            {ensureArray(results.entities).length === 0 ? <EmptyState message="None" /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {ensureArray<{ id: string; name: string; type: string; mentionCount: number; score: number }>(results.entities).slice(0, 8).map((e) => (
                  <div key={ensureString(e.id)} className="list-item" style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{ensureString(e.name)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(e.type)} • {ensureNumber(e.mentionCount)} mentions</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 10px' }}>Claims ({ensureArray(results.claims).length})</div>
            {ensureArray(results.claims).length === 0 ? <EmptyState message="None" /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {ensureArray<{ id: string; claim: string; confidence: number; score: number }>(results.claims).slice(0, 5).map((c) => (
                  <div key={ensureString(c.id)} className="list-item" style={{ padding: 10 }}>
                    <div>{ensureString(c.claim).slice(0, 120)}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>confidence {ensureNumber(c.confidence).toFixed(2)}</div>
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
