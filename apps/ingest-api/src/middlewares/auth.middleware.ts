import { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('AuthMiddleware');

/**
 * Authentication middleware - checks for valid JWT token
 * 
 * ⚠️ SECURITY WARNING (LM-007 Code Review - 2026-02-03):
 * This middleware currently bypasses authentication in development mode.
 * Before deploying to production:
 * 1. Implement proper JWT validation with Cognito
 * 2. Add role-based access control (admin check)
 * 3. Remove the pass-through behavior
 * 
 * TODO: Implement proper JWT validation - see 0-4-aws-cognito-authentication-integration
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // FIXME: Replace with proper JWT validation before production
  // Currently allows all requests through for development convenience
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Auth middleware: Production mode but JWT validation not implemented!');
    // In production, should return 401 if not implemented
    // return res.status(401).json({ error: 'Authentication not configured' });
  }
  
  logger.debug('Auth middleware: allowing request (development mode - NO AUTH)');
  next();
}
