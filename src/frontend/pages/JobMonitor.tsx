import { useEffect, useState } from 'react';

interface JobRecord {
  id: string;
  connectorId: string;
  url: string;
  query?: string;
  status: string;
  error?: string;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function JobMonitor() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      setJobs(data);
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel">
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Crawl jobs</div>
      {jobs.length === 0 ? (
        <div>No jobs yet. Start a crawl from Sources.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {jobs.map((job) => (
            <div key={job.id} className="list-item">
              <div style={{ fontWeight: 700 }}>{job.connectorId} {job.query ? `(${job.query})` : ''}</div>
              <div>Status: {job.status}</div>
              <div>Found: {job.resultCount}</div>
              <div>Updated: {new Date(job.updatedAt).toLocaleString()}</div>
              {job.error && <div style={{ color: '#f87171' }}>{job.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
