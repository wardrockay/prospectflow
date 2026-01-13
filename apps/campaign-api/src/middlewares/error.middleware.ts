// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

const logger = createChildLogger('ErrorHandler');

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  res.locals.error = err;

  // Use request-scoped logger if available, fallback to module logger
  const log = req.log || logger;

  // Log error with context
  log.error(
    {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method,
    },
    'Error occurred',
  );

  // 🔍 Validation error (Zod)
  if (err instanceof ZodError) {
    log.warn({ issues: err.issues }, '❌ Validation Error');
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // 🔍 JSON Syntax error (ex: mauvais body JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    log.warn({ message: err.message }, '❌ Syntax Error');
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON syntax',
      detail: err.message,
    });
  }

  // 🔍 Custom AppError (includes ValidationError, DatabaseError, etc.)
  if (err instanceof AppError) {
    log.info(`⚠️ AppError ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 🔍 Erreur JS standard
  if (err instanceof Error) {
    // Capture server errors with Sentry
    Sentry.captureException(err, {
      tags: {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
      },
      extra: {
        userId: req.user?.sub,
        organisationId: req.user?.['custom:organisation_id'],
      },
    });
    log.error(`❌ Unexpected Error: ${err.message}`);
    return res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  }

  // 🔍 Cas inconnu
  log.error({ err }, '❌ Unhandled error type');
  // Capture unknown error type as generic
  Sentry.captureException(err as unknown as Error, {
    tags: {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
    },
    extra: {
      userId: req.user?.sub,
      organisationId: req.user?.['custom:organisation_id'],
    },
  });
  res.status(500).json({
    status: 'error',
    message: 'Unhandled server error',
  });
}
