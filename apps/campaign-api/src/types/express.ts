// Type augmentation for Express Request
// Re-exports types from @prospectflow/auth-core

import type { CognitoJwtPayload, UserSession } from '@prospectflow/auth-core';

declare global {
  namespace Express {
    interface Request {
      /**
       * Cognito JWT payload, set by cognitoAuthMiddleware
       */
      user?: CognitoJwtPayload;
      /**
       * User session from Redis, set by sessionMiddleware
       */
      session?: UserSession;
      /**
       * Organisation ID for multi-tenant isolation, set by organisationScopeMiddleware
       */
      organisationId?: string;
    }
  }
}

// This export is required to make this a module
export {};
