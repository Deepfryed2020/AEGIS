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
- Native desktop packaging is not implemented; current release artifacts are portable Node.js bundles.
- Large-dataset worker/cache/virtualisation paths remain incomplete.

## Validated 0.1.0 release-candidate artifacts

### Linux x64

The Linux release gate has validated a versioned `AEGIS-0.1.0-linux-x64.tgz` bundle through production build/start, frontend/API/health smoke, restart persistence, SQLite creation, clean extraction, production-only dependency installation, and clean bundled-app startup.

Validated bundle SHA-256:

```text
4289c6459b70b1aedd4f165a13af66b4bbad63ae22751572e45bcc1aeaac49d3
```

### Windows x64

The Windows release gate has validated `AEGIS-0.1.0-windows-x64.zip` on a GitHub-hosted Windows Server 2025 x64 runner. The gate covers production build/start, frontend/API/health smoke, persisted investigation/report state across a full restart, non-empty SQLite state, clean bundle extraction, production-only dependency installation, and clean bundled-app startup.

Validated bundle SHA-256:

```text
3412684f7c03996b35ccb4350b16385d17a3214f4471fba68ad5232ffe9d403f
```

The Windows Actions artifact digest for the portable bundle container is:

```text
sha256:4b35204cc0d7680d21a0a30236bad1bb239b6b9b9a7d6b5ce08874c06c5db9f1
```

These are **portable release-candidate bundles**, not native installers. They require a compatible Node.js 20 runtime on the target machine. GitHub-hosted Windows validation is automated package/runtime evidence; it does not constitute physical-user Windows acceptance.

## Validation

The general release-validation workflow requires a locked dependency install, TypeScript/Vite production build, a single-process production start, frontend/API/health serving on port 4000, persisted investigation/report state across a full restart, and a non-empty SQLite database.

Platform release gates additionally create the versioned portable artifact, record its SHA-256 checksum, extract it into a clean directory, install only production dependencies, start the extracted bundle, and verify that the frontend, health endpoint, and new SQLite database work from the packaged layout.
