import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createChildLogger } from '../utils/logger.js';
import { leadMagnetService, LeadMagnetError } from '../services/lead-magnet.service.js';

const logger = createChildLogger('LeadMagnetController');

/**
 * Zod schema for signup request validation
 */
const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  consentGiven: z.boolean(),
  source: z.string().optional(),
});

/**
 * Extract IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Extract User-Agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * POST /api/lead-magnet/signup
 * Handle email signup with double opt-in flow
 */
export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string;
  const requestLogger = logger.child({ requestId });

  requestLogger.info({ body: req.body }, 'Signup request received');

  try {
    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
      requestLogger.warn({ errors: validationResult.error.issues }, 'Validation failed');
      res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const { email, consentGiven, source } = validationResult.data;

    // Get client metadata
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    requestLogger.debug(
      { email: email.substring(0, 3) + '***', ipAddress, source },
      'Processing signup',
    );

    // Call service layer
    const result = await leadMagnetService.handleSignup({
      email,
      consentGiven,
      ipAddress,
      userAgent,
      source,
    });

    requestLogger.info({ email: email.substring(0, 3) + '***' }, 'Signup successful');

    res.status(200).json(result);
  } catch (error) {
    // Handle custom LeadMagnetError
    if (error instanceof LeadMagnetError) {
      requestLogger.warn(
        { code: error.code, statusCode: error.statusCode },
        'Business logic error',
      );
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }

    // Generic error
    requestLogger.error({ err: error }, 'Unexpected error during signup');
    res.status(500).json({
      success: false,
      message: 'Une erreur est survenue. Veuillez réessayer.',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * GET /api/lead-magnet/confirm/:token
 * Confirm email and return download URL (JSON response)
 */
export const confirmToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { token } = req.params;
  const requestId = req.headers['x-request-id'] as string;
  const requestLogger = logger.child({ requestId });

  requestLogger.info({ tokenPrefix: token?.substring(0, 8) }, 'Token confirmation request received');

  if (!token) {
    requestLogger.warn('Token missing in request');
    res.status(400).json({
      success: false,
      status: 'invalid',
      error: 'TOKEN_MISSING',
      message: 'Token requis',
    });
    return;
  }

  try {
    // Get client metadata
    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Call service layer
    const result = await leadMagnetService.confirmToken(token, ipAddress, userAgent);

    if (result.success) {
      requestLogger.info({ status: result.status }, 'Token confirmation successful');
      res.status(200).json(result);
    } else {
      // Map error status to HTTP status code
      const statusCode =
        result.error === 'TOKEN_INVALID'
          ? 404
          : result.error === 'TOKEN_EXPIRED'
            ? 410
            : result.error === 'USAGE_LIMIT'
              ? 429
              : 400;

      requestLogger.warn({ error: result.error, status: result.status }, 'Token validation failed');
      res.status(statusCode).json(result);
    }
  } catch (error) {
    requestLogger.error({ err: error, tokenPrefix: token.substring(0, 8) }, 'Token confirmation failed');
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la confirmation. Veuillez réessayer.',
    });
  }
};

