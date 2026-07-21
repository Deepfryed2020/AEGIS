import { Sql } from '../../db.js';
import { v4 as uuid } from 'uuid';
import { EvidenceDocument } from '../../../shared/models.js';
import { extractTimelineEvents, TimelineEvent } from '../../lib/intelligence/timeline.js';

export interface ReconstructedTimeline {
  events: MergedTimelineEvent[];
  missingPeriods: Array<{ start: string; end: string; reason: string }>;
  conflictingDates: Array<{ date: string; event: string; descriptions: string[] }>;
  duplicateEvents: Array<{ date: string; description: string; count: number }>;
  eventChains: Array<{ name: string; events: MergedTimelineEvent[] }>;
  causalRelationships: Array<{ cause: MergedTimelineEvent; effect: MergedTimelineEvent; reason: string }>;
}

export interface MergedTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
  sourceCount: number;
}

const CAUSAL_HINTS = [
  { effect: 'awarded', cause: 'announced' },
  { effect: 'commenced', cause: 'approved' },
  { effect: 'published', cause: 'completed' },
  { effect: 'amended', cause: 'reviewed' },
  { effect: 'launched', cause: 'approved' },
];

export const TimelineReconstructor = {
  async reconstruct(evidenceIds?: string[]): Promise<ReconstructedTimeline> {
    const documents = evidenceIds && evidenceIds.length
      ? await this.fetchDocuments(evidenceIds)
      : await Sql.all<EvidenceDocument>(`SELECT * FROM evidence ORDER BY retrievedDate DESC LIMIT 2000`);

    const allEvents: Array<TimelineEvent & { evidenceId: string }> = [];
    for (const doc of documents) {
      const events = extractTimelineEvents(doc.content, doc.id);
      for (const event of events) {
        allEvents.push({ ...event, evidenceId: doc.id });
      }
    }

    const merged = this.mergeEvents(allEvents);
    const sorted = [...merged].sort((a, b) => a.date.localeCompare(b.date));
    const missingPeriods = this.detectMissingPeriods(sorted);
    const conflictingDates = this.detectConflictingDates(allEvents);
    const duplicateEvents = this.detectDuplicates(allEvents);
    const eventChains = this.detectEventChains(sorted);
    const causalRelationships = this.detectCausalRelationships(sorted);

    return {
      events: sorted,
      missingPeriods,
      conflictingDates,
      duplicateEvents,
      eventChains,
      causalRelationships,
    };
  },

  async fetchDocuments(ids: string[]): Promise<EvidenceDocument[]> {
    const placeholders = ids.map(() => '?').join(',');
    return Sql.all<EvidenceDocument>(`SELECT * FROM evidence WHERE id IN (${placeholders})`, ids);
  },

  mergeEvents(events: Array<TimelineEvent & { evidenceId: string }>): MergedTimelineEvent[] {
    const grouped = new Map<string, MergedTimelineEvent>();
    for (const event of events) {
      const key = `${event.date}::${event.title.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) {
        if (!existing.evidenceIds.includes(event.evidenceId)) {
          existing.evidenceIds.push(event.evidenceId);
          existing.sourceCount += 1;
          existing.confidence = Math.min(1, existing.confidence + 0.1);
        }
      } else {
        grouped.set(key, {
          id: uuid(),
          date: event.date,
          title: event.title,
          description: event.description,
          evidenceIds: [event.evidenceId],
          confidence: event.confidence,
          sourceCount: 1,
        });
      }
    }
    return Array.from(grouped.values());
  },

  detectMissingPeriods(events: MergedTimelineEvent[]): Array<{ start: string; end: string; reason: string }> {
    const gaps: Array<{ start: string; end: string; reason: string }> = [];
    for (let i = 1; i < events.length; i += 1) {
      const prev = new Date(events[i - 1].date).getTime();
      const curr = new Date(events[i].date).getTime();
      const days = (curr - prev) / (1000 * 60 * 60 * 24);
      if (days > 180) {
        gaps.push({
          start: events[i - 1].date,
          end: events[i].date,
          reason: `Gap of ${Math.round(days)} days between events — possible missing evidence.`,
        });
      }
    }
    return gaps;
  },

  detectConflictingDates(events: Array<TimelineEvent & { evidenceId: string }>): Array<{ date: string; event: string; descriptions: string[] }> {
    const byDate = new Map<string, Map<string, string[]>>();
    for (const event of events) {
      const dateKey = event.date;
      if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
      const titleKey = event.title.toLowerCase();
      const descMap = byDate.get(dateKey)!;
      if (!descMap.has(titleKey)) descMap.set(titleKey, []);
      const descriptions = descMap.get(titleKey)!;
      const desc = event.description.slice(0, 200);
      if (!descriptions.includes(desc)) descriptions.push(desc);
    }
    const conflicts: Array<{ date: string; event: string; descriptions: string[] }> = [];
    for (const [date, titleMap] of byDate) {
      for (const [title, descriptions] of titleMap) {
        if (descriptions.length > 1) {
          conflicts.push({ date, event: title, descriptions });
        }
      }
    }
    return conflicts;
  },

  detectDuplicates(events: Array<TimelineEvent & { evidenceId: string }>): Array<{ date: string; description: string; count: number }> {
    const counts = new Map<string, { date: string; description: string; count: number }>();
    for (const event of events) {
      const key = `${event.date}::${event.description.slice(0, 100).toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { date: event.date, description: event.description.slice(0, 200), count: 1 });
    }
    return Array.from(counts.values()).filter((entry) => entry.count > 1);
  },

  detectEventChains(sorted: MergedTimelineEvent[]): Array<{ name: string; events: MergedTimelineEvent[] }> {
    const chains: Array<{ name: string; events: MergedTimelineEvent[] }> = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const seed = sorted[i];
      const chain = [seed];
      for (let j = i + 1; j < sorted.length; j += 1) {
        const candidate = sorted[j];
        const days = (new Date(candidate.date).getTime() - new Date(seed.date).getTime()) / (1000 * 60 * 60 * 24);
        if (days > 0 && days < 90 && this.sharesEntity(seed, candidate)) {
          chain.push(candidate);
        }
      }
      if (chain.length >= 3) {
        chains.push({ name: `Chain starting ${seed.date}`, events: chain });
      }
    }
    return chains.slice(0, 10);
  },

  sharesEntity(a: MergedTimelineEvent, b: MergedTimelineEvent): boolean {
    const aWords = new Set(a.description.toLowerCase().split(/\s+/).filter((w) => w.length > 5));
    const bWords = new Set(b.description.toLowerCase().split(/\s+/).filter((w) => w.length > 5));
    let shared = 0;
    for (const word of aWords) if (bWords.has(word)) shared += 1;
    return shared >= 2;
  },

  detectCausalRelationships(sorted: MergedTimelineEvent[]): Array<{ cause: MergedTimelineEvent; effect: MergedTimelineEvent; reason: string }> {
    const relationships: Array<{ cause: MergedTimelineEvent; effect: MergedTimelineEvent; reason: string }> = [];
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const cause = sorted[i];
        const effect = sorted[j];
        const days = (new Date(effect.date).getTime() - new Date(cause.date).getTime()) / (1000 * 60 * 60 * 24);
        if (days <= 0 || days > 365) continue;
        for (const hint of CAUSAL_HINTS) {
          if (cause.description.toLowerCase().includes(hint.cause) && effect.description.toLowerCase().includes(hint.effect)) {
            relationships.push({
              cause,
              effect,
              reason: `"${hint.cause}" event followed by "${hint.effect}" event ${Math.round(days)} days later.`,
            });
          }
        }
      }
    }
    return relationships.slice(0, 20);
  },
};
