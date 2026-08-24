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

The frontend runs on `http://127.0.0.1:5173` and proxies API/health requests to the backend on port `4000`.

## Production build and start

```bash
npm ci
npm run build
npm start
```

`npm run build` must retain both the compiled backend (`dist/backend/server.js`) and the Vite frontend (`dist/index.html`). `npm start` launches the compiled backend and the production frontend preview together. Application data is stored in `data/aegis.db` relative to the working directory.

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

The release-validation workflow requires a locked dependency install, TypeScript/Vite production build, coexistence of frontend and backend artifacts, production startup, direct backend health, proxied frontend API health, frontend serving, and creation of the persistent SQLite database.
