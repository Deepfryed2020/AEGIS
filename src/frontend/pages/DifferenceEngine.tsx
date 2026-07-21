import { useEffect, useState } from 'react';

interface EvidenceDoc {
  id: string;
  title: string;
  url: string;
}

interface Version {
  id: string;
  evidenceId: string;
  versionedAt: string;
  contentHash: string;
  summary: string;
  changeType: string;
}

interface Diff {
  addedParagraphs: string[];
  removedParagraphs: string[];
  amendedParagraphs: Array<{ before: string; after: string; similarity: number }>;
  changedFigures: Array<{ before: string; after: string }>;
  newEntities: string[];
  removedEntities: string[];
  policyChanges: string[];
  summary: string;
}

export default function DifferenceEngine() {
  const [evidence, setEvidence] = useState<EvidenceDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [diff, setDiff] = useState<Diff | null>(null);

  useEffect(() => {
    fetch('/api/evidence').then((res) => res.json()).then(setEvidence);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/diff/${selectedId}/compare`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setVersions(data.versions || []);
          setDiff(data.latestDiff || null);
        }
      });
  }, [selectedId]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Difference Engine</h1>
          <p>Track document versions, detect amended wording, changed figures, and policy changes.</p>
        </div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="panel" style={{ minHeight: 520 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Evidence</div>
          {evidence.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No evidence.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {evidence.map((doc) => (
                <div
                  key={doc.id}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === doc.id ? '#22d3ee' : undefined, padding: 10 }}
                  onClick={() => setSelectedId(doc.id)}
                >
                  <div style={{ fontWeight: 600 }}>{doc.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {selectedId ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Version history</div>
              {versions.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No versions recorded yet. Versions are captured when documents change during re-crawls.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                    {versions.map((v) => (
                      <div key={v.id} className="list-item" style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{v.changeType}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(v.versionedAt).toLocaleString()}</div>
                        <div>{v.summary}</div>
                      </div>
                    ))}
                  </div>
                  {diff && (
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Latest diff</div>
                      <div style={{ marginBottom: 10 }}>{diff.summary}</div>
                      {diff.addedParagraphs.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <strong style={{ color: '#34d399' }}>Added ({diff.addedParagraphs.length})</strong>
                          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                            {diff.addedParagraphs.slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8, borderColor: '#34d399' }}>{p.slice(0, 200)}</div>)}
                          </div>
                        </div>
                      )}
                      {diff.removedParagraphs.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <strong style={{ color: '#f87171' }}>Removed ({diff.removedParagraphs.length})</strong>
                          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                            {diff.removedParagraphs.slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8, borderColor: '#f87171' }}>{p.slice(0, 200)}</div>)}
                          </div>
                        </div>
                      )}
                      {diff.changedFigures.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <strong style={{ color: '#fbbf24' }}>Changed figures ({diff.changedFigures.length})</strong>
                          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                            {diff.changedFigures.slice(0, 5).map((f, i) => (
                              <div key={i} className="list-item" style={{ padding: 8 }}>
                                <span style={{ color: '#f87171' }}>{f.before}</span> → <span style={{ color: '#34d399' }}>{f.after}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {diff.policyChanges.length > 0 && (
                        <div>
                          <strong style={{ color: '#22d3ee' }}>Policy changes ({diff.policyChanges.length})</strong>
                          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                            {diff.policyChanges.slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8 }}>{p}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>Select evidence to view version history and diffs.</div>
          )}
        </div>
      </div>
    </div>
  );
}
