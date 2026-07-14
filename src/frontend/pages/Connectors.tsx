import { useEffect, useState } from 'react';

interface ConnectorSummary {
  id: string;
  name: string;
  source: { name: string; url: string; level: string };
  capabilities: string[];
  status: string;
  health: string;
  lastCrawl?: string;
  documentsIndexed: number;
  averageCrawlTimeMs?: number;
}

export default function Connectors() {
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);

  useEffect(() => {
    fetch('/api/connectors')
      .then((res) => res.json())
      .then(setConnectors);
  }, []);

  async function crawl(connectorId: string) {
    setStatus(`Starting crawl for ${connectorId}...`);
    const response = await fetch(`/api/connectors/${connectorId}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() || undefined, maxDepth }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(`Crawl failed: ${result.error || 'unknown error'}`);
      return;
    }
    setStatus(`Ingested ${result.ingested} documents from ${connectorId}${query ? ` for '${query}'` : ''}`);
    setConnectors((prev) => prev.map((connector) => connector.id === connectorId ? { ...connector, status: 'Idle' } : connector));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Sources</h1>
          <p>Run connectors to crawl government websites and ingest evidence.</p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="input-group">
          <label htmlFor="crawl-query">Crawl filter</label>
          <input
            id="crawl-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Optional filter term for crawled content"
          />
        </div>
        <div className="input-group" style={{ marginTop: 12 }}>
          <label htmlFor="crawl-depth">Max crawl depth</label>
          <input
            id="crawl-depth"
            type="number"
            min={1}
            max={4}
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
          />
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>{status}</div>
      <div className="grid-2">
        {connectors.map((connector) => (
          <div key={connector.id} className="list-item">
            <div style={{ fontSize: 18, fontWeight: 700 }}>{connector.name}</div>
            <div>{connector.source.url}</div>
            <div style={{ color: '#94a3b8' }}>Level: {connector.source.level}</div>
            <div>Documents indexed: {connector.documentsIndexed}</div>
            <div>Status: {connector.status}</div>
            <div>Health: {connector.health}</div>
            <div>Last crawl: {connector.lastCrawl ? new Date(connector.lastCrawl).toLocaleString() : 'Never'}</div>
            <div>Capabilities: {connector.capabilities.join(', ')}</div>
            {connector.averageCrawlTimeMs && (
              <div>Average crawl time: {(connector.averageCrawlTimeMs / 1000).toFixed(1)}s</div>
            )}
            <button className="button" style={{ marginTop: 12 }} onClick={() => crawl(connector.id)}>
              Crawl source
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
