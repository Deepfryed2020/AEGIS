import { EntityType } from '../../../shared/models.js';

export type GraphRelationshipType =
  | 'FUNDED_BY'
  | 'DIRECTOR_OF'
  | 'WORKED_FOR'
  | 'MENTIONED_WITH'
  | 'SUPPORTED'
  | 'OPPOSED'
  | 'CONTRADICTS'
  | 'REFERENCES'
  | 'SUPERSEDES'
  | 'AMENDS'
  | 'RELATED_TO'
  | 'CONNECTED_TO';

export const GRAPH_ENTITY_TYPES: EntityType[] = [
  'Person',
  'Company',
  'Department',
  'Agency',
  'Minister',
  'Legislation',
  'Committee',
  'Project',
  'FundingProgram',
  'Location',
  'Date',
  'Other',
];

export const GRAPH_RELATIONSHIP_TYPES: GraphRelationshipType[] = [
  'FUNDED_BY',
  'DIRECTOR_OF',
  'WORKED_FOR',
  'MENTIONED_WITH',
  'SUPPORTED',
  'OPPOSED',
  'CONTRADICTS',
  'REFERENCES',
  'SUPERSEDES',
  'AMENDS',
  'RELATED_TO',
  'CONNECTED_TO',
];

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  canonical?: string;
  mentionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphRelationshipType;
  confidence: number;
  source: string;
  timestamp: string;
  citation?: string;
  reason?: string;
  weight: number;
  evidenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraphNeighbourhood {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cost: number;
}

export interface Community {
  id: string;
  label: string;
  memberIds: string[];
  size: number;
  modularity: number;
}
