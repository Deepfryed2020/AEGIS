import { useCallback, useEffect, useState } from 'react';
import type { GraphNode, EntityProfile } from '../../shared/types';
import { safeFetch, ensureArray, ensureString, ensureNumber } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

export default function EntityProfiles() {
  const [query, setQuery] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<EntityProfile | null>(null);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState('');

  const loadNodes = useCallback(async () => {
    setLoadingNodes(true);
    const result = await safeFetch<GraphNode[]>('/api/profiles?q=');
    setNodes(ensureArray(result.data));
    if (result.error) setError(result.error);
    setLoadingNodes(false);
  }, []);

  useEffect(() => { loadNodes(); }, [loadNodes]);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingProfile(true);
    safeFetch<EntityProfile>(`/api/profiles/${selectedId}`).then((result) => {
      setProfile(result.data);
      if (result.error) setError(result.error);
      setLoadingProfile(false);
    });
  }, [selectedId]);

  async function search() {
    setLoadingNodes(true);
    const result = await safeFetch<GraphNode[]>(`/api/profiles?q=${encodeURIComponent(query)}`);
    setNodes(ensureArray(result.data));
    setLoadingNodes(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Entity Profiles</h1>
          <p>Inspect people, organisations, legislation, and committees with auto-generated intelligence profiles.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="input-group">
          <label htmlFor="profile-search">Search entities</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input id="profile-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or type" />
            <button className="button" onClick={search}>Search</button>
          </div>
        </div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <div className="panel" style={{ minHeight: 560 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Entities ({nodes.length})</div>
          {loadingNodes ? (
            <LoadingState message="Loading entities…" />
          ) : nodes.length === 0 ? (
            <EmptyState message="No entities found. Ingest evidence to populate the graph." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === n.id ? '#22d3ee' : undefined, padding: 12 }}
                  onClick={() => setSelectedId(n.id)}
                >
                  <div style={{ fontWeight: 600 }}>{ensureString(n.name)}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(n.type)} • {ensureNumber(n.mentionCount)} mentions</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 560 }}>
          {loadingProfile ? (
            <LoadingState message="Loading profile…" />
          ) : profile ? (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{ensureString(profile.node?.name)}</div>
              <div style={{ color: '#94a3b8', marginBottom: 8 }}>{ensureString(profile.node?.type)} • {ensureNumber(profile.degree)} connections • rank {ensureNumber(profile.rank).toFixed(1)}</div>
              <div style={{ marginBottom: 14 }}>{ensureString(profile.summary)}</div>
              {ensureArray(profile.aliases).length > 0 && (
                <div style={{ marginBottom: 10 }}><strong>Aliases:</strong> {profile.aliases.map((a) => ensureString(a)).join(', ')}</div>
              )}
              <div style={{ marginBottom: 10 }}>
                <strong>Confidence:</strong> {ensureNumber(profile.confidence).toFixed(2)}
              </div>
              {ensureArray(profile.riskIndicators).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong>Risk indicators</strong>
                  {profile.riskIndicators.map((r, i) => (
                    <div key={i} className="list-item" style={{ padding: 8, marginTop: 6, borderColor: r.level === 'high' ? '#f87171' : r.level === 'medium' ? '#fbbf24' : '#27334f' }}>
                      <div style={{ fontWeight: 600 }}>{ensureString(r.label)}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(r.reason)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <strong>Related entities</strong>
                {ensureArray(profile.relatedEntities).length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>None</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.relatedEntities.slice(0, 10).map((r, i) => (
                      <div key={i} className="list-item" style={{ padding: 8 }}>
                        <div style={{ fontWeight: 600 }}>{ensureString(r.node?.name)}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(r.edge?.type)} • weight {ensureNumber(r.edge?.weight).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <strong>Claims</strong>
                {ensureArray(profile.claims).length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>No claims extracted</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.claims.slice(0, 5).map((c, i) => (
                      <div key={i} className="list-item" style={{ padding: 8 }}>
                        <div>{ensureString(c.claim)}</div>
                        <div style={{ color: c.supporting ? '#34d399' : '#f87171', fontSize: 12 }}>{c.supporting ? 'Supporting' : 'Contradicting'} • {ensureNumber(c.confidence).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <strong>Documents mentioning</strong>
                {ensureArray(profile.documentsMentioning).length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>None</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.documentsMentioning.slice(0, 5).map((d) => (
                      <div key={ensureString(d.id)} className="list-item" style={{ padding: 8 }}>
                        <div style={{ fontWeight: 600 }}>{ensureString(d.title)}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(d.retrievedDate)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState message="Select an entity to view its intelligence profile." />
          )}
        </div>
      </div>
    </div>
  );
}
