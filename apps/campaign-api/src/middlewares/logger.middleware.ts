// src/middlewares/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { HttpLogEntry } from '../utils/logger.types.js';

/**
 * Paths to exclude from request logging (high frequency, low value)
 */
const EXCLUDED_PATHS = ['/health', '/ready', '/metrics', '/favicon.ico'];

/**
 * Check if path should be logged
 */
const shouldLogPath = (path: string): boolean => {
  return !EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
};

/**
 * HTTP request logging middleware
 * - Logs request start and completion
 * - Measures request duration
 * - Includes authentication context
 * - Handles errors gracefully
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip excluded paths
  if (!shouldLogPath(req.path)) {
    return next();
  }

  const start = process.hrtime.bigint();
  const requestId = req.requestId || 'unknown';

  // Use request-scoped logger if available, fallback to root
  const log = req.log || logger;

  // Log request start (debug level)
  log.debug(
    {
      event: 'request_start',
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
    },
    `→ ${req.method} ${req.originalUrl}`,
  );

  // Capture response finish
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs / BigInt(1_000_000));

    const logEntry: HttpLogEntry = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      requestId,
      userId: req.user?.sub,
      organisationId: req.user?.['custom:organisation_id'],
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    };

    // Determine log level based on status code
    const isError = res.statusCode >= 400;
    const isServerError = res.statusCode >= 500;

    // Include error details if present
    if (res.locals.error instanceof Error) {
      const errorEntry = {
        ...logEntry,
        event: 'request_error',
        error: {
          message: res.locals.error.message,
          name: res.locals.error.name,
          // Stack only in non-production
          ...(process.env.NODE_ENV !== 'production' && {
            stack: res.locals.error.stack,
          }),
        },
      };

      if (isServerError) {
        log.error(errorEntry, `✗ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      } else {
        log.warn(errorEntry, `⚠ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      }
    } else {
      const event = isError ? 'request_failed' : 'request_completed';
      const logData = { ...logEntry, event };

      // Slow request warning (> 1s)
      if (durationMs > 1000) {
        log.warn(
          { ...logData, slow: true },
          `⚠ Slow request: ${req.method} ${req.originalUrl} took ${durationMs}ms`,
        );
      } else if (isError) {
        log.warn(logData, `⚠ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      } else {
        log.info(logData, `← ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`);
      }
    }
  });

  // Handle connection close (client disconnect)
  res.on('close', () => {
    if (!res.writableFinished) {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs / BigInt(1_000_000));

      log.warn(
        {
          event: 'request_aborted',
          method: req.method,
          url: req.originalUrl,
          durationMs,
          requestId,
        },
        `⚡ Request aborted: ${req.method} ${req.originalUrl}`,
      );
    }
  });

  next();
};
