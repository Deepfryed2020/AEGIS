import { useEffect, useState } from 'react';

interface EvidenceDocument {
  id: string;
  title: string;
  sourceName: string;
  documentType: string;
  retrievedDate: string;
  url: string;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/evidence')
      .then((res) => res.json())
      .then(setEvidence);
  }, []);

  async function search() {
    const url = query ? `/api/evidence?q=${encodeURIComponent(query)}` : '/api/evidence';
    const results = await fetch(url).then((res) => res.json());
    setEvidence(results);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evidence</h1>
          <p>Review collected documents and verify the source, type, and provenance.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label htmlFor="evidence-search">Search evidence</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              id="evidence-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, sources, entities"
            />
            <button className="button" onClick={search}>Search</button>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div style={{ display: 'grid', gap: 14 }}>
          {evidence.map((doc) => (
            <div key={doc.id} className="list-item" onClick={() => setSelected(doc.id)} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{doc.title}</div>
              <div>{doc.sourceName}</div>
              <div style={{ color: '#94a3b8' }}>{doc.documentType} • {new Date(doc.retrievedDate).toLocaleDateString()}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{doc.url}</div>
            </div>
          ))}
        </div>
        <div className="panel" style={{ minHeight: 320 }}>
          {selected ? (
            <EvidenceDetail id={selected} />
          ) : (
            <div>Select evidence to view details and provenance.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceDetail({ id }: { id: string }) {
  const [document, setDocument] = useState<EvidenceDocument | null>(null);

  useEffect(() => {
    fetch(`/api/evidence/${id}`)
      .then((res) => res.json())
      .then(setDocument);
  }, [id]);

  if (!document) return <div>Loading evidence...</div>;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{document.title}</div>
      <div style={{ color: '#94a3b8', marginBottom: 14 }}>{document.sourceName}</div>
      <div style={{ marginBottom: 10 }}><strong>Type:</strong> {document.documentType}</div>
      <div style={{ marginBottom: 10 }}><strong>Retrieved:</strong> {new Date(document.retrievedDate).toLocaleString()}</div>
      <div style={{ marginBottom: 10 }}><strong>URL:</strong> <a href={document.url} target="_blank" rel="noreferrer" style={{ color: '#8b9eff' }}>{document.url}</a></div>
      <div style={{ marginTop: 20, whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto', fontSize: 14, color: '#d1d5db' }}>
        {document.title}
      </div>
    </div>
  );
}
