import { Logger } from '../observability/Logger.js';
import { EventBus } from '../events/EventBus.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: Set<string>;
}

const DEFAULT_TTL_MS = 60_000;

export class IntelligenceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();
  private hits = 0;
  private misses = 0;
  private invalidations = 0;

  constructor() {
    EventBus.on('DocumentImported', () => this.invalidateByTag('documents'));
    EventBus.on('GraphUpdated', () => this.invalidateByTag('graph'));
    EventBus.on('TimelineUpdated', () => this.invalidateByTag('timeline'));
    EventBus.on('ClaimResolved', () => this.invalidateByTag('claims'));
    EventBus.on('EvidenceAdded', () => this.invalidateByTag('documents'));
    EventBus.on('InvestigationChanged', () => this.invalidateByTag('investigations'));
    EventBus.on('CacheInvalidated', (event) => {
      if (event.payload?.tag) this.invalidateByTag(event.payload.tag);
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.misses += 1;
      if (entry) this.cache.delete(key);
      return undefined;
    }
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, tags: string[] = [], ttl = DEFAULT_TTL_MS): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      tags: new Set(tags),
    };
    this.cache.set(key, entry);
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }
    this.cache.delete(key);
    this.invalidations += 1;
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;
    for (const key of keys) {
      this.cache.delete(key);
    }
    keys.clear();
    this.invalidations += 1;
    Logger.debug('cache', `Invalidated tag: ${tag}`);
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.invalidations += 1;
  }

  metrics(): { hits: number; misses: number; hitRate: number; size: number; invalidations: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.cache.size,
      invalidations: this.invalidations,
    };
  }
}

export const intelligenceCache = new IntelligenceCache();
