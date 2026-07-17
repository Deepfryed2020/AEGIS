import { ExtractedEntity } from './entities.js';

export type RelationshipType =
  | 'MENTIONED_WITH'
  | 'RELATED_TO'
  | 'SUPPORTED'
  | 'OPPOSED'
  | 'FUNDED_BY'
  | 'AWARDED'
  | 'AMENDED'
  | 'REPLACED'
  | 'SUPERSEDES'
  | 'PART_OF'
  | 'INFLUENCED'
  | 'INVESTIGATED';

export interface ExtractedRelationship {
  sourceName: string;
  targetName: string;
  type: RelationshipType;
  weight: number;
}

const RELATIONSHIP_HINTS: Array<{ type: RelationshipType; pattern: RegExp }> = [
  { type: 'FUNDED_BY', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:was |is |are )?(?:funded|financed|supported)\s+by\s+([A-Z][A-Za-z ]+)/g },
  { type: 'AWARDED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:was |is )?(?:awarded|granted|contracted)\s+(?:to|by)\s+([A-Z][A-Za-z ]+)/g },
  { type: 'AMENDED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:was |is )?amended\s+by\s+([A-Z][A-Za-z ]+)/g },
  { type: 'REPLACED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:was |is )?replaced\s+by\s+([A-Z][A-Za-z ]+)/g },
  { type: 'SUPPORTED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:supports|supported|endorsed)\s+([A-Z][A-Za-z ]+)/g },
  { type: 'OPPOSED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:opposes|opposed|rejected)\s+([A-Z][A-Za-z ]+)/g },
  { type: 'INVESTIGATED', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:investigated|audited|reviewed)\s+([A-Z][A-Za-z ]+)/g },
  { type: 'PART_OF', pattern: /\b([A-Z][A-Za-z ]+?)\s+(?:is |was )?(?:part of|subsidiary of|division of)\s+([A-Z][A-Za-z ]+)/g },
];

export function extractRelationships(content: string, entities: ExtractedEntity[]): ExtractedRelationship[] {
  const entityNames = new Set(entities.map((e) => e.name.toLowerCase()));
  const relationships: ExtractedRelationship[] = [];
  const seen = new Set<string>();

  for (const { type, pattern } of RELATIONSHIP_HINTS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content))) {
      const sourceName = match[1].trim();
      const targetName = match[2].trim();
      if (!sourceName || !targetName) continue;
      if (!entityNames.has(sourceName.toLowerCase()) && !entityNames.has(targetName.toLowerCase())) continue;
      const key = `${sourceName}|${type}|${targetName}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      relationships.push({ sourceName, targetName, type, weight: 1 });
    }
  }

  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      const a = entities[i];
      const b = entities[j];
      if (a.mentionCount >= 2 && b.mentionCount >= 2) {
        const key = `${a.name}|MENTIONED_WITH|${b.name}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        relationships.push({ sourceName: a.name, targetName: b.name, type: 'MENTIONED_WITH', weight: 0.5 });
      }
    }
  }

  return relationships.slice(0, 200);
}
