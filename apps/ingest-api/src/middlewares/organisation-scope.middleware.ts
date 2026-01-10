import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ForbiddenError } from '../errors/http-errors';

/**
 * Organisation scope middleware - enforces multi-tenant isolation
 * MUST run after session.middleware (requires req.session)
 *
 * Extracts organisation_id from session and attaches to request
 * for use in service layer database queries.
 */
export async function organisationScopeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure session exists (should be set by session middleware)
    if (!req.session) {
      logger.error('Organisation scope middleware called without session');
      res.status(401).json({
        error: 'Authentication required',
        code: 'SESSION_REQUIRED',
      });
      return;
    }

    // Extract organisation_id from session
    const organisationId = req.session.organisationId;

    if (!organisationId) {
      logger.error('Session missing organisation_id', {
        cognitoSub: req.session.cognitoSub,
      });
      res.status(403).json({
        error: 'User not assigned to an organisation',
        code: 'MISSING_ORGANISATION',
      });
      return;
    }

    // Attach organisation_id to request for downstream services
    req.organisationId = organisationId;

    // Log for audit trail
    logger.debug('Organisation scope attached', {
      organisationId,
      cognitoSub: req.session.cognitoSub,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Organisation scope middleware error', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'ORG_SCOPE_ERROR',
    });
  }
}

/**
 * Check if user has access to a resource based on organisation_id
 * Throws ForbiddenError if organisation IDs don't match
 *
 * @param resourceOrgId - The organisation_id of the resource being accessed
 * @param userOrgId - The organisation_id of the requesting user
 * @param resourceType - Optional: type of resource for error message (e.g., 'prospect', 'campaign')
 * @throws ForbiddenError if resource belongs to different organisation
 */
export function checkOrganisationAccess(
  resourceOrgId: string,
  userOrgId: string,
  resourceType = 'resource',
): void {
  if (resourceOrgId !== userOrgId) {
    logger.warn('Cross-tenant access attempt blocked', {
      resourceOrgId,
      userOrgId,
      resourceType,
    });

    throw new ForbiddenError(
      `Access denied: ${resourceType} belongs to a different organisation`,
      'CROSS_TENANT_ACCESS_DENIED',
    );
  }
}

/**
 * Validate that organisation_id is present on request
 * Utility function for use in route handlers
 *
 * @param req - Express request object
 * @returns organisation_id string
 * @throws Error if organisation_id not set
 */
export function getOrganisationIdFromRequest(req: Request): string {
  const organisationId = req.organisationId;

  if (!organisationId) {
    logger.error('Attempted to access organisationId without org scope middleware');
    throw new Error(
      'Organisation ID not available - ensure organisation-scope middleware is applied',
    );
  }

  return organisationId;
}

export default organisationScopeMiddleware;
