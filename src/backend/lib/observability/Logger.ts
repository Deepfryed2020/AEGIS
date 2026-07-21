export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  requestId?: string;
  investigationId?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const ringBuffer: LogEntry[] = [];
const RING_BUFFER_MAX = 500;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function format(entry: LogEntry): string {
  const parts = [entry.timestamp, entry.level.toUpperCase(), `[${entry.module}]`];
  if (entry.requestId) parts.push(`req=${entry.requestId}`);
  if (entry.investigationId) parts.push(`inv=${entry.investigationId}`);
  parts.push(entry.message);
  if (entry.stack) parts.push('\n' + entry.stack);
  return parts.join(' ');
}

function log(level: LogLevel, module: string, message: string, context?: {
  requestId?: string;
  investigationId?: string;
  stack?: string;
  metadata?: Record<string, any>;
}): void {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...context,
  };
  ringBuffer.push(entry);
  if (ringBuffer.length > RING_BUFFER_MAX) ringBuffer.shift();
  const output = format(entry);
  if (level === 'error' || level === 'fatal') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const Logger = {
  debug: (module: string, message: string, ctx?: object) => log('debug', module, message, ctx),
  info: (module: string, message: string, ctx?: object) => log('info', module, message, ctx),
  warn: (module: string, message: string, ctx?: object) => log('warn', module, message, ctx),
  error: (module: string, message: string, ctx?: object) => log('error', module, message, ctx),
  fatal: (module: string, message: string, ctx?: object) => log('fatal', module, message, ctx),

  getRecent(count = 100, level?: LogLevel): LogEntry[] {
    let entries = [...ringBuffer].reverse();
    if (level) entries = entries.filter((e) => e.level === level);
    return entries.slice(0, count);
  },

  getErrors(count = 50): LogEntry[] {
    return ringBuffer.filter((e) => e.level === 'error' || e.level === 'fatal').slice(-count);
  },

  clear(): void {
    ringBuffer.length = 0;
  },
};
