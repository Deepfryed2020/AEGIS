import { Logger } from '../observability/Logger.js';

export type EventType =
  | 'DocumentImported'
  | 'GraphUpdated'
  | 'TimelineUpdated'
  | 'ClaimResolved'
  | 'EvidenceAdded'
  | 'InvestigationChanged'
  | 'JobStarted'
  | 'JobCompleted'
  | 'JobFailed'
  | 'PluginLoaded'
  | 'CacheInvalidated'
  | 'DifferenceDetected'
  | 'ReliabilityScored';

export interface AegisEvent {
  type: EventType;
  payload: any;
  timestamp: string;
  id: string;
}

type EventHandler = (event: AegisEvent) => void | Promise<void>;

import { v4 as uuid } from 'uuid';

const handlers = new Map<EventType, Set<EventHandler>>();
const eventLog: AegisEvent[] = [];
const EVENT_LOG_MAX = 300;

export const EventBus = {
  on(type: EventType, handler: EventHandler): void {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler);
  },

  off(type: EventType, handler: EventHandler): void {
    handlers.get(type)?.delete(handler);
  },

  emit(type: EventType, payload: any): void {
    const event: AegisEvent = {
      id: uuid(),
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    eventLog.push(event);
    if (eventLog.length > EVENT_LOG_MAX) eventLog.shift();
    const handlersForType = handlers.get(type);
    if (handlersForType) {
      for (const handler of handlersForType) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch((err) => Logger.error('event-bus', `Handler for ${type} failed: ${err}`));
          }
        } catch (err) {
          Logger.error('event-bus', `Handler for ${type} failed: ${err}`);
        }
      }
    }
    Logger.debug('event-bus', `Emitted ${type}`, { eventId: event.id });
  },

  getRecent(count = 50): AegisEvent[] {
    return [...eventLog].reverse().slice(0, count);
  },

  getByType(type: EventType): AegisEvent[] {
    return eventLog.filter((e) => e.type === type);
  },

  getStats(): Record<EventType, number> {
    const stats = {} as Record<EventType, number>;
    for (const event of eventLog) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    return stats;
  },

  clear(): void {
    eventLog.length = 0;
  },
};
