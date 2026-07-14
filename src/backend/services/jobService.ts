import { v4 as uuid } from 'uuid';
import { Sql } from '../db.js';

export type JobStatus = 'Queued' | 'Downloading' | 'Parsing' | 'Indexing' | 'Complete' | 'Failed';

export interface JobRecord {
  id: string;
  connectorId: string;
  url: string;
  query?: string;
  status: JobStatus;
  error?: string;
  resultCount: number;
  retryCount: number;
  maxDepth: number;
  pagesFetched: number;
  bytesFetched: number;
  duplicates: number;
  queueState?: string;
  visitedState?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const JobService = {
  async create(connectorId: string, url: string, query?: string, maxDepth = 2) {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: uuid(),
      connectorId,
      url,
      query,
      status: 'Queued',
      resultCount: 0,
      retryCount: 0,
      maxDepth,
      pagesFetched: 0,
      bytesFetched: 0,
      duplicates: 0,
      queueState: JSON.stringify([]),
      visitedState: JSON.stringify([]),
      startedAt: now,
      finishedAt: '',
      createdAt: now,
      updatedAt: now,
    };
    await Sql.run(
      `INSERT INTO jobs (id, connectorId, url, query, status, resultCount, retryCount, maxDepth, pagesFetched, bytesFetched, duplicates, queueState, visitedState, startedAt, finishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job.id, job.connectorId, job.url, job.query || null, job.status, job.resultCount, job.retryCount, job.maxDepth, job.pagesFetched, job.bytesFetched, job.duplicates, job.queueState, job.visitedState, job.startedAt, job.finishedAt, job.createdAt, job.updatedAt]
    );
    return job;
  },
  async updateStatus(id: string, status: JobStatus, count = 0, error?: string, updates: Partial<Omit<JobRecord, 'id' | 'connectorId' | 'url' | 'query' | 'createdAt' | 'updatedAt'>> = {}) {
    const updatedAt = new Date().toISOString();
    const fields = ['status = ?', 'resultCount = ?', 'error = ?', 'updatedAt = ?'];
    const values: any[] = [status, count, error || null, updatedAt];
    if (typeof updates.retryCount === 'number') {
      fields.push('retryCount = ?');
      values.push(updates.retryCount);
    }
    if (typeof updates.pagesFetched === 'number') {
      fields.push('pagesFetched = ?');
      values.push(updates.pagesFetched);
    }
    if (typeof updates.bytesFetched === 'number') {
      fields.push('bytesFetched = ?');
      values.push(updates.bytesFetched);
    }
    if (typeof updates.duplicates === 'number') {
      fields.push('duplicates = ?');
      values.push(updates.duplicates);
    }
    if (updates.queueState !== undefined) {
      fields.push('queueState = ?');
      values.push(updates.queueState);
    }
    if (updates.visitedState !== undefined) {
      fields.push('visitedState = ?');
      values.push(updates.visitedState);
    }
    if (updates.startedAt !== undefined) {
      fields.push('startedAt = ?');
      values.push(updates.startedAt);
    }
    if (updates.finishedAt !== undefined) {
      fields.push('finishedAt = ?');
      values.push(updates.finishedAt);
    }
    values.push(id);
    await Sql.run(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getJob(id);
  },
  async recordAudit(jobId: string, eventType: string, url?: string, message?: string, metadata?: object) {
    const id = uuid();
    const createdAt = new Date().toISOString();
    await Sql.run(
      `INSERT INTO crawl_audit (id, jobId, eventType, url, message, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, jobId, eventType, url || null, message || null, metadata ? JSON.stringify(metadata) : null, createdAt]
    );
    return { id, jobId, eventType, url, message, metadata, createdAt };
  },
  async getJob(id: string) {
    return Sql.get<JobRecord>(`SELECT * FROM jobs WHERE id = ?`, [id]);
  },
  async getJobs() {
    return Sql.all<JobRecord>(`SELECT * FROM jobs ORDER BY updatedAt DESC`);
  },
  async getAudit(jobId: string) {
    return Sql.all(`SELECT * FROM crawl_audit WHERE jobId = ? ORDER BY createdAt ASC`, [jobId]);
  }
};
