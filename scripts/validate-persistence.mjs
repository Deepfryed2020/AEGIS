import fs from 'node:fs/promises';

const mode = process.argv[2];
const stateFile = process.argv[3] || '/tmp/aegis-persistence-state.json';
const baseUrl = process.env.AEGIS_API_URL || 'http://127.0.0.1:4000/api';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${text}`);
  }
  return body;
}

if (mode === 'create') {
  const marker = `AEGIS persistence ${process.env.GITHUB_RUN_ID || Date.now()}`;
  const investigation = await request('/investigations', {
    method: 'POST',
    body: JSON.stringify({ title: marker, description: 'release persistence validation' }),
  });

  const updated = await request(`/investigations/${investigation.id}`, {
    method: 'PUT',
    body: JSON.stringify({ notes: 'survives-production-restart' }),
  });
  if (updated.notes !== 'survives-production-restart') {
    throw new Error('Investigation update was not returned by the API');
  }

  const report = await request(`/investigations/${investigation.id}/reports`, {
    method: 'POST',
    body: JSON.stringify({
      title: `${marker} report`,
      format: 'markdown',
      content: '# Persistence validation\nThis report must survive a full production-stack restart.',
    }),
  });

  await fs.writeFile(
    stateFile,
    JSON.stringify({ marker, investigationId: investigation.id, reportId: report.id }, null, 2),
  );
  console.log(`created investigation=${investigation.id} report=${report.id}`);
} else if (mode === 'verify') {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  const investigation = await request(`/investigations/${state.investigationId}`);
  if (investigation.title !== state.marker) throw new Error('Persisted investigation title mismatch');
  if (investigation.notes !== 'survives-production-restart') throw new Error('Persisted investigation notes missing');

  const reports = await request(`/investigations/${state.investigationId}/reports`);
  const report = reports.find((item) => item.id === state.reportId);
  if (!report) throw new Error('Persisted report missing after restart');
  if (!String(report.content).includes('must survive a full production-stack restart')) {
    throw new Error('Persisted report content mismatch');
  }

  const investigations = await request('/investigations');
  if (!investigations.some((item) => item.id === state.investigationId)) {
    throw new Error('Persisted investigation missing from list after restart');
  }
  console.log(`verified investigation=${state.investigationId} report=${state.reportId}`);
} else {
  throw new Error('Usage: node scripts/validate-persistence.mjs <create|verify> [state-file]');
}
