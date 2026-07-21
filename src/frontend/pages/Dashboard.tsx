import { useEffect, useState } from 'react';

interface DashboardStats {
  investigations: number;
  evidence: number;
  sources: number;
  relationships: number;
  entities: number;
  claims: number;
  jobs: number;
  queuePending: number;
  latestImports: Array<{ id: string; title: string; sourceName: string; retrievedDate: string; documentType: string }>;
  relationshipGrowth: Array<{ date: string; count: number }>;
  entityGrowth: Array<{ date: string; count: number }>;
  mostConnectedOrganisations: Array<{ name: string; degree: number; mentionCount: number }>;
  evidenceConfidence: { average: number; high: number; medium: number; low: number };
  claimConflicts: Array<{ claim: string; supporting: number; contradicting: number }>;
  timelineActivity: Array<{ date: string; count: number }>;
  sourceReliability: Array<{ sourceId: string; sourceName: string; compositeScore: number; sourceClass: string }>;
  investigationProgress: Array<{ id: string; title: string; evidenceCount: number; archived: number }>;
  graphStats: { nodeCount: number; edgeCount: number; typeDistribution: Record<string, number> };
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {hint && <div style={{ color: '#cbd5e1', fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

function Sparkline({ data, label }: { data: Array<{ date: string; count: number }>; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
      {data.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: 12 }}>No data yet</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
          {data.slice(-20).map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${d.count}`}
              style={{
                width: 10,
                height: `${(d.count / max) * 100}%`,
                background: 'linear-gradient(180deg, #4f46e5, #22d3ee)',
                borderRadius: 2,
                minHeight: 2,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfidenceBar({ average }: { average: number }) {
  const pct = Math.round(average * 100);
  const color = average >= 0.75 ? '#34d399' : average >= 0.5 ? '#fbbf24' : '#f87171';
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Evidence confidence</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</div>
      <div style={{ height: 8, background: '#1e293b', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (active) setStats(data);
      } catch (err) {
        if (active) setError(String(err));
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (error) return <div className="panel">Failed to load dashboard: {error}</div>;
  if (!stats) return <div className="panel">Loading intelligence command centre…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Intelligence Command Centre</h1>
          <p>Live overview of investigations, evidence, graph growth, and source reliability.</p>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <MetricCard label="Investigations" value={stats.investigations} hint="Active workspaces" />
        <MetricCard label="Evidence" value={stats.evidence} hint="Indexed documents" />
        <MetricCard label="Graph entities" value={stats.graphStats.nodeCount} hint={`${stats.graphStats.edgeCount} relationships`} />
        <MetricCard label="Claims resolved" value={stats.claims} hint={`${stats.claimConflicts.length} conflicts`} />
        <MetricCard label="Sources" value={stats.sources} hint="Government & media" />
        <MetricCard label="Queue pending" value={stats.queuePending} hint="Ingestion queue" />
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <Sparkline data={stats.relationshipGrowth} label="Relationship growth (last 30 days)" />
        <Sparkline data={stats.entityGrowth} label="Entity growth (last 30 days)" />
        <Sparkline data={stats.timelineActivity} label="Timeline activity" />
        <ConfidenceBar average={stats.evidenceConfidence.average} />
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Most connected organisations</div>
          {stats.mostConnectedOrganisations.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No organisations yet.</div>
          ) : (
            stats.mostConnectedOrganisations.map((org) => (
              <div key={org.name} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{org.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{org.degree} connections • {org.mentionCount} mentions</div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Latest imports</div>
          {stats.latestImports.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No imports yet.</div>
          ) : (
            stats.latestImports.map((doc) => (
              <div key={doc.id} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{doc.title}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{doc.sourceName} • {doc.documentType} • {new Date(doc.retrievedDate).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Claim conflicts</div>
          {stats.claimConflicts.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No conflicting claims detected.</div>
          ) : (
            stats.claimConflicts.map((c, i) => (
              <div key={i} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{c.claim.slice(0, 100)}</div>
                <div style={{ color: '#f87171', fontSize: 12 }}>{c.contradicting} contradicting • {c.supporting} supporting</div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Source reliability</div>
          {stats.sourceReliability.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No sources scored yet.</div>
          ) : (
            stats.sourceReliability.map((s) => (
              <div key={s.sourceId} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{s.sourceName}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{s.sourceClass} • score {s.compositeScore.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Investigation progress</div>
        {stats.investigationProgress.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No investigations yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {stats.investigationProgress.map((inv) => (
              <div key={inv.id} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{inv.title}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{inv.evidenceCount} evidence • {inv.archived ? 'Archived' : 'Active'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
