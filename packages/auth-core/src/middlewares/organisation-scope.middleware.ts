/// <reference path="../types/express.ts" />
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Logger interface for organisation scope middleware
 */
export interface OrgScopeLogger {
  warn: (data: Record<string, unknown>, message: string) => void;
  error: (data: Record<string, unknown>, message: string) => void;
  debug: (data: Record<string, unknown>, message: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: OrgScopeLogger = {
  warn: (data, msg) => console.warn(`[OrgScope] ${msg}`, data),
  error: (data, msg) => console.error(`[OrgScope] ${msg}`, data),
  debug: (data, msg) => console.debug(`[OrgScope] ${msg}`, data),
};

/**
 * Options for creating the organisation scope middleware
 */
export interface OrgScopeMiddlewareOptions {
  /** Logger instance (optional) */
  logger?: OrgScopeLogger;
}

/**
 * Create an organisation scope middleware
 *
 * Organisation scope middleware - enforces multi-tenant isolation
 * MUST run after session.middleware (requires req.session)
 *
 * Extracts organisation_id from session and attaches to request
 * for use in service layer database queries.
 *
 * @param options - Middleware configuration
 * @returns Express middleware
 */
export function createOrganisationScopeMiddleware(
  options: OrgScopeMiddlewareOptions = {},
): RequestHandler {
  const logger = options.logger || defaultLogger;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure session exists (should be set by session middleware)
      if (!req.session) {
        logger.error({}, 'Organisation scope middleware called without session');
        res.status(401).json({
          error: 'Authentication required',
          code: 'SESSION_REQUIRED',
        });
        return;
      }

      // Extract organisation_id from session
      const organisationId = req.session.organisationId;

      if (!organisationId) {
        logger.error({ cognitoSub: req.session.cognitoSub }, 'Session missing organisation_id');
        res.status(403).json({
          error: 'User not assigned to an organisation',
          code: 'MISSING_ORGANISATION',
        });
        return;
      }

      // Attach organisation_id to request for downstream services
      req.organisationId = organisationId;

      // Log for audit trail
      logger.debug(
        {
          organisationId,
          cognitoSub: req.session.cognitoSub,
          path: req.path,
          method: req.method,
        },
        'Organisation scope attached',
      );

      next();
    } catch (error) {
      logger.error({ err: error }, 'Organisation scope middleware error');
      res.status(500).json({
        error: 'Internal server error',
        code: 'ORG_SCOPE_ERROR',
      });
    }
  };
}

/**
 * ForbiddenError class for cross-tenant access attempts
 */
export class ForbiddenError extends Error {
  public readonly code: string;
  public readonly status: number = 403;

  constructor(message: string, code = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

/**
 * Check if user has access to a resource based on organisation_id
 * Throws ForbiddenError if organisation IDs don't match
 *
 * @param resourceOrgId - The organisation_id of the resource being accessed
 * @param userOrgId - The organisation_id of the requesting user
 * @param resourceType - Optional: type of resource for error message (e.g., 'prospect', 'campaign')
 * @param logger - Optional logger for security audit
 * @throws ForbiddenError if resource belongs to different organisation
 */
export function checkOrganisationAccess(
  resourceOrgId: string,
  userOrgId: string,
  resourceType = 'resource',
  logger: OrgScopeLogger = defaultLogger,
): void {
  if (resourceOrgId !== userOrgId) {
    logger.warn({ resourceOrgId, userOrgId, resourceType }, 'Cross-tenant access attempt blocked');

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
 * @param logger - Optional logger
 * @returns organisation_id string
 * @throws Error if organisation_id not set
 */
export function getOrganisationIdFromRequest(
  req: Request,
  logger: OrgScopeLogger = defaultLogger,
): string {
  const organisationId = req.organisationId;

  if (!organisationId) {
    logger.error({}, 'Attempted to access organisationId without org scope middleware');
    throw new Error(
      'Organisation ID not available - ensure organisation-scope middleware is applied',
    );
  }

  return organisationId;
}

/**
 * Default organisation scope middleware using default logger
 */
export const organisationScopeMiddleware: RequestHandler = createOrganisationScopeMiddleware();

export default organisationScopeMiddleware;
