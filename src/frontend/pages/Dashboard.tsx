import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats, ConnectedOrg, LatestImport, ClaimConflict, SourceReliabilitySummary, InvestigationProgress } from '../../shared/types';
import { safeFetch, ensureArray, ensureNumber, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, SkeletonCard, EmptyState } from '../components/States';
import { useToast } from '../components/Toast';

const EMPTY_STATS: DashboardStats = {
  investigations: 0,
  evidence: 0,
  sources: 0,
  relationships: 0,
  entities: 0,
  claims: 0,
  jobs: 0,
  queuePending: 0,
  latestImports: [],
  relationshipGrowth: [],
  entityGrowth: [],
  mostConnectedOrganisations: [],
  evidenceConfidence: { average: 0, high: 0, medium: 0, low: 0 },
  claimConflicts: [],
  timelineActivity: [],
  sourceReliability: [],
  investigationProgress: [],
  graphStats: { nodeCount: 0, edgeCount: 0, typeDistribution: {} },
};

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
  const safeData = ensureArray<{ date: string; count: number }>(data);
  const max = Math.max(1, ...safeData.map((d) => ensureNumber(d.count)));
  return (
    <div className="card">
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
      {safeData.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: 12 }}>No data yet</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
          {safeData.slice(-20).map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${d.count}`}
              style={{
                width: 10,
                height: `${(ensureNumber(d.count) / max) * 100}%`,
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
  const safeAvg = ensureNumber(average);
  const pct = Math.round(safeAvg * 100);
  const color = safeAvg >= 0.75 ? '#34d399' : safeAvg >= 0.5 ? '#fbbf24' : '#f87171';
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
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const load = useCallback(async () => {
    const result = await safeFetch<DashboardStats>('/api/dashboard');
    if (result.error) {
      setError(result.error);
      setLoading(false);
      if (result.status >= 500) notify('Dashboard service unavailable', 'error');
    } else if (result.data) {
      setStats(result.data);
      setError('');
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !stats) {
    return (
      <div>
        <div className="page-header"><div><h1>Intelligence Command Centre</h1><p>Loading live overview…</p></div></div>
        <div className="grid-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (error && !stats) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const safeStats = stats || EMPTY_STATS;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Intelligence Command Centre</h1>
          <p>Live overview of investigations, evidence, graph growth, and source reliability.</p>
        </div>
      </div>
      {error && <div style={{ color: '#fbbf24', marginBottom: 12, fontSize: 13 }}>Warning: {error} — showing last known data</div>}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <MetricCard label="Investigations" value={ensureNumber(safeStats.investigations)} hint="Active workspaces" />
        <MetricCard label="Evidence" value={ensureNumber(safeStats.evidence)} hint="Indexed documents" />
        <MetricCard label="Graph entities" value={ensureNumber(safeStats.graphStats?.nodeCount)} hint={`${ensureNumber(safeStats.graphStats?.edgeCount)} relationships`} />
        <MetricCard label="Claims resolved" value={ensureNumber(safeStats.claims)} hint={`${ensureArray(safeStats.claimConflicts).length} conflicts`} />
        <MetricCard label="Sources" value={ensureNumber(safeStats.sources)} hint="Government & media" />
        <MetricCard label="Queue pending" value={ensureNumber(safeStats.queuePending)} hint="Ingestion queue" />
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <Sparkline data={safeStats.relationshipGrowth} label="Relationship growth (last 30 days)" />
        <Sparkline data={safeStats.entityGrowth} label="Entity growth (last 30 days)" />
        <Sparkline data={safeStats.timelineActivity} label="Timeline activity" />
        <ConfidenceBar average={safeStats.evidenceConfidence?.average} />
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Most connected organisations</div>
          {ensureArray(safeStats.mostConnectedOrganisations).length === 0 ? (
            <EmptyState message="No organisations yet." />
          ) : (
            ensureArray<ConnectedOrg>(safeStats.mostConnectedOrganisations).map((org) => (
              <div key={ensureString(org.name)} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(org.name)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureNumber(org.degree)} connections • {ensureNumber(org.mentionCount)} mentions</div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Latest imports</div>
          {ensureArray(safeStats.latestImports).length === 0 ? (
            <EmptyState message="No imports yet." />
          ) : (
            ensureArray<LatestImport>(safeStats.latestImports).map((doc) => (
              <div key={ensureString(doc.id)} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(doc.title)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(doc.sourceName)} • {ensureString(doc.documentType)} • {ensureString(doc.retrievedDate)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Claim conflicts</div>
          {ensureArray(safeStats.claimConflicts).length === 0 ? (
            <EmptyState message="No conflicting claims detected." />
          ) : (
            ensureArray<ClaimConflict>(safeStats.claimConflicts).map((c, i) => (
              <div key={i} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(c.claim).slice(0, 100)}</div>
                <div style={{ color: '#f87171', fontSize: 12 }}>{ensureNumber(c.contradicting)} contradicting • {ensureNumber(c.supporting)} supporting</div>
              </div>
            ))
          )}
        </div>
        <div className="panel">
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Source reliability</div>
          {ensureArray(safeStats.sourceReliability).length === 0 ? (
            <EmptyState message="No sources scored yet." />
          ) : (
            ensureArray<SourceReliabilitySummary>(safeStats.sourceReliability).map((s) => (
              <div key={ensureString(s.sourceId)} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(s.sourceName)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureString(s.sourceClass)} • score {ensureNumber(s.compositeScore).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Investigation progress</div>
        {ensureArray<InvestigationProgress>(safeStats.investigationProgress).length === 0 ? (
          <EmptyState message="No investigations yet." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {ensureArray<InvestigationProgress>(safeStats.investigationProgress).map((inv) => (
              <div key={ensureString(inv.id)} className="list-item" style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{ensureString(inv.title)}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{ensureNumber(inv.evidenceCount)} evidence • {inv.archived ? 'Archived' : 'Active'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
