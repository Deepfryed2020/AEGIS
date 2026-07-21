import { GraphNode, GraphEdge } from './types.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000;

export class GraphCache {
  private nodeCache = new Map<string, CacheEntry<GraphNode>>();
  private edgeCache = new Map<string, CacheEntry<GraphEdge[]>>();
  private statsCache: CacheEntry<any> | null = null;
  private hits = 0;
  private misses = 0;

  getNode(id: string): GraphNode | undefined {
    const entry = this.nodeCache.get(id);
    if (!entry || entry.expiresAt < Date.now()) {
      this.misses += 1;
      this.nodeCache.delete(id);
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  setNode(id: string, node: GraphNode, ttl = DEFAULT_TTL_MS): void {
    this.nodeCache.set(id, { value: node, expiresAt: Date.now() + ttl });
  }

  getEdges(key: string): GraphEdge[] | undefined {
    const entry = this.edgeCache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.misses += 1;
      this.edgeCache.delete(key);
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  setEdges(key: string, edges: GraphEdge[], ttl = DEFAULT_TTL_MS): void {
    this.edgeCache.set(key, { value: edges, expiresAt: Date.now() + ttl });
  }

  getStats(): any | undefined {
    if (!this.statsCache || this.statsCache.expiresAt < Date.now()) {
      this.misses += 1;
      this.statsCache = null;
      return undefined;
    }
    this.hits += 1;
    return this.statsCache.value;
  }

  setStats(stats: any, ttl = DEFAULT_TTL_MS): void {
    this.statsCache = { value: stats, expiresAt: Date.now() + ttl };
  }

  invalidate(): void {
    this.nodeCache.clear();
    this.edgeCache.clear();
    this.statsCache = null;
  }

  metrics(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total === 0 ? 0 : this.hits / total };
  }
}

export const graphCache = new GraphCache();
