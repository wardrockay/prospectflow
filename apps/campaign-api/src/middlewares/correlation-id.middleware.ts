// src/middlewares/correlation-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../utils/logger.js';
import type { Logger } from 'pino';

// Extend Express Request to include logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

/**
 * Header names for correlation ID
 */
const CORRELATION_HEADERS = ['x-request-id', 'x-correlation-id', 'x-trace-id'] as const;

/**
 * Extract correlation ID from request headers or generate new one
 */
const getOrCreateRequestId = (req: Request): string => {
  for (const header of CORRELATION_HEADERS) {
    const value = req.headers[header];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return randomUUID();
};

/**
 * Correlation ID middleware
 * - Extracts or generates unique request ID
 * - Attaches request-scoped logger to request object
 * - Adds request ID to response headers for client tracing
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get or create request ID
  const requestId = getOrCreateRequestId(req);
  req.requestId = requestId;

  // Get user context from authentication (if available)
  const userId = req.user?.sub;
  const organisationId = req.user?.['custom:organisation_id'];

  // Create request-scoped logger
  req.log = createRequestLogger(requestId, {
    userId,
    organisationId,
    method: req.method,
    path: req.path,
  });

  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);

  next();
};
