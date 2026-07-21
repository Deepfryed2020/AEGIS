import { EvidenceDocument, SourceMetadata } from '../../../shared/models.js';
import { GraphStore } from './GraphStore.js';
import { ExtractedEntity } from '../intelligence/entities.js';
import { ExtractedRelationship } from '../intelligence/relationships.js';
import { TimelineEvent } from '../intelligence/timeline.js';
import { GraphRelationshipType } from './types.js';

export interface GraphBuildResult {
  entityCount: number;
  relationshipCount: number;
  timelineCount: number;
}

function mapRelationshipType(type: string): GraphRelationshipType {
  const allowed: GraphRelationshipType[] = [
    'FUNDED_BY', 'DIRECTOR_OF', 'WORKED_FOR', 'MENTIONED_WITH', 'SUPPORTED',
    'OPPOSED', 'CONTRADICTS', 'REFERENCES', 'SUPERSEDES', 'AMENDS',
    'RELATED_TO', 'CONNECTED_TO',
  ];
  return (allowed as string[]).includes(type) ? (type as GraphRelationshipType) : 'RELATED_TO';
}

export const GraphBuilder = {
  async ingestExtracted(
    evidenceId: string,
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[],
    timeline: TimelineEvent[],
    source: SourceMetadata,
    document: EvidenceDocument
  ): Promise<GraphBuildResult> {
    const nameToId = new Map<string, string>();

    for (const entity of entities) {
      const node = await GraphStore.upsertNode({
        name: entity.name,
        type: entity.type,
      });
      await GraphStore.linkEvidence(evidenceId, node.id, entity.mentionCount);
      nameToId.set(entity.name.toLowerCase(), node.id);
    }

    let relationshipCount = 0;
    for (const rel of relationships) {
      const sourceId = nameToId.get(rel.sourceName.toLowerCase());
      const targetId = nameToId.get(rel.targetName.toLowerCase());
      if (!sourceId || !targetId) continue;
      await GraphStore.upsertEdge({
        sourceId,
        targetId,
        type: mapRelationshipType(rel.type),
        confidence: Math.min(1, rel.weight + 0.3),
        source: source.name,
        citation: document.url,
        reason: `Extracted from ${document.title}`,
        weight: rel.weight,
        evidenceId,
      });
      relationshipCount += 1;
    }

    for (const event of timeline) {
      if (!event.evidenceId) continue;
      const dateNode = await GraphStore.upsertNode({
        name: event.date,
        type: 'Date',
      });
      await GraphStore.linkEvidence(evidenceId, dateNode.id, 1);
    }

    return {
      entityCount: entities.length,
      relationshipCount,
      timelineCount: timeline.length,
    };
  },
};
