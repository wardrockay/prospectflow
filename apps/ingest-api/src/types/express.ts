// Type augmentation for Express Request
// This file extends the Express Request interface with custom properties

import type { CognitoJwtPayload } from './cognito.js';
import type { UserSession } from './session.js';

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
