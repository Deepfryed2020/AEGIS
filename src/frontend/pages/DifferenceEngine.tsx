import { useCallback, useEffect, useState } from 'react';
import type { EvidenceDocument, DocumentVersion, DocumentDifference } from '../../shared/types';
import { safeFetch, ensureArray, ensureString } from '../lib/safeFetch';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

export default function DifferenceEngine() {
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [diff, setDiff] = useState<DocumentDifference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState('');

  const loadEvidence = useCallback(async () => {
    const result = await safeFetch<EvidenceDocument[]>('/api/evidence');
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setEvidence(ensureArray<EvidenceDocument>(result.data));
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const loadDiff = useCallback(async (id: string) => {
    setSelectedId(id);
    setDiffLoading(true);
    setDiffError('');
    const result = await safeFetch<{ versions: DocumentVersion[]; latestDiff: DocumentDifference | null }>(`/api/diff/${id}/compare`);
    setDiffLoading(false);
    if (result.error) {
      setDiffError(result.error);
    } else if (result.data) {
      setVersions(ensureArray<DocumentVersion>(result.data.versions));
      setDiff(result.data.latestDiff || null);
    }
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header"><div><h1>Difference Engine</h1><p>Loading…</p></div></div>
        <LoadingState message="Loading evidence…" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={loadEvidence} />;

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
          {ensureArray(evidence).length === 0 ? (
            <EmptyState message="No evidence." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ensureArray<EvidenceDocument>(evidence).map((doc) => (
                <div
                  key={ensureString(doc.id)}
                  className="list-item"
                  style={{ cursor: 'pointer', borderColor: selectedId === doc.id ? '#22d3ee' : undefined, padding: 10 }}
                  onClick={() => loadDiff(ensureString(doc.id))}
                >
                  <div style={{ fontWeight: 600 }}>{ensureString(doc.title)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {selectedId ? (
            diffLoading ? (
              <LoadingState message="Comparing versions…" />
            ) : diffError ? (
              <ErrorState message={diffError} onRetry={() => loadDiff(selectedId)} />
            ) : (
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Version history</div>
                {ensureArray(versions).length === 0 ? (
                  <EmptyState message="No versions recorded yet. Versions are captured when documents change during re-crawls." />
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                      {ensureArray<DocumentVersion>(versions).map((v) => (
                        <div key={ensureString(v.id)} className="list-item" style={{ padding: 10 }}>
                          <div style={{ fontWeight: 600 }}>{ensureString(v.changeType)}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>{v.versionedAt ? new Date(ensureString(v.versionedAt)).toLocaleString() : 'Unknown'}</div>
                          <div>{ensureString(v.summary)}</div>
                        </div>
                      ))}
                    </div>
                    {diff && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Latest diff</div>
                        <div style={{ marginBottom: 10 }}>{ensureString(diff.summary)}</div>
                        {ensureArray(diff.addedParagraphs).length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <strong style={{ color: '#34d399' }}>Added ({ensureArray(diff.addedParagraphs).length})</strong>
                            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                              {ensureArray<string>(diff.addedParagraphs).slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8, borderColor: '#34d399' }}>{ensureString(p).slice(0, 200)}</div>)}
                            </div>
                          </div>
                        )}
                        {ensureArray(diff.removedParagraphs).length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <strong style={{ color: '#f87171' }}>Removed ({ensureArray(diff.removedParagraphs).length})</strong>
                            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                              {ensureArray<string>(diff.removedParagraphs).slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8, borderColor: '#f87171' }}>{ensureString(p).slice(0, 200)}</div>)}
                            </div>
                          </div>
                        )}
                        {ensureArray(diff.changedFigures).length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <strong style={{ color: '#fbbf24' }}>Changed figures ({ensureArray(diff.changedFigures).length})</strong>
                            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                              {ensureArray<{ before: string; after: string }>(diff.changedFigures).slice(0, 5).map((f, i) => (
                                <div key={i} className="list-item" style={{ padding: 8 }}>
                                  <span style={{ color: '#f87171' }}>{ensureString(f?.before)}</span> → <span style={{ color: '#34d399' }}>{ensureString(f?.after)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {ensureArray(diff.policyChanges).length > 0 && (
                          <div>
                            <strong style={{ color: '#22d3ee' }}>Policy changes ({ensureArray(diff.policyChanges).length})</strong>
                            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                              {ensureArray<string>(diff.policyChanges).slice(0, 5).map((p, i) => <div key={i} className="list-item" style={{ padding: 8 }}>{ensureString(p)}</div>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          ) : (
            <EmptyState message="Select evidence to view version history and diffs." />
          )}
        </div>
      </div>
    </div>
  );
}
