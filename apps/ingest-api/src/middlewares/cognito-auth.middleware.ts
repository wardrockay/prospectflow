/// <reference path="../types/express.ts" />
import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { cognitoConfig } from '../config/cognito.js';
import { CognitoJwtPayload } from '../types/cognito.js';

// Create Cognito JWT verifier instance lazily
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

const getVerifier = () => {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: cognitoConfig.userPoolId,
      tokenUse: 'id', // Verify ID tokens (contains user attributes)
      clientId: cognitoConfig.clientId,
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
export const cognitoAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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

    // Optional: Validate required custom claims
    // Note: organisation_id validation will be done in session middleware
    // to allow for better error messaging and user onboarding flows

    next();
  } catch (error) {
    // Unexpected error during authentication
    const { logger } = await import('../utils/logger.js');
    logger.error({ error }, 'Authentication middleware error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication',
    });
  }
};

export default cognitoAuthMiddleware;
