import { useEffect, useState } from 'react';

interface Investigation {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  evidenceIds: string[];
  notes?: string;
  archived?: number;
}

interface EvidenceDocument {
  id: string;
  title: string;
  sourceName: string;
  documentType: string;
  retrievedDate: string;
  url: string;
}

export default function Investigations() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([]);
  const [attachedEvidence, setAttachedEvidence] = useState<EvidenceDocument[]>([]);

  useEffect(() => {
    loadInvestigations();
    fetchEvidence();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAttachedEvidence(selectedId);
    }
  }, [selectedId]);

  async function loadInvestigations() {
    const investigations = await fetch('/api/investigations').then((res) => res.json());
    setInvestigations(investigations);
  }

  async function fetchEvidence() {
    const url = search ? `/api/evidence?q=${encodeURIComponent(search)}` : '/api/evidence';
    const results = await fetch(url).then((res) => res.json());
    setEvidence(results);
  }

  async function loadAttachedEvidence(investigationId: string) {
    const response = await fetch(`/api/investigations/${investigationId}/evidence`);
    const data = await response.json();
    setAttachedEvidence(data);
  }

  async function createInvestigation() {
    if (!title.trim()) return;
    const response = await fetch('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    const investigation = await response.json();
    setInvestigations((prev) => [investigation, ...prev]);
    setTitle('');
    setDescription('');
  }

  async function attachEvidence(evidenceId: string) {
    if (!selectedId) return;
    await fetch(`/api/investigations/${selectedId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceId })
    });
    await loadAttachedEvidence(selectedId);
    loadInvestigations();
  }

  async function renameInvestigation(newTitle: string) {
    if (!selectedId || !newTitle.trim()) return;
    await fetch(`/api/investigations/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    loadInvestigations();
  }

  async function archiveInvestigation() {
    if (!selectedId) return;
    await fetch(`/api/investigations/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: 1 })
    });
    loadInvestigations();
  }

  async function deleteInvestigation() {
    if (!selectedId) return;
    await fetch(`/api/investigations/${selectedId}`, {
      method: 'DELETE'
    });
    setSelectedId(null);
    loadInvestigations();
  }

  async function removeEvidence(evidenceId: string) {
    if (!selectedId) return;
    await fetch(`/api/investigations/${selectedId}/evidence/${evidenceId}`, {
      method: 'DELETE'
    });
    await loadAttachedEvidence(selectedId);
    loadInvestigations();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Investigations</h1>
          <p>Create a workspace and attach evidence from trusted government sources.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label htmlFor="investigation-title">Investigation title</label>
          <input
            id="investigation-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Housing crisis analysis"
          />
        </div>
        <div className="input-group" style={{ marginTop: 12 }}>
          <label htmlFor="investigation-description">Description</label>
          <textarea
            id="investigation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the claim or policy area."
            rows={4}
          />
        </div>
        <button className="button" style={{ marginTop: 16 }} onClick={createInvestigation}>Create investigation</button>
      </div>
      <div className="grid-2">
        <div className="panel" style={{ minHeight: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Investigations</div>
            <input
              style={{ width: 240, borderRadius: 12, padding: 10, border: '1px solid #27334f', background: '#090b14', color: '#e5e7eb' }}
              placeholder="Search investigations"
              value={investigationSearch}
              onChange={(e) => setInvestigationSearch(e.target.value)}
            />
          </div>
          {investigations
            .filter((investigation) => investigation.title.toLowerCase().includes(investigationSearch.toLowerCase()) || investigation.description.toLowerCase().includes(investigationSearch.toLowerCase()))
            .map((investigation) => (
            <div
              key={investigation.id}
              className="list-item"
              style={{ cursor: 'pointer', borderColor: selectedId === investigation.id ? '#8b5cf6' : undefined }}
              onClick={() => setSelectedId(investigation.id)}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{investigation.title}</div>
              <div>{investigation.description}</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(investigation.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Evidence linked: {investigation.evidenceIds.length} • {investigation.archived ? 'Archived' : 'Active'}
              </div>
            </div>
          ))}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {selectedId ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Investigation details</div>
                  <div style={{ color: '#94a3b8' }}>Select evidence below to attach to the current investigation.</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="input-group">
                  <label htmlFor="evidence-search">Search evidence</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      id="evidence-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter evidence by title, source, or text"
                    />
                    <button className="button" onClick={fetchEvidence}>Search evidence</button>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Attached evidence</div>
                {attachedEvidence.length === 0 ? (
                  <div>No evidence attached yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {attachedEvidence.map((doc) => (
                      <div key={doc.id} className="list-item">
                        <div style={{ fontWeight: 700 }}>{doc.title}</div>
                        <div>{doc.sourceName}</div>
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(doc.retrievedDate).toLocaleDateString()}</div>
                        <button className="button button-secondary" onClick={() => removeEvidence(doc.id)}>
                          Remove evidence
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Available evidence</div>
                {evidence.length === 0 ? (
                  <div>No evidence found.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {evidence.map((doc) => (
                      <div key={doc.id} className="list-item">
                        <div style={{ fontWeight: 700 }}>{doc.title}</div>
                        <div>{doc.sourceName}</div>
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(doc.retrievedDate).toLocaleDateString()}</div>
                        <button className="button button-secondary" onClick={() => attachEvidence(doc.id)}>
                          Add to investigation
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>Select an investigation to view or attach evidence.</div>
          )}
        </div>
      </div>
    </div>
  );
}
