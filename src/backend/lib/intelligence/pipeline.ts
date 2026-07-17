import { EvidenceDocument, SourceMetadata } from '../../../shared/models.js';
import { extractEntities } from './entities.js';
import { extractRelationships } from './relationships.js';
import { extractTimelineEvents } from './timeline.js';
import { calculateConfidence } from './confidence.js';
import { KnowledgeGraph } from './knowledge.js';

export interface IntelligenceResult {
  entities: ReturnType<typeof extractEntities>;
  relationships: ReturnType<typeof extractRelationships>;
  timeline: ReturnType<typeof extractTimelineEvents>;
  confidence: number;
}

export class IntelligenceEngine {
  async analyze(document: EvidenceDocument, source: SourceMetadata): Promise<IntelligenceResult> {
    const entities = extractEntities(document.content);
    const relationships = extractRelationships(document.content, entities);
    const timeline = extractTimelineEvents(document.content, document.id);
    const confidence = calculateConfidence({
      sourceTrust: source.trustScore,
      mentionCount: entities.reduce((sum, e) => sum + e.mentionCount, 0),
      relationshipCount: relationships.length,
      contentLength: document.content.length,
    });

    await KnowledgeGraph.ingestExtracted(document.id, entities, relationships, timeline);

    return { entities, relationships, timeline, confidence };
  }
}

export const intelligenceEngine = new IntelligenceEngine();
