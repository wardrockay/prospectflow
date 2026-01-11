/// <reference path="../types/express.ts" />
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { SessionService } from '../services/session.service.js';
import type { UserSyncService } from '../services/user-sync.service.js';
import type { CognitoJwtPayload } from '../types/cognito.js';

/**
 * Logger interface for session middleware
 */
export interface SessionMiddlewareLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (data: Record<string, unknown>, message: string) => void;
  debug: (data: Record<string, unknown> | string, message?: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: SessionMiddlewareLogger = {
  info: (msg) => console.log(`[Session] ${msg}`),
  warn: (msg) => console.warn(`[Session] ${msg}`),
  error: (data, msg) => console.error(`[Session] ${msg}`, data),
  debug: (data, msg) => console.debug(`[Session] ${msg || data}`, typeof data === 'object' ? data : ''),
};

/**
 * Options for creating the session middleware
 */
export interface SessionMiddlewareOptions {
  /** SessionService instance for Redis session management */
  sessionService: SessionService;
  /** UserSyncService instance for database user sync (optional) */
  userSyncService?: UserSyncService;
  /** Logger instance (optional) */
  logger?: SessionMiddlewareLogger;
}

/**
 * Create a session middleware
 *
 * Session middleware - manages Redis sessions for authenticated users
 * MUST run after cognito-auth.middleware (requires req.user)
 *
 * Flow:
 * 1. Validate JWT was verified by previous middleware
 * 2. Check if session exists in Redis
 * 3. If no session: sync user to DB, then create session
 * 4. If session exists: update activity timestamp
 * 5. Attach session to request for downstream handlers
 *
 * @param options - Session middleware configuration
 * @returns Express middleware
 */
export function createSessionMiddleware(options: SessionMiddlewareOptions): RequestHandler {
  const { sessionService, userSyncService, logger = defaultLogger } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure user is authenticated (JWT validated by previous middleware)
      if (!req.user) {
        logger.error({}, 'Session middleware called without authenticated user');
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const cognitoPayload = req.user as CognitoJwtPayload;
      const cognitoSub = cognitoPayload.sub;

      // Check if session exists in Redis
      let session = await sessionService.getSession(cognitoSub);

      if (session) {
        // Session exists - update activity timestamp
        logger.debug(`Session found for user ${cognitoSub}, updating activity`);
        await sessionService.updateActivity(cognitoSub);

        // Attach session to request for downstream handlers
        req.session = session;
      } else {
        // Session doesn't exist - create new one
        logger.info(`Creating new session for user ${cognitoSub}`);

        // Extract organisation_id from custom attributes
        const organisationId = cognitoPayload['custom:organisation_id'];
        if (!organisationId) {
          logger.error({}, `User ${cognitoSub} missing organisation_id in JWT`);
          res.status(403).json({
            error: 'User not assigned to an organisation',
            code: 'MISSING_ORGANISATION',
          });
          return;
        }

        // Sync user to database on first login (if userSyncService provided)
        // This ensures user exists in iam.users before creating session
        if (userSyncService) {
          try {
            await userSyncService.syncUser(cognitoPayload);
            logger.debug(`User ${cognitoSub} synced to database`);
          } catch (syncError) {
            logger.error({ err: syncError }, `Failed to sync user ${cognitoSub} to database`);
            // Continue with session creation - user sync is non-blocking
            // The user will be synced on next login attempt
          }
        }

        // Extract role from custom attributes
        const role = cognitoPayload['custom:role'] || 'user';
        const email = cognitoPayload.email;
        const cognitoGroups = cognitoPayload['cognito:groups'] || [];

        // Get client metadata for audit trail
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');

        // Create new session
        session = await sessionService.createSession({
          cognitoSub,
          organisationId,
          role,
          email,
          cognitoGroups,
          ipAddress,
          userAgent,
        });

        req.session = session;
      }

      // Log session access for security audit
      logger.debug(
        {
          cognitoSub: session.cognitoSub,
          organisationId: session.organisationId,
          role: session.role,
          lastActivity: new Date(session.lastActivity).toISOString(),
        },
        'Session validated',
      );

      next();
    } catch (error) {
      logger.error({ err: error }, 'Session middleware error');

      // Check if Redis connection failed
      if (error instanceof Error && error.message.includes('Redis')) {
        res.status(503).json({
          error: 'Session service unavailable',
          code: 'REDIS_UNAVAILABLE',
          message: 'Please try again in a moment',
        });
        return;
      }

      // Generic error
      res.status(500).json({
        error: 'Internal server error',
        code: 'SESSION_ERROR',
      });
    }
  };
}

/**
 * Optional: Middleware to attach organisation ID to request
 * Useful for downstream services that need quick access to org ID
 */
export function attachOrganisationId(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.organisationId) {
    // Attach to request for easy access in controllers/services
    req.organisationId = req.session.organisationId;
  }
  next();
}

/**
 * Create a middleware that requires specific role(s)
 * @param allowedRoles - List of roles allowed to access the route
 * @returns Express middleware
 */
export function createRequireRole(...allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.session.role;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Create a middleware that requires specific group membership
 * @param requiredGroups - List of Cognito groups (user must be in at least one)
 * @returns Express middleware
 */
export function createRequireGroup(...requiredGroups: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userGroups = req.session.cognitoGroups || [];
    const hasGroup = requiredGroups.some((group) => userGroups.includes(group));

    if (!hasGroup) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required group membership: ${requiredGroups.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
