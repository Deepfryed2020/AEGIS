import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { Logger } from '../../lib/observability/Logger.js';
import { EventBus } from '../../lib/events/EventBus.js';

export type JobType =
  | 'ingestion'
  | 'analysis'
  | 'graph-build'
  | 'timeline-reconstruct'
  | 'claim-resolve'
  | 'report-generate'
  | 'diff-compare'
  | 'reliability-score'
  | 'graph-validate'
  | 'graph-heal'
  | 'graph-rebuild';

export type JobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  progress: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  investigationId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  estimatedCompletion?: string;
}

type JobHandler = (job: Job, updateProgress: (progress: number) => void) => Promise<any>;

const handlers = new Map<JobType, JobHandler>();
const activeJobs = new Map<string, { cancel: () => void }>();
const MAX_RETRIES = 3;

export const JobEngine = {
  registerHandler(type: JobType, handler: JobHandler): void {
    handlers.set(type, handler);
    Logger.info('job-engine', `Registered handler for ${type}`);
  },

  async enqueue(type: JobType, payload: any = {}, options: { priority?: number; investigationId?: string; maxRetries?: number } = {}): Promise<Job> {
    const job: Job = {
      id: uuid(),
      type,
      status: 'queued',
      payload: JSON.stringify(payload),
      progress: 0,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries ?? MAX_RETRIES,
      investigationId: options.investigationId,
      createdAt: new Date().toISOString(),
    };
    await Sql.run(
      `INSERT INTO jobs (id, type, status, payload, progress, priority, retryCount, investigationId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job.id, job.type, job.status, job.payload, job.progress, job.priority, job.retryCount, job.investigationId || null, job.createdAt]
    );
    EventBus.emit('JobStarted', { jobId: job.id, type: job.type });
    void this.processNext();
    return job;
  },

  async processNext(): Promise<void> {
    const next = await Sql.get<Job>(
      `SELECT * FROM jobs WHERE status = 'queued' ORDER BY priority DESC, createdAt ASC LIMIT 1`
    );
    if (!next) return;
    await this.execute(next);
  },

  async execute(job: Job): Promise<void> {
    const handler = handlers.get(job.type);
    if (!handler) {
      Logger.error('job-engine', `No handler for job type ${job.type}`);
      await this.markFailed(job.id, `No handler registered for ${job.type}`);
      return;
    }

    let cancelled = false;
    activeJobs.set(job.id, { cancel: () => { cancelled = true; } });

    await Sql.run(
      `UPDATE jobs SET status = 'running', startedAt = ? WHERE id = ?`,
      [new Date().toISOString(), job.id]
    );

    const updateProgress = async (progress: number) => {
      if (cancelled) return;
      await Sql.run(`UPDATE jobs SET progress = ? WHERE id = ?`, [progress, job.id]);
    };

    try {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      const result = await handler({ ...job, payload }, updateProgress);
      if (cancelled) {
        await this.markCancelled(job.id);
        return;
      }
      await Sql.run(
        `UPDATE jobs SET status = 'completed', progress = 100, result = ?, finishedAt = ? WHERE id = ?`,
        [JSON.stringify(result), new Date().toISOString(), job.id]
      );
      EventBus.emit('JobCompleted', { jobId: job.id, type: job.type, result });
      Logger.info('job-engine', `Job ${job.id} (${job.type}) completed`);
    } catch (error) {
      if (cancelled) {
        await this.markCancelled(job.id);
        return;
      }
      Logger.error('job-engine', `Job ${job.id} failed: ${error}`);
      if (job.retryCount < job.maxRetries) {
        await Sql.run(
          `UPDATE jobs SET status = 'queued', retryCount = retryCount + 1, error = ? WHERE id = ?`,
          [String(error), job.id]
        );
        Logger.info('job-engine', `Job ${job.id} queued for retry ${job.retryCount + 1}/${job.maxRetries}`);
        void this.processNext();
      } else {
        await this.markFailed(job.id, String(error));
      }
    } finally {
      activeJobs.delete(job.id);
      void this.processNext();
    }
  },

  async markFailed(jobId: string, error: string): Promise<void> {
    await Sql.run(
      `UPDATE jobs SET status = 'failed', error = ?, finishedAt = ? WHERE id = ?`,
      [error, new Date().toISOString(), jobId]
    );
    EventBus.emit('JobFailed', { jobId, error });
  },

  async markCancelled(jobId: string): Promise<void> {
    await Sql.run(
      `UPDATE jobs SET status = 'cancelled', finishedAt = ? WHERE id = ?`,
      [new Date().toISOString(), jobId]
    );
    Logger.info('job-engine', `Job ${jobId} cancelled`);
  },

  async pause(jobId: string): Promise<void> {
    const job = await Sql.get<Job>(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    if (job?.status === 'running') {
      activeJobs.get(jobId)?.cancel();
      await Sql.run(`UPDATE jobs SET status = 'paused' WHERE id = ?`, [jobId]);
    }
  },

  async resume(jobId: string): Promise<void> {
    const job = await Sql.get<Job>(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    if (job?.status === 'paused') {
      await Sql.run(`UPDATE jobs SET status = 'queued' WHERE id = ?`, [jobId]);
      void this.processNext();
    }
  },

  async cancel(jobId: string): Promise<void> {
    const job = await Sql.get<Job>(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    if (job?.status === 'running') {
      activeJobs.get(jobId)?.cancel();
    } else {
      await this.markCancelled(jobId);
    }
  },

  async getJob(jobId: string): Promise<Job | undefined> {
    const row = await Sql.get<any>(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    if (!row) return undefined;
    return {
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined,
    };
  },

  async getJobs(limit = 50, status?: string): Promise<Job[]> {
    const rows = status
      ? await Sql.all<any>(`SELECT * FROM jobs WHERE status = ? ORDER BY createdAt DESC LIMIT ?`, [status, limit])
      : await Sql.all<any>(`SELECT * FROM jobs ORDER BY createdAt DESC LIMIT ?`, [limit]);
    return rows.map((row) => ({
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      result: row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined,
    }));
  },

  async getStats(): Promise<{
    total: number;
    queued: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
    cancelled: number;
    activeCount: number;
  }> {
    const rows = await Sql.all<{ status: string; count: number }>(
      `SELECT status, COUNT(*) AS count FROM jobs GROUP BY status`
    );
    const stats: any = { total: 0, queued: 0, running: 0, paused: 0, completed: 0, failed: 0, cancelled: 0, activeCount: activeJobs.size };
    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }
    return stats;
  },
};
