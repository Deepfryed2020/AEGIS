# AEGIS Evidence Intelligence Platform

AEGIS is a local-first evidence investigation web application with a React frontend, Express/TypeScript backend, and SQLite persistence.

## Current release boundary

Version **0.1.0** is a local single-user application. The bounded golden path is:

**start AEGIS → create/open an investigation → ingest or inspect evidence → link evidence → search/analyse → generate a report → close/restart → confirm SQLite-backed state remains available.**

The repository includes broader graph, agent, observability, migration, job, cache, timeline and reliability systems, but this release does **not** claim multi-user authentication, a production LLM backend, cloud deployment, or a native desktop installer.

## Development

```bash
npm ci
npm run dev
```

Development uses the Express API on `http://127.0.0.1:4000` and Vite on `http://127.0.0.1:5173`.

## Production build and start

```bash
npm ci
npm run build
npm start
```

`npm run build` retains both the compiled backend (`dist/backend/server.js`) and Vite frontend (`dist/index.html`). Production is intentionally different from development: `npm start` launches **one Node/Express process on port 4000**. The production bootstrap mounts the built frontend onto the existing Express application before the API begins listening, so Vite is not required at runtime.

Open `http://127.0.0.1:4000/`. API, health and frontend requests are served by the same local process. Application data is stored in `data/aegis.db` relative to the working directory.

## Implemented core capabilities

- Evidence ingestion from supported URLs/documents and connector sources
- SQLite-backed sources, evidence, investigations, reports, jobs and graph state
- Investigation workspace with evidence linking
- Search, claim analysis, timeline, reliability and report services
- Health, status, metrics and observability endpoints
- Database migrations and recovery-oriented graph validation tools

## Known limitations

- PDF extraction is not yet release-grade for every PDF type.
- AI agents currently rely on existing deterministic/heuristic services; a real local/remote LLM backend is not part of the 0.1.0 acceptance boundary.
- Authentication and multi-user tenancy are not implemented.
- Native desktop packaging is not yet implemented.
- Large-dataset worker/cache/virtualisation paths remain incomplete.

## Validation

The release-validation workflow requires a locked dependency install, TypeScript/Vite production build, a single-process production start, frontend/API/health serving on port 4000, persisted investigation/report state across a full restart, and a non-empty SQLite database.

On a successful release-gate run it also creates `AEGIS-0.1.0-linux-x64.tgz`, records its SHA-256 checksum, extracts it into a clean directory, installs only production dependencies, starts the extracted bundle, and verifies that the frontend, health endpoint, and new SQLite database work from the packaged layout.

This tarball is a **local Linux x64 release bundle**, not a native installer. It still requires a compatible Node.js 20 runtime on the target machine.
