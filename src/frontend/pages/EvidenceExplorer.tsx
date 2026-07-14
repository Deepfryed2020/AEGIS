import { useEffect, useState } from 'react';

interface EvidenceDocument {
  id: string;
  title: string;
  sourceName: string;
  documentType: string;
  retrievedDate: string;
  publicationDate?: string;
  summary?: string;
  organisation?: string;
  confidence?: number;
  url: string;
  content?: string;
}

interface InvestigationSummary {
  id: string;
  title: string;
}

export default function EvidenceExplorer() {
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<EvidenceDocument | null>(null);
  const [query, setQuery] = useState('');
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [attachTarget, setAttachTarget] = useState<string>('');
  const [attachStatus, setAttachStatus] = useState('');

  useEffect(() => {
    fetchEvidence();
    fetchInvestigations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/evidence/${selectedId}`)
      .then((res) => res.json())
      .then(setSelectedDoc);
  }, [selectedId]);

  async function fetchInvestigations() {
    const investigations = await fetch('/api/investigations').then((res) => res.json());
    setInvestigations(investigations);
    if (investigations.length > 0 && !attachTarget) {
      setAttachTarget(investigations[0].id);
    }
  }

  async function fetchEvidence() {
    const url = query ? `/api/evidence?q=${encodeURIComponent(query)}` : '/api/evidence';
    const results = await fetch(url).then((res) => res.json());
    setEvidence(results);
  }

  async function attachEvidenceToInvestigation(evidenceId: string) {
    if (!attachTarget) {
      setAttachStatus('Create an investigation first to attach evidence.');
      return;
    }
    setAttachStatus('Attaching evidence...');
    const response = await fetch(`/api/investigations/${attachTarget}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceId }),
    });
    if (response.ok) {
      setAttachStatus('Evidence attached successfully.');
    } else {
      const body = await response.json();
      setAttachStatus(body.error || 'Failed to attach evidence.');
    }
  }

  return (
    <div className="grid-2" style={{ gap: 18 }}>
      <div>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h1>Evidence Explorer</h1>
            <p>Browse indexed documents and inspect extracted metadata.</p>
          </div>
        </div>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="input-group">
            <label htmlFor="evidence-query">Keyword search</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                id="evidence-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search evidence"
              />
              <button className="button" onClick={fetchEvidence}>Search</button>
              <select value={attachTarget} onChange={(e) => setAttachTarget(e.target.value)} style={{ minWidth: 240 }}>
                <option value="">Select investigation to attach evidence</option>
                {investigations.map((investigation) => (
                  <option key={investigation.id} value={investigation.id}>{investigation.title}</option>
                ))}
              </select>
            </div>
            {attachStatus && <div style={{ marginTop: 10, color: '#94a3b8' }}>{attachStatus}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {evidence.map((doc) => (
            <div key={doc.id} className="list-item" style={{ cursor: 'pointer' }}>
              <div onClick={() => setSelectedId(doc.id)}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{doc.title}</div>
                <div>{doc.organisation || doc.sourceName}</div>
                <div style={{ color: '#94a3b8' }}>{doc.documentType} • {doc.publicationDate ? new Date(doc.publicationDate).toLocaleDateString() : new Date(doc.retrievedDate).toLocaleDateString()}</div>
                <div>{doc.summary}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{doc.url}</div>
              </div>
              <button className="button button-secondary" onClick={() => attachEvidenceToInvestigation(doc.id)} style={{ marginTop: 10 }}>
                Attach to investigation
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel" style={{ minHeight: 560 }}>
        {selectedDoc ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{selectedDoc.title}</div>
            <div style={{ color: '#94a3b8', marginBottom: 10 }}>{selectedDoc.sourceName}</div>
            <div style={{ marginBottom: 10 }}><strong>Organisation:</strong> {selectedDoc.organisation || 'N/A'}</div>
            <div style={{ marginBottom: 10 }}><strong>Type:</strong> {selectedDoc.documentType}</div>
            <div style={{ marginBottom: 10 }}><strong>Publication date:</strong> {selectedDoc.publicationDate || 'Unknown'}</div>
            <div style={{ marginBottom: 10 }}><strong>Confidence:</strong> {(selectedDoc.confidence ?? 0).toFixed(2)}</div>
            <div style={{ marginBottom: 10 }}><strong>Source URL:</strong> <a href={selectedDoc.url} target="_blank" rel="noreferrer" style={{ color: '#8b9eff' }}>{selectedDoc.url}</a></div>
            <div style={{ marginTop: 16 }}><strong>Summary</strong></div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedDoc.summary}</div>
            <div style={{ marginTop: 16 }}><strong>Full text</strong></div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 260, overflow: 'auto', marginTop: 8 }}>{selectedDoc.content}</div>
          </div>
        ) : (
          <div>Select a document to view full extracted evidence.</div>
        )}
      </div>
    </div>
  );
}
