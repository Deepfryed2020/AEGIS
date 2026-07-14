import fs from 'fs';
import sqlite3 from 'sqlite3';
import { dirname, resolve } from 'path';

const sqlite = sqlite3.verbose();
const dbPath = resolve('data', 'aegis.db');
const dbDir = dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
export const db = new sqlite.Database(dbPath);

function runSql(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolvePromise, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolvePromise({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getSql<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolvePromise, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolvePromise(row as T | undefined);
    });
  });
}

function allSql<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolvePromise, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolvePromise(rows as T[]);
    });
  });
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  db.all(`PRAGMA table_info(${table})`, (err, rows: any[]) => {
    if (err) return;
    if (!rows.some((row) => row.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    }
  });
}

function initializeSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      level TEXT NOT NULL,
      authorityScore REAL NOT NULL,
      trustScore REAL NOT NULL,
      officialStatus TEXT NOT NULL,
      lastCrawled TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      sourceId TEXT NOT NULL,
      sourceName TEXT NOT NULL,
      title TEXT,
      url TEXT NOT NULL,
      documentType TEXT NOT NULL,
      publisher TEXT,
      author TEXT,
      publicationDate TEXT,
      retrievedDate TEXT NOT NULL,
      indexedAt TEXT NOT NULL,
      confidence REAL NOT NULL,
      organisation TEXT,
      summary TEXT,
      entities TEXT,
      topics TEXT,
      keywords TEXT,
      language TEXT,
      pages INTEGER,
      headings TEXT,
      references TEXT,
      footnotes TEXT,
      status TEXT,
      duplicateScore REAL DEFAULT 0,
      governmentLevel TEXT,
      content TEXT NOT NULL,
      contentHash TEXT UNIQUE NOT NULL,
      FOREIGN KEY(sourceId) REFERENCES sources(id)
    )`);

    db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(
      title,
      content,
      sourceName,
      organisation,
      publisher,
      summary,
      keywords,
      topics,
      entities,
      headings,
      references
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      notes TEXT,
      archived INTEGER DEFAULT 0,
      archivedAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS investigation_evidence (
      investigationId TEXT NOT NULL,
      evidenceId TEXT NOT NULL,
      tags TEXT,
      bookmarked INTEGER DEFAULT 0,
      PRIMARY KEY (investigationId, evidenceId),
      FOREIGN KEY (investigationId) REFERENCES investigations(id),
      FOREIGN KEY (evidenceId) REFERENCES evidence(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      investigationId TEXT NOT NULL,
      title TEXT NOT NULL,
      format TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (investigationId) REFERENCES investigations(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      connectorId TEXT NOT NULL,
      url TEXT NOT NULL,
      query TEXT,
      status TEXT NOT NULL,
      error TEXT,
      resultCount INTEGER DEFAULT 0,
      retryCount INTEGER DEFAULT 0,
      maxDepth INTEGER DEFAULT 2,
      pagesFetched INTEGER DEFAULT 0,
      bytesFetched INTEGER DEFAULT 0,
      duplicates INTEGER DEFAULT 0,
      queueState TEXT,
      visitedState TEXT,
      startedAt TEXT,
      finishedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS crawl_audit (
      id TEXT PRIMARY KEY,
      jobId TEXT,
      eventType TEXT NOT NULL,
      url TEXT,
      message TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS document_stages (
      id TEXT PRIMARY KEY,
      evidenceId TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      completedAt TEXT,
      details TEXT,
      FOREIGN KEY(evidenceId) REFERENCES evidence(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      evidenceId TEXT NOT NULL,
      versionedAt TEXT NOT NULL,
      contentHash TEXT NOT NULL,
      summary TEXT,
      diff TEXT,
      changeType TEXT NOT NULL,
      pageCount INTEGER,
      FOREIGN KEY(evidenceId) REFERENCES evidence(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      canonical TEXT,
      mentionCount INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS evidence_entities (
      evidenceId TEXT NOT NULL,
      entityId TEXT NOT NULL,
      mentionCount INTEGER DEFAULT 1,
      PRIMARY KEY (evidenceId, entityId),
      FOREIGN KEY(evidenceId) REFERENCES evidence(id),
      FOREIGN KEY(entityId) REFERENCES entities(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      sourceId TEXT NOT NULL,
      targetId TEXT NOT NULL,
      type TEXT NOT NULL,
      evidenceId TEXT,
      createdAt TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      evidenceId TEXT NOT NULL,
      chunkIndex INTEGER NOT NULL,
      chunkHash TEXT NOT NULL,
      snippet TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(evidenceId) REFERENCES evidence(id)
    )`);

    addColumnIfMissing('evidence', 'language', 'TEXT');
    addColumnIfMissing('evidence', 'pages', 'INTEGER');
    addColumnIfMissing('evidence', 'headings', 'TEXT');
    addColumnIfMissing('evidence', 'references', 'TEXT');
    addColumnIfMissing('evidence', 'footnotes', 'TEXT');
    addColumnIfMissing('evidence', 'status', 'TEXT');
    addColumnIfMissing('evidence', 'duplicateScore', 'REAL DEFAULT 0');
    addColumnIfMissing('evidence', 'governmentLevel', 'TEXT');
    addColumnIfMissing('investigations', 'archived', 'INTEGER DEFAULT 0');
    addColumnIfMissing('investigations', 'archivedAt', 'TEXT');
    addColumnIfMissing('jobs', 'retryCount', 'INTEGER DEFAULT 0');
    addColumnIfMissing('jobs', 'maxDepth', 'INTEGER DEFAULT 2');
    addColumnIfMissing('jobs', 'pagesFetched', 'INTEGER DEFAULT 0');
    addColumnIfMissing('jobs', 'bytesFetched', 'INTEGER DEFAULT 0');
    addColumnIfMissing('jobs', 'duplicates', 'INTEGER DEFAULT 0');
    addColumnIfMissing('jobs', 'queueState', 'TEXT');
    addColumnIfMissing('jobs', 'visitedState', 'TEXT');
    addColumnIfMissing('jobs', 'startedAt', 'TEXT');
    addColumnIfMissing('jobs', 'finishedAt', 'TEXT');
  });
}

initializeSchema();

export const Sql = {
  run: runSql,
  get: getSql,
  all: allSql,
};
