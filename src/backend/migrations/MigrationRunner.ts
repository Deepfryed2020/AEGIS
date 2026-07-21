import { Sql } from '../db.js';
import { Logger } from '../lib/observability/Logger.js';

export interface Migration {
  version: string;
  description: string;
  up: string[];
}

export const migrations: Migration[] = [
  {
    version: '001',
    description: 'Core AEGIS tables (evidence, sources, entities, relationships, investigations, jobs, reports, document_versions, evidence_entities)',
    up: [
      `CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        level TEXT,
        authorityScore REAL DEFAULT 0.8,
        trustScore REAL DEFAULT 0.85,
        officialStatus TEXT,
        lastCrawled TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        sourceId TEXT,
        sourceName TEXT,
        documentType TEXT,
        retrievedDate TEXT NOT NULL,
        contentHash TEXT,
        confidence REAL DEFAULT 0.5,
        publisher TEXT,
        organisation TEXT,
        keywords TEXT,
        entities TEXT,
        summary TEXT,
        FOREIGN KEY (sourceId) REFERENCES sources(id)
      )`,
      `CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        canonical TEXT,
        mentionCount INTEGER DEFAULT 1,
        createdAt TEXT,
        updatedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        sourceId TEXT NOT NULL,
        targetId TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL DEFAULT 1,
        confidence REAL DEFAULT 0.5,
        source TEXT,
        timestamp TEXT,
        citation TEXT,
        reason TEXT,
        evidenceId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (sourceId) REFERENCES entities(id),
        FOREIGN KEY (targetId) REFERENCES entities(id)
      )`,
      `CREATE TABLE IF NOT EXISTS evidence_entities (
        evidenceId TEXT NOT NULL,
        entityId TEXT NOT NULL,
        mentionCount INTEGER DEFAULT 1,
        PRIMARY KEY (evidenceId, entityId),
        FOREIGN KEY (evidenceId) REFERENCES evidence(id),
        FOREIGN KEY (entityId) REFERENCES entities(id)
      )`,
      `CREATE TABLE IF NOT EXISTS investigations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        evidenceIds TEXT,
        notes TEXT,
        archived INTEGER DEFAULT 0,
        archivedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS investigation_evidence (
        investigationId TEXT NOT NULL,
        evidenceId TEXT NOT NULL,
        PRIMARY KEY (investigationId, evidenceId),
        FOREIGN KEY (investigationId) REFERENCES investigations(id),
        FOREIGN KEY (evidenceId) REFERENCES evidence(id)
      )`,
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT,
        result TEXT,
        error TEXT,
        progress REAL DEFAULT 0,
        priority INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        startedAt TEXT,
        finishedAt TEXT,
        investigationId TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        investigationId TEXT NOT NULL,
        title TEXT NOT NULL,
        format TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (investigationId) REFERENCES investigations(id)
      )`,
      `CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        evidenceId TEXT NOT NULL,
        versionedAt TEXT NOT NULL,
        contentHash TEXT,
        summary TEXT,
        changeType TEXT,
        pageCount INTEGER,
        FOREIGN KEY (evidenceId) REFERENCES evidence(id)
      )`,
      `CREATE TABLE IF NOT EXISTS evidence_fts (
        evidenceId TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        sourceName TEXT
      )`,
    ],
  },
  {
    version: '002',
    description: 'Phase 14 stabilization tables (resolved_claims, crawl_schedules, ingestion_queue, saved_searches, migration_log)',
    up: [
      `CREATE TABLE IF NOT EXISTS resolved_claims (
        id TEXT PRIMARY KEY,
        claim TEXT NOT NULL,
        supportingCount INTEGER DEFAULT 0,
        contradictingCount INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0,
        reasoning TEXT,
        outstandingQuestions TEXT,
        createdAt TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS crawl_schedules (
        id TEXT PRIMARY KEY,
        connectorId TEXT NOT NULL,
        cronExpression TEXT NOT NULL,
        lastRun TEXT,
        nextRun TEXT,
        enabled INTEGER DEFAULT 1,
        maxDepth INTEGER DEFAULT 2,
        createdAt TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ingestion_queue (
        id TEXT PRIMARY KEY,
        connectorId TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        contentHash TEXT,
        previousHash TEXT,
        changed INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        startedAt TEXT,
        finishedAt TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        filters TEXT,
        createdAt TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS migration_log (
        version TEXT PRIMARY KEY,
        description TEXT,
        appliedAt TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_sourceId ON evidence(sourceId)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_retrievedDate ON evidence(retrievedDate)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_contentHash ON evidence(contentHash)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_sourceId ON relationships(sourceId)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_targetId ON relationships(targetId)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_entities_entityId ON evidence_entities(entityId)`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_entities_evidenceId ON evidence_entities(evidenceId)`,
      `CREATE INDEX IF NOT EXISTS idx_document_versions_evidenceId ON document_versions(evidenceId)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`,
    ],
  },
];

export const MigrationRunner = {
  async run(): Promise<{ applied: string[]; skipped: string[] }> {
    const applied: string[] = [];
    const skipped: string[] = [];

    await Sql.run(
      `CREATE TABLE IF NOT EXISTS migration_log (
        version TEXT PRIMARY KEY,
        description TEXT,
        appliedAt TEXT NOT NULL
      )`
    );

    for (const migration of migrations) {
      const existing = await Sql.get<{ version: string }>(
        `SELECT version FROM migration_log WHERE version = ?`,
        [migration.version]
      );
      if (existing) {
        skipped.push(migration.version);
        continue;
      }
      Logger.info('migrations', `Applying migration ${migration.version}: ${migration.description}`);
      for (const statement of migration.up) {
        await Sql.run(statement);
      }
      await Sql.run(
        `INSERT INTO migration_log (version, description, appliedAt) VALUES (?, ?, ?)`,
        [migration.version, migration.description, new Date().toISOString()]
      );
      applied.push(migration.version);
    }
    Logger.info('migrations', `Migrations complete: ${applied.length} applied, ${skipped.length} skipped`);
    return { applied, skipped };
  },

  async list(): Promise<Array<{ version: string; description: string; appliedAt: string }>> {
    return Sql.all(`SELECT * FROM migration_log ORDER BY version ASC`);
  },
};
