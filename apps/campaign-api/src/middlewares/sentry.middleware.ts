import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enrich Sentry context with user and request data
 * Should run after authentication middleware
 */
export const sentryContextMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user) {
    Sentry.setUser({
      id: req.user.sub,
      email: req.user.email,
    });
    const organisationId = req.user['custom:organisation_id'] as string | undefined;
    if (organisationId) {
      Sentry.setTag('organisation_id', organisationId);
    }
  }

  if (req.requestId) {
    Sentry.setTag('requestId', req.requestId);
  }

  next();
};
