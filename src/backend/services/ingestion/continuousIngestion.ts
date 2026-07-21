import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { crawlConnector } from '../connectorService.js';
import { DifferenceEngine } from '../difference/differenceEngine.js';

export interface CrawlSchedule {
  id: string;
  connectorId: string;
  cronExpression: string;
  lastRun?: string;
  nextRun?: string;
  enabled: number;
  maxDepth: number;
  createdAt: string;
}

export interface IngestionQueueEntry {
  id: string;
  connectorId: string;
  url: string;
  status: 'queued' | 'running' | 'complete' | 'failed' | 'skipped';
  reason?: string;
  contentHash?: string;
  previousHash?: string;
  changed?: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export const ContinuousIngestion = {
  schedules: new Map<string, { nextRun: number; interval: number }>(),
  running: false,

  async createSchedule(connectorId: string, intervalMinutes: number, maxDepth = 2): Promise<CrawlSchedule> {
    const schedule: CrawlSchedule = {
      id: uuid(),
      connectorId,
      cronExpression: `every ${intervalMinutes} minutes`,
      maxDepth,
      enabled: 1,
      nextRun: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await Sql.run(
      `INSERT INTO crawl_schedules (id, connectorId, cronExpression, maxDepth, enabled, nextRun, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schedule.id, schedule.connectorId, schedule.cronExpression, schedule.maxDepth, schedule.enabled, schedule.nextRun, schedule.createdAt]
    );
    this.schedules.set(schedule.id, { nextRun: Date.now() + intervalMinutes * 60 * 1000, interval: intervalMinutes * 60 * 1000 });
    return schedule;
  },

  async listSchedules(): Promise<CrawlSchedule[]> {
    return Sql.all<CrawlSchedule>(`SELECT * FROM crawl_schedules ORDER BY nextRun ASC`);
  },

  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    await Sql.run(`UPDATE crawl_schedules SET enabled = ? WHERE id = ?`, [enabled ? 1 : 0, scheduleId]);
  },

  async queueManual(connectorId: string, maxDepth = 2): Promise<IngestionQueueEntry> {
    const entry: IngestionQueueEntry = {
      id: uuid(),
      connectorId,
      url: '',
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    await Sql.run(
      `INSERT INTO ingestion_queue (id, connectorId, url, status, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [entry.id, entry.connectorId, entry.url, entry.status, entry.createdAt]
    );
    void this.processQueueEntry(entry.id, connectorId, maxDepth);
    return entry;
  },

  async processQueueEntry(entryId: string, connectorId: string, maxDepth: number): Promise<void> {
    await Sql.run(`UPDATE ingestion_queue SET status = ?, startedAt = ? WHERE id = ?`, ['running', new Date().toISOString(), entryId]);
    try {
      const results = await crawlConnector(connectorId, undefined, maxDepth);
      let changed = 0;
      for (const doc of results || []) {
        const existing = await Sql.get<{ id: string; contentHash: string }>(
          `SELECT id, contentHash FROM evidence WHERE url = ? AND id != ?`,
          [doc.url, doc.id]
        );
        if (existing && existing.contentHash !== doc.contentHash) {
          await DifferenceEngine.recordVersion(existing.id, doc.contentHash, `Updated content for ${doc.url}`, 'Modified');
          changed += 1;
        }
      }
      await Sql.run(
        `UPDATE ingestion_queue SET status = ?, changed = ?, finishedAt = ? WHERE id = ?`,
        ['complete', changed, new Date().toISOString(), entryId]
      );
    } catch (error) {
      await Sql.run(
        `UPDATE ingestion_queue SET status = ?, reason = ?, finishedAt = ? WHERE id = ?`,
        ['failed', String(error), new Date().toISOString(), entryId]
      );
    }
  },

  async getQueue(limit = 50): Promise<IngestionQueueEntry[]> {
    return Sql.all<IngestionQueueEntry>(`SELECT * FROM ingestion_queue ORDER BY createdAt DESC LIMIT ?`, [limit]);
  },

  startScheduler(): void {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      try {
        const schedules = await this.listSchedules();
        const now = Date.now();
        for (const schedule of schedules) {
          if (!schedule.enabled) continue;
          const next = new Date(schedule.nextRun || schedule.createdAt).getTime();
          if (next <= now) {
            await this.queueManual(schedule.connectorId, schedule.maxDepth);
            const intervalMs = this.parseInterval(schedule.cronExpression);
            const nextRun = new Date(now + intervalMs).toISOString();
            await Sql.run(`UPDATE crawl_schedules SET lastRun = ?, nextRun = ? WHERE id = ?`, [
              new Date().toISOString(),
              nextRun,
              schedule.id,
            ]);
          }
        }
      } catch (error) {
        console.error('Scheduler tick failed', error);
      }
    };
    setInterval(tick, 60 * 1000);
  },

  parseInterval(cron: string): number {
    const match = cron.match(/every\s+(\d+)\s+minutes/);
    if (match) return Number(match[1]) * 60 * 1000;
    return 60 * 60 * 1000;
  },
};
