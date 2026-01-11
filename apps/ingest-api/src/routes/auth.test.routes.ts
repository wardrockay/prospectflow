/// <reference path="../types/express.ts" />
import { Router, Request, Response } from 'express';
import { cognitoAuthMiddleware } from '../middlewares/cognito-auth.middleware.js';

const router = Router();

/**
 * GET /auth/test
 *
 * Test route to verify Cognito JWT authentication works end-to-end.
 * Protected by cognitoAuthMiddleware.
 *
 * Returns decoded JWT payload from req.user
 */
router.get('/test', cognitoAuthMiddleware, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

export default router;
