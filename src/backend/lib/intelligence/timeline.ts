export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  evidenceId?: string;
  confidence: number;
}

const DATE_PATTERNS = [
  /\b(\d{4}-\d{2}-\d{2})\b/g,
  /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/g,
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/g,
];

export function extractTimelineEvents(content: string, evidenceId?: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seen = new Set<string>();

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      const dateStr = match[1];
      const normalized = normalizeDate(dateStr);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      const contextStart = Math.max(0, match.index - 80);
      const contextEnd = Math.min(content.length, match.index + match[0].length + 80);
      const description = content.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim();
      events.push({
        date: normalized,
        title: dateStr,
        description,
        evidenceId,
        confidence: 0.6,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 50);
}

function normalizeDate(input: string): string | null {
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
