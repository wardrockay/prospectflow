// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  res.locals.error = err;

  // Log error with context
  logger.error(
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
    logger.warn({ issues: err.issues }, '❌ Validation Error');
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // 🔍 JSON Syntax error (ex: mauvais body JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn({ message: err.message }, '❌ Syntax Error');
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON syntax',
      detail: err.message,
    });
  }

  // 🔍 Custom AppError (includes ValidationError, DatabaseError, etc.)
  if (err instanceof AppError) {
    logger.info(`⚠️ AppError ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 🔍 Erreur JS standard
  if (err instanceof Error) {
    logger.error(`❌ Unexpected Error: ${err.message}`);
    return res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  }

  // 🔍 Cas inconnu
  logger.error({ err }, '❌ Unhandled error type');
  res.status(500).json({
    status: 'error',
    message: 'Unhandled server error',
  });
}
