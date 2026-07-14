export default function Settings() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure source trust and platform preferences.</p>
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Platform status</div>
        <div>Core evidence pipeline is ready for source ingestion.</div>
        <div style={{ marginTop: 16, color: '#94a3b8' }}>Future settings will include trust profiling, crawler scheduling, and source approval workflows.</div>
      </div>
    </div>
  );
}
