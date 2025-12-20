// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { HttpError } from '../errors/http-error.js';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  res.locals.error = err;

  // 🔍 Validation error (Zod)
  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues }, '❌ Validation Error'); // log structurellement les erreurs
    return res.status(400).json({
      message: 'Validation error',
      issues: err.issues,
    });
  }

  // 🔍 JSON Syntax error (ex: mauvais body JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn({ message: err.message }, '❌ Syntax Error');
    return res.status(400).json({
      message: 'Invalid JSON syntax',
      detail: err.message,
    });
  }

  // 🔍 Custom HttpError (ex: 404, 403, etc.)
  if (err instanceof HttpError) {
    logger.info(`⚠️ HttpError ${err.status} - ${err.message}`);
    return res.status(err.status).json({ message: err.message });
  }

  // 🔍 Erreur JS standard
  if (err instanceof Error) {
    logger.error(`❌ Unexpected Error: ${err.message}`);
    return res.status(500).json({ message: 'Internal server error' });
  }

  // 🔍 Cas inconnu
  logger.error({ err }, '❌ Unhandled error type');
  res.status(500).json({ message: 'Unhandled server error' });
}
