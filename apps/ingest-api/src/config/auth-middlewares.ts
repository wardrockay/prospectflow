/// <reference path="../types/express.ts" />
// Auth middlewares adapted for ingest-api
// Re-exports auth-core middlewares with application-specific configuration

import {
  createCognitoAuthMiddleware,
  createSessionMiddleware,
  createOrganisationScopeMiddleware,
  attachOrganisationId as coreAttachOrganisationId,
  createRequireRole,
  createRequireGroup,
  checkOrganisationAccess as coreCheckOrganisationAccess,
  getOrganisationIdFromRequest as coreGetOrganisationIdFromRequest,
  ForbiddenError,
} from '@prospectflow/auth-core';
import type { Request, RequestHandler } from 'express';
import { cognitoConfig } from './cognito.js';
import { getSessionService, getUserSyncService } from './auth.js';
import { logger } from '../utils/logger.js';

// Logger adapters for middlewares
const authLogger = {
  error: (data: Record<string, unknown>, msg: string) => logger.error(data, msg),
};

const sessionLogger = {
  info: (msg: string) => logger.info(msg),
  warn: (msg: string) => logger.warn(msg),
  error: (data: Record<string, unknown>, msg: string) => logger.error(data, msg),
  debug: (data: Record<string, unknown> | string, msg?: string) => {
    if (typeof data === 'string') {
      logger.debug(data);
    } else {
      logger.debug(data, msg || '');
    }
  },
};

const orgScopeLogger = {
  warn: (data: Record<string, unknown>, msg: string) => logger.warn(data, msg),
  error: (data: Record<string, unknown>, msg: string) => logger.error(data, msg),
  debug: (data: Record<string, unknown>, msg: string) => logger.debug(data, msg),
};

/**
 * Cognito JWT authentication middleware
 * Validates JWT tokens from Authorization header
 */
export const cognitoAuthMiddleware: RequestHandler = createCognitoAuthMiddleware(
  {
    userPoolId: cognitoConfig.userPoolId,
    clientId: cognitoConfig.clientId,
  },
  authLogger,
);

/**
 * Session middleware factory
 * Creates sessions in Redis, syncs users to database
 * Note: This is a function because services need lazy initialization
 */
export function sessionMiddleware(): RequestHandler {
  return createSessionMiddleware({
    sessionService: getSessionService(),
    userSyncService: getUserSyncService(),
    logger: sessionLogger,
  });
}

/**
 * Organisation scope middleware
 * Enforces multi-tenant isolation
 */
export const organisationScopeMiddleware: RequestHandler = createOrganisationScopeMiddleware({
  logger: orgScopeLogger,
});

/**
 * Attach organisation ID to request for easy access
 */
export const attachOrganisationId = coreAttachOrganisationId;

/**
 * Create middleware that requires specific role(s)
 */
export const requireRole = createRequireRole;

/**
 * Create middleware that requires specific group membership
 */
export const requireGroup = createRequireGroup;

/**
 * Check organisation access (throws if cross-tenant)
 * Wrapped to use the application logger
 */
export function checkOrganisationAccess(
  resourceOrgId: string,
  userOrgId: string,
  resourceType = 'resource',
): void {
  return coreCheckOrganisationAccess(resourceOrgId, userOrgId, resourceType, orgScopeLogger);
}

export { ForbiddenError };

/**
 * Get organisation ID from request
 */
export function getOrganisationIdFromRequest(req: Request): string {
  return coreGetOrganisationIdFromRequest(req, orgScopeLogger);
}

export default cognitoAuthMiddleware;
