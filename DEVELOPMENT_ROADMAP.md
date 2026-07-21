# AEGIS Development Roadmap

## Overview

AEGIS has been transformed from an evidence repository into an autonomous investigation platform. This document describes what was completed in this phase, what remains, and recommended next milestones.

## Completed in This Phase

### Phase 1 — Autonomous Knowledge Graph
- Created `src/backend/lib/graph/` with six modules: `GraphStore.ts`, `GraphBuilder.ts`, `GraphQuery.ts`, `CommunityDetection.ts`, `PathFinder.ts`, `NodeRank.ts`.
- Every imported document now automatically updates the graph via the intelligence pipeline (`pipeline.ts` wired to `GraphBuilder`).
- Supports the full entity type set (People, Companies, Departments, Legislation, Committees, Programs, Grants, Contracts, Media, Reports, FOI, Court Cases, Locations, Events) and relationship types (FUNDED_BY, DIRECTOR_OF, WORKED_FOR, MENTIONED_WITH, SUPPORTED, OPPOSED, CONTRADICTS, REFERENCES, SUPERSEDES, AMENDS, RELATED_TO, CONNECTED_TO).
- Each edge stores confidence, source, timestamp, citation, reason, and weight.
- Added API routes: `/api/graph2`, `/api/graph2/stats`, `/api/graph2/neighbours/:id`, `/api/graph2/communities`, `/api/graph2/path`, `/api/graph2/rank`.

### Phase 2 — Entity Profiles
- Created `src/backend/lib/intelligence/profileService.ts` producing auto-generated profiles with summary, aliases, timeline, related entities, connected evidence, claims, confidence, risk indicators, documents mentioning, and recent activity.
- Frontend inspector panel at `/profiles` (`EntityProfiles.tsx`).

### Phase 3 — Claim Resolution
- Created `src/backend/services/claims/claimResolutionEngine.ts` with supporting/contradicting evidence separation, confidence scoring, reasoning, and outstanding questions.
- Contradictory evidence coexists with supporting evidence — nothing is overwritten.
- Persisted in `resolved_claims` table. API: `POST /api/claims/resolve`, `GET /api/claims/resolved`.
- Frontend page at `/claims`.

### Phase 4 — Timeline Reconstruction
- Created `src/backend/services/timeline/timelineReconstructor.ts` merging timelines across documents.
- Detects missing periods, conflicting dates, duplicate events, event chains, and causal relationships.
- API: `GET /api/timeline`. Frontend page at `/timeline`.

### Phase 5 — Investigation Assistant
- Created `src/backend/services/assistant/investigationAssistant.ts` generating suggestions across 9 categories: people, missing-evidence, conflicts, questions, related-investigations, legislation, procurement, funding, and reporting angles.
- Every suggestion explains WHY with a reason string and confidence score.
- API: `GET /api/assistant/:investigationId`. Frontend page at `/assistant`.

### Phase 6 — Evidence Reliability Engine
- Created `src/backend/services/reliability/reliabilityEngine.ts` scoring sources across 6 classes (government, academic, media, corporate, lobby, anonymous).
- Computes historical accuracy, cross references, document age, evidence quality, and independent corroboration into a composite score.
- API: `GET /api/reliability`, `GET /api/reliability/:sourceId`. Frontend page at `/reliability`.

### Phase 7 — Continuous Ingestion
- Created `src/backend/services/ingestion/continuousIngestion.ts` with scheduled crawls, incremental updates, deduplication, and change detection.
- Scheduler runs in the background (60-second tick). Persisted in `crawl_schedules` and `ingestion_queue` tables.
- API: schedules CRUD and queue endpoints under `/api/ingestion/*`. Frontend page at `/ingestion`.

