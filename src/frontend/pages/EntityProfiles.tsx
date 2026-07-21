import { useEffect, useState } from 'react';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentionCount: number;
}

interface EntityProfile {
  node: GraphNode;
  summary: string;
  aliases: string[];
  timeline: Array<{ date: string; title: string; description: string; evidenceId?: string }>;
  relatedEntities: Array<{ node: GraphNode; edge: { type: string; weight: number; confidence: number } }>;
  connectedEvidence: Array<{ id: string; title: string; sourceName: string; retrievedDate: string; url: string }>;
  claims: Array<{ claim: string; documentId: string; supporting: boolean; confidence: number }>;
  confidence: number;
  riskIndicators: Array<{ level: string; label: string; reason: string }>;
  documentsMentioning: Array<{ id: string; title: string; retrievedDate: string; url: string }>;
  recentActivity: Array<{ timestamp: string; event: string; evidenceId?: string }>;
  rank: number;
  degree: number;
}

export default function EntityProfiles() {
  const [query, setQuery] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<EntityProfile | null>(null);

  useEffect(() => {
    fetch('/api/profiles?q=')
      .then((res) => res.json())
      .then(setNodes);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/profiles/${selectedId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setProfile);
  }, [selectedId]);

  async function search() {
    const results = await fetch(`/api/profiles?q=${encodeURIComponent(query)}`).then((res) => res.json());
    setNodes(results);
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
          {nodes.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No entities found. Ingest evidence to populate the graph.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === n.id ? '#22d3ee' : undefined, padding: 12 }}
                  onClick={() => setSelectedId(n.id)}
                >
                  <div style={{ fontWeight: 600 }}>{n.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{n.type} • {n.mentionCount} mentions</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 560 }}>
          {profile ? (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{profile.node.name}</div>
              <div style={{ color: '#94a3b8', marginBottom: 8 }}>{profile.node.type} • {profile.degree} connections • rank {profile.rank.toFixed(1)}</div>
              <div style={{ marginBottom: 14 }}>{profile.summary}</div>
              {profile.aliases.length > 0 && (
                <div style={{ marginBottom: 10 }}><strong>Aliases:</strong> {profile.aliases.join(', ')}</div>
              )}
              <div style={{ marginBottom: 10 }}>
                <strong>Confidence:</strong> {profile.confidence.toFixed(2)}
              </div>
              {profile.riskIndicators.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong>Risk indicators</strong>
                  {profile.riskIndicators.map((r, i) => (
                    <div key={i} className="list-item" style={{ padding: 8, marginTop: 6, borderColor: r.level === 'high' ? '#f87171' : r.level === 'medium' ? '#fbbf24' : '#27334f' }}>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.reason}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <strong>Related entities</strong>
                {profile.relatedEntities.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>None</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.relatedEntities.slice(0, 10).map((r, i) => (
                      <div key={i} className="list-item" style={{ padding: 8 }}>
                        <div style={{ fontWeight: 600 }}>{r.node.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{r.edge.type} • weight {r.edge.weight.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <strong>Claims</strong>
                {profile.claims.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>No claims extracted</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.claims.slice(0, 5).map((c, i) => (
                      <div key={i} className="list-item" style={{ padding: 8 }}>
                        <div>{c.claim}</div>
                        <div style={{ color: c.supporting ? '#34d399' : '#f87171', fontSize: 12 }}>{c.supporting ? 'Supporting' : 'Contradicting'} • {c.confidence.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <strong>Documents mentioning</strong>
                {profile.documentsMentioning.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>None</div>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {profile.documentsMentioning.slice(0, 5).map((d) => (
                      <div key={d.id} className="list-item" style={{ padding: 8 }}>
                        <div style={{ fontWeight: 600 }}>{d.title}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(d.retrievedDate).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>Select an entity to view its intelligence profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
