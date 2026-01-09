import { Router, Request, Response } from 'express';
import axios from 'axios';
import { sessionService } from '../services/session.service';
import { userSyncService } from '../services/user-sync.service';
import { cognitoAuthMiddleware } from '../middlewares/cognito-auth.middleware';
import { sessionMiddleware } from '../middlewares/session.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Cognito OAuth configuration
const cognitoConfig = {
  domain: process.env.COGNITO_DOMAIN!, // e.g., prospectflow-dev.auth.eu-west-1.amazoncognito.com
  clientId: process.env.COGNITO_CLIENT_ID!,
  clientSecret: process.env.COGNITO_CLIENT_SECRET, // Optional, depends on app client config
  redirectUri: process.env.COGNITO_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  region: process.env.AWS_REGION || 'eu-west-1',
};

/**
 * OAuth 2.0 Callback - Exchange authorization code for tokens
 * GET /auth/callback?code=xxx
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      logger.error('Authorization code missing from callback');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Authorization code is required',
      });
    }

    logger.info('Processing OAuth callback with authorization code');

    // Exchange authorization code for tokens
    const tokenEndpoint = `https://${cognitoConfig.domain}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cognitoConfig.clientId,
      code,
      redirect_uri: cognitoConfig.redirectUri,
    });

    // Add client secret if configured (for confidential clients)
    if (cognitoConfig.clientSecret) {
      params.append('client_secret', cognitoConfig.clientSecret);
    }

    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token, refresh_token, expires_in, token_type } = response.data;

    logger.info('Successfully exchanged authorization code for tokens');

    // Return tokens to frontend
    // In production, consider setting secure HTTP-only cookies instead
    res.json({
      access_token,
      id_token,
      refresh_token,
      expires_in,
      token_type,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('OAuth token exchange failed', {
        status: error.response?.status,
        data: error.response?.data,
      });

      return res.status(error.response?.status || 500).json({
        error: 'Token exchange failed',
        message: error.response?.data?.error_description || 'Failed to exchange authorization code',
      });
    }

    logger.error('Unexpected error in OAuth callback', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process authentication callback',
    });
  }
});

/**
 * Refresh Token - Exchange refresh token for new access token
 * POST /auth/refresh
 * Body: { refresh_token: string }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Refresh token is required',
      });
    }

    logger.info('Processing token refresh request');

    const tokenEndpoint = `https://${cognitoConfig.domain}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: cognitoConfig.clientId,
      refresh_token,
    });

    if (cognitoConfig.clientSecret) {
      params.append('client_secret', cognitoConfig.clientSecret);
    }

    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token, expires_in, token_type } = response.data;

    logger.info('Successfully refreshed access token');

    res.json({
      access_token,
      id_token,
      expires_in,
      token_type,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Token refresh failed', {
        status: error.response?.status,
        data: error.response?.data,
      });

      return res.status(error.response?.status || 500).json({
        error: 'Token refresh failed',
        message: error.response?.data?.error_description || 'Failed to refresh token',
      });
    }

    logger.error('Unexpected error in token refresh', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * Logout - Delete session and optionally revoke tokens
 * POST /auth/logout
 * Requires: Authentication (JWT token)
 */
router.post('/logout', cognitoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const cognitoSub = req.user.sub;

    logger.info(`Processing logout for user ${cognitoSub}`);

    // Delete session from Redis
    const deleted = await sessionService.deleteSession(cognitoSub);

    if (deleted) {
      logger.info(`Session deleted for user ${cognitoSub}`);
    } else {
      logger.warn(`No session found to delete for user ${cognitoSub}`);
    }

    // Optional: Revoke refresh token in Cognito
    // This requires AWS SDK and admin permissions
    // For MVP, client-side token disposal is sufficient

    res.json({
      message: 'Logged out successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Logout failed', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Failed to complete logout',
    });
  }
});

/**
 * Get Current User - Returns current authenticated user info
 * GET /auth/me
 * Requires: Authentication + Session
 */
router.get('/me', cognitoAuthMiddleware, sessionMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // Sync user to database if not already synced
    await userSyncService.syncUser(req.user!);

    res.json({
      user: {
        email: req.session.email,
        organisationId: req.session.organisationId,
        role: req.session.role,
        groups: req.session.cognitoGroups,
        lastActivity: new Date(req.session.lastActivity).toISOString(),
        createdAt: new Date(req.session.createdAt).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get current user', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve user information',
    });
  }
});

/**
 * Initiate Login - Redirect to Cognito Hosted UI
 * GET /auth/login
 */
router.get('/login', (req: Request, res: Response) => {
  const loginUrl =
    `https://${cognitoConfig.domain}/login?` +
    `client_id=${cognitoConfig.clientId}&` +
    `response_type=code&` +
    `scope=openid+email+profile&` +
    `redirect_uri=${encodeURIComponent(cognitoConfig.redirectUri)}`;

  res.redirect(loginUrl);
});

/**
 * Session Health Check
 * GET /auth/health
 * Requires: Authentication + Session
 */
router.get(
  '/health',
  cognitoAuthMiddleware,
  sessionMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.session) {
        return res.status(503).json({
          healthy: false,
          message: 'Session not available',
        });
      }

      // Check session TTL
      const ttl = await sessionService.getSessionTTL(req.session.cognitoSub);

      res.json({
        healthy: true,
        session: {
          active: true,
          ttl: ttl > 0 ? ttl : 0,
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null,
        },
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        healthy: false,
        message: 'Health check failed',
      });
    }
  },
);

export default router;