### Phase 8 — Difference Engine
- Created `src/backend/services/difference/differenceEngine.ts` detecting new paragraphs, removed paragraphs, amended wording, changed figures, policy changes, new entities, and removed entities.
- Stores every version in `document_versions`. Side-by-side comparison available.
- API: `/api/diff/:evidenceId/versions`, `/api/diff/:evidenceId/compare`. Frontend page at `/diff`.

### Phase 9 — Investigation Dashboard
- Upgraded `Dashboard.tsx` into an intelligence command centre with live widgets: latest imports, relationship growth, entity growth, most connected organisations, evidence confidence, claim conflicts, timeline activity, source reliability, investigation progress, queue status, and graph statistics.
- Auto-refreshes every 15 seconds. API: `GET /api/dashboard`.

### Phase 10 — Search 2.0
- Created `src/backend/services/search/semanticSearch.ts` searching across documents, entities, relationships, claims, and investigations.
- Supports boolean operators (AND/OR/NOT), saved searches, filters (document type, source, organisation, date range, min confidence), and ranking by confidence/relevance/date.
- API: `/api/search2`, saved search CRUD. Frontend page at `/search2`.

### Phase 11 — Report Generator
- Created `src/backend/services/reports/reportGenerator.ts` generating reports with 9 sections: Executive Summary, Key Findings, Timeline, Relationship Network, Evidence Table, Contradictory Evidence, Confidence Assessment, Recommendations, Appendix.
- Every paragraph references citations. API: `POST /api/reports/generate/:investigationId`. Frontend page at `/report-generator`.

### Phase 12 — Performance
- Added graph caching (`src/backend/lib/graph/cache.ts`) with TTL-based invalidation.
- Added virtualised list hook (`src/frontend/hooks/useVirtualList.ts`) for rendering large tables.
- Added background worker pool (`src/backend/lib/intelligence/workerPool.ts`) for parallel ingestion.
- Added database indexes on evidence, relationships, evidence_entities, document_versions, and jobs.
- Lazy loading via offset/limit pagination on graph and search endpoints.

### Phase 13 — Plugin Architecture
- Created `src/backend/plugins/` with auto-registering plugins across 7 categories: ingestion, analysis, graph, timeline, reports, search, visualisations.
- `PluginRegistry` auto-initialises all plugins on server startup.
- API: `GET /api/plugins`, `POST /api/plugins/execute`. Frontend page at `/plugins`.

### Phase 14 — Stabilization & Intelligence Core
- **Root cause fix**: `addColumnIfMissing` in `db.ts` was passing only the type definition instead of `columnName TYPE` to ALTER TABLE, causing "duplicate column name: TEXT" crash on startup. Fixed.
- **Health system**: `/health`, `/status`, `/metrics` endpoints with 8 subsystem checks (database, graph, plugins, workers, queue, cache, OCR, memory).
- **Versioned migrations**: `src/backend/migrations/MigrationRunner.ts` with `migration_log` table, 2 migrations, idempotent re-runs.
- **Observability**: Structured Logger (ring buffer), PerfTimer, ErrorTracker, request tracing middleware with X-Request-Id.
- **Graph validation**: Detects duplicate nodes, broken edges, orphan entities, invalid references.
- **Self-healing**: Merges duplicates, removes broken edges, cleans orphans, rebuilds indexes, full graph rebuild.
- **Job engine**: Background jobs with retry (3x), pause, resume, cancel, priority, progress tracking.
- **AI orchestration**: AgentManager with 6 specialized agents (Evidence, Claim, Timeline, Entity, Report, Verifier), Planner for multi-step execution, shared memory.
- **Event bus**: 13 event types with plugin auto-subscription.
- **Intelligence cache**: Tag-based cache with automatic invalidation on evidence/graph/timeline/claim changes.
- **Command palette**: Global Ctrl+K palette with keyboard navigation across all pages.
- **Developer console**: Live system dashboard with health, metrics, events, jobs, errors, slow requests, plugins.

