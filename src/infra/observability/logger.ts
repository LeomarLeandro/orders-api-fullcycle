import pino, { Logger } from 'pino';

export function createLogger(level?: string): Logger {
  return pino({
    level: level ?? process.env.LOG_LEVEL ?? 'info',
    base: {
      service: 'orders-api',
      env: process.env.NODE_ENV ?? 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      censor: '[REDACTED]',
    },
  });
}

export const logger = createLogger();
