import { EntityType } from '../../../shared/models.js';

const ENTITY_PATTERNS: Array<{ type: EntityType; pattern: RegExp }> = [
  { type: 'Legislation', pattern: /\b([A-Z][A-Za-z]+ (?:Act|Bill|Regulations|Amendment))\b/g },
  { type: 'Company', pattern: /\b([A-Z][A-Za-z]+ (?:Pty Ltd|Ltd|Limited|Inc|Corp|Corporation))\b/g },
  { type: 'Department', pattern: /\b(Department of [A-Z][A-Za-z ]+)\b/g },
  { type: 'Agency', pattern: /\b(Australian [A-Z][A-Za-z ]+(?: Commission|Authority|Office|Agency))\b/g },
  { type: 'Minister', pattern: /\b(Minister for [A-Z][A-Za-z ]+)\b/g },
  { type: 'Committee', pattern: /\b([A-Z][A-Za-z ]+ Committee)\b/g },
  { type: 'Date', pattern: /\b(\d{4}-\d{2}-\d{2})\b/g },
];

const GENERIC_PROPER_NOUN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;

const STOPWORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'It', 'Its', 'A', 'An',
  'We', 'Our', 'You', 'Your', 'They', 'Their', 'He', 'She', 'His', 'Her',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
]);

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  mentionCount: number;
}

export function extractEntities(content: string, limit = 40): ExtractedEntity[] {
  const counts = new Map<string, { type: EntityType; count: number }>();

  for (const { type, pattern } of ENTITY_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      const name = match[1].trim();
      if (!name) continue;
      const key = `${type}::${name.toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { type, count: 1 });
    }
  }

  if (counts.size < limit / 2) {
    GENERIC_PROPER_NOUN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = GENERIC_PROPER_NOUN.exec(content)) && counts.size < limit * 2) {
      const name = match[1].trim();
      if (STOPWORDS.has(name) || name.length < 3) continue;
      const key = `Other::${name.toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { type: 'Other', count: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([key, { type, count }]) => ({ name: key.split('::')[1].replace(/^\w/, (c) => c.toUpperCase()), type, mentionCount: count }))
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, limit);
}
