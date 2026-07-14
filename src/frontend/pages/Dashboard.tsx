import { useEffect, useState } from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  detail: string;
}

function SummaryCard({ title, value, detail }: SummaryCardProps) {
  return (
    <div className="card">
      <div style={{ fontSize: '14px', color: '#94a3b8' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#cbd5e1' }}>{detail}</div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState({ investigations: 0, evidence: 0, sources: 0 });

  useEffect(() => {
    async function load() {
      const [investigations, evidence, sources] = await Promise.all([
        fetch('/api/investigations').then((res) => res.json()),
        fetch('/api/evidence').then((res) => res.json()),
        fetch('/api/sources').then((res) => res.json())
      ]);
      setSummary({ investigations: investigations.length, evidence: evidence.length, sources: sources.length });
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Trusted government evidence for Australian investigations.</p>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <SummaryCard title="Investigations" value={String(summary.investigations)} detail="Active investigation workspaces." />
        <SummaryCard title="Evidence" value={String(summary.evidence)} detail="Documents collected from trusted sources." />
        <SummaryCard title="Sources" value={String(summary.sources)} detail="Government sources indexed." />
        <SummaryCard title="Status" value="Ready" detail="Crawler pipeline initialized." />
      </div>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 650 }}>Recent activity</div>
        </div>
        <div className="list-item">
          <div style={{ fontWeight: 700 }}>AEGIS MVP initialized</div>
          <div>Core pipeline, evidence store, and investigation workspace are available.</div>
        </div>
      </div>
    </div>
  );
}
