import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service';
import { userSyncService } from '../services/user-sync.service';
import { logger } from '../utils/logger';
import { CognitoJwtPayload } from '../types/cognito';

/**
 * Session middleware - manages Redis sessions for authenticated users
 * MUST run after cognito-auth.middleware (requires req.user)
 *
 * Flow:
 * 1. Validate JWT was verified by previous middleware
 * 2. Check if session exists in Redis
 * 3. If no session: sync user to DB, then create session
 * 4. If session exists: update activity timestamp
 * 5. Attach session to request for downstream handlers
 */
export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure user is authenticated (JWT validated by previous middleware)
    if (!req.user) {
      logger.error('Session middleware called without authenticated user');
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
        logger.error(`User ${cognitoSub} missing organisation_id in JWT`);
        res.status(403).json({
          error: 'User not assigned to an organisation',
          code: 'MISSING_ORGANISATION',
        });
        return;
      }

      // Sync user to database on first login (Task 2.4.2)
      // This ensures user exists in iam.users before creating session
      try {
        await userSyncService.syncUser(cognitoPayload);
        logger.debug(`User ${cognitoSub} synced to database`);
      } catch (syncError) {
        logger.error(`Failed to sync user ${cognitoSub} to database`, syncError);
        // Continue with session creation - user sync is non-blocking
        // The user will be synced on next login attempt
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
    logger.debug('Session validated', {
      cognitoSub: session.cognitoSub,
      organisationId: session.organisationId,
      role: session.role,
      lastActivity: new Date(session.lastActivity).toISOString(),
    });

    next();
  } catch (error) {
    logger.error('Session middleware error', error);

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
}

/**
 * Optional: Middleware to attach organisation ID to request
 * Useful for downstream services that need quick access to org ID
 */
export function attachOrganisationId(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.organisationId) {
    // Attach to request for easy access in controllers/services
    (req as any).organisationId = req.session.organisationId;
  }
  next();
}

/**
 * Optional: Middleware to require specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.session.role;
    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `Access denied: user ${
          req.session.cognitoSub
        } with role ${userRole} attempted to access endpoint requiring ${allowedRoles.join(', ')}`,
      );
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Optional: Middleware to require specific Cognito group
 */
export function requireGroup(...allowedGroups: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userGroups = req.session.cognitoGroups;
    const hasRequiredGroup = allowedGroups.some((group) => userGroups.includes(group));

    if (!hasRequiredGroup) {
      logger.warn(
        `Access denied: user ${req.session.cognitoSub} not in required groups ${allowedGroups.join(
          ', ',
        )}`,
      );
      res.status(403).json({
        error: 'Insufficient permissions',
        required_groups: allowedGroups,
      });
      return;
    }

    next();
  };
}
