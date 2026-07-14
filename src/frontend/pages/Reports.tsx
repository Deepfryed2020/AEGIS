import { useEffect, useState } from 'react';

interface Investigation {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface EvidenceDocument {
  id: string;
  title: string;
  sourceName: string;
  url: string;
  summary?: string;
  retrievedDate: string;
}

export default function Reports() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDocument[]>([]);

  useEffect(() => {
    fetch('/api/investigations')
      .then((res) => res.json())
      .then(setInvestigations);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/investigations/${selectedId}/evidence`).then((res) => res.json()).then(setEvidence);
  }, [selectedId]);

  function buildReportContent(investigation: Investigation) {
    const header = `# ${investigation.title}\nGenerated: ${new Date().toISOString()}\n\n`;
    const summary = `## Executive Summary\n${investigation.description || 'No summary provided.'}\n\n`;
    const evidenceSummary = `## Evidence Summary\nDocuments attached: ${evidence.length}\n\n`;
    const evidenceList = evidence.map((doc, index) => `### ${index + 1}. ${doc.title}\nSource: ${doc.sourceName}\nRetrieved: ${new Date(doc.retrievedDate).toLocaleDateString()}\nURL: ${doc.url}\n${doc.summary ? `Summary: ${doc.summary}\n` : ''}`).join('\n');
    return `${header}${summary}${evidenceSummary}${evidenceList}`;
  }

  async function downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildPdfBuffer(text: string) {
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    const header = '%PDF-1.4\n';
    const body = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const pages = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const textObj = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
    const font = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
    const contentStream = `5 0 obj\n<< /Length ${encodedText.length + 79} >>\nstream\nBT /F1 24 Tf 72 720 Td (${text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET\nendstream\nendobj\n`;
    const xrefStart = header.length + body.length + pages.length + textObj.length + font.length + contentStream.length;
    const xref = `xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000200 00000 n \n0000000260 00000 n \n`; 
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    const pdf = header + body + pages + textObj + font + contentStream + xref + trailer;
    return new Uint8Array(Array.from(pdf, (c) => c.charCodeAt(0)));
  }

  async function exportMarkdown(investigation: Investigation) {
    const content = buildReportContent(investigation);
    await downloadFile(`${investigation.title.replace(/\s+/g, '_')}.md`, content, 'text/markdown;charset=utf-8');
  }

  async function exportJson(investigation: Investigation) {
    const report = {
      investigation,
      evidence,
      generatedAt: new Date().toISOString(),
    };
    await downloadFile(`${investigation.title.replace(/\s+/g, '_')}.json`, JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
  }

  async function exportPdf(investigation: Investigation) {
    const content = buildReportContent(investigation);
    const data = buildPdfBuffer(content);
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${investigation.title.replace(/\s+/g, '_')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function selectInvestigation(id: string) {
    setSelectedId(id);
  }

  const selectedInvestigation = selectedId ? investigations.find((investigation) => investigation.id === selectedId) : undefined;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate export-ready investigation summaries and evidence reports.</p>
        </div>
      </div>
      <div className="grid-2">
        <div className="panel" style={{ minHeight: 520 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Investigations</div>
          {investigations.length === 0 ? (
            <div>No investigations found.</div>
          ) : (
            investigations.map((investigation) => (
              <div
                key={investigation.id}
                className="list-item"
                style={{ cursor: 'pointer', borderColor: selectedId === investigation.id ? '#8b5cf6' : undefined }}
                onClick={() => selectInvestigation(investigation.id)}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>{investigation.title}</div>
                <div>{investigation.description}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(investigation.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
        <div className="panel" style={{ minHeight: 520 }}>
          {selectedInvestigation ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Selected investigation</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedInvestigation.title}</div>
                <div>{selectedInvestigation.description}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(selectedInvestigation.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="button" onClick={() => exportMarkdown(selectedInvestigation)}>
                  Export Markdown
                </button>
                <button className="button" onClick={() => exportJson(selectedInvestigation)}>
                  Export JSON
                </button>
                <button className="button" onClick={() => exportPdf(selectedInvestigation)}>
                  Export PDF
                </button>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Evidence preview</div>
                {evidence.length === 0 ? (
                  <div>No evidence loaded for this investigation yet.</div>
                ) : (
                  evidence.map((doc) => (
                    <div key={doc.id} className="list-item" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{doc.title}</div>
                      <div>{doc.sourceName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>{new Date(doc.retrievedDate).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div>Select an investigation to generate a report.</div>
          )}
        </div>
      </div>
    </div>
  );
}
