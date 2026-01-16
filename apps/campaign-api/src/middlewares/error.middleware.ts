// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { ValidationError } from '../errors/ValidationError.js';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

const logger = createChildLogger('ErrorHandler');

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  res.locals.error = err;

  // Use request-scoped logger if available, fallback to module logger
  const log = req.log || logger;

  // Log FULL error with complete context and stack trace
  log.error(
    {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      errorType: err?.constructor?.name || typeof err,
      path: req.path,
      method: req.method,
      query: req.query,
      body: process.env.NODE_ENV === 'development' ? req.body : undefined,
      // Log the full error object for debugging
      fullError: err,
    },
    '❌ Error occurred in request',
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

  // 🔍 Custom ValidationError with fieldErrors
  if (err instanceof ValidationError) {
    log.info(`⚠️ ValidationError ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.fieldErrors && { fieldErrors: err.fieldErrors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 🔍 Custom AppError (includes DatabaseError, etc.)
  if (err instanceof AppError) {
    log.info(`⚠️ AppError ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 🔍 Erreur JS standard ou toute autre erreur 500
  // Capture ALL server errors with Sentry (not just instanceof Error)
  Sentry.captureException(err, {
    tags: {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      errorType: err instanceof Error ? err.constructor.name : typeof err,
    },
    extra: {
      userId: req.user?.sub,
      organisationId: req.user?.['custom:organisation_id'],
      query: req.query,
      body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    },
  });

  if (err instanceof Error) {
    log.error(`❌ Unexpected Error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 🔍 Cas inconnu (non-Error objects)
  log.error({ err }, '❌ Unhandled error type');
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { detail: String(err) }),
  });
}