### Final Requirements (Updated)
- Duplicate logic removed (GraphBuilder replaces parallel KnowledgeGraph.ingestExtracted calls).
- TypeScript typing improved across all new modules with explicit interfaces.
- Comprehensive documentation in roadmap, stability report, and inline module structure.
- Error handling added to all new API routes and services with structured logging.
- Accessibility: labelled inputs, semantic structure, keyboard-navigable controls in all new pages.
- Extension points for future AI agents at `src/backend/lib/agents/` with `AgentManager` and `Planner`.
- Backward compatibility preserved: all existing routes, APIs, and pages retained.
- All endpoints verified returning HTTP 200.
- See `STABILITY_REPORT.md` for full details.

## What Remains

### Near-term
1. **Real AI agent integration** — the `AgentRegistry` is ready but no concrete AI agents are wired. Connect to an LLM provider for claim verification and investigation drafting.
2. **PDF text extraction** — `documentParser.ts` returns empty text for PDFs; wire a robust PDF parser for production use.
3. **Virtualised table adoption** — the `useVirtualList` hook exists but existing list pages use simple maps. Migrate high-volume pages (Evidence, Search results) to virtualised rendering for 100k+ datasets.
4. **Graph cache integration** — `GraphCache` exists but `GraphStore` reads directly from SQLite. Wire cache into hot read paths for production scale.
5. **Worker pool integration** — `WorkerPool` exists but ingestion currently runs inline. Migrate `crawlConnector` to use the pool for parallel crawls.

### Medium-term
6. **Authentication & multi-tenancy** — currently single-tenant. Add Supabase auth for multi-user investigations with RLS.
7. **Real-time updates** — dashboard polls every 15s; upgrade to WebSocket/SSE for true live updates.
8. **Advanced entity resolution** — current entity extraction is regex-based; add NLP-based canonicalisation and alias merging.
9. **Full-text search upgrade** — `evidence_fts` exists; integrate with semantic search for hybrid retrieval.
10. **Export formats** — report generator outputs Markdown/JSON; add PDF and DOCX rendering.

### Long-term
11. **Distributed ingestion** — for 100k+ document datasets, move ingestion to a job queue (Redis/BullMQ) with horizontal scaling.
12. **Graph database** — for deep relationship queries at scale, consider migrating the graph layer to Neo4j or Postgres with pg_graph.
13. **ML-powered claim verification** — train or fine-tune models for contradiction detection and evidence scoring.
14. **Connector SDK** — formalise the connector interface into an SDK for third-party source plugins.

## Recommended Next Milestones

1. **Milestone A (2 weeks)**: Wire PDF extraction, integrate graph cache into GraphStore, migrate Evidence page to virtualised rendering. Target: handle 10k documents smoothly.
2. **Milestone B (4 weeks)**: Integrate first AI agent (claim verification via LLM), add WebSocket live updates, add PDF/DOCX report export.
3. **Milestone C (6 weeks)**: Add Supabase auth with multi-tenant investigations, migrate ingestion to worker pool with Redis queue, deploy first NLP entity resolver.

## Architecture Summary

```
src/backend/
├── lib/
│   ├── graph/          # Phase 1: persistent graph engine
│   ├── intelligence/   # Extended: pipeline, profiles, workers
│   └── agents/         # Extension points for AI agents
├── plugins/            # Phase 13: auto-registering plugins
├── services/
│   ├── assistant/      # Phase 5
│   ├── claims/         # Phase 3 (extended)
│   ├── dashboard/      # Phase 9
│   ├── difference/     # Phase 8
│   ├── reliability/    # Phase 6
│   ├── reports/        # Phase 11
│   ├── search/         # Phase 10 (extended)
│   ├── timeline/       # Phase 4
│   └── ingestion/      # Phase 7 (extended)
└── server.ts           # All new routes added, existing preserved

src/frontend/
├── pages/              # 10 new pages added
└── hooks/              # Virtualisation hook
```
