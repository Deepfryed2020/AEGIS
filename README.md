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
- Native desktop packaging is not implemented; current release artifacts are portable bundles.
- Large-dataset worker/cache/virtualisation paths remain incomplete.
- The current locked production dependency tree reports **6 npm audit findings (4 moderate, 2 high)** during Windows packaging. They did not prevent the validated local golden path, but dependency remediation remains a release-hardening blocker before calling 0.1.0 production-ready.

## Validated 0.1.0 release-candidate artifacts

### Linux x64

The Linux release gate has validated a versioned `AEGIS-0.1.0-linux-x64.tgz` bundle through production build/start, frontend/API/health smoke, restart persistence, SQLite creation, clean extraction, production-only dependency installation, and clean bundled-app startup.

Validated bundle SHA-256:

```text
4289c6459b70b1aedd4f165a13af66b4bbad63ae22751572e45bcc1aeaac49d3
```

### Windows x64 — self-contained

The Windows self-contained release gate has validated `AEGIS-0.1.0-windows-x64-self-contained.zip` on a GitHub-hosted Windows Server 2025 x64 runner. The bundle includes the validated Node.js 20 x64 runtime, production dependencies, `START-AEGIS.cmd`, `RUN-AEGIS-CONSOLE.cmd`, and `START-HERE.txt`.

The clean extracted package was validated **without system Node.js or npm**. The gate verified frontend/API/health serving, SQLite creation, investigation/report creation, full process shutdown, restart, and persisted-state reload using only the bundled runtime.

Validated bundle size:

```text
58,139,781 bytes
```

Validated bundle SHA-256:

```text
58a1bdd9746b271a980cde159b81d1f816f33588d973b072ee5783ba3c24d3f1
```

The GitHub Actions artifact-container digest is:

```text
sha256:619d55b437e8d5ad6bc0586ac2e3bb66c6d4aea26c4d55fe52b02141dc1a889a
```

The corresponding validation-evidence artifact digest is:

```text
sha256:4793aee5078fda2ff927301de07e399c78d2b9ee12053bb4e8227c8fd8b64f9c
```

A preceding Windows portable bundle that requires target-machine Node.js remains historical validation evidence; the self-contained bundle is the preferred ordinary-user Windows release candidate.

These are **portable release-candidate bundles**, not native installers. GitHub-hosted Windows validation is automated package/runtime evidence; it does not constitute physical-user Windows acceptance.

## Validation

The general release-validation workflow requires a locked dependency install, TypeScript/Vite production build, a single-process production start, frontend/API/health serving on port 4000, persisted investigation/report state across a full restart, and a non-empty SQLite database.

Platform release gates additionally create the versioned portable artifact, record its SHA-256 checksum, extract it into a clean directory, and start the extracted bundle. The self-contained Windows gate additionally requires the extracted package to work using only its bundled `node.exe` and packaged production dependencies.
