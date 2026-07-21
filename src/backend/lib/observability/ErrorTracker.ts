import { v4 as uuid } from 'uuid';
import { Logger } from './Logger.js';

export interface ErrorRecord {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  stack?: string;
  requestId?: string;
  investigationId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
}

const errors: ErrorRecord[] = [];
const ERROR_MAX = 200;

export const ErrorTracker = {
  record(error: Error | string, context: {
    module: string;
    requestId?: string;
    investigationId?: string;
    url?: string;
    method?: string;
    statusCode?: number;
  }): ErrorRecord {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;
    const record: ErrorRecord = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      module: context.module,
      message,
      stack,
      requestId: context.requestId,
      investigationId: context.investigationId,
      url: context.url,
      method: context.method,
      statusCode: context.statusCode,
    };
    errors.push(record);
    if (errors.length > ERROR_MAX) errors.shift();
    Logger.error(context.module, message, {
      requestId: context.requestId,
      investigationId: context.investigationId,
      stack,
    });
    return record;
  },

  getRecent(count = 50): ErrorRecord[] {
    return [...errors].reverse().slice(0, count);
  },

  getCount(): number {
    return errors.length;
  },

  getByModule(module: string): ErrorRecord[] {
    return errors.filter((e) => e.module === module);
  },

  clear(): void {
    errors.length = 0;
  },
};
