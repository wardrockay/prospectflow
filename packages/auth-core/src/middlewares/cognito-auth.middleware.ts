/// <reference path="../types/express.ts" />
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoConfigOptions } from '../config/cognito.js';
import { cognitoConfig } from '../config/cognito.js';
import type { CognitoJwtPayload } from '../types/cognito.js';

/**
 * Logger interface for middleware
 */
export interface AuthMiddlewareLogger {
  error: (data: Record<string, unknown>, message: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: AuthMiddlewareLogger = {
  error: (data, msg) => console.error(`[CognitoAuth] ${msg}`, data),
};

/**
 * Create a Cognito JWT authentication middleware
 *
 * @param config - Cognito configuration options
 * @param logger - Optional logger for error reporting
 * @returns Express middleware that validates JWT tokens
 *
 * @example
 * ```typescript
 * const authMiddleware = createCognitoAuthMiddleware({
 *   userPoolId: 'eu-west-1_xxxxx',
 *   clientId: 'your-client-id',
 * });
 * app.use('/api', authMiddleware);
 * ```
 */
export const createCognitoAuthMiddleware = (
  config: CognitoConfigOptions,
  logger: AuthMiddlewareLogger = defaultLogger,
): RequestHandler => {
  // Create Cognito JWT verifier instance lazily
  let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  const getVerifier = () => {
    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId: config.userPoolId,
        tokenUse: 'id', // Verify ID tokens (contains user attributes)
        clientId: config.clientId,
      });
    }
    return verifier;
  };

  /**
   * Middleware to validate AWS Cognito JWT tokens
   *
   * Extracts and validates the JWT token from the Authorization header,
   * verifies its signature against Cognito public keys, and attaches
   * the decoded payload to req.user.
   *
   * @throws 401 - If token is missing, invalid, or expired
   * @throws 403 - If token is valid but missing required claims
   */
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'No authorization header provided',
        });
        return;
      }

      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid authorization header format. Expected: Bearer <token>',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'No token provided',
        });
        return;
      }

      // Verify token signature and claims using Cognito public keys
      let payload;
      try {
        payload = await getVerifier().verify(token);
      } catch (error) {
        // Token verification failed (invalid signature, expired, wrong issuer, etc.)
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed';

        // Check if token is expired
        if (errorMessage.includes('expired')) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Token expired',
          });
          return;
        }

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
          details: errorMessage,
        });
        return;
      }

      // Attach decoded payload to request for downstream use
      req.user = payload as unknown as CognitoJwtPayload;

      next();
    } catch (error) {
      // Unexpected error during authentication
      logger.error({ error }, 'Authentication middleware error');
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during authentication',
      });
    }
  };
};

/**
 * Default Cognito auth middleware using environment variables
 */
export const cognitoAuthMiddleware: RequestHandler = createCognitoAuthMiddleware(cognitoConfig);

export default cognitoAuthMiddleware;
