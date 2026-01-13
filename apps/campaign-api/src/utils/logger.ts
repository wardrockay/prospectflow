// src/utils/logger.ts
import pino, { Logger, LoggerOptions } from 'pino';
import { env } from '../config/env.js';
import { REDACTED_FIELDS, type LogContext } from './logger.types.js';

/**
 * Pino logger configuration
 * - Development: pino-pretty with colors
 * - Production: JSON output for log aggregation
 */
const getLoggerConfig = (): LoggerOptions => {
  const isDevelopment = env.node_env === 'development' || env.node_env === 'dev';

  const baseConfig: LoggerOptions = {
    level: env.logLevel,
    // Add base context to all logs
    base: {
      service: 'ingest-api',
      environment: env.node_env,
    },
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Redact sensitive fields
    redact: {
      paths: [
        ...REDACTED_FIELDS.map((f) => f),
        ...REDACTED_FIELDS.map((f) => `*.${f}`),
        ...REDACTED_FIELDS.map((f) => `*.*.${f}`),
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
      ],
      censor: '[REDACTED]',
    },
    // Custom serializers
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers?.['user-agent'],
          'content-type': req.headers?.['content-type'],
          'x-request-id': req.headers?.['x-request-id'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader?.('content-type'),
        },
      }),
      err: pino.stdSerializers.err,
    },
    // Format error objects nicely
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
      }),
    },
  };

  // Development: use pino-pretty for readable output
  if (isDevelopment) {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{module} - {msg}',
        },
      },
    };
  }

  // Production: JSON output for log aggregation (ELK, CloudWatch, etc.)
  return baseConfig;
};

/**
 * Root logger instance
 */
export const logger: Logger = pino(getLoggerConfig());

/**
 * Create a child logger with module context
 * @param module - Module name for log context
 * @param context - Additional context to bind
 * @returns Child logger with bound context
 *
 * @example
 * const logger = createChildLogger('IngestService');
 * logger.info({ campaignId: '123' }, 'Processing campaign');
 * // Output: { module: 'IngestService', campaignId: '123', msg: 'Processing campaign' }
 */
export const createChildLogger = (module: string, context?: LogContext): Logger => {
  return logger.child({ module, ...context });
};

/**
 * Create a request-scoped child logger
 * Includes requestId for distributed tracing
 * @param requestId - Unique request identifier
 * @param context - Additional context (userId, organisationId, etc.)
 */
export const createRequestLogger = (
  requestId: string,
  context?: Omit<LogContext, 'requestId'>,
): Logger => {
  return logger.child({ requestId, ...context });
};

/**
 * Log performance metrics for an operation
 * @param logger - Logger instance to use
 * @param operation - Operation name
 * @param durationMs - Duration in milliseconds
 * @param success - Whether operation succeeded
 * @param metadata - Additional operation metadata
 */
export const logPerformance = (
  loggerInstance: Logger,
  operation: string,
  durationMs: number,
  success: boolean,
  metadata?: Record<string, unknown>,
): void => {
  const level = durationMs > 1000 ? 'warn' : 'info';
  loggerInstance[level](
    {
      performance: true,
      operation,
      durationMs,
      success,
      ...metadata,
    },
    `${operation} completed in ${durationMs}ms`,
  );
};

/**
 * Utility to time an async operation and log its performance
 * @param loggerInstance - Logger to use
 * @param operation - Operation name
 * @param fn - Async function to time
 * @returns Result of the function
 *
 * @example
 * const result = await timeOperation(logger, 'database.query', async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
export const timeOperation = async <T>(
  loggerInstance: Logger,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    logPerformance(loggerInstance, operation, Date.now() - start, true);
    return result;
  } catch (error) {
    logPerformance(loggerInstance, operation, Date.now() - start, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export default logger;
